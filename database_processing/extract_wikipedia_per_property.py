import gzip
import json
import os
from tqdm import tqdm
from multiprocessing import Process, Manager

DUMP_FILE = "C:/Users/krdan/latest-all.json.gz"
OUTPUT_DIR = "film_database_2/"
TARGET_TYPES = {
    # "genre": ["Q201658", "Q15961987"],
    # "mpa_film_rating": ["Q23660208"], 
    # "reviewer": ["Q1340449"],
    # "cities": ["Q515"],
    # "countries": ["Q6256"],
    # "review_methodology":["Q107737383"],
    # "character":["Q15773317","Q15711870", "Q15632617"],
    # "distribution_format": ["Q723685"],
    # "production_company":["Q1762059","Q1107679","Q10689397"],
    # "language":["Q33742", "Q34770", "Q1288568"],
    # "awards":["Q19020","Q56116950", "Q1011547"],
    # "award institution":["Q223740", "Q16913666"],
    "people": ["Q5"]
}

occupations = {
    "Q10800557": "Actor",
    "Q2259451": "Actor",
    "Q10798782": "Actor",
    "Q33999": "Actor",
    "Q2405480": "Actor",
    "Q3282637": "Producer",
    "Q28389": "Screenwriter",
    "Q1415090": "Composer",
    "Q36834": "Composer",
    "Q1053574": "Executive Producer",
    "Q3455803": "Director",
    "Q2526255": "Director",
    "Q222344": "Cinematographer",
}

def process_target_type(target_name, target_types, progress_queue):
    output_file = os.path.join(OUTPUT_DIR, f"{target_name}.json.gz")
    with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as infile, \
            gzip.open(output_file, "wt", encoding="utf-8") as outfile:
        for i, line in enumerate(infile):
            progress_queue.put(len(line.encode("utf-8")))  # Update progress
            line = line.strip()
            if line.endswith(","):
                line = line[:-1]

            try:
                entity = json.loads(line)                
            except json.JSONDecodeError:
                continue

            if "claims" in entity:
                p31_claims = entity["claims"].get("P31", [])
                if any(claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") in target_types
                       for claim in p31_claims):
                    
                    occupation_claims = entity["claims"].get("P106", [])

                    if any(
                        claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") in occupations.keys()
                        for claim in occupation_claims
                    ):
                        outfile.write(json.dumps(entity) + "\n")


def progress_listener(file_size, progress_queue):
    with tqdm(total=file_size, unit="B", unit_scale=True, desc="Processing") as pbar:
        while True:
            update = progress_queue.get()
            if update is None:
                break
            pbar.update(update)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)  # Ensure output directory exists
    file_size = os.path.getsize(DUMP_FILE)

    manager = Manager()
    progress_queue = manager.Queue()

    # Start progress listener process
    progress_process = Process(target=progress_listener, args=(file_size, progress_queue))
    progress_process.start()

    processes = []
    for target_name, target_types in TARGET_TYPES.items():
        p = Process(target=process_target_type, args=(target_name, target_types, progress_queue))
        processes.append(p)
        p.start()

    # Wait for all processes to complete
    for p in processes:
        p.join()

    # Signal the progress listener to exit
    progress_queue.put(None)
    progress_process.join()


if __name__ == "__main__":
    main()