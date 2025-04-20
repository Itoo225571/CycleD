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

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

import json

class TopView(generic.TemplateView):
    template_name="games/top.html"

class RunGameView(generic.TemplateView):
    template_name="games/run.html"

class RouletteView(generic.TemplateView):
    template_name = 'games/roulette.html'