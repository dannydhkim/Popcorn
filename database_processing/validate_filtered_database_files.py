import gzip
import json
import os
import pandas as pd

def validate_json_gz_files(folder_path, required_keys=None):
    """
    Validate `.json.gz` files in a folder.

    Parameters:
    - folder_path (str): Path to the folder containing .json.gz files.
    - required_keys (list): Keys that each JSON object should contain (optional).

    Returns:
    - dict: A summary of validation results.
    """
    summary = {"total_files": 0, "valid_files": 0, "invalid_files": 0, "errors": []}

    for file_name in os.listdir(folder_path):
        if file_name.endswith('.json.gz'):
            summary["total_files"] += 1
            file_path = os.path.join(folder_path, file_name)

            try:
                # Decompress and load JSON data
                with gzip.open(file_path, 'rt', encoding='utf-8') as f:
                    data = json.load(f)

                # Check JSON structure
                if isinstance(data, list):  # Assuming each file contains a list of JSON objects
                    for item in data:
                        if required_keys and not all(key in item for key in required_keys):
                            raise ValueError(f"Missing required keys in {file_name}")
                else:
                    raise ValueError(f"Invalid JSON structure in {file_name}")

                summary["valid_files"] += 1

            except Exception as e:
                summary["invalid_files"] += 1
                summary["errors"].append({"file": file_name, "error": str(e)})

    return summary

# # Example usage
# folder_path = 'film_database'
# required_keys = ['title', 'director', 'release_date']  # Adjust based on your data schema
# results = validate_json_gz_files(folder_path)

# print("Validation Summary:")
# print(json.dumps(results, indent=4))

with open('film_database/genre.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    description = item.get("descriptions", {}).get("en", {}).get("value")
    row = {"id":qid, "genre":val, "description":description}
    rows.append(row)

# for row in rows:
#     print(row)

df = pd.DataFrame(rows)
df.to_csv("film_database/genre.csv", index=False)