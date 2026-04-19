import json
import boto3
from collections import Counter

dynamodb = boto3.resource('dynamodb')
clicks_table = dynamodb.Table('clicks')
urls_table   = dynamodb.Table('urls')

def lambda_handler(event, context):
    params = event.get('queryStringParameters') or {} # query string parameters takes anything after ? in url, e.g. /stats?code=abc123, {} acts as default value if there is none
    short_code = params.get('code') # if there is a code parameter we set it else its None, which means we will get stats for all urls

    # scan reads every item and without scan_kwargs it returns everything, with it we can filter by short_code if provided, otherwise we get stats for all urls
    scan_kwargs = {} 
    if short_code: # if there is a short_code we want to filter the clicks by that code, otherwise we want to get all clicks
        scan_kwargs = {
            'FilterExpression': 'short_code = :sc',
            'ExpressionAttributeValues': {':sc': short_code}
        }

    items = clicks_table.scan(**scan_kwargs).get('Items', []) # scan returns a dict with 'Items' key that contains the list of items, if there are no items we return an empty list as default value

    # we use Counter to count the occurrences of each country, device and browser in the clicks, we use get method to get the value of the key and if it doesn't exist we return 'Unknown' as default value
    countries = Counter(i.get('country', 'Unknown') for i in items)
    devices   = Counter(i.get('device',  'Unknown') for i in items)
    browsers  = Counter(i.get('browser', 'Unknown') for i in items)

    # scans urls table to get every short url with long url and click count in descending order, if click field doesnt exist we return 0 as default
    urls = urls_table.scan().get('Items', [])
    url_list = sorted([
        {'short_code': u['short_code'],
         'long_url':   u['long_url'],
         'clicks':     int(u.get('click_count', 0))}
        for u in urls
    ], key=lambda x: x['clicks'], reverse=True)

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' # allows any webpage from any domain to access this API
        },
        'body': json.dumps({
            'total_clicks':  len(items),
            'top_countries': dict(countries.most_common(5)),
            'devices':       dict(devices),
            'browsers':      dict(browsers),
            'top_urls':      url_list[:10]
        })
    }