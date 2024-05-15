import requests

import pandas as pd
import json
from os import path
from datetime import datetime,timedelta,timezone,date
from pydantic import BaseModel
from typing import List

from pprint import pprint

def _get_weather_categories():
    p = path.join(path.dirname(__file__), 'weather_category.json')
    with open(p,mode="rt", encoding='utf-8') as f:
        weather_categories = json.load(f)
    return weather_categories

_weather_category = _get_weather_categories()

class WeatherDataHourly(BaseModel):
    """___必須項目___"""
    time: datetime
    temperature_2m: float
    relative_humidity_2m:int            #湿度
    apparent_temperature: float         #見かけの温度
    precipitation_probability: int      #降水確率
    weather_code: int
    wind_speed_10m: float 
    wind_direction_10m: int
    """___上から導く項目____"""
    weather: str = ""
    img_file_name: str = ""
    within48: bool = False

    def __init__(self, **data):
        super().__init__(**data) 
        data = _weather_category.get(str(self.weather_code))
        self.weather = data.get("description")
        self.img_file_name =  data.get("img")
        current = datetime.now(timezone(timedelta(hours=9))).replace(tzinfo=None)
        if self.time - current <= timedelta(hours=48) and self.time - current >= timedelta(hours=-1):
            self.within48 = True

class WeatherDataDaily(BaseModel):
    time: date
    weather_code: int
    temperature_2m_max: float
    temperature_2m_min: float
    apparent_temperature_max: float
    apparent_temperature_min: float
    sunrise: datetime
    sunset: datetime
    wind_speed_10m_max: float
    wind_gusts_10m_max: float
    wind_direction_10m_dominant: int
    """___上から導く項目____"""
    weather: str = ""
    img_file_name: str = ""
        
    def __init__(self, **data):
        super().__init__(**data) 
        data = _weather_category.get(str(self.weather_code))
        self.weather = data.get("description")
        self.img_file_name =  data.get("img")
        current = datetime.now(timezone(timedelta(hours=9))).replace(tzinfo=None)
        
class WeatherData(BaseModel):
    lat: float
    lon: float
    hourly: List[WeatherDataHourly]
    today: WeatherDataDaily
    tomorrow: WeatherDataDaily
    
def get_weather(lat,lon):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation_probability", "precipitation", "rain", "showers", "snowfall", "weather_code", "wind_speed_10m", "wind_speed_80m", "wind_speed_120m", "wind_speed_180m", "wind_direction_10m", "wind_direction_80m", "wind_direction_120m", "wind_direction_180m", "wind_gusts_10m", "temperature_80m", "temperature_120m", "temperature_180m"],
        "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset", "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant"],
        "timezone": "Asia/Tokyo",
    }
    url = f"https://api.open-meteo.com/v1/forecast"
    response = requests.get(url,params,timeout=3.5)
    data_json = response.json()
    
    df_hourly = pd.DataFrame(data=data_json["hourly"])
    hourly_list = []
    for index, row in df_hourly.iterrows():
        row_dict = row.to_dict()
        wData = WeatherDataHourly(**row_dict)
        if wData.within48:
            hourly_list.append(wData)
            
    df_daily = pd.DataFrame(data=data_json["daily"])
    data_today = df_daily.iloc[0]
    data_tomorrow = df_daily.iloc[1]
    today = WeatherDataDaily(**data_today)
    tomorrow = WeatherDataDaily(**data_tomorrow)
    
    weather_data_param = {
        "lat": lat,
        "lon": lon,
        "hourly": hourly_list,
        "today": today,
        "tomorrow": tomorrow,
    }
    return WeatherData(**weather_data_param)

if __name__ == "__main__":
    data = get_weather(35.7247316,139.5812637)
    date = datetime.now()