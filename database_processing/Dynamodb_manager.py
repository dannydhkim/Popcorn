import boto3
from boto3.dynamodb.conditions import Key
import hashlib
from decimal import Decimal

class DynamoDBManager:
    def __init__(self, region_name='us-west-1'):
        self.session = boto3.Session(profile_name='popcorn_dev', region_name=region_name)
        self.dynamodb_resource = self.session.resource('dynamodb')
        self.table = None
        
    def set_table(self, table_name):
        self.table = self.dynamodb_resource.Table(table_name)

    def write_item(self, item):
        """
        Write an item to the DynamoDB table.
        """
        self._convert_floats_to_decimals(item)
        response = self.table.put_item(Item=item)
        return response
    
    def _convert_floats_to_decimals(self, item):
        """
        Recursively convert all floats in a dictionary to decimals.
        """
        for key, value in item.items():
            if isinstance(value, float):
                item[key] = Decimal(str(value))
            elif isinstance(value, dict):
                self._convert_floats_to_decimals(value)
            elif isinstance(value, list):
                item[key] = [Decimal(str(v)) if isinstance(v, float) else self._convert_floats_to_decimals(v) if isinstance(v, dict) else v for v in value]

    def get_item(self, key):
        """
        Get an item from the DynamoDB table.
        """
        response = self.table.get_item(Key=key)
        return response.get('Item')

    def update_item(self, key, update_expression, expression_attributes):
        """
        Update an item in the DynamoDB table.
        """
        response = self.table.update_item(
            Key=key,
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attributes,
            ReturnValues="UPDATED_NEW"
        )
        return response

    def delete_item(self, key):
        """
        Delete an item from the DynamoDB table.
        """
        response = self.table.delete_item(Key=key)
        return response
    
    def batch_write(self, table_name, dataframe):
        dynamodb = boto3.resource('dynamodb', region_name='us-west-1')
        table = dynamodb.Table(table_name)
        with table.batch_writer() as batch:
            for index, row in dataframe.iterrows():
                row_dict = row.to_dict()
            # Apply existing conversion utility
                self._convert_floats_to_decimals(row_dict)
                batch.put_item(Item=row_dict)

    def generate_id(self, title, year):
        unique_string = f"{title}{year}"
        return "CONTENT#" + hashlib.sha256(unique_string.encode()).hexdigest()[:8]
    
    def create_table(self, table_name, key_schema, attribute_definitions, provisioned_throughput):
        """
        Create a new DynamoDB table.
        """
        try:
            response = self.dynamodb_resource.create_table(
                TableName=table_name,
                KeySchema=key_schema,
                AttributeDefinitions=attribute_definitions,
                ProvisionedThroughput=provisioned_throughput
            )
            # Wait until the table exists and is ready for use
            table = self.dynamodb_resource.Table(table_name)
            table.wait_until_exists()
            print(f"Table {table_name} created successfully and is ready for use.")
            return response
        except Exception as e:
            print(f"Failed to create table {table_name}: {e}")
            return None
