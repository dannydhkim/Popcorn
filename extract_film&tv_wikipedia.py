import gzip
import json
import os
from tqdm import tqdm

DUMP_FILE = "C:/Users/krdan/latest-all.json.gz"
OUTPUT_FILE = "filtered-data.json.gz"
TARGET_TYPES = ["Q11424", "Q15416"]  # Film and Television Series

# Get the file size for progress calculation
file_size = os.path.getsize(DUMP_FILE)

with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as infile, \
        gzip.open(OUTPUT_FILE, "wt", encoding="utf-8") as outfile, \
        tqdm(total=file_size, unit="B", unit_scale=True, desc="Processing") as pbar:
    
    for line in infile:
        pbar.update(len(line.encode('utf-8')))  # Update progress bar by the bytes read
        line = line.strip()
        if line.endswith(","):  # JSON objects are separated by commas
            line = line[:-1]  # Remove the trailing comma

        try:
            entity = json.loads(line)
        except json.JSONDecodeError:
            continue  # Skip malformed lines

        if "claims" in entity:
            # Check if it's a film or TV series
            p31_claims = entity["claims"].get("P31", [])
            if any(claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") in TARGET_TYPES
                   for claim in p31_claims):
                # Write the matching entity to the output file
                outfile.write(json.dumps(entity) + "\n")