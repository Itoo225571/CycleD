from rest_framework import serializers
from .models import Location,Diary

import datetime

class LocationSerializer(serializers.ModelSerializer):
    # image = serializers.ImageField(source='image.url', required=False)
    class Meta:
        model = Location
        fields = [
            'location_id', 
            'lat', 
            'lon', 
            'state', 
            'display', 
            'label', 
            'image', 
            'image_hash', 
            'diary', 
            'is_home', 
            'is_thumbnail'
        ]

class DiarySerializer(serializers.ModelSerializer):
    locations = LocationSerializer(many=True, read_only=True)
    class Meta:
        model = Diary
        fields = [
            'diary_id', 
            'date', 
            'comment', 
            'locations',
            'rank',
            'is_public',
        ]