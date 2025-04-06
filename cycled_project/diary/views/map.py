from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin

class MapView(LoginRequiredMixin, generic.TemplateView):
    template_name="diary/map.html"