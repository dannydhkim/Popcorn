import pandas as pd
import math
from dateutil.parser import parse
import numpy as np


df = pd.read_json("database_processing/processed_extracted_metadata.json")

initial = df[['id', 'Instance of', 'Title', 'Genre', 'Duration', 'Publication date', 'Netflix ID', "Disney+ movie ID", "Disney+ series ID", 'Hulu ID']]

instance_mapping = {
    'Q11424':'movie', 
    'Q226730':'movie', 
    'Q202866':'movie',
    'Q24856':'movie',
    'Q56884562':'movie',
    'Q13593818':'movie',
    'Q12912091':'movie',
    'Q127402430':'movie',
    'Q67655225':'movie',
    'Q20442589':'movie',
    'Q98807719':'tv_film', 
    'Q506240':'tv_film',
    'Q29168811':'tv_film',
    'Q24862':'short_film', 
    'Q17517379':'short_film',
    'Q7751682':'short_film',
    'Q20667187':'short_film',
    'Q113791292':'short_film',
    'Q104771028':'short_film',
    'Q3585697':'short_film',
    'Q123995800':'short_film',
    'Q15416':'tv',
    'Q5398426':'tv',
    'Q36103':'tv',
    'Q17317604':'tv',
    'Q59284':'tv',
    'Q117467246':'tv',
    'Q21191270':'tv',
    'Q1261214':'tv',
    'Q59759':'tv',
    'Q18536800':'tv',
    'Q123126551':'tv',
    'Q1259759':'tv',
    'Q61220733':'tv',
    'Q526877':'tv',
    'Q653916':'tv',
    'Q7697093':'tv',
    'Q399811':'tv',
    'Q3464665':'tv',
    'Q98701476':'tv',
    'Q35516':'tv',
    'Q868250':'tv',
    'Q21156425':'tv',
    'Q1044551':'tv',
    'Q278329':'tv',
    'Q3564871':'tv', 
    'Q116048824':'tv',
    'Q1050739':'tv',
    'Q21664088':'tv',
    'Q1407245':'tv',
    'Q7696995':'tv',
    'Q24855895':'tv',
    'Q14346334':'tv',
    'Q597009':'tv',
    'Q1348595':'tv',
    'Q21010853':'tv',
    'Q1363997':'tv',
    'Q28225717':'tv',
    'Q196600':'tv',
    'Q122914758':'tv',
    'Q336181':'tv',
    'Q28195059':'tv',
    'Q98526239':'tv',
    'Q3421644':'tv',
    'Q182415':'tv',
    'Q581714':'tv',
    'Q1658957':'tv',
    'Q25360500':'tv',
    'Q125359117':'tv',
    'Q113687694': 'anime', 
    'Q63952888': 'anime', 
    'Q21198342': 'anime', 
    'Q20650540': 'anime',
    'Q220898': 'anime',
    'Q113671041':'anime',
    'Q104775758':'anime',
    'Q1047299':'anime',
    'Q100269041':'anime',
    'Q117209498':'anime',
    'Q117467240':'anime',
    'Q1107':'anime',
    'Q11086742':'anime',
    'Q30935481':'anime',
    'Q29982285':'anime',
    'Q7889': 'other', 
    'Q10590726': 'other', 
    'Q14406742': 'other', 
    'Q18011171': 'other',
    'Q18011172': 'other',
    'Q482994': 'other',
    'Q193977': 'other',
    'Q7725634':'other',
    'Q1656682':'other',
    'Q58483083':'other',
    'Q25379':'other',
    'Q7777570':'other',
    'Q98069877':'other',
    'Q1635956':'other',
    'Q2301591':'other',
    'Q18956797':'other',
    'Q182832':'other',
    'Q47461344':'other',
    'Q13406463':'other',
    'Q110879246':'other',
    'Q47544035':'other',
    'Q34508':'other',
    'Q13406554':'other',
    'Q18608583':'other',
    'Q64100970':'other',
    'Q1144661':'other',
    'Q134556':'other',
    'Q11664270':'other',
    'Q2431196':'other',
    'Q4886':'other',
    'Q17537576':'other',
    'Q3495514':'other',
    'Q59126':'other',
    'Q17558136':'youtube',
    'Q145806':'live',
    'Q16510064':'live',
    'Q35140':'live',
    'Q130192067':'live',
    'Q11483816':'live',
    'Q27889498':'live',
    'Q107655869':'live',
    'Q4504495':'live',
    'Q4164344': 'documentary',
    'Q93204': 'documentary',
    'Q7603925':'documentary',
    'Q27868077':'documentary'
}

hierarchy = ['anime', 'documentary', 'short_film','tv_film', 'live', 'movie', 'tv', 'youtube','other']

def clean_instance(value, instance_mapping):
    """
    Select the best duration value from the input data.
    
    The function supports different data types:
      - If 'value' is a list of dicts (each with a 'value' and optional 'qualifiers'),
        it picks the candidate with the highest priority.
      - If 'value' is a list of plain numeric (or string convertible) values,
        it converts them and returns the minimum.
      - If 'value' is a numeric or string, it converts it appropriately.
    
    Returns:
      A rounded numeric duration (an int) or None if conversion fails.
    """
    if isinstance(value, str):
          return instance_mapping.get(value, value)
    elif isinstance(value, dict):
        inner_value = value.get('value')
        if inner_value is not None:
            return instance_mapping.get(inner_value, value)
        return value
    if isinstance(value, list):
        # Recursively map each item in the list.
        mapped_items = [clean_instance(item, instance_mapping) for item in value]
        # After mapping, if any of the instance_mapping keys appear in the results, return the key.
          
        for key in hierarchy:
            if key in mapped_items:
                return key
        # Otherwise, return the list (or value) as-is.
        return value

    # Fallback for other types.
    return value


def clean_pub_date(value, date_format='mixed', dayfirst=False):
    def format_date(dt):
        # If the parsed date is the "unknown" value, return None.
        if dt.year == 1 and dt.month == 1 and dt.day == 1:
            return None
        return dt.date().isoformat()
    
    # Handle NaN values.
    if isinstance(value, float) and math.isnan(value):
        return None
    
    # Process strings.
    if isinstance(value, str):
        try:
            if date_format != 'mixed':
                dt = pd.to_datetime(value, format=date_format, dayfirst=dayfirst, errors='raise')
            else:
                dt = pd.to_datetime(value, dayfirst=dayfirst, errors='raise')
            formatted = format_date(dt)
            if formatted is None:
                return None
            return formatted
        except pd.errors.OutOfBoundsDatetime:
            try:
                dt = parse(value, dayfirst=dayfirst)
                formatted = format_date(dt)
                if formatted is None:
                    return None
                return formatted
            except Exception:
                return value
        except Exception:
            try:
                dt = parse(value, dayfirst=dayfirst)
                formatted = format_date(dt)
                if formatted is None:
                    return None
                return formatted
            except Exception:
                return value
    
    # Process dictionaries.
    if isinstance(value, dict):
        inner_value = value.get('value')
        if inner_value is not None:
            return clean_pub_date(inner_value, date_format=date_format, dayfirst=dayfirst)
        return None
    
    # Process lists.
    if isinstance(value, list):
        cleaned = [clean_pub_date(item, date_format=date_format, dayfirst=dayfirst) for item in value]
        # Remove any None values.
        cleaned = [c for c in cleaned if c is not None]
        if not cleaned:
            return None
        if len(cleaned) == 1:
            return cleaned[0]
        try:
            # Convert each cleaned date string to a datetime object.
            dates = [pd.to_datetime(d, dayfirst=dayfirst, errors='coerce') for d in cleaned]
            # Filter out any dates that are NaT or equal to 0001-01-01.
            dates = [d for d in dates if d is not pd.NaT and d is not None and not (d.year == 1 and d.month == 1 and d.day == 1)]
            if not dates:
                return cleaned[0]
            earliest = min(dates)
            return earliest.date().isoformat()
        except Exception:
            return cleaned[0]
    
    # Fallback for other types.
    return value
    
def check_for_list_or_dict(row):
    if isinstance(row, (int, float)):
        return False
    for item in row:
        if isinstance(item, list) or isinstance(item, dict):
            return True
    return False

def is_non_scalar(value):
    return isinstance(value, (list, dict, set, tuple, np.ndarray))

def get_candidate_priority(candidate):
    """
    Determine the candidate's priority based on its qualifiers.
    Lower numbers indicate higher priority.
    
    Priority rules:
      1. If the candidate's 'applies to part' qualifier has id 'Q26225765', return priority 1.
      2. Else if the candidate's 'place of publication' qualifier equals ['Q30'], return priority 2.
      3. Otherwise, return priority 3.
    """
    qualifiers = candidate.get('qualifiers', {})
    # Highest priority: "applies to part" equals Q26225765
    applies_to = qualifiers.get('applies to part')
    if isinstance(applies_to, list) and applies_to:
        # Check the first (or any) candidate; adjust if multiple values need to be considered.
        if isinstance(applies_to[0], dict) and applies_to[0].get('id') == 'Q26225765':
            return 1
    # Next priority: "place of publication" equals ['Q30']
    pop = qualifiers.get('place of publication')
    if isinstance(pop, list) and pop == ['Q30']:
        return 2
    # Lower priority for any candidate that doesn’t match the above.
    return 3

