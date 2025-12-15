import pandas as pd
import time
from dateutil.parser import parse
import numpy as np
from dynamodb_manager import DynamoDBManager
from botocore.exceptions import ClientError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

content_data = pd.read_csv("cleaned_content_data.csv")

db_manager = DynamoDBManager()


def id_from_row(row):
    title = row['Title']
    pub_date = row['Publication date']
    row['uuid'] = db_manager.generate_id(title, pub_date)
    return row

# Create the TVandFilm table
def create_table(table_name):
    """
    Creates an Amazon DynamoDB table that can be used to store movie data.
    The table uses the release year of the movie as the partition key and the
    title as the sort key.

    :param table_name: The name of the table to create.
    :return: The newly created table.
    """

     # Check if the table exists
    table_list = db_manager.dynamodb_resource.tables.all()
    existing_tables = [table.name for table in table_list]
    print("Tables in DynamoDB:", existing_tables)

    # Check if the table exists and wait until it is completely deleted
    if table_name in existing_tables:
        print(f"Table {table_name} already exists. Attempting to delete...")
        try:
            response = db_manager.dynamodb_resource.Table(table_name).delete()
            print("Delete table initiated:", response)
            # Wait until the table is deleted
            db_manager.dynamodb_resource.Table(table_name).wait_until_not_exists()
            print("Table deleted successfully.")
        except Exception as e:
            print("Error deleting table:", e)
            return
    try:
        response = db_manager.create_table(
            table_name=table_name,
            key_schema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {"AttributeName": "SK", "KeyType": "RANGE"}
            ],
            attribute_definitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            provisioned_throughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print("Table creation response:", response)
    except Exception as e:
        print(f"Failed to create table {table_name}: {e}")

content_data = content_data.apply(lambda x: id_from_row(x), axis=1)
content_data['Title'] = 'SHOWNAME#' + content_data['Title']
content_data = content_data.rename(columns={"id": "wiki_id", "uuid": "PK", "Title": "SK"})

create_table("Content")

db_manager.batch_write("Content", content_data)