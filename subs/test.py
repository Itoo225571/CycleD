from weather_report.weather_report import WeatherReport
from get_location.get_location import Location

import requests

from pprint import pprint

if __name__=="__main__":    	
	# test_list=["練馬区","東京スカイツリー","国際展示場","海城高校","幕張メッセ"]
	# for city in test_list:
	# 	location=Location(city)
	# 	weather=WeatherReport(latitude=location.latitude,longitude=location.longitude)
	# 	print(location)
		# pprint(weather.today)
	keys=["name","lat","lon","address"]
	dict1=dict.fromkeys(["name","lat","lon","address"])
	dict2={
		"name":"阿佐ヶ谷",
		"format":"json"
	}
	lat,lon=[43.062087 , 141.354404]
	params={
		"lat":lat,
		"lon":lon,
		"format":"geocodejson",
		"addressdetails":1,
	}
	url = f"https://nominatim.openstreetmap.org/reverse"
	res = requests.get(url=url,params=params)

	pprint(res.json())