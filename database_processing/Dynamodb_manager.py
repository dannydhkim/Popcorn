import boto3
from boto3.dynamodb.conditions import Key

class DynamoDBManager:
    def __init__(self, table_name, region_name='us-west-2'):
        session = boto3.Session(profile_name=profile_name) if profile_name else boto3.Session()
        self.dynamodb = boto3.resource('dynamodb', region_name=region_name)
        self.table = self.dynamodb.Table(table_name)

    def write_item(self, item):
        """
        Write an item to the DynamoDB table.
        """
        response = self.table.put_item(Item=item)
        return response

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
    
    def batch_write(table_name, dataframe):
        dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
        table = dynamodb.Table(table_name)
        with table.batch_writer() as batch:
            for index, row in dataframe.iterrows():
                batch.put_item(Item=row.to_dict())
