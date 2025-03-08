from django.http import JsonResponse
from django.templatetags.static import static
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache import cache

from subs.weather_report.weather_report import get_weather
from datetime import datetime
import os
import json

class WeatherView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/weather.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        json_file_path = os.path.join(settings.BASE_DIR, 'diary', 'resources', 'meteocons_mapping.json')
        with open(json_file_path, 'r') as file:
            meteocons_data = json.load(file)
            context['meteocons'] = meteocons_data
        location = getattr(self.request.user, 'location', None)
        weather = None
        time = None
        if location:
            lat = location.lat
            lon = location.lon
            weather_base = get_weather(lat, lon, time_range=48)
            weather = weather_base.model_dump()
            time = weather_base.current.time
        context['weather'] = weather
        context['current_time'] = time
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