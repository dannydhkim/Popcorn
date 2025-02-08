import gzip
import json
import os
import pandas as pd

with open('film_database_2/character.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    description = item.get("descriptions", {}).get("en", {}).get("value")
    row = {"id":qid, "character":val, "description": description}
    rows.append(row)

df = pd.DataFrame(rows)
df = df.loc[df['character'].notna()]
print(df)
df.to_csv("film_database_2/characters.csv", index=False)