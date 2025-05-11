from typing import Any
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from django.utils.decorators import method_decorator
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.core.cache import cache
from django.contrib import messages
from django.utils.safestring import mark_safe
from django.contrib.staticfiles import finders

from rest_framework import views, viewsets, permissions, mixins, throttling
from rest_framework.response import Response

from .models import NIKIRunScore,NIKIRunUserInfo
from .serializers import NIKIRunScoreSerializer,NIKIRunUserInfoSerializer

import json
import os

class TopView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/top.html"

class NIKIRunView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/run.html"

class RouletteView(generic.TemplateView):
    template_name = 'games/roulette.html'

class NIKIRunScoreViewSet(
    mixins.ListModelMixin,
    # mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet):

    serializer_class = NIKIRunScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]  # レート制限（ユーザー、匿名ユーザー）

    def get_queryset(self):
        if self.action == 'list':
            # スコア高い順に並べて上位10件だけ返す
            return NIKIRunScore.objects.exclude(score__isnull=True).order_by('-score')[:10]
        return NIKIRunScore.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        # 現在のスコアを取得
        instance = self.get_object()
        # 新しいスコアが現在のスコア以上かどうかを確認
        new_score = serializer.validated_data.get('score',0)
        if not instance.score or new_score > instance.score:
            # 新しいスコアが現在のスコア以上であれば更新
            serializer.save()
            serializer._is_newrecord = True  # ★ここで動的にフラグを立てる！

# 主に，コイン換金，キャラ購入用のViewSet
class NIKIRunUserInfoViewSet(
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet):

    serializer_class = NIKIRunUserInfoSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]  # レート制限（ユーザー、匿名ユーザー）

    def get_queryset(self):
        return NIKIRunUserInfo.objects.filter(user=self.request.user)  # 対象は自分のデータだけ

class NIKIRunDataAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]

    def get(self, request, format=None):
        user = request.user

        # プレイヤーデータ読み込み
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, 'data', 'players.json')
        with open(json_path, 'r') as f:
            players_data = json.load(f)

        # NIKIRunUserInfoを取得または作成
        user_info, _ = NIKIRunUserInfo.objects.get_or_create(user=user)
        user_info_serialized = NIKIRunUserInfoSerializer(user_info).data
        # NIKIRunScoreを取得または作成
        score_data, _ = NIKIRunScore.objects.get_or_create(user=user)
        score_serialized = NIKIRunScoreSerializer(score_data).data

        # 使えるキャラクターだけ情報を乗せる
        owned_characters = user_info.owned_characters
        players_with_info = {}
        for player in players_data:
            player_key = player['key']
            if player_key in owned_characters:
                players_with_info[player_key] = player
            else:
                players_with_info[player_key] = {'price': player.get('price')}

        return Response({
            'players': players_with_info,
            'user_info': user_info_serialized,
            'score': score_serialized,
        })

