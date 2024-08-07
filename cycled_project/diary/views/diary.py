from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from ..forms import *

"""______Diary関係______"""
class DiaryView(LoginRequiredMixin,generic.TemplateView):
    template_name = "diary/diary.html"
    pass

class DiaryListView(LoginRequiredMixin,generic.ListView):
    template_name = "diary/diary_list.html"
    pass

class DiaryNewView(LoginRequiredMixin,generic.CreateView):
    template_name = "diary/diary_new.html"
    form_class = DiaryNewForm
    success_url = reverse_lazy("diary:home")
    pass

class DiaryEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass
