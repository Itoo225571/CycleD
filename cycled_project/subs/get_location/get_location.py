from pydantic import BaseModel,RootModel
from typing import List
from time import sleep
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import pandas as pd
from pathlib import Path
import re
from io import BytesIO
import datetime
import os.path
from difflib import SequenceMatcher

from pprint import pprint

EMPTY_VALUE = -1

_prefectures = [
		"東京都", "神奈川県", "大阪府", "愛知県", "埼玉県",
		"千葉県", "兵庫県", "北海道", "福岡県", "静岡県",
		"茨城県", "広島県", "京都府", "宮城県", "新潟県",
		"長野県", "岐阜県", "群馬県", "栃木県", "岡山県",
		"福島県", "三重県", "熊本県", "鹿児島県", "沖縄県",
		"滋賀県", "山口県", "愛媛県", "奈良県", "長崎県",
		"青森県", "岩手県", "石川県", "大分県", "宮崎県",
		"山形県", "富山県", "秋田県", "香川県", "和歌山県",
		"佐賀県", "山梨県", "福井県", "徳島県", "高知県",
		"島根県", "鳥取県"
	]

def _agg_dup_col(df_: pd.core.frame.DataFrame) -> pd.core.frame.DataFrame:
    '''カラム名重複のあるデータフレームを，カラムの欠損を保管し合う+重複削除し，データフレームとして返す
    Args:
        df_ (pd.core.frame.DataFrame): any dataframe
    Returns:
        pd.core.frame.DataFrame
    '''
    df = df_.copy()
    dup_col = set(df.columns[df.columns.duplicated()])
    for col in dup_col:
        value = [[v for v in values if v == v and v is not None]
					for values in df[col].values.tolist()]
        value = [v[0] if v != [] else None for v in value]
        df = df.drop(col, axis=1)
        df[col] = value
    return df

def _have_word(handle, target):
	have_space = bool(re.search(r'[\s]', handle))
	if have_space:
		words = handle.split()
		for word in words:
			if word not in target:
				return False
		return True
	else:
		return bool(handle in target)

def _assign_prefecture_number(label):
	for i, state in enumerate(_prefectures, 1):
		if state in label:
			return i
	return EMPTY_VALUE

def _get_addressCode():
	file_path = os.path.join(os.path.dirname(__file__), 'addressCode.json')
	myfile = Path(file_path)
	myfile.touch(exist_ok=True)
	try:
		with open(file_path, 'r', encoding='utf-8') as file:
			addressCode = json.load(file)
			update_info = addressCode.get("update_info")
			update_year = addressCode.get("update_year")
	except json.decoder.JSONDecodeError:
		update_info = None
		update_year = None

	# 今年更新されていなかったら更新
	if update_year != datetime.datetime.now().year:
		# スクレイピング対象の URL にリクエストを送り HTML を取得する
		sleep(1)
		res = requests.get('https://www.soumu.go.jp/denshijiti/code.html',timeout=3.5)
		# レスポンスの HTML から BeautifulSoup オブジェクトを作る
		soup = BeautifulSoup(res.content, 'html.parser', from_encoding='UTF-8')
		tag_items = soup.select('li:-soup-contains("都道府県コード及び市区町村コード"):not(:-soup-contains("改正一覧表"))')
		
		for tag_item in tag_items:
			date_info = re.search(r'（(.*?)更新）', tag_item.text).group(1)
			# サイト上で更新されていたら
			if update_info != date_info:
				# リンク要素を取得
				links = tag_item.find_all('a', href=True)
				if links:
					for link in links:
						# リンクテキストが"Excelファイル"と一致するか確認
						if "Excelファイル" in link.text:
							# ExcelファイルのURLを取得
							excel_url = link['href']
							excel_url = urljoin("https://www.soumu.go.jp",excel_url)

							# Excelファイルをダウンロード
							res = requests.get(excel_url)
							input_book = pd.ExcelFile(BytesIO(res.content))
							all_sheet_data = []
							for sheet_name in input_book.sheet_names:
								sheet_data = input_book.parse(sheet_name)
								all_sheet_data.append(sheet_data)

							# すべてのシートのDataFrameを連結する
							input_sheet_df = pd.concat(all_sheet_data, ignore_index=True)
							input_sheet_df.loc[:, "団体コード"] = [int(num/10) for num in input_sheet_df.loc[:, "団体コード"]]

							input_sheet_df.set_index("団体コード",inplace=True)
							input_sheet_df = input_sheet_df.rename(columns={'都道府県名\n（漢字）': 'state','市区町村名\n（漢字）':'city','都道府県名\n（カナ）':'state_kana','市区町村名\n（カナ）':'city_kana','都道府県名\n（ｶﾅ）':'state_kana','市区町村名\n（ｶﾅ）':'city_kana',})
							input_sheet_df = _agg_dup_col(input_sheet_df)
							input_sheet_df = input_sheet_df[~input_sheet_df.index.duplicated(keep='first')]

							json_str = input_sheet_df.to_json(force_ascii=False,orient="index")
							
							# JSON をデコードして表示
							addressCode = json.loads(json_str)
							addressCode["update_info"] = date_info
							addressCode["update_year"] = str(datetime.datetime.now().year)
							updated_json = json.dumps(addressCode,indent=4,ensure_ascii=False)

							with open(file_path, 'w', encoding='utf-8') as file:
								file.write(updated_json)

							# 1つのExcelファイルを見つけたらループを終了する
							break
					else:
						raise ValueError("Excelファイルが見つかりませんでした。")
	return addressCode
		
