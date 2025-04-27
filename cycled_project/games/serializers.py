from rest_framework import serializers
from .models import NIKIRunScore
from django.contrib.auth import get_user_model

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['username']  # usernameのみ

class NIKIRunScoreSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # userフィールドをUserSerializerでシリアライズ

    class Meta:
        model = NIKIRunScore
        fields = ['user', 'score', 'updated_at']  # 必要なフィールドを指定
        read_only_fields = ['updated_at']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # updated_atをdate形式(YYYY-MM-DD)に変換
        if rep.get('updated_at'):
            rep['updated_at'] = instance.updated_at.strftime('%Y-%m-%d')
        # ★ フラグが立ってたら is_newrecord を付与！
        if getattr(self, '_is_newrecord', False):
            rep['is_newrecord'] = True
        return rep