import gzip
import json
import os
import pandas as pd

with open('film_database_2/countries.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    iso_code = item["claims"].get("P297",{})[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    row = {"id":qid, "country":val, "iso_code": iso_code}
    rows.append(row)

df = pd.DataFrame(rows)
print(df)
# df.to_csv("film_database_2/countries.csv", index=False)