import gzip
import json
import os
from tqdm import tqdm

DUMP_FILE = "C:/Users/krdan/latest-all.json.gz"
OUTPUT_FILE = "extracted_film_tv_data.json.gz"
TARGET_TYPES = ["Q11424", "Q15416"]  # Film and Television Series

# Get the file size for progress calculation
file_size = os.path.getsize(DUMP_FILE)

def coalesce_arrays(*arrays, default=[]):
    """
    Returns the first non-empty array from the given arrays.
    If all arrays are empty, returns the default value.
    """
    for arr in arrays:
        if arr:  # Checks if the array is not empty (falsy)
            return arr
    return default

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
            netflix_id = entity["claims"].get("P1874", [])
            disney_movie_id = entity["claims"].get("P7595", [])
            disney_series_id = entity["claims"].get("P7596", [])
            hulu_id = entity["claims"].get("P6467", [])
            TMDB_id = entity["claims"].get("P4947", [])

            if any(claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") in TARGET_TYPES
                   for claim in p31_claims):
                # Write the matching entity to the output file
                outfile.write(json.dumps(entity) + "\n")           
            elif coalesce_arrays(netflix_id, disney_movie_id, disney_series_id, hulu_id, TMDB_id):
                # Write the matching entity to the output file
                outfile.write(json.dumps(entity) + "\n")