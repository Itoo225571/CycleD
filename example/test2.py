from PIL import Image
from PIL.ExifTags import TAGS,GPSTAGS
import pandas as pd
import os

def GPS_loader(path):
    with Image.open(path) as img:
        exif=img.getexif()
    gps_dict=exif.get_ifd(0x8825)
    gps_str=pd.Series(gps_dict).rename(GPSTAGS)
    Lat=gps_str["GPSLatitude"][0]+gps_str["GPSLatitude"][1]/60+gps_str["GPSLatitude"][2]/3600
    Long=gps_str["GPSLongitude"][0]+gps_str["GPSLongitude"][1]/60+gps_str["GPSLongitude"][2]/3600
    
    info={
        "Latitude":gps_str["GPSLatitude"],
        "Longitude":gps_str["GPSLongitude"],
        "LatitudeRef":gps_str["GPSLatitudeRef"],
        "LongitudeRef":gps_str["GPSLongitudeRef"],
        "Lat":Lat,
        "Long":Long,
    }
    return info

photo_name="img/IMG_0529.jpg"
path=os.path.join(os.path.dirname(__file__),photo_name)
print(GPS_loader(path)["Latitude"])