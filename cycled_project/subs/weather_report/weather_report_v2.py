import requests
from datetime import datetime,timedelta,timezone
from pydantic import BaseModel,RootModel,field_serializer,field_validator
from typing import List
from time import sleep
import pandas as pd
from pprint import pprint

class WeatherDataBase(BaseModel):
    time: datetime
    weather: str
    weather_icon: str
    weather_code: int
    is_day: bool
    temperature: int
    humidity: int
    wind_speed: int
    wind_direction: int
    def __init__(self,*args,**data):
        data['temperature'] = int(data['temperature'])
        data['wind_speed'] = int(data['wind_speed'])
        data['wind_direction'] = int(data['wind_direction'])
        super().__init__(**data)

class WeatherData(BaseModel):
    lat: float
    lon: float
    hourly: RootModel[list[WeatherDataBase]]
    current: WeatherDataBase

def _convert_json(json_data,timezone_offset=32400):
    dt_timestamp = json_data.get('dt')
    # UNIXタイムスタンプから時間を計算し、タイムゾーンオフセットを適用
    time = datetime.fromtimestamp(dt_timestamp, tz=timezone.utc).astimezone(timezone(timedelta(seconds=timezone_offset)))
    weather = json_data.get('weather', [{}])[0].get('description')
    weather_icon = json_data.get('weather', [{}])[0].get('icon')
    weather_code = json_data.get('weather', [{}])[0].get('id')
    is_day = json_data.get('weather', [{}])[0].get('icon', '').endswith('d')
    
    return {
        'time': time,
        'weather': weather,
        'weather_icon': weather_icon,
        'weather_code': weather_code,
        'is_day': is_day,
        'temperature': json_data['main'].get("temp") - 273.15,
        'humidity': json_data['main'].get("humidity"),
        'wind_speed': json_data['wind'].get('speed'),
        'wind_direction': json_data['wind'].get('deg'),
    }

def get_weather_current(api_key,lat,lon):
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "lang": "ja",
    }

    url = f"https://api.openweathermap.org/data/2.5/weather"
    try:
        response = requests.get(url=url,params=params,timeout=5.0)
    except requests.exceptions.Timeout:
        raise(url+" get faild")
    json_current = response.json()
    timezone_offset = json_current.get("timezone")
    data_current = WeatherDataBase(**_convert_json(json_current,timezone_offset))
    return data_current.model_dump()

def get_weather_5days(api_key,lat,lon):
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "lang": "ja",
    }

    url = f"https://api.openweathermap.org/data/2.5/forecast"
    try:
        response = requests.get(url=url,params=params,timeout=5.0)
    except requests.exceptions.Timeout:
        raise(url+" get faild")
    json_5days = response.json()
    timezone_offset = json_5days.get('city',{}).get("timezone")
    data_5days = [
        WeatherDataBase(**_convert_json(data, timezone_offset)).model_dump()
        for data in json_5days.get("list", [])
    ]
    return data_5days

def get_weather(api_key, lat, lon):
    hourly = get_weather_5days(api_key, lat, lon)
    sleep(1)  # ここでスリープ
    current = get_weather_current(api_key, lat, lon)
    return WeatherData(lat=lat, lon=lon, hourly=hourly, current=current).model_dump()

def update_weather(api_key, weather_data, update_for=['hourly', 'current']):
    weather_data = WeatherData(**weather_data)
    lat, lon = weather_data.lat, weather_data.lon

    hourly = get_weather_5days(api_key, lat, lon) if 'hourly' in update_for else weather_data.hourly
    current = get_weather_current(api_key, lat, lon) if 'current' in update_for else weather_data.current

    return WeatherData(lat=lat, lon=lon, hourly=hourly, current=current).model_dump()


if __name__ == "__main__":
    lat=35.7247708
    lon=139.5812715
    pass