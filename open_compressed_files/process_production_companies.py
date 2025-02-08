import gzip
import json
import os
import pandas as pd

with open('film_database_2/production_company.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    row = {"id":qid, "company":val}
    rows.append(row)

df = pd.DataFrame(rows)
df = df.loc[df['company'].notna()]
print(df)
df.to_csv("film_database_2/production_company.csv", index=False)