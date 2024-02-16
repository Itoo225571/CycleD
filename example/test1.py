import requests
geo_request_url = 'https://get.geojs.io/v1/ip/geo.json'
geo_data = requests.get(geo_request_url).json()
print(geo_data['latitude'])
print(geo_data['longitude'])