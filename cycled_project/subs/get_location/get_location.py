from pydantic import BaseModel
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
		with open(file_path, 'r') as file:
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
							excel_url = urljoin(f"https://www.soumu.go.jp",excel_url)

							# Excelファイルをダウンロード
							response = requests.get(excel_url)
							input_book = pd.ExcelFile(BytesIO(response.content))
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
							addressCode["update_year"] = datetime.datetime.now().year
							updated_json = json.dumps(addressCode,indent=4,ensure_ascii=False)

							with open(file_path, 'w') as file:
								file.write(updated_json)

							# 1つのExcelファイルを見つけたらループを終了する
							break
					else:
						raise ValueError("Excelファイルが見つかりませんでした。")
	return addressCode

_addressCode = _get_addressCode()

class AddressData(BaseModel):
	search: str							#検索名
	name: str            				#目的地
	display: str =""
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
		# コードがある場合
		if self.code != EMPTY_VALUE:
			self.state = _addressCode[str(self.code)].get("state")
			self.city = _addressCode[str(self.code)].get("city")
			self.label = self.name + "（" + self.state + " " + self.city + "）"
			self.fulladdress = self.country + self.state + self.city + self.locality + self.street + self.name
			self.display = self.name
		else:
			for pre in _prefectures:
				if pre in self.name:
					self.state = pre
					self.city = self.name.lstrip(pre)
					if self.city.endswith(self.search):
						self.city = self.city.rstrip(self.search)
			self.label = self.name
			self.fulladdress = self.country + self.name
			self.display = self.city
		
		self.priority = _assign_prefecture_number(self.label)

class LocationData(BaseModel):
    address: AddressData
    lat: float  # 緯度
    lon: float  # 経度

def geocode_gsi(place_name:str,to_json=False) -> list[LocationData]:
	place_name = re.sub(r'　', ' ', place_name)
	
	params_gsi={
		"q":place_name
	}
	url = f"https://msearch.gsi.go.jp/address-search/AddressSearch"
	sleep(1)
	
	try:
		res = requests.get(url=url,params=params_gsi,timeout=5.0)
	except requests.exceptions.Timeout:
		raise(url+" get faild")
	
	if res.status_code != 200:
		raise Exception(f"Error: {res.status_code}")

	data_list = res.json()
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
				loc = LocationData(**location)
				geocode_list.append(loc)
		geocode_list = sorted(geocode_list, key=lambda x:(x.address.source,x.address.priority,x.address.matcher,x.address.code))
		if to_json:
			geocode_list = [v.model_dump() for v in geocode_list]
	return geocode_list

if __name__=="__main__":
	address = "新宿"
	geo = geocode_gsi(address)
	for l in geo:
		print(l)