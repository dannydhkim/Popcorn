import pandas as pd


df = pd.read_json("database_processing/processed_extracted_metadata.json")

initial = df[['id', 'Instance of', 'Title', 'Duration', 'Netflix ID', "Disney+ movie ID", "Disney+ series ID", 'Hulu ID']]

initial['Instance of'] = initial['Instance of'].apply(lambda x: x['value'] if isinstance(x, dict) else x)
initial.loc[initial['Instance of'] == 'Q11424', 'Instance of'] = 'movie'
initial.loc[initial['Instance of'] =='Q15416', 'Instance of'] = 'tv'
initial.loc[~initial['Instance of'].isin(['movie', 'tv']), 'Instance of'] = initial.loc[~initial['Instance of'].isin(['movie', 'tv']), 'Instance of'].apply(lambda x: 'movie' if 'Q11424' in x else x)
initial.loc[~initial['Instance of'].isin(['movie', 'tv']), 'Instance of'] = initial.loc[~initial['Instance of'].isin(['movie', 'tv']), 'Instance of'].apply(lambda x: 'tv' if 'Q15416' in x else x)


def clean_instance(row):
    value = row['Instance of']
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
    results = []
    if isinstance(value, str):
        if value == 'Q11424':
            return 'movie'
        elif value == 'Q15416':
            return 'tv'
        else:
            return value
    elif isinstance(value, dict):
        if value.get('value') == 'Q11424':
            return 'movie'
        elif value.get('value') == 'Q15416':
            return 'tv'
        else:
            return value
    # Case 1: 'value' is a list.
    if isinstance(value, list):
        # Check if the list elements are dictionaries (i.e. structured with qualifiers).
        if all(isinstance(item, dict) for item in value):
            for item in value:
                item_value = item.get('value')
                if item_value == 'Q11424':
                    results.append('movie')
                elif item_value == 'Q15416':
                    results.append('tv')
                else:
                    results.append(item)
        elif any(isinstance(item, dict) for item in value):
            for item in value:
                try:
                    item_value = item.get('value')
                    if item_value == 'Q11424':
                        results.append('movie')
                    elif item_value == 'Q15416':
                        results.append('tv')
                    else:
                        results.append(item)
                except:
                    for item in value:
                        if item == 'Q11424':
                            results.append('movie')
                        elif item == 'Q15416':
                            results.append('tv')
                        else:
                            results.append(item)
        else:
            for item in value:
                if item == 'Q11424':
                    results.append('movie')
                elif item == 'Q15416':
                    results.append('tv')
                else:
                    results.append(item)
    if 'movie' in results:
        return 'movie'
    elif 'tv' in results:
        return 'tv'
    else:
        return value
    
initial.loc[~initial['Instance of'].isin(['movie', 'tv'])].apply(clean_instance, axis=1)


import numpy as np
import math

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
    
initial = initial.loc[(initial['Title'] != '')]
initial['Duration'] = initial['Duration'].apply(clean_duration)

def check_for_list_or_dict(row):
    if isinstance(row, (int, float)):
        return False
    for item in row:
        if isinstance(item, list) or isinstance(item, dict):
            return True
    return False

#Specific Netflix IDs to fix:
problematic_netflix_ids = ('Q289127', 'Q21001674', 'Q320588', 'Q13897247', 'Q20495759')
problematic_netflix_ids = initial.loc[initial['Netflix ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_disney_movie_ids = initial.loc[initial['Disney+ movie ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_disney_series_ids = initial.loc[initial['Disney+ series ID'].apply(check_for_list_or_dict)]['id'].tolist()
problematic_hulu_ids = initial.loc[initial['Hulu ID'].apply(check_for_list_or_dict)]['id'].tolist()


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


initial.loc[initial['id'].isin(problematic_netflix_ids), 'Netflix ID'] = \
    initial.loc[initial['id'].isin(problematic_netflix_ids), 'Netflix ID'].apply(flatten_list)

initial.loc[initial['id'].isin(problematic_disney_movie_ids), 'Disney+ movie ID'] = \
    initial.loc[initial['id'].isin(problematic_disney_movie_ids), 'Disney+ movie ID'].apply(flatten_list)


print(df.loc[df['id']=='Q85518571'])
# print(initial.loc[initial[['Netflix ID', 'Disney+ movie ID', 'Disney+ series ID', 'Hulu ID']].notnull().any(axis=1)])