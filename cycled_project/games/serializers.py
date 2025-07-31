from rest_framework import serializers
from .models import NIKIRunScore,NIKIRunUserInfo
from diary.models import Coin
from accounts.models import User

class NIKIRunScoreSerializer(serializers.ModelSerializer):
    # user = UserSerializer()  # userフィールドをUserSerializerでシリアライズ
    user = serializers.StringRelatedField()     # strのみ
    class Meta:
        model = NIKIRunScore
        fields = ['id', 'user', 'score', 'updated_at', 'character']  # 必要なフィールドを指定
        read_only_fields = ['id','updated_at','user',]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # listアクションのときだけidを除外
        view = self.context.get('view')
        if view and getattr(view, 'action', '') == 'list':
            rep.pop('id', None)

        # updated_atをdate形式(YYYY-MM-DD)に変換
        if rep.get('updated_at'):
            rep['updated_at'] = instance.updated_at.strftime('%Y-%m-%d')
            
        # ★ フラグが立ってたら is_newrecord を付与！
        if getattr(self, '_is_newrecord', False):
            rep['is_newrecord'] = True
        return rep
    
class CoinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coin
        fields = ['num']
class UserSerializer(serializers.ModelSerializer):
    coin = CoinSerializer()
    class Meta:
        model = User
        fields = ['username','coin']

class NIKIRunUserInfoSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # userフィールドをUserSerializerでシリアライズ
    class Meta:
        model = NIKIRunUserInfo
        fields = ['id','user','owned_characters','bronze_coin','character_last','equipments']
        read_only_fields = ['id','user','owned_characters','bronze_coin','equipments']
