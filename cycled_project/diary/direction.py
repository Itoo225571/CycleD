from decimal import Decimal, ROUND_HALF_UP

def azimuth_to_direction(azimuth):
    # 16方位の方角を定義する
    directions = ['北', '北北東','北東', '東北東',
                '東', '東南東', '南東', '南南東',
                '南', '南南西', '南西', '西南西',
                '西', '西北西', '北西', '北北西',
                '北'
                ]

    # Decimalモジュールで小数第一位を四捨五入
    directions_index = Decimal(azimuth / 22.5).quantize(Decimal('1.'), rounding=ROUND_HALF_UP)

    return directions[int(directions_index)]

if __name__=="__main__":
    d=[120,210,9,355]
    for i in d:
        print(str(i)+" : "+azimuth_to_direction(i))