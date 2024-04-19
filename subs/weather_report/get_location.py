from geopy.geocoders import Nominatim
import re

from pprint import pprint

class Location():
    def __init__(self,*args):
        geolocator = Nominatim(user_agent="user")
        if len(args)==2 and isinstance(args[0],(float,int)) and isinstance(args[1],(float,int)):
            ret=geolocator.reverse(args,timeout=5.0)
        elif len(args)==1 and isinstance(args[0],str):
            ret=geolocator.geocode(args[0],timeout=5.0)
        else:
            raise ValueError("Invalid arguments")

        self.location_params={
            "name":ret.raw["name"],
            "latitude":ret.latitude,
            "longitude":ret.longitude,
        }
        address_dict=self._abstract(ret.address)
        self.location_params.update(address_dict)

    def _abstract(self,address):
        # 正規表現を使って郵便番号を取り除く
        clean_pattern = r'\b\d{3}-\d{4}\b,'
        address = re.sub(clean_pattern, '', address)
        # 文字列反転
        address_list = address.split(', ')[::-1]
        while len(address_list) < 5:
            address_list.append(None)
        address_dict={
            "country": address_list[0],
            "prefecture": address_list[1],
            "district":address_list[2],
            "city": address_list[3],
            "street": address_list[4],
        }
        return address_dict
        

if __name__=="__main__":
    # サンプルのaddress
    addresses = ["東京都","東京都千代田区丸の内1丁目","東京タワー","練馬区","幕張メッセ"]
    for address in addresses:
        loc=Location(address)
        pprint(loc.location_params)
    # address="幕張メッセ"
    # loc=Location(address)
    # pprint(loc.location_params)