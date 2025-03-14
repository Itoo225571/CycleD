import requests
import random

def get_pictures(api_key,keyword,num=50):
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    params = {
        "query": keyword,
        # "page": 1,
        "per_page": num,
        "order": "popular",
        'orientation': 'landscape',  # 横長の画像
    }  # 画像をnum枚取得

    response = requests.get(url, headers=headers, params=params)
    images = response.json().get("photos", [])  # 画像リストを取得
    return images

def get_random_url(images):
    # 画像リストからランダムに1枚を選ぶ
    if images:
        random_image = random.choice(images)  # ランダムで1枚選択
        image_url = random_image['src']['original']  # 画像URLを取得
    else:
        image_url = None
    return image_url