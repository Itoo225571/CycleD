from typing import Any
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django_user_agents.utils import get_user_agent

from ..forms import *

from datetime import datetime,timedelta

class TopView(generic.TemplateView):
    template_name="diary/top.html"

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)
    
class CacheMixin:
    @method_decorator(cache_page(60 * 15))  # 15分間キャッシュ
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

class BaseContextMixin:
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # ユーザーエージェント情報をコンテキストに追加
        context['user_agent'] = get_user_agent(self.request)
        return context