import requests
import geocoder.osm

import urllib.parse
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

class WeatherReport:
	def __init__(self,*args):
		if len(args)==2 and isinstance(args[0],(float,int)) and isinstance(args[1],(float,int)):
			latitude,longtitude=args
			location_name=None
		elif len(args)==1 and isinstance(args[0],str):
			location_name=args[0]
			ret=geocoder.osm(location_name,timeout=5.0)
			latitude,longtitude=ret.latlng
		else:
			raise ValueError("Invalid arguments")

		self.location_name=location_name
		self.params={
			"latitude": latitude,
			"longitude": longtitude,
			"current": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation", "weather_code", "wind_speed_10m", "wind_direction_10m"],
			"hourly": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation_probability", "weather_code", "wind_speed_10m", "wind_direction_10m",],
			"daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset", "precipitation_probability_max",],
			"timezone": "Asia/Tokyo"
			}

		params_url=urllib.parse.urlencode(self.params,True)
		url = f"https://api.open-meteo.com/v1/forecast?{params_url}"
		response = requests.get(url,timeout=3.5)
		self.data=response.json()
		
		self.data["hourly"]["time"]=self.decode_time(self.data["hourly"]["time"])
		self.data["daily"]["time"]=self.decode_time(self.data["daily"]["time"])
		self.data["current"]["time"]=self.decode_time(self.data["current"]["time"])

		self.data["hourly"]["weather"]=self.decode_weather_category(self.data["hourly"]["weather_code"])
		self.data["daily"]["weather"]=self.decode_weather_category(self.data["daily"]["weather_code"])
		self.data["current"]["weather"]=self.decode_weather_category(self.data["current"]["weather_code"])

		self.data["hourly"]["wind_direction_10m_ja"]=self.en_to_ja_direction(self.data["hourly"]["wind_direction_10m"])
		self.data["current"]["wind_direction_10m_ja"]=self.en_to_ja_direction(self.data["current"]["wind_direction_10m"])

		self.df_hourly = pd.DataFrame(index=self.data["hourly"]["time"],data=self.data["hourly"])
		self.df_daily = pd.DataFrame(index=self.data["daily"]["time"],data=self.data["daily"])
		self.df_current=pd.DataFrame(index=[self.data["current"]["time"]],data=self.data["current"])

	"""__コード解読用メソッド__"""
	def decode_weather_category(self,codes):
		weather_categories = {
        0: "Clear",
        1: "Cloudy",
        2: "Cloudy",
        3: "Cloudy",
        40: "Mist",
        41: "Mist",
        42: "Mist",
        43: "Mist",
        44: "Mist",
        45: "Mist",
        46: "Mist",
        47: "Mist",
        48: "Mist",
        49: "Mist",
        50: "Light Rain",
        51: "Light Rain",
        52: "Light Rain",
        53: "Light Rain",
        54: "Light Rain",
        55: "Light Rain",
        56: "Light Rain",
        57: "Light Rain",
        58: "Light Rain",
        59: "Light Rain",
        60: "Rain",
        61: "Rain",
        62: "Rain",
        63: "Rain",
        64: "Rain",
        65: "Rain",
        66: "Rain",
        67: "Rain",
        68: "Rain",
        69: "Rain",
        70: "Snow",
        71: "Snow",
        72: "Snow",
        73: "Snow",
        74: "Snow",
        75: "Snow",
        76: "Snow",
        77: "Snow",
        78: "Snow",
        79: "Snow",
        80: "Showers",
        81: "Showers",
        82: "Showers",
        83: "Showers",
        84: "Showers",
        85: "Snow Showers",
        86: "Snow Showers",
        87: "Snow Showers",
        88: "Snow Showers",
        89: "Snow Showers",
        90: "Thunderstorm",
        91: "Thunderstorm",
        92: "Thunderstorm",
        93: "Thunderstorm",
        94: "Thunderstorm",
        95: "Thunderstorm",
        96: "Thunderstorm",
        97: "Thunderstorm",
        98: "Thunderstorm",
        99: "Thunderstorm"
    }
		new_codes=[]
		if isinstance(codes, list):
			for code in codes:
				new_codes.append(weather_categories.get(code, None))
		elif isinstance(codes, int):
			return weather_categories.get(codes, None)
		return new_codes
	
	def decode_time(self,times):
		new_times=[]
		if isinstance(times,list):
			for time in times:
				if "T" in time:
					new_times.append(datetime.strptime(time, "%Y-%m-%dT%H:%M"))
				else:
					new_times.append(datetime.strptime(time, "%Y-%m-%d"))
		elif isinstance(times,str):
			if "T" in times:
				return datetime.strptime(times, "%Y-%m-%dT%H:%M")
			else:
				return datetime.strptime(times, "%Y-%m-%d")
		return new_times
	
	"""__翻訳用__"""
	def en_to_ja_weather(self,weather):
		weather_dict = {
		"Clear": "晴れ",
		"Cloudy": "曇り",
		"Mist": "霧",
		"Light Rain": "小雨",
		"Rain": "雨",
		"Snow": "雪",
		"Showers": "時々雨",
		"Snow Showers": "時々雪",
		"Thunderstorm": "雷"
		}
		new_weathers=[]
		if isinstance(weather,list):
			new_weathers.append(weather_dict.get(weather,None))
		elif isinstance(weather,str):
			return weather_dict.get(weather, None)
		return new_weathers
	
	def en_to_ja_direction(self,azimuth):
		# 16方位の方角を定義する
		directions = ['北', '北北東','北東', '東北東',
					'東', '東南東', '南東', '南南東',
					'南', '南南西', '南西', '西南西',
					'西', '西北西', '北西', '北北西',
					'北'
					]
		# Decimalモジュールで小数第一位を四捨五入
		dirs=[]
		if isinstance(azimuth,list):
			for azi in azimuth:
				directions_index = Decimal(azi / 22.5).quantize(Decimal('1.'), rounding=ROUND_HALF_UP)
				dirs.append(directions[int(directions_index)])
		elif isinstance(azimuth,int):
			directions_index = Decimal(azimuth / 22.5).quantize(Decimal('1.'), rounding=ROUND_HALF_UP)
			return directions[int(directions_index)]
		return dirs

	"""__デバッグ用__"""
	def to_csv(self):
		self.df_hourly.to_csv(str(self.location_name)+"_hourly.csv")
		self.df_daily.to_csv(str(self.location_name)+"_daily.csv")
		self.df_current.to_csv(str(self.location_name)+"_current.csv")
		
	
if __name__=="__main__":
	# w=WeatherReport(35.72475432967049,139.58134714317478)
	w=WeatherReport("関町東")
	w.to_csv()