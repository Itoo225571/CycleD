import urllib.request
import urllib.parse

import requests
from pprint import pprint

#天気予報APIのエントリーポイント
API = "https://weather.tsukumijima.net/api/forecast"

#パラメータを定義
paramValue = {
	#名古屋のIDを指定
	'city': '230010'
}

#パラメータをURLエンコードする
params = urllib.parse.urlencode(paramValue)

#リクエスト用のURL生成
url = API + "?" + params

#データをリクエスト
data = requests.get(url).json()

#取得したバイナリデータをUTF-8にエンコード
# text = data.decode("utf-8")

#テキストとして表示
pprint(data)