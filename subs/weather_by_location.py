import geocoder

if __name__=="__main__":
    place_names=["練馬","東京タワー","荒川","明治大学生田",]
    for place in place_names:
        ret=geocoder.osm(place,timeout=5.0)
        print(ret.address)