_addressCode = _get_addressCode()

# muniCode = addressCode
# addressCodeのもう一つの獲得方法
# 使うには from js2py import EvalJs が必要
def _get_muniCode():
	file_path = os.path.join(os.path.dirname(__file__), 'muniCode.json')
	myfile = Path(file_path)
	myfile.touch(exist_ok=True)
	try:
		with open(file_path, 'r', encoding='utf-8') as file:
			muniCode = json.load(file)
			update_info = muniCode.get("update_info")
			update_year = muniCode.get("update_year")
	except json.decoder.JSONDecodeError:
		update_info = None
		update_year = None

	if update_year != datetime.datetime.now().year:
		# スクレイピング対象の URL にリクエストを送り js を取得する
		sleep(1)
		res = requests.get('https://maps.gsi.go.jp/js/muni.js',timeout=3.5)

		if update_info != str(datetime.datetime.strptime(res.headers['Last-Modified'], "%a, %d %b %Y %H:%M:%S GMT")):
			data_raw = f'var GSI = {{\n    MUNI_ARRAY: {{}}\n}};\n' + res.text
			context = EvalJs()
			context.execute(data_raw)
			js_object = context.GSI.MUNI_ARRAY
			data_dict = js_object.to_dict()

			muniCode = {}
			for key, value in data_dict.items():
				values = value.split(',')
				muniCode[key] = {
					"state_code": values[0],
					"state": values[1],
					"city": values[3],
					}
			muniCode["update_info"] = str(datetime.datetime.strptime(res.headers['Last-Modified'], "%a, %d %b %Y %H:%M:%S GMT"))
			muniCode["update_year"] = str(datetime.datetime.now().year)
			json_str = json.dumps(muniCode,indent=4,ensure_ascii=False)
			with open(file_path, 'w', encoding='utf-8') as file:
				file.write(json_str)
	return muniCode

class ResponseEmptyError(ValueError):
    pass

# リクエストを送ってその返事をもらう関数
def _fetch_data(url,params,timeout=5.0):
	sleep(1)
	try:
		res = requests.get(url,params,timeout=timeout)
		res.raise_for_status()  # HTTPエラーチェック
		if not res.text.strip():
			raise ResponseEmptyError(f"レスポンスが空です: {res.url}")
		try:
			data = res.json()
		except requests.exceptions.JSONDecodeError:
			raise ValueError(f"JSONデコードエラー: {res.text}")  # デバッグのためにレスポンスを出力
	except requests.exceptions.Timeout:
		raise ValueError("リクエストがタイムアウトしました。")
	except requests.RequestException as e:
		raise ValueError(f"リクエストエラー: {e}")
	if res.status_code != 200:
		raise Exception(f"Error: {res.status_code}")
	return data

