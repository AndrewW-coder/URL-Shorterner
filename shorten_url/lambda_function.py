import json
import boto3
import random
import string

dynamodb = boto3.resource('dynamodb') # Python can interact with dynamodb
table = dynamodb.Table('urls')

def generate_code(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

def lambda_handler(event, context): # AWS always calls this exaact function when the lambda is invoked
    body = json.loads(event.get('body', '{}')) # the JSOn the user sends in request
    long_url = body.get('long_url')

    if not long_url:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'long_url is required'})
        }

    short_code = generate_code()

    table.put_item(Item={ # saving the short code and long url in DynamoDB
        'short_code': short_code,
        'long_url': long_url,
        'click_count': 0
    })

    return {
        'statusCode': 200,
        'body': json.dumps({'short_code': short_code})
    }