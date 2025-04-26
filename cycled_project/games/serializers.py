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
        """listの時はscore_idを除く"""
        rep = super().to_representation(instance)
        view = self.context.get('view', None)
        if view and view.action == 'list':
            rep.pop('score_id', None)  # listならscore_idを消す
        return rep