class AddressData(BaseModel):
	geotype: str

	name: str = ""           			#目的地
	search: str	= ""					#検索名
	display: str = ""
	label: str = "" 					#一般表記
	country: str = "日本"				#国名
	state: str = ""         			#都道府県
	city: str = ""          			#市町村（区もつなげる）
	locality: str = ""      			#居住域
	street: str = ""        			#道路？
	fulladdress: str = ""   			#以上を合わせたもの	
	postcode: int = EMPTY_VALUE      	#郵便番号
	type: str = ""          			#目的地の種類

	code: int = EMPTY_VALUE				#住所コード
	priority: int = EMPTY_VALUE			#優先度
	source: int = EMPTY_VALUE			#データの参照元
	matcher: float = 1.0				#目的地の名前にどれだけマッチしているか（０の方がマッチしてる）

	def __init__(self,**data):
		super().__init__(**data)
		if self.geotype == "yahoo" :
			place = _addressCode.get(str(self.code))
			if place:
				self.state = place.get("state","")
				self.city = place.get("city","")
				if self.city in self.name:
					self.label = self.name
				else:
					self.label = f"{self.name} ({self.state} {self.city})"
				self.display = self.city

		elif self.geotype == "gsi":
			if self.code != EMPTY_VALUE:
				place = _addressCode.get(str(self.code))
				if place:
					if self.state == "":
						self.state = place.get("state","")
					if self.city == "":
						self.city = place.get("city","")
					if self.city is None:
						self.city = ""
				self.label = f"{self.name} ({self.state} {self.city})"
				self.fulladdress = self.country + self.state + self.city + self.locality + self.street + self.name
				if self.search == "":
					self.display = self.city
				else:
					self.display = self.name
			else:
				for pre in _prefectures:
					if pre in self.name:
						self.state = pre
						self.city = self.name.lstrip(pre)
						if self.city.endswith(self.search) and self.city != self.search:
							self.city = self.city.rstrip(self.search)
				self.label = self.name
				self.fulladdress = self.country + self.name
				self.display = self.city
			self.priority = _assign_prefecture_number(self.label)

		elif self.geotype == "HeartRails":
			if self.city in self.name:
				self.label = self.name
			else:
				self.label = f"{self.name} ({self.state} {self.city})"
			self.display = self.city

class LocationData(BaseModel):
    address: AddressData
    lat: float  # 緯度
    lon: float  # 経度
    
class LocationDataList(RootModel[list[LocationData]]):
    pass
	
def geocode_gsi(place_name:str):
	place_name = re.sub(r'　', ' ', place_name)
	
	params={
		"q":place_name
	}
	url = "https://msearch.gsi.go.jp/address-search/AddressSearch"
	try:
		data_list = _fetch_data(url,params)
	except Exception as e:
		print(f"エラーが発生しました: {e}")
		raise 

	geocode_list = []
	if data_list:
		for future in data_list:
			code=future["properties"].get('addressCode',EMPTY_VALUE)
			source=future["properties"].get('dataSource',EMPTY_VALUE)
			if code == "":
				code = EMPTY_VALUE
			if source == "":
				source = EMPTY_VALUE
			matcher = 1 - SequenceMatcher(None, place_name ,future["properties"]["title"] ).ratio()
			address = {
				"geotype": "gsi",
				"search":place_name,
				"name":future["properties"]["title"],
				"code":code,
				"source":source,
				"matcher":matcher,
			}
			location = {
				"lon":future["geometry"]["coordinates"][0],
				"lat":future["geometry"]["coordinates"][1],
				"address":address,
			}

			if _have_word(place_name,address["name"]):
				# ここでcodeは諸々に変換される
				loc = LocationData(**location)
				geocode_list.append(loc)
		geocode_list = sorted(geocode_list, key=lambda x:(x.address.source,x.address.priority,x.address.matcher,x.address.code))
		
	return LocationDataList(geocode_list)

def geocode_yahoo(place_name,cliant_id):
	params = {
		"appid": cliant_id,
		"query": place_name,
		"sort": "address2",
		"output": "json",
		"results": 100,
	}
	url = "https://map.yahooapis.jp/geocode/V1/geoCoder"
	try:
		data_list = _fetch_data(url,params).get('Feature')
	except Exception as e:
		print(f"エラーが発生しました: {e}")
		raise 

	geocode_list = []
	# もし該当箇所がなかったらlocalでもう一回検索
	if not data_list:
		params['sort'] = "-match"
		url = "https://map.yahooapis.jp/search/local/V1/localSearch"
		try:
			data_list = _fetch_data(url,params).get('Feature')
		except Exception as e:
			print(f"エラーが発生しました: {e}")
			raise 

	if data_list:
		for future in data_list:
			code = future['Property'].get('GovernmentCode',EMPTY_VALUE)
			matcher = 1 - SequenceMatcher(None, place_name ,future['Name'] ).ratio()
			
			address = {
				"geotype": "yahoo",
				"search": place_name,
				"name":future['Name'],
				"fulladdress": future['Property']['Address'],
				"code": code,
				"matcher":matcher,
			}
			location = {
				"lon":future["Geometry"]["Coordinates"].split(',')[0],
				"lat":future["Geometry"]["Coordinates"].split(',')[1],
				"address":address,
			}

			loc = LocationData(**location)
			geocode_list.append(loc)
			
	return LocationDataList(geocode_list)

def regeocode_gsi(lat:float,lon:float) -> LocationData:
	url = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress"
	params = {
		"lat": lat,
		"lon": lon,
	}
	try:
		data = _fetch_data(url,params)
	except Exception as e:
		print(f"エラーが発生しました: {e}")
		raise 
	
	if data:
		result = data.get("results")
		code = result.get("muniCd",EMPTY_VALUE)
		name = result.get("lv01Nm")
		if name== '－':
			name = ""
		address = {
			"geotype": "gsi",
			"name": name,
			"code": code,
		}
		location = {
			"lat": lat,
			"lon": lon,
			"address": address,
		}
		loc = LocationData(**location)
	else:
		raise Exception(f"Error data is empty")
	return loc

def regeocode_HeartTails(lat:float,lon:float) -> LocationData:
	url = "https://geoapi.heartrails.com/api/json?method=searchByGeoLocation"
	params = {
		"y": lat,
		"x": lon,
	}
	try:
		data = _fetch_data(url,params)
	except Exception as e:
		print(f"エラーが発生しました: {e}")
		raise 
	# return data
	if data:
		result = data.get("response")
		result = result.get("location")[0]
		address = {
			"geotype": 'HeartRails',
			"name": result.get('town'),
			"state": result.get('prefecture'),
			"city": result.get('city'),
			"locality": result.get('town'),
			"postcode": result.get('postal'),
		}
		location = {
			"lat": lat,
			"lon": lon,
			"address": address,
		}
		loc = LocationData(**location)
	else:
		raise Exception(f"Error data is empty")
	return loc

# def regeocode_yahoo(lat:float,lon:float,cliant_id) -> LocationData:
# 	url = "https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder"
# 	params = {
# 		"lat": lat,
# 		"lon": lon,
# 		"appid": cliant_id,
# 		"output": "json",
# 	}
# 	try:
# 		data = _fetch_data(url,params)
# 	except Exception as e:
# 		print(f"エラーが発生しました: {e}")
# 		raise 
# 	# return data
# 	if data:
# 		result = data.get("response")
# 		result = result.get("location")[0]
# 		address = {
# 			"geotype": 'yahoo',
# 			"name": result.get('town'),
# 			"state": result.get('prefecture'),
# 			"city": result.get('city'),
# 			"locality": result.get('town'),
# 			"postcode": result.get('postal'),
# 		}
# 		location = {
# 			"lat": lat,
# 			"lon": lon,
# 			"address": address,
# 		}
# 		loc = LocationData(**location)
# 	else:
# 		raise Exception(f"Error data is empty")
# 	return loc

if __name__=="__main__":
	# import string
	# import random

	# for i in range(10):
	# 	print(i)
	# 	result = ''.join(random.choices(string.ascii_uppercase, k=5))
	# 	print(result)
	# 	geo = geocode_gsi(result)
	# geo = regeocode_gsi(35.7247454,139.5812729)
	geo = regeocode_HeartTails(35.7247454,139.5812729)
	# print(geo)
	