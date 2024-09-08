from PIL import Image
import pillow_heif
import exifread
from fractions import Fraction
from pydantic import BaseModel,field_serializer
from datetime import datetime
from pathlib import Path
from io import BytesIO

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
    pillow_heif.register_heif_opener()
    img = Image.open(infile)

    try:
        with open(infile, 'rb') as f:
            exif_data = exifread.process_file(f)
        # exif_data = img._getexif()
    except Exception as e:
        errors.append(f"ファイルの読み込みに失敗しました: {infile}")
        errors.append(f"エラー: {str(e)}")
    if exif_data:
        photo_info = get_values_from_photo(exif_data)
    else:
        errors.append("EXIFデータの読み込みに失敗しました。")
    photo_info["errors"] = errors
    # photo_info["path"] = Path(infile)
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
        pre_height = exif_data["GPS GPSAltitude"].printable
        
        if pre_latitude and pre_longitude:
            latitude = dms_to_decimal(pre_latitude,lat_ref)
            longitude = dms_to_decimal(pre_longitude,lon_ref)
        if pre_height:
            height = float(Fraction(pre_height))
        
        datetime_str = exif_data.get("Image DateTime").printable
        dt = datetime.strptime(datetime_str, '%Y:%m:%d %H:%M:%S')
        photo_info = {"dt":dt,"lat":latitude,"lon":longitude,"height":height}

        return photo_info
    except KeyError:
        print("必要なGPS情報が含まれていません。")
        return None
    
def heic2jpeg(heic_file):
    pillow_heif.register_heif_opener()
    image = Image.open(heic_file)
    jpeg_file = BytesIO()
    image.convert('RGB').save(jpeg_file, format='JPEG')
    jpeg_file.seek(0)
    return jpeg_file

if __name__=="__main__":
    file = r"/Users/itoudaiki/Downloads/plus.png"
    file= r"/Users/itoudaiki/Library/CloudStorage/OneDrive-MeijiMail/設計計画/20240905_013804792_iOS.heic"

    info = get_photo_info(file)