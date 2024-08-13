from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction

from ..forms import *

"""______Diary関係______"""
class DiaryView(LoginRequiredMixin,generic.TemplateView):
    template_name = "diary/diary.html"
    pass

class DiaryListView(LoginRequiredMixin,generic.ListView):
    template_name = "diary/diary_list.html"
    model = Diary
    context_object_name = 'diaries'  # テンプレートで使用するコンテキスト変数の名前

# 日記作成・編集共通のクラス
class DiaryMixin(object):
    def form_valid(self, form):
        form.instance.user = self.request.user
        response = super().form_valid(form)
        location_ids = self.request.POST.getlist('locations')
        diary = self.object
        for location_id in location_ids:
            # Locationオブジェクトを取得
            location = get_object_or_404(Location, id=location_id)
            # DiaryオブジェクトをLocationに関連づける
            location.diary = diary
            location.save()
        return response
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        # ユーザーをフォームに渡す
        kwargs['request'] = self.request
        return kwargs

class DiaryNewView(LoginRequiredMixin,DiaryMixin,generic.CreateView):
    template_name = "diary/diary_new.html"
    form_class = DiaryForm
    # formset_class = LocationInDiaryFormSet
    success_url = reverse_lazy("diary:home")
    model = Diary

class DiaryEditView(LoginRequiredMixin,DiaryMixin,generic.UpdateView):
    is_update_view = True
    template_name = "diary/diary_new.html"
    form_class = DiaryForm
    # formset_class = LocationInDiaryFormSet
    success_url = reverse_lazy("diary:home")
    model = Diary

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass
