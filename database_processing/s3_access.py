import boto3
from botocore.exceptions import NoCredentialsError, ClientError

class S3Client:
    def __init__(self, bucket_name, profile_name=None):
        # If a profile name is specified, use that profile
        session = boto3.Session(profile_name=profile_name) if profile_name else boto3.Session()
        self.s3 = session.client('s3')
        self.bucket_name = bucket_name

    def download_file(self, s3_key, local_path):
        try:
            self.s3.download_file(self.bucket_name, s3_key, local_path)
            print(f"Downloaded {s3_key} to {local_path}")
        except NoCredentialsError:
            print("Credentials not available")
        except ClientError as e:
            # Check if the error was due to an HTTP 404 (file not found) or 403 (access denied)
            if e.response['Error']['Code'] == '404':
                print("The file was not found.")
            elif e.response['Error']['Code'] == '403':
                print("Access denied.")
            else:
                print(f"Failed to download file: {e.response['Error']['Message']}")
        except Exception as e:
            print(f"An error occurred: {str(e)}")

# Usage example
if __name__ == "__main__":
    s3_client = S3Client('popcorn-movie-database-dev', 'popcorn_dev')
    s3_client.download_file('processed_extracted_metadata.json', 'processed_extracted_metadata.json')