def clean_duration(value):
    """
    Select the best duration value from the input data.
    
    The function supports different data types:
      - If 'value' is a list of dicts (each with a 'value' and optional 'qualifiers'),
        it picks the candidate with the highest priority.
      - If 'value' is a list of plain numeric (or string convertible) values,
        it converts them and returns the minimum.
      - If 'value' is a numeric or string, it converts it appropriately.
    
    Returns:
      A rounded numeric duration (an int) or None if conversion fails.
    """
    # Case 1: 'value' is a list.
    if isinstance(value, list):
        # Check if the list elements are dictionaries (i.e. structured with qualifiers).
        if all(isinstance(item, dict) for item in value):
            # Filter out candidates that have a 'value' key.
            candidates = [item for item in value if 'value' in item]
            if not candidates:
                return None
            # Assign a priority to each candidate.
            candidates_with_priority = [
                (get_candidate_priority(candidate), candidate) for candidate in candidates
            ]
            # Sort by priority (lowest number is highest priority).
            candidates_with_priority.sort(key=lambda x: x[0])
            chosen_candidate = candidates_with_priority[0][1]
            chosen_value = chosen_candidate.get('value')
            try:
                # Convert the chosen value to float and round it.
                return round(float(chosen_value))
            except (ValueError, TypeError):
                return None
        else:
            # Otherwise, assume the list contains plain numeric or string values.
            numeric_candidates = []
            for item in value:
                try:
                    numeric_candidates.append(float(item))
                except (ValueError, TypeError):
                    continue
            if numeric_candidates:
                # Here you might choose the minimum (or maximum) duration.
                return round(min(numeric_candidates))
            else:
                return None

    # Case 2: 'value' is a numeric type.
    elif isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        try:
            return round(float(value))
        except (ValueError, TypeError):
            return None

    # Case 3: 'value' is a string.
    elif isinstance(value, str):
        try:
            return round(float(value))
        except ValueError:
            return None

    # Fallback: unrecognized type.
    else:
        return None
    
def flatten_list(value):
    row = []
    if isinstance(value, list):
        for val in value:
            if isinstance(val, dict):
                row.append(val['value'])
            else:
                row.append(val)
        return row
    return value

def flatten_dict(value):
    row = []
    if isinstance(value, list):
        for val in value:
            if isinstance(val, dict):
                row.append(val['value'])
            else:
                row.append(val)
        return row
    return value
    
initial["Instance of"] = initial.loc[~initial["Instance of"].isin(['Q5']),'Instance of']
initial["Instance of"] = initial.loc[initial["Instance of"].notnull(),'Instance of']
initial["Instance of"] = initial["Instance of"].apply(lambda x: clean_instance(x, instance_mapping))
instance_keys = list(set(instance_mapping.values()))
initial.loc[(~initial['Instance of'].isin(instance_keys)) & (~initial['Instance of'].apply(lambda x: isinstance(x, (list, dict))))]['Instance of'].value_counts()
initial.loc[initial['id']=='Q50691801', 'Instance of'] = 'tv'
initial.loc[initial['id']=='Q104869375', 'Instance of'] = 'tv'
initial.loc[initial['id']=='Q50697929', 'Instance of'] = 'other'
initial.loc[initial['id']=='Q65045161', 'Instance of'] = 'anime'
initial['Instance of'] = initial['Instance of'].dropna()

initial = initial.dropna(how='all', subset=['Instance of', 'Genre','Duration'])
initial = initial.loc[(initial['Instance of'].isin(instance_keys)) & (initial[['Netflix ID', 'Disney+ movie ID', 'Disney+ series ID', 'Hulu ID']].notnull().any(axis=1))]

initial['Publication date'] = initial['Publication date'].apply(clean_pub_date)
initial['Publication date'] = pd.to_datetime(initial['Publication date'])
    
initial = initial.loc[(initial['Title'] != '')]
initial['Duration'] = initial['Duration'].apply(clean_duration)

#Specific Netflix IDs to fix:
problematic_netflix_ids = ('Q289127', 'Q21001674', 'Q320588', 'Q13897247', 'Q20495759')
problematic_netflix_ids = initial.loc[initial['Netflix ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_disney_movie_ids = initial.loc[initial['Disney+ movie ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_disney_series_ids = initial.loc[initial['Disney+ series ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_hulu_ids = initial.loc[initial['Hulu ID'].apply(check_for_list_or_dict)]['id'].tolist()


initial.loc[initial['id'].isin(problematic_netflix_ids), 'Netflix ID'] = \
    initial.loc[initial['id'].isin(problematic_netflix_ids), 'Netflix ID'].apply(flatten_list)

initial.loc[initial['id'].isin(problematic_disney_movie_ids), 'Disney+ movie ID'] = \
    initial.loc[initial['id'].isin(problematic_disney_movie_ids), 'Disney+ movie ID'].apply(flatten_list)

initial.to_csv('cleaned_content_data.csv', index=False)