import gzip
import json
from tqdm import tqdm
from datetime import datetime
import re

import csv

def csv_to_dict(filename):
    result = {}
    with open(filename, encoding="utf8") as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header row
        for row in reader:
            key = row[0]
            values = row[1:]
            result[key] = values[0]
    return result

property_mapping = csv_to_dict('film_database_2/property_mapping.csv')

# Input and output files
DUMP_FILE = "film_database_2/filtered-data.json.gz"
OUTPUT_FILE = "database_processing/processed_extracted_metadata.json"

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
    # "P444": "Review Score",
    "P166": "Award Received",
    "P1411": "Nominated for",

    # Logistics and Distribution
    # "P4947": "Streaming platform" - TMDB movie ID 
    # "P6127": "Online publication",
    # "P437": "Distribution format",
    "P2142": "Box office",
    "P2130": "Production budget",
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


# property_mapping = {
#     "P585" : "datetime",
#     "P4566" : "datetime",
#     "P577": "Publication date",
#     "P805" : "group",
#     "P3005" : "valid_location",
#     "P131": "narrative_location",
#     "P50": "author",
#     "P17": "country",
#     "P276": "location",
#     "P376": "planet",
#     "P291" : "publication_location",
#     "P1346" : "winner",
#     "P2453": "nominee",
#     "P3831" : "functions",
#     "P2676" : "rating_certificate_ID",
#     "P7367" : "content_description",
#     "P9259" : "assessment_outcome",
#     "P1013" : "criterion_used",
#     "P447" : "reviewer",
#     "P459" : "methodology",
#     "P7887" : "num_reviews",
#     "P1810" : "named_as",
#     "P793" : "significant_event",
#     "P453" : "character_role",
#     "P4633" : "character_role",
#     "P444" : "review_score",
#     "P5102" : "nature of statement",
#     "P437": "distribution_format",
#     "P518": "applies to",
#     "P1352": "ranking",
#     "P5800": "narrative_role",
#     "P1545": "series_ordinal",
#     "P156": "followed_by",
#     "P155": "follows",
#     "P407": "language",
#     "P1552": "has_characteristic",
#     "P6833": "backup_html_title",
#     "P6835": "backup_latex_title",
#     "P582": "end_time",
#     "P580": "start_time",
#     "P1932": "also_known_as",
#     "P1686": "for_work",
#     "P175": "performer"
# }

#skipped: 
# P2676 - rating certificate ID
# P7367 - content descriptor (for rating)
# P7452 - reason for preferred rank
# "P2241" - reason for deprecated rank 
# P2719 - Hungarian-style transcription
# P1065 - archive URL
# P282 - writing system
# P2960 - archive date
# P1107 - proportion
# P1706 - together with
# P2868 - subhect has role
# P1411 - nominated for
# P1011 - excluding
# "P1480" - sourcing circumstances

def parse_wikidata_time(time_str, precision):
    """
    Parse a Wikidata time string of the form '+YYYY-MM-DDT00:00:00Z'
    taking into account that month or day can be '00'.
    """
    # Regex that captures +YYYY, MM, DD, HH, mm, ss
    pattern = r'^[\+\-](\d+)-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$'
    match = re.match(pattern, time_str)
    if not match:
        return None
    
    year_str, month_str, day_str, hour_str, minute_str, second_str = match.groups()
    
    year = int(year_str)
    month = int(month_str)
    day = int(day_str)
    hour = int(hour_str)
    minute = int(minute_str)
    second = int(second_str)

    # Wikidata may store '00' for unknown month or day.
    # A common approach is to default them to 1, or you can handle them more gracefully if needed.
    if year == 0:
        year = 1
    if month == 0:
        month = 1
    if day == 0:
        day = 1
    
    # Construct a datetime object
    dt = datetime(year, month, day, hour, minute, second)
    
    # Return both the parsed datetime and the precision
    return dt, precision

# Prepare to save output
output_data = []
# Process the dataset to extract metadata
with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as file:
    for i, line in enumerate(file):
        entity = json.loads(line.strip())
        metadata = {"id": entity.get("id", "Unknown"), "label": entity.get("label"), "labels": entity.get("labels",{}).get("en", {}).get("value", "")}
        
        # Extract metadata fields
        claims = entity.get("claims", {})
        for prop_id, label in METADATA_PROPERTIES.items():
            if prop_id in claims:
                # Extract values and qualifiers for the property
                values = []
                for claim in claims[prop_id]:
                    if "datavalue" in claim.get("mainsnak", {}):
                        value = claim["mainsnak"]["datavalue"]["value"]
                        if label in ["Instance of", "Genre", "Country of origin", "Distribution format", "Narrative location", "Original language of work",
                                        "Based on", "Film editor", "Director of photography", "Composer", "Screenwriter", "Director", "Cast member", "Nominated for",
                                        "Award Received", "Production company", "MPA Film Rating", "Assessment"]:
                            value = value.get("id")
                        if label == "Publication date":
                            dt, _ = parse_wikidata_time(value.get("time", "+1900-01-01T00:00:00Z"), value.get("precision", None))
                            value = dt.isoformat()
                        if label == "Duration":
                            value = value["amount"].strip("+")
                        if label in ["Box office", "Production budget"] and "Q4917" in value.get("unit"):
                            value = value["amount"].strip("+")
                        qualifiers = claim.get("qualifiers", {})
                        qualifier_data = {}
                        for q, qclaims in qualifiers.items():
                            if q in ["P2676","P7367", "P7452", "P2241", "P2719", "P1065", "P282", "P2960", 
                                     "P1107", "P1706", "P2868", "P1411", "P1011", "P642", "P1480"]:
                                continue
                            qualifier_values = []
                            for qclaim in qclaims:
                                if "datavalue" in qclaim:
                                    qval = qclaim["datavalue"]["value"]
                                    if q == "P585":
                                        try:
                                            dt, _ = parse_wikidata_time(qval["time"], qval.get("precision", None))
                                            qualifier_values.append(dt.isoformat())
                                        except:
                                            qualifier_values.append(qval["time"])
                                    elif q in ["P805", "P3005", "P291", "P1346", "P2453", "P793","P9259", "P1013"]:
                                        qualifier_values.append(qval.get("id",""))
                                    else:
                                        qualifier_values.append(qval)
                            try:
                                qualifier_data[property_mapping[q]] = qualifier_values
                            except:
                                print(qualifier_data, q, value)
                                raise
                        if qualifier_data:
                            values.append({"value": value, "qualifiers": qualifier_data})
                        else:
                            values.append(value)
                # Add to metadata
                if values:
                    metadata[label] = values if len(values) > 1 else values[0]
        
        title = metadata["label"] or metadata["labels"]
        if not title:
            if isinstance(metadata.get("Title"), list):
                try: 
                    title = metadata.get("Title",[{"value":{"text":None}}])[0].get("value").get("text") 
                except:
                    pass
                try:
                    title =metadata.get("Title",[{"value":{"text":None}}])[0].get("text")
                except:
                    pass
            elif isinstance(metadata.get("Title"), dict):
                title = metadata.get("Title",[{"text":None}]).get("text")
        metadata["Title"] = title
        metadata.pop("label")
        metadata.pop("labels")
        output_data.append(metadata)  # Save metadata to the list

        # except (json.JSONDecodeError, KeyError):
        #     continue

# Save all extracted metadata to a JSON file
with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
    json.dump(output_data, outfile, indent=4)

print(f"Extracted metadata saved to {OUTPUT_FILE}.")
