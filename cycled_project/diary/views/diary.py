from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from ..forms import *

"""______Diary関係______"""
class DiaryView(LoginRequiredMixin,generic.TemplateView):
    template_name = "diary/diary.html"
    pass

class DiaryNew(LoginRequiredMixin,generic.CreateView):
    pass

class DiaryEdit(LoginRequiredMixin,generic.UpdateView):
    pass

class DiaryDelete(LoginRequiredMixin,generic.DeleteView):
    pass
