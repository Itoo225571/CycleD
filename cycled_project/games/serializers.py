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
        fields = ['score_id', 'user', 'score', 'updated_at']  # 必要なフィールドを指定
        read_only_fields = ['score_id', 'updated_at']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # listの時はidを除く
        view = self.context.get('view', None)
        if view and view.action == 'list':
            rep.pop('score_id', None)
        # updated_atをdate形式(YYYY-MM-DD)に変換
        if rep.get('updated_at'):
            rep['updated_at'] = instance.updated_at.strftime('%Y-%m-%d')

        return rep