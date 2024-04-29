from weather_report.weather_report import WeatherReport
from get_location.get_location import Location

import requests

from pprint import pprint

def is_empty(target_dict):
	for value in target_dict.values():
		if value is not None:
			if isinstance(value,dict):
				if not is_empty(value):
					return False
			else:
				return False
	return True


if __name__=="__main__":
	name = "新宿"

	url = f"https://map.yahooapis.jp/geocode/V1/geoCoder"