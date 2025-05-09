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

from .models import NIKIRunScore
from .serializers import NIKIRunScoreSerializer

import json
import os

class TopView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/top.html"

class NIKIRunScoreView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/run.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # ログインユーザーのNIKIRunScoreを取得
        user = self.request.user
        # user.nikirunscoreが存在しない場合、新規作成
        if not hasattr(user, 'nikirunscore'):
            # 新規作成
            NIKIRunScore.objects.create(user=user, score=0.0)  # 初期スコアは0.0
            # 再度取得
            user.nikirunscore = NIKIRunScore.objects.get(user=user)

        # コンテキストにuser.nikirunscoreを追加
        context['score'] = user.nikirunscore
        return context

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
            return NIKIRunScore.objects.filter(not_play_yet=True).order_by('-score')[:10]
        return NIKIRunScore.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # 保存時にログインユーザーを自動セット
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # 現在のスコアを取得
        instance = self.get_object()
        # 新しいスコアが現在のスコア以上かどうかを確認
        new_score = serializer.validated_data.get('score', instance.score)  # 新しいスコアが渡されていない場合は現在のスコアを使用
        if new_score >= instance.score:
            # 新しいスコアが現在のスコア以上であれば更新
            serializer.save()
            serializer._is_newrecord = True  # ★ここで動的にフラグを立てる！

class NIKIRunDataAPIView(views.APIView):
    # ログイン必須とレート制限を追加
    permission_classes = [permissions.IsAuthenticated]  # ログイン必須
    throttle_classes = [
        throttling.UserRateThrottle, 
        throttling.AnonRateThrottle,
    ]  # レート制限（ユーザー、匿名ユーザー）

    def get(self, request, format=None):
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, 'data', 'players.json')
        map_dir = os.path.join(base_dir, 'data', 'map')

        # キャラクターデータ読み込み
        with open(json_path, 'r') as f:
            players_data = json.load(f)

        # マップデータ読み込み
        maps = []
        for filename in os.listdir(map_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(map_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        map_data = json.load(f)
                        map_name = os.path.splitext(filename)[0]    # 拡張子 .json を取り除く
                        maps.append({
                            'name': map_name,
                            'data': map_data
                        })
                    except json.JSONDecodeError:
                        continue

        # 両方まとめて返す
        return Response({
            'players': players_data,
            'maps': maps
        })
