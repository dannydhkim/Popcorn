import gzip
import json
import os
import pandas as pd

with open('film_database_2/award_institution.json', 'r') as f:
    data = f.read().splitlines()
json_data = [json.loads(line) for line in data]

award_bins = ["Academy Awards",]

# ["claims"].get("P297",{})[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
rows = []
for item in json_data:
    qid = item.get("id")
    val = item.get("labels",{}).get("en", {}).get("value")
    award_bin = val
    if "academy awards" in val.lower():
        award_bin = "Academy Awards"
    if "european film award" in val.lower():
        award_bin = "European Film Award"
    if "european film academy" in val.lower():
        award_bin = "European Film Academy"
    if "jameson people's choice award" in val.lower():
        award_bin = "Jameson People's Choice Award"
    if "jameson people's choice award" in val.lower():
        award_bin = "Jameson People's Choice Award"
    # iso_code = item["claims"].get("P297",{})[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
    row = {"id":qid, "award_institution":val, "bin":award_bin}
    rows.append(row)

df = pd.DataFrame(rows)
df.to_csv("film_database_2/award institution.csv", index=False)