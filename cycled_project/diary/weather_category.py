def decode(codes):
    weather_categories = {
        0: "Clear",
        1: "Cloudy",
        2: "Cloudy",
        3: "Cloudy",
        40: "Mist",
        41: "Mist",
        42: "Mist",
        43: "Mist",
        44: "Mist",
        45: "Mist",
        46: "Mist",
        47: "Mist",
        48: "Mist",
        49: "Mist",
        50: "Light Rain",
        51: "Light Rain",
        52: "Light Rain",
        53: "Light Rain",
        54: "Light Rain",
        55: "Light Rain",
        56: "Light Rain",
        57: "Light Rain",
        58: "Light Rain",
        59: "Light Rain",
        60: "Rain",
        61: "Rain",
        62: "Rain",
        63: "Rain",
        64: "Rain",
        65: "Rain",
        66: "Rain",
        67: "Rain",
        68: "Rain",
        69: "Rain",
        70: "Snow",
        71: "Snow",
        72: "Snow",
        73: "Snow",
        74: "Snow",
        75: "Snow",
        76: "Snow",
        77: "Snow",
        78: "Snow",
        79: "Snow",
        80: "Showers",
        81: "Showers",
        82: "Showers",
        83: "Showers",
        84: "Showers",
        85: "Snow Showers",
        86: "Snow Showers",
        87: "Snow Showers",
        88: "Snow Showers",
        89: "Snow Showers",
        90: "Thunderstorm",
        91: "Thunderstorm",
        92: "Thunderstorm",
        93: "Thunderstorm",
        94: "Thunderstorm",
        95: "Thunderstorm",
        96: "Thunderstorm",
        97: "Thunderstorm",
        98: "Thunderstorm",
        99: "Thunderstorm"
    }

    if type(codes)==list:
        return [weather_categories.get(code, None) for code in codes]
    else:
        return weather_categories.get(codes, None)

if __name__=="__main__":
    list1=[
        1,2,3,7,10
    ]
    list1=decode(list1)
    print(list1)