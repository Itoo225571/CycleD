from weather_report.weather_report import WeatherReport
from subs.get_location.get_location_old import Location

import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import pandas as pd
from pathlib import Path
import re
import io

from pprint import pprint

def is_empty(target_dict):
	for value in target_dict.values():
		if value is not None:
			if isinstance(value,dict):
				if not is_empty(value):
					return False
			else:
				return False
	return True

def geocode_gsi(place_name:str):
	params_gsi={
		"q":place_name
	}
	url = f"https://msearch.gsi.go.jp/address-search/AddressSearch"
	res = requests.get(url=url,params=params_gsi,timeout=3.5)
	data_list = res.json()
	if data_list:
		code_to_features = {}
		for feature in data_list:
			if place_name in feature['properties'].get('title'):
				source_code = feature['properties'].get('dataSource',float("inf"))
				if source_code not in code_to_features:
					code_to_features[source_code] = []
				code_to_features[source_code].append(feature)

		# 結果の表示
		for source_code, code_features in code_to_features.items():
			print("Data Source:", source_code)
			for feature in code_features:
				print(feature)
			print()
	else:
		raise ValueError("data list is empty")
	
def get_addressCode(file_path = 'addressCode.json'):
	myfile = Path(file_path)
	myfile.touch(exist_ok=True)
	try:
		with open(file_path, 'r') as file:
			
			update_data = json.load(file).get("update")
	except json.decoder.JSONDecodeError:
		update_data = None
		update_year = None

	# スクレイピング対象の URL にリクエストを送り HTML を取得する
	res = requests.get('https://www.soumu.go.jp/denshijiti/code.html')
	# レスポンスの HTML から BeautifulSoup オブジェクトを作る
	soup = BeautifulSoup(res.content, 'html.parser', from_encoding='UTF-8')
	tag_items = soup.select('li:-soup-contains("都道府県コード及び市区町村コード"):not(:-soup-contains("改正一覧表"))')
	
	for tag_item in tag_items:
		date_info = re.search(r'（(.*?)更新）', tag_item.text).group(1)
		if update_data != date_info:
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
						input_book = pd.ExcelFile(io.BytesIO(response.content))
						input_sheet_name = input_book.sheet_names
						input_sheet_df = input_book.parse(input_sheet_name[0])

						input_sheet_df.set_index("団体コード",inplace=True)
						input_sheet_df.columns = [s.replace('\n', '') for s in input_sheet_df.columns]
						input_sheet_df = input_sheet_df.T

						json_str = input_sheet_df.to_json(force_ascii=False)
						# JSON をデコードして表示
						json_data_new = json.loads(json_str)
						json_data_new["update"]=date_info
						updated_json = json.dumps(json_data_new,indent=4,ensure_ascii=False)

						with open(file_path, 'w') as file:
							file.write(updated_json)

						# 1つのExcelファイルを見つけたらループを終了する
						break
				else:
					print("Excelファイルが見つかりませんでした。")
			

if __name__=="__main__":
	get_addressCode()