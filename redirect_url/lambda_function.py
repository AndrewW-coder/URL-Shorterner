import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('urls')

def lambda_handler(event, context):
    short_code = event['pathParameters']['code']    # the short code from the URL path, e.g., /abc123 -> abc123

    response = table.get_item( # fetching the long URL from DynamoDB using the short code
        Key={'short_code': short_code}
    )

    item = response.get('Item')

    if not item:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Short URL not found'})
        }

    table.update_item( # incrementing the click count for analytics
        Key={'short_code': short_code},
        UpdateExpression='ADD click_count :inc',
        ExpressionAttributeValues={':inc': 1}
    )

    return {
        'statusCode': 301, # HTTP status code for redirection
        'headers': {'Location': item['long_url']},
        'body': ''
    }