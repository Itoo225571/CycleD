from django.http import HttpRequest, HttpResponse
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect
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
    
    def form_valid(self, form):
        form.instance.user = self.request.user  # 現在のユーザーを設定
        location_id = self.request.session.get('diary_location')
        if location_id:
            try:
                location = Location.objects.get(id=location_id)
                form.instance.location = location  # 正しいフィールド名を使用
                print(location)
            except Location.DoesNotExist:
                # ログまたはエラーハンドリング
                pass
        return super().form_valid(form)

class DiaryEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass
