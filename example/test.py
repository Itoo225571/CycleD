import requests
geo_request_url = 'https://get.geojs.io/v1/ip/geo.json'
data = requests.get(geo_request_url).json()
print(data['latitude'])
print(data['longitude'])
print(data['country'])
print(data['city'])