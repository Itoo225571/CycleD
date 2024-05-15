from subs.weather_report.weather_report import WeatherData
from django.templatetags.static import static

class DiaryWeatherData(WeatherData):
	def __init__(self, *args):
		super().__init__(*args)
		# イメージ画像用のパスを書く
		
		
if __name__=="__main__":    	
	# w=DiaryWeatherReport(35.7247316,139.5812637)
	# w.to_csv()
	pass