import requests
import random
from PIL import Image
from io import BytesIO
from collections import Counter

def get_pictures(api_key, keyword, num=50, aspect_ratios=[(16, 9), (4, 3)]):
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    params = {
        "query": keyword,
        "per_page": num,
        "order": "popular",
        'orientation': 'landscape',  # 横長の画像
    }

    response = requests.get(url, headers=headers, params=params)
    images = response.json().get("photos", [])  # 画像リストを取得
    
    return filter_images(images,aspect_ratios)

def filter_images(images,aspect_ratios=[(16, 9), (4, 3)]):
    # 縦横比を指定して画像を絞り込む
    filtered_images = []
    for image in images:
        width = image.get('width')
        height = image.get('height')
        
        if width and height:
            # 縦横比を計算
            image_aspect_ratio = width / height
            # 許可する縦横比のリストを定義
            is_valid_aspect_ratio = any(
                abs(image_aspect_ratio - (aspect_ratio[0] / aspect_ratio[1])) < 0.1
                for aspect_ratio in aspect_ratios
            )
            # 許可された縦横比かどうかチェック
            if is_valid_aspect_ratio:
                filtered_images.append(image)
    return filtered_images

def get_random_url(images):
    # 画像リストからランダムに1枚を選ぶ
    if images:
        random_image = random.choice(images)  # ランダムで1枚選択
        image_url = random_image['src']['original']  # 画像URLを取得
    else:
        image_url = None
    return image_url

def is_bright(image_url):
    # 画像をURLから取得
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))

    # 画像をグレースケールに変換
    grayscale_img = img.convert("L")

    # 画像のピクセルデータを取得
    pixels = list(grayscale_img.getdata())

    # 平均輝度を計算
    avg_brightness = sum(pixels) / len(pixels)
    
    # 輝度のしきい値を設定して明るいか暗いか判定
    if avg_brightness > 128:
        return True
    else:
        return False

def get_main_color(image_url, resize=(50, 50)):
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content)).convert('RGB')
    img = img.resize(resize)  # 処理速度のために縮小

    pixels = list(img.getdata())
    most_common_color = Counter(pixels).most_common(1)[0][0]  # 最も多く使われている色

    return most_common_color  # (R, G, B)