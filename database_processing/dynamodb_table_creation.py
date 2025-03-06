import pandas as pd
import math
from dateutil.parser import parse
import numpy as np
from dynamodb_manager import DynamoDBManager
from botocore.exceptions import ClientError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

df = pd.read_csv("cleaned_content_data.csv")

db_manager = DynamoDBManager()

def create_table(table_name):
    """
    Creates an Amazon DynamoDB table that can be used to store movie data.
    The table uses the release year of the movie as the partition key and the
    title as the sort key.

    :param table_name: The name of the table to create.
    :return: The newly created table.
    """
    try:
        table = db_manager.dynamodb.create_table(
            TableName='Content',
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
                {"AttributeName":"title","KeyType" : "RANGE"}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id','AttributeType': 'S'},
                {'AttributeName': 'title','AttributeType': 'S'}
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )

        table.wait_until_exists()
        print("Table status:", table.table_status)
    except ClientError as err:
        logger.error(
            "Couldn't create table %s. Here's why: %s: %s",
            table_name,
            err.response["Error"]["Code"],
            err.response["Error"]["Message"],
        )
        raise
    else:
        return table