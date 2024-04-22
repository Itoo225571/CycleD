from weather_report.weather_report import WeatherReport
from get_location.get_location import Location

from pprint import pprint

if __name__=="__main__":    	
	test_list=["練馬区","東京スカイツリー","国際展示場","海城高校","幕張メッセ"]
	for city in test_list:
		location=Location(city)
		weather=WeatherReport(latitude=location.latitude,longitude=location.longitude)
		print(location)
		# pprint(weather.today)