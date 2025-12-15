import gzip
import json
import os
from tqdm import tqdm
from contextlib import ExitStack

# File paths
DUMP_FILE = "C:/Users/krdan/latest-all.json.gz"
OUTPUT_DIR = "film_database"  # Directory for output files
os.makedirs(OUTPUT_DIR, exist_ok=True)  # Ensure output directory exists

# Metadata properties to filter
METADATA_PROPERTIES = {
    # About the Content
    "Q201658": "Genre",
    "Q15961987": "Genre",
    
    #Used for country of origin
    "Q6256": "Country",

    #Used for Narrative Location
    "Q515": "Cities",

    "Q23660208":"MPA Film Rating",
    "Q1340449": "Reviewer",
    "Q107737383":"Review Methodology",
    "Q19020": "Award", 
    "Q56116950": "Award",
    "Q1011547": "Award", 
    "Q38033430": "Award", 
    "Q4220917": "Award",
    "Q223740": "Award Institution", 
    "Q16913666": "Award Institution",
    "Q5": "People",

    #Characters
    "Q15773317": "Character", 
    "Q15711870": "Character", 
    "Q15632617": "Character",


    #Logistics and Distribution
    "Q723685":"Distribution format",
    "Q1762059": "Production company", 
    "Q1107679": "Production company", 
    "Q10689397": "Production company",
    "Q33742": "Language",
    "Q34770": "Language", 
    "Q1288568": "Language"
}

# Resolve nested dictionary for occupations
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

# Get the file size for progress tracking
file_size = os.path.getsize(DUMP_FILE)

# Process the dataset
with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as infile, \
     ExitStack() as stack, \
     tqdm(total=file_size, unit="B", unit_scale=True, desc="Processing") as pbar:

    # Create output file handlers
    output_files = {
        prop: stack.enter_context(gzip.open(
            os.path.join(OUTPUT_DIR, f"{label.replace(' ', '_').lower()}.json.gz"), "wt", encoding="utf-8"
        ))
        for prop, label in METADATA_PROPERTIES.items()
    }

    for line in infile:
        pbar.update(len(line.encode("utf-8")))  # Update progress bar by bytes read
        line = line.strip()
        if line.endswith(","):  # JSON objects are separated by commas
            line = line[:-1]  # Remove the trailing comma

        try:
            entity = json.loads(line)
        except json.JSONDecodeError:
            continue  # Skip malformed lines

        if "claims" in entity:
            claims = entity["claims"]

            # Check if the entity is a "Person" (Q5)
            if any(
                claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") == "Q5"
                for claim in claims.get("P31", [])
            ):
                # Filter further by occupations
                occupation_claims = claims.get("P106", [])
                if any(
                    claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") in occupations
                    for claim in occupation_claims
                ):
                    output_files["Q5"].write(json.dumps(entity) + "\n")
                continue  # Skip further processing for "People"
            # Process other properties
            for prop, label in METADATA_PROPERTIES.items():
                if any(
                    claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") == prop
                    for claim in claims.get("P31", [])
                ):
                    output_files[prop].write(json.dumps(entity) + "\n")

print(f"Filtered metadata saved to {OUTPUT_DIR}.")
