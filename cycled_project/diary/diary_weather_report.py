from diary.subs.weather_report import WeatherReport

class DiaryWeatherReport(WeatherReport):
	def __init__(self, *args):
		super().__init__(*args)
		self.data["hourly"]["weather_img"]=["diary:"+name for name in self.data["hourly"]["weather_img"]]
		self.data["daily"]["weather_img"]=["diary:"+name for name in self.data["daily"]["weather_img"]]
		self.data["current"]["weather_img"]=["diary:"+name for name in self.data["current"]["weather_img"]]
		
if __name__=="__main__":    	
	w=DiaryWeatherReport("関町")
	# w.to_csv()
