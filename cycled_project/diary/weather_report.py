import requests

from pprint import pprint
import urllib.parse
import pandas as pd

import weather_category

class WeatherReport:
	def __init__(self,latitude,longtitude):
		self.params={
			"latitude": latitude,
			"longitude": longtitude,
			"current": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation", "weather_code", "wind_speed_10m", "wind_direction_10m"],
			"hourly": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation_probability", "weather_code", "wind_speed_10m", "wind_direction_10m"],
			"daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset", "precipitation_probability_max"],
			"timezone": "Asia/Tokyo"
			}

		params_url=urllib.parse.urlencode(self.params,True)
		url = f"https://api.open-meteo.com/v1/forecast?{params_url}"
		response = requests.get(url)
		self.data=response.json()

		self.data["hourly"]["time"] = [item.replace("T", " ") for item in self.data["hourly"]["time"]]
		self.data["daily"]["time"] = [item.replace("T", " ") for item in self.data["daily"]["time"]]
		self.data["current"]["time"] = self.data["current"]["time"].replace("T", " ")

		self.data["hourly"]["weather_code"]=weather_category.decode(self.data["hourly"]["weather_code"])
		self.data["daily"]["weather_code"]=weather_category.decode(self.data["daily"]["weather_code"])
		self.data["current"]["weather_code"]=weather_category.decode(self.data["current"]["weather_code"])

		self.df_hourly = pd.DataFrame(index=self.data["hourly"]["time"],columns=self.params["hourly"],data=self.data["hourly"])
		self.df_daily = pd.DataFrame(index=self.data["daily"]["time"],columns=self.params["daily"],data=self.data["daily"])
		self.df_current=pd.DataFrame(index=[0],data=self.data["current"])

	def to_csv(self):
		self.df_hourly.to_csv("hourly.csv")
		self.df_daily.to_csv("daily.csv")
		self.df_current.to_csv("current.csv")
		
	
if __name__=="__main__":
	w=WeatherReport(35.72475432967049,139.58134714317478)
	w.to_csv()