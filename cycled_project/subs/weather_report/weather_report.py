import requests

import pandas as pd
import json
from os import path
from datetime import datetime,timedelta,timezone
from pydantic import BaseModel,RootModel,field_serializer,field_validator
from typing import List
from pathlib import Path
from time import sleep

from pprint import pprint

def _get_weather_categories():
    p = path.join(path.dirname(__file__), 'weather_category.json')
    with open(p,mode="rt", encoding='utf-8') as f:
        weather_categories = json.load(f)
    return weather_categories

_weather_category = _get_weather_categories()

class WeatherDataBase(BaseModel):
    time: datetime
    weather_code: int
    """___上から導く項目____"""
    weather: str = ""
    img_file_name: str = ""
    img_file_path: str = ""
    
    def __init__(self,dir_name=None,**data):
        super().__init__(**data) 
        data = _weather_category.get(str(self.weather_code))
        self.weather = data.get("description")
        self.img_file_name =  data.get("img")
        if dir_name != None and isinstance(dir_name,str):
            self.img_file_path = (Path(dir_name) / self.img_file_name).as_posix()
        else:
            self.img_file_path = (Path(__file__).parent / Path('./img') / self.img_file_name).as_posix()

    @field_serializer("time")
    def serialize_time(self, value: datetime) -> dict:
        return {
            'year': value.year,
            'month': value.month,
            'day': value.day,
            'hour': value.hour,
            'minute': value.minute,
            'second': value.second
        }

class WeatherDataHourly(WeatherDataBase):
    """___必須項目___"""
    temperature_2m: int
    relative_humidity_2m:int            #湿度
    apparent_temperature: int         #見かけの温度
    precipitation_probability: int      #降水確率
    wind_speed_10m: int 
    wind_direction_10m: int
    """___設定___"""
    time_range: int = 24

    def __init__(self,*args, **kwargs):
        kwargs['temperature_2m'] = int(kwargs['temperature_2m'])
        kwargs['apparent_temperature'] = int(kwargs['apparent_temperature'])
        kwargs['wind_speed_10m'] = int(kwargs['wind_speed_10m'])
        super().__init__(*args,**kwargs)

class WeatherDataDaily(WeatherDataBase):
    temperature_2m_max: int
    temperature_2m_min: int
    apparent_temperature_max: int
    apparent_temperature_min: int
    sunrise: datetime
    sunset: datetime
    wind_speed_10m_max: int
    wind_gusts_10m_max: int
    wind_direction_10m_dominant: int

    def __init__(self,*args, **data):
        data['temperature_2m_max'] = int(data['temperature_2m_max'])
        data['temperature_2m_min'] = int(data['temperature_2m_min'])
        data['apparent_temperature_max'] = int(data['apparent_temperature_max'])
        data['apparent_temperature_min'] = int(data['apparent_temperature_min'])
        data['wind_speed_10m_max'] = int(data['wind_speed_10m_max'])
        data['wind_gusts_10m_max'] = int(data['wind_gusts_10m_max'])
        super().__init__(*args,**data)
        
class WeatherData(BaseModel):
    lat: float
    lon: float
    hourly: RootModel[list[WeatherDataHourly]]    
    today: WeatherDataDaily
    tomorrow: WeatherDataDaily
    
def get_weather(lat,lon,dir_name= None):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation_probability", "precipitation", "rain", "showers", "snowfall", "weather_code", "wind_speed_10m", "wind_speed_80m", "wind_speed_120m", "wind_speed_180m", "wind_direction_10m", "wind_direction_80m", "wind_direction_120m", "wind_direction_180m", "wind_gusts_10m", "temperature_80m", "temperature_120m", "temperature_180m"],
        "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset", "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant"],
        "timezone": "Asia/Tokyo",
    }
    url = f"https://api.open-meteo.com/v1/forecast"
    sleep(1)
    try:
        response = requests.get(url=url,params=params,timeout=5.0)
    except requests.exceptions.Timeout:
        raise(url+" get faild")
    data_json = response.json()
    
    df_hourly = pd.DataFrame(data=data_json["hourly"])
    hourly_list = []
    for index, row in df_hourly.iterrows():
        row_dict = row.to_dict()
        wData = WeatherDataHourly(dir_name,**row_dict)
        current = datetime.now(timezone(timedelta(hours=9))).replace(tzinfo=None)
        if wData.time - current <= timedelta(hours=wData.time_range) and wData.time - current >= timedelta(hours=-1):
            hourly_list.append(wData)
            
    df_daily = pd.DataFrame(data=data_json["daily"])
    data_today = df_daily.iloc[0]
    data_tomorrow = df_daily.iloc[1]
    today = WeatherDataDaily(dir_name,**data_today)
    tomorrow = WeatherDataDaily(dir_name,**data_tomorrow)
    
    weather_data_param = {
        "lat": lat,
        "lon": lon,
        "hourly": hourly_list,
        "today": today,
        "tomorrow": tomorrow,
    }
    return WeatherData(**weather_data_param)

if __name__ == "__main__":
    kwargs = get_weather(35.7247316,139.5812637)
    date = datetime.now()