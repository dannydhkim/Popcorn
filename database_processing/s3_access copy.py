import boto3

import hashlib

def generate_id(title, year):
    unique_string = f"{title}{year}"
    return "TVFILM#" + hashlib.sha256(unique_string.encode()).hexdigest()[:8]  # Short hash for brevity

# Example usage
unique_id = generate_id("Example Movie", "2021")


# Initialize a DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TVandFilm')

{
  "PK": "SHOW#BreakingBad",
  "SK": "METADATA#BreakingBad",
  "Title": "Breaking Bad",
  "Duration": "45 min",
  "Netflix ID": "N123",
  "Genres": ["Action", "Drama"],
  "Actors": ["Bryan Cranston", "Aaron Paul"],
  "Release Year": 2008,
  "Total Episodes": 62
}


response = table.query(
    KeyConditionExpression=boto3.dynamodb.conditions.Key('PK').eq('SHOW#BreakingBad') &
                           boto3.dynamodb.conditions.Key('SK').begins_with('EPISODE#05'),
    FilterExpression="Platform = :platform AND TimeCode = :timecode",
    ExpressionAttributeValues={
        ":platform": "Netflix",
        ":timecode": "00:15:32"
    }
)


# Query to get all items for a specific show
response = table.query(
    KeyConditionExpression=boto3.dynamodb.conditions.Key('PK').eq('SHOW#001')
)

items = response.get('Items', [])

# Use batch_writer to handle deletion of items
with table.batch_writer() as batch:
    for item in items:
        batch.delete_item(
            Key={
                'PK': item['PK'],
                'SK': item['SK']
            }
        )

def batch_write_items(items, table_name):
    table = dynamodb.Table(table_name)
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

# Example data to insert
items = [
    {'id': '001', 'Instance of': 'Movie', 'Title': 'Example Movie', 'Duration': '120', 'Netflix ID': 'NFX100', 'Disney+ movie ID': ['DISN200'], 'Disney+ series ID': 'DISN300', 'Hulu ID': 'HUL400'},
    {'id': '002', 'Instance of': 'Show', 'Title': 'Example Show', 'Duration': '45', 'Netflix ID': 'NFX101', 'Disney+ movie ID': ['DISN201'], 'Disney+ series ID': 'DISN301', 'Hulu ID': 'HUL401'}
]

# Batch write items
batch_write_items(items, 'TVandFilm')


print(f"Deleted {len(items)} items associated with PK SHOW#001")
