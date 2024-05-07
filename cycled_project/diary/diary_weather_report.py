# from subs.weather_report.weather_report import WeatherReport
from subs.weather_report.weather_report import WeatherReport

from django.templatetags.static import static

class DiaryWeatherReport(WeatherReport):
	def __init__(self, *args):
		super().__init__(*args)
		
		self.data["hourly"]["weather_img"] = [static('diary/img/' + name) for name in self.data["hourly"]["weather_img"]]
		self.data["daily"]["weather_img"] = [static('diary/img/' + name) for name in self.data["daily"]["weather_img"]]
		self.data["current"]["weather_img"] = [static('diary/img/' + name) for name in self.data["current"]["weather_img"]]
		
if __name__=="__main__":    	
	# w=DiaryWeatherReport(35.7247316,139.5812637)
	# w.to_csv()
	pass