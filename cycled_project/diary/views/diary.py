from django.http import HttpRequest, HttpResponse
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect
from django.db import transaction

from ..forms import *

"""______Diary関係______"""
class DiaryView(LoginRequiredMixin,generic.TemplateView):
    template_name = "diary/diary.html"
    pass

class DiaryListView(LoginRequiredMixin,generic.ListView):
    template_name = "diary/diary_list.html"
    pass

# 日記作成・編集共通のクラス
class DiaryMixin(object):
    def form_valid(self, form, formset):
        # formset.saveでインスタンスを取得できるように、既存データに変更が無くても更新対象となるようにする
        for location_form in formset.forms:
            if location_form.cleaned_data:
                location_form.has_changed = lambda: True

        # インスタンスの取得
        diary = form.save(commit=False)
        formset.instance = diary
        locations = formset.save(commit=False)
        diary.user = self.request.user

        # DB更新
        with transaction.atomic():
            diary.save()
            formset.instance = diary
            formset.save()

        # 処理後は詳細ページを表示
        return redirect(diary.get_absolute_url())

class DiaryNewView(LoginRequiredMixin,generic.CreateView):
    template_name = "diary/diary_new.html"
    form_class = DiaryNewForm
    success_url = reverse_lazy("diary:home")
    
    def form_valid(self, form):
        form.instance.user = self.request.user  # 現在のユーザーを設定
        return super().form_valid(form)

class DiaryEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass
