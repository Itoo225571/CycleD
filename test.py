import time
import requests
# import httpx as requests
import asyncio

BASE_URL = "https://jsonplaceholder.typicode.com/"

def calc_time(fn):
    """関数の実行時間を計測するデコレータ"""
    def wrapper(*args, **kwargs):
        start = time.time()
        fn(*args, **kwargs)
        end = time.time()
        print(f"[{fn.__name__}] elapsed time: {end - start}")
        return
    return wrapper
###############################################################
def get_sync(path: str) -> dict:
    print(f"/{path} request")
    res = requests.get(BASE_URL + path)
    print(f"/{path} request done")
    return res.json()

@calc_time
def main_sync():
    data_ls = []
    paths = [
        "posts",
        "comments",
        "albums",
        "photos",
        "todos",
        "users",
    ]
    for path in paths:
        data_ls.append(get_sync(path))
    return data_ls
###############################################################
async def get_async(path: str) -> dict:
    print(f"/{path} async request")
    url = BASE_URL + path
    loop = asyncio.get_event_loop()
    # イベントループで実行
    res = await loop.run_in_executor(None, requests.get, url)
    print(f"/{path} async request done")
    return res.json()

@calc_time
def main_async():
    # イベントループを取得
    loop = asyncio.get_event_loop()
    # 非同期実行タスクを一つのFutureオブジェクトに
    tasks = asyncio.gather(
        get_async("posts"),
        get_async("comments"),
        get_async("albums"),
        get_async("photos"),
        get_async("todos"),
        get_async("users"),
    )
    # 非同期実行、それぞれが終わるまで
    results = loop.run_until_complete(tasks)
    return results


if __name__ == "__main__":
    main_async()
