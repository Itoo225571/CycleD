import requests
from time import sleep
# import re
# import copy.deepcopy

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
        self._address_keys=["country","state","city","district","locality","name","postcode","type","label",]
        self._data=dict.fromkeys(self._data_keys)
        self._data["address"]=dict.fromkeys(self._address_keys)
        self._data_list = []

    def __str__(self) -> str:
        return str(self._data["address"].get("label",""))+str(self._data["address"]["name"])

    """___GET___"""
    def make_data_list(self,place_name:str):
        params_gsi={
            "q":place_name
        }
        url = f"https://msearch.gsi.go.jp/address-search/AddressSearch"
        res = requests.get(url=url,params=params_gsi,timeout=3.5)
        data_list = res.json()
        behind = []
        if data_list:
            for data in data_list:
                name = data["properties"]["title"]
                lon,lat = data["geometry"]["coordinates"]
                dictionary = {
                    "lat":lat,
                    "lon":lon,
                    "label":name,
                }
                if place_name in name:
                    self._data_list.append(dictionary)
                else:
                    behind.append(dictionary)
            self._data_list[len(self._data_list):len(self._data_list)] = behind
            return self._data_list
    
    """__いらないかも___"""
    def get_geocode(self,num):
        if len(self._data_list) > num :
            code = self._data_list[num]
            self.get_reverse(code.get("lat"),code.get("lon"))

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

    """___getで手に入れたjson_dataを本クラスのdata使用に書き換える___"""
    def _apply_data(self,json_data):
        features = json_data.get("features")
        # 存在しなかった場合、data,addressの要素は全てNone
        if is_empty(features) :
            return 
        if isinstance(json_data.get("features"),list):
            feature = features[0]
        else:
            feature = features
        geometry = feature.get("geometry")
        properties = feature.get("properties")
        geocoding = properties.get("geocoding")
        
        coord = {
            "lat":geometry.get("coordinates")[1],
            "lon":geometry.get("coordinates")[0],
        }
        
        self._data.update(coord)

        address = {key: geocoding.get(key, None) for key in self._address_keys}
        address_keys=["state","city","district","locality",]
        address_value = ""
        for key in address_keys:
            if address.get(key) is not None:
                address_value += address.get(key)
        address["label"] = address_value
        if address["city"] == "東京":
            address["state"] = address["city"]
        self._data["address"].update(address)

    """___DEBUG___"""
    def get_geocode_test(self,place_name:str):
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

        return self._data

    @property
    def data(self):
        return self._data
    @property
    def data_list(self):
        return self._data_list
        
    
if __name__=="__main__":
    # サンプルのaddress
    # addresses = ["東京都千代田区丸の内1丁目","東京タワー","練馬区","原爆ドーム","明治大学","富士山","札幌駅北口駅前広場"]
    # addresses = ["静岡市","新宿区","札幌駅北口駅前広場","京王プレリアホテル札幌",]
    addresses = ["明治大学"]
    for address in addresses:
        loc=Location()
        loc.make_data_list(address)
        loc.get_geocode(0)
        print(loc)
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