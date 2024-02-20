from test2 import GPS_loader
import os

import folium
from geopy.geocoders import Nominatim

photo_name="img/IMG_0529.jpg"
path=os.path.join(os.path.dirname(__file__),photo_name)
geolocation=GPS_loader(path)

location=[geolocation["Lat"],geolocation["Long"]]

m=folium.Map(location=location,zoom_start=16)
folium.Marker(location).add_to(m)
m.save("map.html")

print(location)