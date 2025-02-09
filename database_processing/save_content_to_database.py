import gzip
import json
from tqdm import tqdm
import pandas as pd

# Input and output files
# DUMP_FILE = "filtered-data.json.gz"
DUMP_FILE = "film_database/language.json.gz"
OUTPUT_FILE = "extracted_metadata.json"

# Metadata properties of interest
METADATA_PROPERTIES = {
    # About the Content
    "P31": "Instance of",
    "P1476": "Title",
    "P136": "Genre",
    "P2047": "Duration",
    "P2437": "Num Seasons",
    "P1113": "Num Episodes",
    "P577": "Publication date",
    "P580": "Sunrise",
    "P582": "Sunset",
    "P495": "Country of origin",
    "P1657": "MPA Film Rating",
    "P5021": "Assessment",
    "P444": "Review Score",
    "P166": "Award Received",
    "P1411": "Nominated for",

    # Logistics and Distribution
    "P4947": "Streaming platform",
    "P6127": "Online publication",
    "P2603": "Box office",
    "P12096": "Production budget",
    "P272": "Production company",
    "P437": "Distribution format",
    "P840": "Narrative location",

    # Associated People
    "P161": "Cast member",
    "P725": "Voice actor",
    "P57": "Director",
    "P58": "Screenwriter",
    "P1431": "Executive Producer",
    "P86": "Composer",
    "P344": "Director of photography",
    "P480": "Filmography",
    "P1040": "Film editor",
    "P674": "Characters",
    "P170": "Creator",

    # Associated Works
    "P179": "Series",
    "P144": "Based on",
    "P856": "Official Website",
    "P364": "Original language of work",

    # IDs
    "P1874": "Netflix ID",
    "P7595": "Disney+ movie ID",
    "P7596": "Disney+ series ID",
    "P6467": "Hulu ID"
}

df = pd.read_json("database_processing/processed_extracted_metadata.json")
print(df)

# # Process the dataset to extract metadata
# with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as file, tqdm(total=file_size, unit="lines", desc="Processing") as pbar:
#     for line in file:
#         try:
#             entity = json.loads(line.strip())
#             metadata = {"id": entity.get("id", "Unknown")}

#             # Extract metadata fields
#             claims = entity.get("claims", {})
#             for prop_id, label in METADATA_PROPERTIES.items():
#                 if prop_id in claims:
#                     # Extract values and qualifiers for the property
#                     values = []
#                     for claim in claims[prop_id]:
#                         if "datavalue" in claim.get("mainsnak", {}):
#                             value = claim["mainsnak"]["datavalue"]["value"]
#                             qualifiers = claim.get("qualifiers", {})
#                             qualifier_data = {
#                                 q: [qclaim["datavalue"]["value"] for qclaim in qclaims if "datavalue" in qclaim]
#                                 for q, qclaims in qualifiers.items()
#                             }
#                             values.append({"value": value, "qualifiers": qualifier_data})
                    
#                     # Add to metadata
#                     if values:
#                         metadata[label] = values if len(values) > 1 else values[0]

#             print(json.dumps(metadata, indent=4))
#             # output_data.append(metadata)  # Save metadata to the list

#         except (json.JSONDecodeError, KeyError):
#             continue
#         finally:
#             pbar.update(1)

# # # Save all extracted metadata to a JSON file
# # with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
# #     json.dump(output_data, outfile, indent=4)

# # print(f"Extracted metadata saved to {OUTPUT_FILE}.")
