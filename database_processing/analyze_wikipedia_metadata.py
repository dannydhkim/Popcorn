import gzip
import json
from collections import Counter
from tqdm import tqdm

# Input file
DUMP_FILE = "filtered-data.json.gz"

property_labels = {}
label_counter = Counter()

# Determine the size of the file for progress tracking
file_size = sum(1 for _ in gzip.open(DUMP_FILE, "rt", encoding="utf-8"))

# Process the dataset in a single pass with a progress bar
with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as file, tqdm(total=file_size, unit="lines", desc="Processing") as pbar:
    for line in file:
        try:
            entity = json.loads(line.strip())
            
            # Extract property labels if the entity is a property
            if entity["id"].startswith("P"):  # Check if the entity is a property
                label = entity.get("labels", {}).get("en", {}).get("value")
                if label:
                    property_labels[entity["id"]] = label
            
            # Count property occurrences if the entity has claims
            if "claims" in entity:
                for prop in entity["claims"].keys():
                    label = property_labels.get(prop, f"Unknown ({prop})")
                    label_counter[label] += 1

        except (json.JSONDecodeError, KeyError):
            continue

        pbar.update(1)

# Print the most common labels and their counts
for label, count in label_counter.most_common(50):
    print(f"{label}: {count} occurrences")
