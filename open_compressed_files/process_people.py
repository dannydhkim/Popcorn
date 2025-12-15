import gzip
import json
import os
import pandas as pd

# with open('film_database_2/people.json', 'r') as f:
#     data = f.read().splitlines()
# json_data = [json.loads(line) for line in data]

# occupation_mapping = {
#     "Q10800557": "Actor",
#     "Q2259451": "Actor",
#     "Q10798782": "Actor",
#     "Q33999": "Actor",
#     "Q2405480": "Actor",
#     "Q3282637": "Producer",
#     "Q28389": "Screenwriter",
#     "Q1415090": "Composer",
#     "Q36834": "Composer",
#     "Q1053574": "Executive Producer",
#     "Q3455803": "Director",
#     "Q2526255": "Director",
#     "Q222344": "Cinematographer",
# }
# jobs = ['Actor', 'Producer', 'Screenwriter', 'Composer', 'Executive Producer', 'Director', 'Cinematographer']
# # print([occupations.get(json_data["claims"].get("P106",{})[0].get("mainsnak", {}).get("datavalue", {}).get("value", {}).get('id', {})),{}])
# rows = []
# for job in jobs:
#     for i, item in enumerate(json_data):
#         occupation_claims = item["claims"].get("P106",{})
#         if any([occupation_mapping.get(claim.get("mainsnak", {}).get("datavalue", {})\
#             .get("value", {}).get("id","")) == job for claim in occupation_claims]):
#             qid = item.get("id")
#             name = item.get("labels",{}).get("en", {}).get("value")
#             if not name:
#                 try:
#                     search_native_name = item.get("claims").get("P1559",{})[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
#                     if search_native_name.get('language', "") == 'en':
#                         name = search_native_name.get("text")
#                 except:
#                     continue
#             val = item.get("labels",{}).get("en", {}).get("value")            
#             description = item.get("descriptions", {}).get("en", {}).get("value")
#             row = {"id":qid, "job": job, "name":name, "description": description}
#             rows.append(row)

# df = pd.DataFrame(rows)
# df = df.loc[df['name'].notna()]
# for job in jobs:
#     job_df = df.copy()
#     job_df = job_df.loc[job_df["job"] == job].drop(columns="job")
#     df.to_csv(f"film_database_2/{job}.csv", index=False)

df = pd.read_csv("film_database_2/Actor.csv")
print(df.loc[df["job"] == 'Actor'])
df = df.loc[df["job"] == 'Actor'].drop(columns="job")
print(df)
df.to_csv("film_database_2/Actor.csv", index=False)