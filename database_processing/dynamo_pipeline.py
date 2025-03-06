import pandas as pd
import math
from dateutil.parser import parse
import numpy as np
from dynamodb_manager import DynamoDBManager
from botocore.exceptions import ClientError
import logging

def pipeline(csv_file, table_name):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger()

    df = pd.read_csv(csv_file)
    df = df.rename(columns={'id':'wiki_id', 'uuid':'id','Instance of': 'content_type', 'Title':'title','Duration':'duration','Publication date':'publication_date', 
                        'Genre':'genre','Hulu ID': 'hulu_id', 'Netflix ID':'netflix_id', 'Disney+ movie ID': 'disney_movie_id', 'Disney+ series ID': 'disney_series_id'})

    for col in df.columns:
        if col != 'duration' and col != 'genre':
            df[col] = df[col].astype(str)
    print(df.dtypes)
    db_manager = DynamoDBManager()

    db_manager.set_table(table_name)

    db_manager.batch_write(df)

if __name__ == "__main__":
    csv_file = "cleaned_content_data.csv"
    pipeline(csv_file, 'Content')