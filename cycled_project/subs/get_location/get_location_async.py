from .get_location import LocationData,ResponseEmptyError
import httpx,asyncio

async def _fetch_data_async(url: str, params: dict, timeout: float = 5.0):
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            res = await client.get(url, params=params)
            res.raise_for_status()
            if not res.text.strip():
                raise ResponseEmptyError(f"レスポンスが空です: {res.url}")
            return res.json()
        except httpx.TimeoutException:
            raise ValueError("リクエストがタイムアウトしました。")
        except httpx.RequestError as e:
            raise ValueError(f"リクエストエラー: {e}")

# 非同期バージョン
async def regeocode_gsi_async(lat: float, lon: float) -> LocationData:
    url = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress"
    params = {
        "lat": lat,
        "lon": lon,
    }
    data = await _fetch_data_async(url, params)
    
    if data:
        result = data.get("results")
        code = result.get("muniCd", "")
        name = result.get("lv01Nm", "")
        address = {
            "geotype": "gsi",
            "name": "" if name == '－' else name,
            "code": code,
        }
        location = {
            "lat": lat,
            "lon": lon,
            "address": address,
        }
        return LocationData(**location)
    else:
        raise Exception("Error: data is empty")

async def regeocode_HeartTails_async(lat: float, lon: float) -> LocationData:
    url = "https://geoapi.heartrails.com/api/json?method=searchByGeoLocation"
    params = {
        "y": lat,
        "x": lon,
    }
    data = await _fetch_data_async(url, params)

    if data:
        result = data.get("response", {}).get("location", [{}])[0]
        address = {
            "geotype": 'HeartRails',
            "name": result.get('town', ""),
            "state": result.get('prefecture', ""),
            "city": result.get('city', ""),
            "locality": result.get('town', ""),
            "postcode": result.get('postal', ""),
        }
        location = {
            "lat": lat,
            "lon": lon,
            "address": address,
        }
        return LocationData(**location)
    else:
        raise Exception("Error: data is empty")

async def regeocode_yahoo_async(lat: float, lon: float, client_id: str) -> LocationData:
    url = "https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": client_id,
        "output": "json",
    }
    data = await _fetch_data_async(url, params)

    if data:
        result = data.get("Feature", [{}])[0]
        element = {item['Level']: item['Name'] for item in result['Property']['AddressElement']}
        code = {item['Level']: item.get('Code') for item in result['Property']['AddressElement']}.get('city', "")
        address = {
            "geotype": "yahoo",
            "search": "",
            "name": element.get('oaza', ""),
            "fulladdress": result['Property']['Address'],
            "code": code,
            "matcher": 1.0,
            "locality": element.get('oaza', ""),
        }
        location = {
            "lat": lat,
            "lon": lon,
            "address": address,
        }
        return LocationData(**location)
    else:
        raise Exception("Error: data is empty")

# ここで非同期関数を呼び出す
if __name__ == "__main__":
    async def main():
        geo = await regeocode_gsi_async(35.7247454, 139.5812729)
        print(geo)
    asyncio.run(main())