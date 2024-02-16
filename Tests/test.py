import folium
from geopy.geocoders import Nominatim

geolocator=Nominatim(user_agent="geoapiExcercises")
geolocation=geolocator.geocode("幕張駅")

location=[geolocation.latitude,geolocation.longitude]

m=folium.Map(location=location,zoom_start=16)
folium.Marker(location).add_to(m)
m.save("map.html")

print(location)
