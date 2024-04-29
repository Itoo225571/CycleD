import requests
from time import sleep
# import re
from copy import deepcopy

from pprint import pprint

def is_empty(target):
    if target is None:
        return True
    elif isinstance(target,(list,tuple)):
        for value in target:
            if value is not None:
                if isinstance(value,(dict,list,tuple)):
                    if not is_empty(value):
                        return False
                else:
                    return False
    elif isinstance(target,dict):
        for value in target.values():
            if value is not None:
                if isinstance(value,(dict,list,tuple)):
                    if not is_empty(value):
                        return False
                else:
                    return False
    return True

class Location():
    def __init__(self) -> None:
        self._data_keys=["lat","lon","address",]
        self._address_keys=["country","state","city","district","locality","street","name","postcode","type","label",]
        self._empty_data=dict.fromkeys(self._data_keys)
        self._empty_data["address"]=dict.fromkeys(self._address_keys)
        self._data_list = []

    """___GET___"""
    def make_data_list(self,place_name:str):
        params_gsi={
            "q":place_name
        }
        url = f"https://msearch.gsi.go.jp/address-search/AddressSearch"
        res = requests.get(url=url,params=params_gsi,timeout=3.5)
        data_list = res.json()[::-1]
        if data_list:
            for future in data_list:
                data = deepcopy(self._empty_data)
                coord = {
                    "lon":future["geometry"]["coordinates"][0],
                    "lat":future["geometry"]["coordinates"][1],
                }
                address = {
                    "label":future["properties"]["title"]
                }
                if place_name in address["label"]:
                    data.update(coord)
                    data["address"].update(address)
                self._data_list.append(data)
        return data_list

    def get_reverse(self,*latlon):
        if len(latlon)==2 and isinstance(latlon[0],(float,int)) and isinstance(latlon[1],(float,int)):
            lat=latlon[0]
            lon=latlon[1]
        elif len(latlon)==1 and isinstance(latlon[0],(list,tuple)) and isinstance(latlon[0][0],(float,int)) and isinstance(latlon[0][1],(float,int)):
            lat=latlon[0][0]
            lon=latlon[0][1]
        else:
            raise ValueError("Invalid arguments")

        params={
            "lat":lat,
            "lon":lon,
            "format":"geocodejson",
            "limit":10,
            "addressdetails":1,
        }
        
        url = f"https://nominatim.openstreetmap.org/reverse"
        res = requests.get(url=url,params=params,timeout=3.5)
        sleep(1)
        res_data=res.json()
        self._apply_data(res_data)

    def get_geocode(self,place_name:str):
        params={
            "q":place_name,
            "format":"geocodejson",
            "limit":10,
            "addressdetails":1,
            "countrycodes":"jp",
        }
        url = f"https://nominatim.openstreetmap.org/search"
        res = requests.get(url=url,params=params,timeout=3.5)
        sleep(1)
        res_data = res.json()
        self._apply_data(res_data)
        # return self._data_list
        return res_data

    """___getで手に入れたjson_dataを本クラスのdata使用に書き換える___"""
    def _apply_data(self,json_data):
        features = json_data.get("features")
        # 存在しなかった場合、data,addressの要素は全てNone
        if is_empty(features) :
            return 
            
        for feature in features:
            data = deepcopy(self._empty_data)
            geometry = feature.get("geometry")
            properties = feature.get("properties")
            geocoding = properties.get("geocoding")
            
            coord = {
                "lat":geometry.get("coordinates")[1],
                "lon":geometry.get("coordinates")[0],
            }
            
            data.update(coord)

            address = {key: geocoding.get(key, None) for key in self._address_keys}
            address_keys=["state","city","district","locality","street",]
            address_value = ""
            for key in address_keys:
                if address.get(key) is not None:
                    address_value += address.get(key)
            address["label"] = address_value
            if address["city"] == "東京":
                address["state"] = address["city"]
            data["address"].update(address)
            self._data_list.append(data)

    @property
    def data(self):
        return self._empty_data
    @property
    def data_list(self):
        return self._data_list
        
    
if __name__=="__main__":
    # サンプルのaddress
    # addresses = ["東京都千代田区丸の内1丁目","東京タワー","練馬区","原爆ドーム","明治大学","富士山","札幌駅北口駅前広場"]
    # addresses = ["静岡市","新宿区","札幌駅北口駅前広場","京王プレリアホテル札幌",]
    addresses = ["新宿"]
    for address in addresses:
        loc=Location()
        # pprint(loc.make_data_list(address))
        pprint(loc.get_geocode(address))
        # pprint(loc.data_list)
        # pprint(loc.get_geocode(address))
        # print(loc)
        # pprint(loc.data_list)
        
    # loc = Location()
    # loc.get_geocode_list("新宿区")
    # pprint(loc._data_list)
    # print(len(loc._data_list))
        # pprint(loc.get_geocode(0))
        # print(address)
        # pprint(loc.data)

    # address="東京ディズニーランド"
    # loc=Location()
    # pprint(loc.get_geocode_list(address))

    # address=(35.7247316,139.5812637)
    # loc=Location()
    # loc.get_reverse(address)
    # print(loc.data)