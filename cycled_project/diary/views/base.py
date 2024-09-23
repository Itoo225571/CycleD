from typing import Any
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin

from ..forms import *

from datetime import datetime,timedelta

class BaseView(generic.TemplateView):
    template_name="diary/base.html"
    def get_context_data(self, **kwargs) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["user"]=request.user # type: ignore
        # context["home"] = request.user.home
        return context

class TopView(generic.TemplateView):
    template_name="diary/top.html"

class HomeView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/home.html"