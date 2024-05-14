import requests

import pandas as pd
import json
from os import path
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime,timedelta
from pydantic import BaseModel

from pprint import pprint

class WeatherData(BaseModel):
    tempareture: float
    humid: int
    code: int                       #weather_code
    wind_speed:float
    wind_direction: int

def _get_weather_categories():
    p = path.join(path.dirname(__file__), 'weather_category.json')
    with open(p,mode="rt", encoding='utf-8') as f:
        weather_categories = json.load(f)
    # 文字列から整数にキーを変換する
    weather_categories = {int(key): value for key, value in weather_categories.items()}
    return weather_categories
