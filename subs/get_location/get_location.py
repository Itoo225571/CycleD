from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import re

from pprint import pprint

class Location():
    def __init__(self,*args):
        geolocator = Nominatim(user_agent="user",timeout=10)
        if len(args)==2 and isinstance(args[0],(float,int)) and isinstance(args[1],(float,int)):
            geo=RateLimiter(geolocator.reverse,min_delay_seconds=1)
            arg=args
        elif len(args)==1 and isinstance(args[0],(list,tuple)) and isinstance(args[0][0],(float,int)) and isinstance(args[0][1],(float,int)):
            geo=RateLimiter(geolocator.reverse,min_delay_seconds=1)
            arg=args[0]
        elif len(args)==1 and isinstance(args[0],str):
            geo=RateLimiter(geolocator.geocode,min_delay_seconds=1)
            arg=args[0]
        else:
            raise ValueError("Invalid arguments")
        
        ret=geo(arg,language="ja",timeout=5.0)
        self._data={
            "name":ret.raw["name"],
            "latitude":ret.latitude,
            "longitude":ret.longitude,
            "original_address":ret.address
        }
        address_dict=self._organize(ret.address)
        self._data.update(address_dict)

    def _organize(self,address):
        # 正規表現を使って郵便番号を取り除く
        clean_pattern = r'\b\d{3}-\d{4}\b,'
        post_number=re.search(clean_pattern,address)
        post_number = post_number.group() if post_number else None

        address=re.sub(clean_pattern,"",address)
        
        # 文字列反転
        address_list = address.split(',')[::-1]
        address_list = [item.strip() for item in address_list if item]

        address_str="".join(address_list)
        while len(address_list) < 5:
            address_list.append(None)
        address_dict={
            "country": address_list[0],
            "prefecture": address_list[1],
            "district":address_list[2],#練馬区とかさいたま市はここ
            "city": address_list[3],
            # "street": address_list[4],
            "post_number":post_number,
            "address":address_str,
        }
        return address_dict
    
    # 地名入力の場合：地名を返す
    # 緯度経度入力の場合：地区を返す
    def __str__(self) -> str:
        if self.name != "":
            return str(self.name)
        else:
            return str(self.district)
    @property
    def city(self):
        return self._data.get('city')

    @property
    def country(self):
        return self._data.get('country')

    @property
    def district(self):
        return self._data.get('district')

    @property
    def latitude(self):
        return self._data.get('latitude')

    @property
    def longitude(self):
        return self._data.get('longitude')

    @property
    def name(self):
        return self._data.get('name')

    @property
    def original_address(self):
        return self._data.get('original_address')

    @property
    def post_number(self):
        return self._data.get('post_number')

    @property
    def prefecture(self):
        return self._data.get('prefecture')
    
    @property
    def address(self):
        return self._data.get('address')

    @property
    def data(self):
        return self._data
    
if __name__=="__main__":
    # サンプルのaddress
    addresses = ["東京都","東京都千代田区丸の内1丁目","東京タワー","練馬区","幕張メッセ",(35.7247316,139.5812637)]
    for address in addresses:
        loc=Location(address)
        print(loc)
        pprint(loc.data)

    # address="幕張メッセ"
    # loc=Location(address)
    # pprint(loc.location_params)

    # address=(35.7247316,139.5812637)
    # loc=Location(address)
    # print(loc)
    # pprint(loc.location_params)