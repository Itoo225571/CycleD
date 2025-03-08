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

from subs.weather_report.weather_report import get_weather
from datetime import datetime,timedelta
import os
import json

class WeatherView(LoginRequiredMixin, generic.TemplateView):
    template_name = "diary/weather.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # JSONファイルの読み込み
        json_file_path = os.path.join(settings.BASE_DIR, 'diary', 'resources', 'meteocons_mapping.json')
        with open(json_file_path, 'r') as file:
            meteocons_data = json.load(file)
            context['meteocons'] = meteocons_data

        location = getattr(self.request.user, 'location', None)
        weather = None

        # ユーザーの位置が設定されている場合
        if location:
            lat = location.lat
            lon = location.lon

            # セッションから以前の位置情報、天気情報、時間を取得
            previous_lat = self.request.session.get('lat')
            previous_lon = self.request.session.get('lon')
            last_weather_time = self.request.session.get('last_weather_time')
            stored_weather = self.request.session.get('weather')

            # 位置情報が変わった場合、または15分以上経過している場合に天気情報を取得
            if (lat != previous_lat or lon != previous_lon or
                (last_weather_time and timezone.now() - last_weather_time >= timedelta(minutes=15))):
                # 新しい天気情報を取得
                weather_base = get_weather(lat, lon, time_range=48)
                weather = weather_base.model_dump()
                # セッションに新しい位置情報、天気情報、時間を保存
                self.request.session['lat'] = lat
                self.request.session['lon'] = lon
                self.request.session['last_weather_time'] = timezone.now()
                self.request.session['weather'] = weather  # weather をセッションに保存
            else:
                # セッションに天気情報が保存されている場合、それを使用
                weather = stored_weather

        context['weather'] = weather
        return context


def ajax_location2weather(request):
    if request.method == 'POST':
        latitude = float(request.POST.get('latitude',None))
        longitude = float(request.POST.get('longitude',None))
        latlon = str(latitude) + str(longitude)
        # キャッシュキーを生成
        cache_key = f"weather_{latlon}"
        weather = cache.get(cache_key)

        # キャッシュが無い場合はAPIを呼び出してデータを取得
        if weather is None:
            img_path = static('diary_weather_report/img/')
            weather_json = get_weather(latitude, longitude, time_range=48)
            weather = weather_json.model_dump()
            # データをキャッシュする（15分間）
            cache.set(cache_key, weather, timeout=60 * 15)

        # 位置情報を含むレスポンスを作成
        response = {
            'message': 'Location data received successfully.',
            "weather": weather,
            'latlon': latlon,
        }
        request.session['weather_data'] = response
        return JsonResponse(response)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)