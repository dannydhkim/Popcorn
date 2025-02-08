import gzip
import json
import os
import pandas as pd

with open('film_database_2/distribution_format.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    row = {"id":qid, "format":val}
    rows.append(row)

df = pd.DataFrame(rows)
df = df.loc[df['format'].notna()]
print(df)
df.to_csv("film_database_2/distribution_format.csv", index=False)