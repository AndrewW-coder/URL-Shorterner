import json
import boto3
import uuid
import urllib.request
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
urls_table = dynamodb.Table('urls')
clicks_table = dynamodb.Table('clicks')

def get_geo(ip):
    try:
        url = f"http://ip-api.com/json/{ip}"
        with urllib.request.urlopen(url, timeout=2) as r: # Pytyhon built-in HTTP client - calls ip-api.com, timeout to avoid hanging if API is slow
            data = json.loads(r.read())
        if data.get('status') == 'success':
            return data.get('country', 'Unknown'), data.get('city', 'Unknown')
    except Exception:
        pass
    return 'Unknown', 'Unknown'

def get_device(user_agent):
    ua = (user_agent or '').lower()
    if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
        return 'Mobile'
    if 'tablet' in ua or 'ipad' in ua:
        return 'Tablet'
    return 'Desktop'

def get_browser(user_agent):
    ua = (user_agent or '').lower()
    for browser in ['chrome', 'firefox', 'safari', 'edge', 'opera']:
        if browser in ua:
            return browser.capitalize()
    return 'Other'

def lambda_handler(event, context):
    short_code = event['pathParameters']['code']
    headers = event.get('headers', {})

    # AWS_Proxy integration packages entire HTTP request into event object our lambda receives
    # include metadata from request itself stored under requestContext
    # sourceIP is IP address of client making the request
    
    ip = event.get('requestContext', {}).get('http', {}).get('sourceIp', '0.0.0.0') # visitors real IP address from API Gateway
    user_agent = headers.get('user-agent', '') # string the browser sends to identify itself

    response = urls_table.get_item(Key={'short_code': short_code})
    item = response.get('Item')

    if not item:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Short URL not found'})
        }

    country, city = get_geo(ip)
    device = get_device(user_agent)
    browser = get_browser(user_agent)

    clicks_table.put_item(Item={
        'click_id':   str(uuid.uuid4()), # unique ID for each click
        'short_code': short_code,
        'timestamp':  datetime.now(timezone.utc).isoformat(),
        'country':    country,
        'city':       city,
        'device':     device,
        'browser':    browser
    })

    urls_table.update_item(
        Key={'short_code': short_code},
        UpdateExpression='ADD click_count :inc',
        ExpressionAttributeValues={':inc': 1}
    )

    return {
        'statusCode': 301,
        'headers': {'Location': item['long_url']},
        'body': ''
    }