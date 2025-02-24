from PIL import Image
import pillow_heif
import exifread
from fractions import Fraction
from pydantic import BaseModel,field_serializer
from datetime import datetime
from pathlib import Path
from io import BytesIO
import base64
import imagehash
import logging

from pprint import pprint

class Photo(BaseModel):
    # path: Path
    dt: datetime = None
    lat: float = None
    lon:float = None
    height:float = None
    errors: list[str] = []

    @field_serializer("dt")
    def serialize_sunrise(self, value: datetime) -> dict:
        if value is None:
            # Noneの場合に空の辞書を返すか、デフォルト値を返す
            return {
                'year': None,
                'month': None,
                'day': None,
                'hour': None,
                'minute': None,
                'second': None
            }
        return {
            'year': value.year,
            'month': value.month,
            'day': value.day,
            'hour': value.hour,
            'minute': value.minute,
            'second': value.second
        }
    
def get_photo_info(infile):
    errors = []
    photo_info = {}
    exif_data = None
    try:
        with open(infile, 'rb') as f:
            exif_data = exifread.process_file(f)
    except Exception as e:
        errors.append(f"ファイルの読み込みに失敗しました: {infile}")
        errors.append(f"エラー: {str(e)}")
    if exif_data:
        photo_info = get_values_from_photo(exif_data)
        if not photo_info:
            errors.append('必要なGPS情報が含まれていません')
    else:
        errors.append("EXIFデータの読み込みに失敗しました。")
    photo_info["errors"] = errors
    photo = Photo(**photo_info)
    return photo

def dms_to_decimal(dms,ref):
    """度分秒（DMS）リストから10進数の座標に変換する関数"""
    degrees, minutes, seconds = dms
    decimal = degrees + (minutes / 60) + (seconds / 3600)
    if ref in ['S', 'W']:
        return -decimal  # 南緯または西経の場合は負の値にする
    return decimal

def get_values_from_photo(exif_data):
    def parse_dms_string(dms_string):
        """DMS形式の文字列をリストに変換する関数"""
        try:
            dms_list = dms_string.replace(' ', '').strip('[]').split(',')
            dms_list = [float(Fraction(value)) for value in dms_list]
            if len(dms_list) == 3:
                return dms_list
            else:
                raise ValueError("DMS形式が不正です。")
        except ValueError as e:
            logging.error(f"DMS形式の文字列が正しくありません: {e}")
            return None

    try:
        # GPS情報
        lat_ref = exif_data.get("GPS GPSLatitudeRef")
        lon_ref = exif_data.get("GPS GPSLongitudeRef")
        lat_dms = exif_data.get("GPS GPSLatitude")
        lon_dms = exif_data.get("GPS GPSLongitude")
        pre_height = exif_data.get("GPS GPSAltitude")

        # 日付情報
        datetime_str = exif_data.get("Image DateTime")
        dt = None
        if datetime_str:
            try:
                dt = datetime.strptime(datetime_str.printable, '%Y:%m:%d %H:%M:%S')
            except ValueError:
                logging.error(f"日付の形式が不正です: {datetime_str.printable}")

        # GPSデータが存在しない場合でも日付だけは返す
        if not all([lat_ref, lon_ref, lat_dms, lon_dms]):
            logging.warning("緯度・経度の情報が含まれていません。")
            return {"dt": dt } if dt else {}

        # GPSデータの処理
        lat_ref = lat_ref.printable.strip()
        lon_ref = lon_ref.printable.strip()
        pre_latitude = parse_dms_string(lat_dms.printable)
        pre_longitude = parse_dms_string(lon_dms.printable)

        if not pre_latitude or not pre_longitude:
            return {"dt": dt} if dt else {}

        latitude = dms_to_decimal(pre_latitude, lat_ref)
        longitude = dms_to_decimal(pre_longitude, lon_ref)
        height = float(Fraction(pre_height.printable)) if pre_height else None

        return {"dt": dt, "lat": latitude, "lon": longitude, "height": height}

    except Exception as e:
        logging.error(f"EXIFデータの解析中にエラーが発生しました: {e}")
        return {"dt": dt} if dt else {}


def to_jpeg(original_file, quality=80, max_size=(1920, 1080)):
    pillow_heif.register_heif_opener()
    with Image.open(original_file) as img:
        img.thumbnail(max_size)  # 画像のサイズを1280x720に制限
        jpeg_io = BytesIO()
        img.convert('RGB').save(jpeg_io, format='JPEG', quality=quality) #exifを削除
        jpeg_io.seek(0)  # ファイルポインタを先頭に戻す
        return jpeg_io

def to_base64(image):
    image_file = image.read()
    encoded_image = base64.b64encode(image_file).decode('utf-8')
    return encoded_image

def to_pHash(image):
    pillow_heif.register_heif_opener()
    img = Image.open(image)
    phash = imagehash.phash(img)  # pHashを生成
    return str(phash)  # ハッシュ値を文字列として返す

if __name__=="__main__":
    file = r"/Users/itoudaiki/Downloads/plus.png"
    file= r"/Users/itoudaiki/Library/CloudStorage/OneDrive-MeijiMail/設計計画/写真/20240731_081808188_iOS.heic"
    file = r"/Users/itoudaiki/Library/CloudStorage/OneDrive-MeijiMail/設計計画/写真/IMG_0907.jpg"

    info = get_photo_info(file)