from django.http import JsonResponse
from django.templatetags.static import static

from subs.weather_report.weather_report import get_weather
from datetime import datetime

def ajax_location2weather(request):
    if request.method == 'POST':
        session_data = request.session.get('weather_data', False)
        dt = datetime.now()
        time_bool = False

        latitude = float(request.POST.get('latitude',None))
        longitude = float(request.POST.get('longitude',None))
        latlon = str(latitude) + str(longitude)

        # セッションの中にデータがあった場合の処理 : 
        # 〜時間までの時刻が現在時刻と一致してたらセッションのデータを使う
        if session_data:
            datetime_1 = session_data.get('time')
            #str -> datetime型
            session_dt = datetime.fromisoformat(datetime_1)
            time_bool = bool(dt.year==session_dt.year) and bool(dt.month==session_dt.month) and bool(dt.day==session_dt.day) and bool(dt.hour==session_dt.hour) 
            latlon_bool = bool(session_data.get('latlon') == latlon)

        if session_data and time_bool and latlon_bool:
            weather = session_data.get('weather')
        else:
            img_path = static('diary_weather_report/img/')
            
            weather_json = get_weather(latitude,longitude,dir_name = img_path,time_range=48)
            weather = weather_json.model_dump()
            
        # 位置情報を含むレスポンスを作成
        response = {
            'message': 'Location data received successfully.',
            "weather": weather,
            'time': dt.isoformat(),
            'latlon': latlon,
        }
        request.session['weather_data'] = response
        return JsonResponse(response)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)