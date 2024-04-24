import requests
import re
# import copy.deepcopy

from pprint import pprint

class Location():
    def __init__(self) -> None:
        self.data_keys=["lat","lon","address",]
        self.address_keys=["country","state","city","district","locality","name","postcode","type","label",]
        self.data=dict.fromkeys(self.data_keys)
        self.data["address"]=dict.fromkeys(self.address_keys)
        # self.data = {key: {} if key == "address" else None for key in self.data_keys}
        # self.data["address"] = {key: None for key in self.address_keys}

    """___GET___"""
    def get_geocode(self,place_name:str):
        params={
            "q":place_name,
            "format":"geocodejson",
            "limit":10,
            "addressdetails":1,
            "countrycodes":"jp",
        }
        url = f"https://nominatim.openstreetmap.org/search"
        res = requests.get(url=url,params=params)
        res_data = res.json()
        # self.data = {key: res_data.get(key, 0) for key in self.data_keys}
        self._apply_data(res_data)

        return self.data
        # return res_data
    
    def get_geocode_list(self,place_name:str):
        params_gsi={
            "q":place_name
        }
        url = f"https://msearch.gsi.go.jp/address-search/AddressSearch"
        res = requests.get(url=url,params=params_gsi)
        self.data_list = res.json()
        return self.data_list

    def get_reverse(self,*args):
        if len(args)==2 and isinstance(args[0],(float,int)) and isinstance(args[1],(float,int)):
            lat=args[0]
            lon=args[1]
        elif len(args)==1 and isinstance(args[0],(list,tuple)) and isinstance(args[0][0],(float,int)) and isinstance(args[0][1],(float,int)):
            lat=args[0][0]
            lon=args[0][1]
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
        res = requests.get(url=url,params=params)

        res_data=res.json()
        self._apply_data(res_data)
        return self.data
        # return res_data

    """___getで手に入れたjson_dataを本クラスのdata使用に書き換える___"""
    def _apply_data(self,json_data):
        features = json_data.get("features")
        if not features :
            # raise ValueError("Data is None. Cannot access properties.")
            return 
        if isinstance(json_data.get("features"),list):
            feature = features[0]
        else:
            feature = features
        geometry = feature.get("geometry")
        properties = feature.get("properties")
        geocoding = properties.get("geocoding")
        
        cood = {
            "lat":geometry.get("coordinates")[0],
            "lon":geometry.get("coordinates")[1],
        }
        self.data.update(cood)

        address = {key: geocoding.get(key, None) for key in self.address_keys}
        address_keys=["state","city","district","locality",]
        address_value = ""
        for key in address_keys:
            if address.get(key) is not None:
                address_value += address.get(key)
        address["label"] = address_value
        if address["city"] == "東京":
            address["state"] = address["city"]
        self.data["address"].update(address)

    # def __str__(self) -> str:
        
    
if __name__=="__main__":
    # サンプルのaddress
    # addresses = ["東京都千代田区丸の内1丁目","東京タワー","練馬区","原爆ドーム","明治大学","富士山","札幌駅北口駅前広場"]
    addresses = ["静岡市","新宿区","札幌駅北口駅前広場"]
    for address in addresses:
        loc=Location()
        pprint(loc.get_geocode(address))
        # print(address)
        # pprint(loc.data)

    # address="東京ディズニーランド"
    # loc=Location()
    # pprint(loc.get_geocode_list(address))

    # address=(35.7247316,139.5812637)
    # loc=Location()
    # pprint(loc.get_reverse(address))