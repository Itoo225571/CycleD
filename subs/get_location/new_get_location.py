from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

from pprint import pprint

if __name__=="__main__":
    geolocator = Nominatim(user_agent="user",timeout=10)
    rets=geolocator.geocode("東京ディズニーランド",exactly_one=False)
    print(type(rets))