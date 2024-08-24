from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.http import JsonResponse
from django.core import serializers
from django.contrib import messages
from ..forms import *

"""______Diary関係______"""
class DiaryListView(LoginRequiredMixin,generic.ListView):
    template_name = "diary/diary_list.html"
    model = Diary
    context_object_name = 'diaries'  # テンプレートで使用するコンテキスト変数の名前

# ajaxでDiary日情報を送る用の関数
def sendDairies(request):
    if request.method == 'GET':
        # Diaryをコンテキストに含める
        # すべてのDiaryと関連するLocationを一度に取得
        diaries = Diary.objects.prefetch_related('locations').all()
        # カスタムシリアル化
        diaries_data = []
        for diary in diaries:
            diary_data = {
                "id": diary.id,
                "date": diary.date.isoformat(),
                "comment": diary.comment,
                "locations": []
            }
            for location in diary.locations.all():
                location_data = {
                    "id": location.id,
                    "lat": location.lat,
                    "lon": location.lon,
                    "state": location.state,
                    "display": location.display,
                    "label": location.label,
                }
                diary_data["locations"].append(location_data)
            diaries_data.append(diary_data)
        return JsonResponse(diaries_data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)

# 日記作成・編集共通のクラス
class DiaryMixin(object):
    def form_valid(self, form):
        form.instance.user = self.request.user
        response = super().form_valid(form)
        # LocationFormSetの処理
        # formset = self.get_form_kwargs().get('formset')
        # if formset:
        #     for location_form in formset:
        #         if location_form.cleaned_data:
        #             # 新規作成または変更されたLocationオブジェクトを取得
        #             location = location_form.save(commit=False)
        #             location.diary = self.object
        #             location.save()
        return response
    # エラーがあったことを知らせるやつ
    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form, form_errors=True))
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        # ユーザーをフォームに渡す
        kwargs['request'] = self.request
        return kwargs        

class DiaryNewView(LoginRequiredMixin,DiaryMixin,generic.CreateView):
    template_name = "diary/diary.html"
    form_class = DiaryForm
    # formset_class = LocationInDiaryFormSet
    success_url = reverse_lazy("diary:home")
    model = Diary

class DiaryEditView(LoginRequiredMixin,DiaryMixin,generic.UpdateView):
    is_update_view = True
    template_name = "diary/diary.html"
    form_class = DiaryForm
    # formset_class = LocationInDiaryFormSet
    success_url = reverse_lazy("diary:home")
    model = Diary

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass
