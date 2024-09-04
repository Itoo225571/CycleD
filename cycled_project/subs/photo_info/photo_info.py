from PIL import Image
import pillow_heif
import exifread
from fractions import Fraction
from pydantic import BaseModel,field_serializer
from datetime import datetime
from pathlib import Path

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from get_location import get_location

class Photo(BaseModel):
    dt: datetime
    location: get_location.LocationData
    path: Path
    @field_serializer("dt")
    def serialize_sunrise(self, value: datetime) -> dict:
        return {
            'year': value.year,
            'month': value.month,
            'day': value.day,
            'hour': value.hour,
            'minute': value.minute,
            'second': value.second
        }
    
def get_photo_info(infile):
    pillow_heif.register_heif_opener()
    try:
        # img = Image.open(infile)
        # EXIFデータの取得
        with open(infile, 'rb') as f:
            exif_data = exifread.process_file(f)
        if exif_data:
            photo_info = get_from_photo(exif_data)
            if photo_info:
                lat,lon,dt = photo_info
                location = get_location.regeocode_HeartTails(lat,lon)
                photo_dict = {"dt":dt,"location":location,"path":infile}
                photo = Photo(**photo_dict)
                return photo
            else:
                print("GPS情報の取得に失敗しました。")
        else:
            print("EXIFデータの読み込みに失敗しました。")
    except FileNotFoundError:
        print(f"ファイルが見つかりません: {infile}")
        return None
    except IOError:
        print(f"ファイルの読み込みに失敗しました: {infile}")
        return None

def dms_to_decimal(dms,ref):
    """度分秒（DMS）リストから10進数の座標に変換する関数"""
    degrees, minutes, seconds = dms
    decimal = degrees + (minutes / 60) + (seconds / 3600)
    if ref in ['S', 'W']:
        return -decimal  # 南緯または西経の場合は負の値にする
    return decimal

def get_from_photo(exif_data):
    def parse_dms_string(dms_string):
        """DMS形式の文字列をリストに変換する関数"""
        try:
            # 文字列を分割し、数値に変換
            dms_list = dms_string.replace(' ', '').strip('[]').split(',')
            dms_list = [float(Fraction(str)) for str in dms_list]
            if len(dms_list) == 3:
                return dms_list
            else:
                raise ValueError("DMS形式が不正です。")
        except ValueError:
            print("DMS形式の文字列が正しくありません。")
            return None
    try:
        lat_ref = exif_data["GPS GPSLatitudeRef"].printable.strip()
        lon_ref = exif_data["GPS GPSLongitudeRef"].printable.strip()
        lat_dms = exif_data["GPS GPSLatitude"].printable
        lon_dms = exif_data["GPS GPSLongitude"].printable
        pre_latitude = parse_dms_string(lat_dms)
        pre_longitude = parse_dms_string(lon_dms)
        # pre_height = exif_data["GPS GPSAltitude"].printable
        
        if pre_latitude and pre_longitude:
            latitude = dms_to_decimal(pre_latitude,lat_ref)
            longitude = dms_to_decimal(pre_longitude,lon_ref)
        
        datetime_str = exif_data.get("Image DateTime").printable
        dt = datetime.strptime(datetime_str, '%Y:%m:%d %H:%M:%S')
        return (latitude, longitude, dt)
    except KeyError:
        print("必要なGPS情報が含まれていません。")
        return None
    
if __name__=="__main__":
    file = r"C:\Users\desig\Box\設計システム研究室\研究用データ\研究グループ\ロバスト設計\2024-_伊藤大貴\着陸シミュレーション\jiantwork\20240904\初期範囲result\IMG_0474.HEIC"
    info = get_photo_info(file)