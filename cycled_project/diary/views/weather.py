from django.http import JsonResponse
from django.templatetags.static import static
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.core.cache import cache
from django_ratelimit.decorators import ratelimit
from django.utils import timezone

# from subs.weather_report.weather_report import get_weather
from subs.weather_report.weather_report_v2 import get_weather,update_weather
from datetime import timedelta
import os
import json

class WeatherView(LoginRequiredMixin, generic.TemplateView):
    template_name = "diary/weather.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # JSONファイルの読み込み
        json_file_path = os.path.join(settings.BASE_DIR, 'diary', 'resources', 'openweather_mapping.json')
        with open(json_file_path, 'r') as file:
            openweather_data = json.load(file)
            context['openweather'] = openweather_data

        location = getattr(self.request.user, 'location', None)
        weather = None

        # ユーザーの位置が設定されている場合
        if location:
            lat = location.lat
            lon = location.lon
            weather = get_weather_ratelimit(self.request,lat,lon)

        context['weather'] = weather
        return context

@ratelimit(key='user', rate='5/m', method='GET', block=True)
def get_weather_ratelimit(request,lat,lon) -> dict:
    now = timezone.now()
    api_key = settings.OPENWEATHER_API_KEY

    pre = {
        'lat' : request.session.get('lat'),
        'lon' : request.session.get('lon'),
        'time_current' : request.session.get('time_current'),
        'time_hourly': request.session.get('time_hourly'),
        'weather' : request.session.get('weather'),
    }

    # latもしくはlonが異なる or pre内のいずれかがNone
    if lat != pre['lat'] or lon != pre['lon'] or (any(value is None for value in pre.values())):
        weather = get_weather(api_key,lat,lon)
    else:
        # 場所が同じ場合，過去のデータを使う
        weather = pre['weather']
        # currentの取得時間が10分以上経過していた場合 currentのみを更新
        if now - pre['time_current'] > timedelta(minutes=10):
            weather = update_weather(api_key,weather,update_for=['current'])
        # hourlyの最新時刻が現在時刻よりも過去の場合
        if now > pre['time_hourly']:
            weather = update_weather(api_key,weather,update_for=['hourly'])
    
    # セッションに新しい位置情報、天気情報、時間を保存
    request.session['lat'] = lat
    request.session['lon'] = lon
    request.session['time_current'] = weather['current']['time']
    request.session['time_hourly'] = weather['hourly'][0]['time']   #一番近いデータの時刻を保存
    request.session['weather'] = weather  # weather をセッションに保存

    return weather