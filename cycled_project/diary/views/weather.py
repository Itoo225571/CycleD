from django.http import JsonResponse
from django.templatetags.static import static
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache import cache

from subs.weather_report.weather_report import get_weather
from datetime import datetime

class WeatherView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/weather.html"
    def get_context_data(self, **kwargs):
        user = self.request.user
        context = super().get_context_data(**kwargs)
        if user.home:
            weather_data = self.get_weather_report(self.request)
            context.update(weather_data)
        return context
    
    # キャッシュを適用するためにdispatchにデコレーターを使用
    @method_decorator(cache_page(60 * 15))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def get_weather_report(self,request):
        lat = request.user.home.lat
        lon = request.user.home.lon
        img_path = static('diary_weather_report/img/')
        weather_json = get_weather(lat,lon,dir_name = img_path,time_range=48)
        weather = weather_json.model_dump()
        # 位置情報を含むレスポンスを作成
        data = {
            'message': 'Location data received successfully.',
            "weather_data": weather,
        }
        return data

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
            weather_json = get_weather(latitude, longitude, dir_name=img_path, time_range=48)
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