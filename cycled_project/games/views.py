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

from rest_framework import viewsets, permissions, mixins

from .models import NIKIRunScore
from .serializers import NIKIRunScoreSerializer

import json

class TopView(LoginRequiredMixin,generic.TemplateView):
    template_name="games/top.html"

class RunGameView(LoginRequiredMixin,generic.TemplateView):
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

    def get_queryset(self):
        if self.action == 'list':
            # スコア高い順に並べて上位10件だけ返す
            return NIKIRunScore.objects.filter(not_play_yet=True).order_by('-score')[:10]
        return NIKIRunScore.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # 保存時にログインユーザーを自動セット
        serializer.save(user=self.request.user)
