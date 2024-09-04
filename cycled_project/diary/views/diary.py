from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.http import JsonResponse
from django.utils.timezone import now
from ..forms import *
from .address import address_search,regeocode

from datetime import timedelta
import json


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
        current_date = now().date()
        one_year_ago = current_date - timedelta(days=365)
        diaries = Diary.objects.prefetch_related('locations').filter(
            date__gte=one_year_ago,
            date__lte=current_date,
            user=request.user,
        )
        # カスタムシリアル化
        diaries_data = []
        for diary in diaries:
            diary_data = {
                "diary_id": diary.id,
                "date": diary.date.isoformat(),
                "comment": diary.comment,
                "locations": []
            }
            for location in diary.locations.all():
                location_data = {
                    "location_id": location.id,
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
        return  super().form_valid(form)
    # エラーがあったことを知らせるやつ
    def form_invalid(self, form):
        # self.object = None
        # context = self.get_context_data()
        # context['diary_form_errors'] = True
        # エラー情報をセッションに保存
        self.request.session['diary_form_errors'] = form.errors.as_json()
        redirect_url = reverse_lazy('diary:diary')
        return HttpResponseRedirect(redirect_url)
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        # ユーザーをフォームに渡す
        kwargs['request'] = self.request
        return kwargs

class DiaryNewView(LoginRequiredMixin,DiaryMixin,generic.CreateView):
    template_name = "diary/diary.html"
    form_class = DiaryForm
    # formset_class = LocationInDiaryFormSet
    success_url = reverse_lazy("diary:diary")
    model = Diary

    def post(self, request, *args: str, **kwargs: Any) -> HttpResponse:
        if "address-search-form" in request.POST:
            return self.handle_address_search(request)
        elif "address-select-form" in request.POST:
            return self.handle_address_select(request)
            # return self.form_invalid(None)
        elif "get-current-address-form" in request.POST:
            return self.handle_get_current_address(request)
        elif "diary-new-form" in request.POST:
            return self.handle_diary_new(request)
        elif "diary-edit-form" in request.POST:
            # return self.handle_diary_edit(request)
            pass
        else:
            print(f"post name error: {request.POST}")
            return self.form_invalid(None)
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # セッションからエラー情報を取得
        form_errors = self.request.session.pop('diary_form_errors', None)
        if form_errors:
            # エラー情報を辞書形式に変換してコンテキストに追加
            context['diary_form_errors'] = json.loads(form_errors)
        return context

    def handle_address_search(self, request):
        form = AddressSearchForm(request.POST)
        if form.is_valid():
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return address_search(request,form)
            # return self.form_valid(form)
        return self.form_invalid(form)

    def handle_address_select(self, request):
        form = LocationForm(request.POST)
        if form.is_valid():
            return self.form_valid(form)
        return self.form_invalid(form)

    def handle_get_current_address(self, request):
        form = LocationCoordForm(request.POST)
        if form.is_valid():
            loc = form.save(commit=False)
            lat = form.cleaned_data["lat"]
            lon = form.cleaned_data["lon"]
            # 住所情報の取得
            geo = regeocode(lat, lon)
            loc.state = geo.address.state
            loc.display = geo.address.display
            loc.label = geo.address.label
            response = {
                "data": loc.to_dict(),
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            # 最初のフォームが無効な場合
            return self.form_invalid(form)

    def handle_diary_new(self, request):
        # print(request.POST)
        form = DiaryForm(request.POST, request=request)
        if form.is_valid():
            return self.form_valid(form)
        return self.form_invalid(form)

class DiaryEditView(LoginRequiredMixin,DiaryMixin,generic.UpdateView):
    is_update_view = True
    template_name = "diary/diary.html"
    form_class = DiaryForm
    success_url = reverse_lazy("diary:diary")
    model = Diary
    
    def get(self, request, *args, **kwargs):
        return redirect(reverse_lazy('diary:diary'))

    def post(self, request, pk):
        diary = get_object_or_404(Diary, pk=pk)
        form = DiaryForm(request.POST, instance=diary, request=request)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

# class DiaryEditView(LoginRequiredMixin,generic.View):
#     success_url = reverse_lazy("diary:diary")
#     def post(self, request, pk):
#         # print(request.POST)
#         # Diary インスタンスを取得
#         diary = get_object_or_404(Diary, pk=pk)
#         form = DiaryForm(request.POST, instance=diary, request=request)
#         if form.is_valid():
#             # フォームが有効な場合、データを保存
#             form.save()
#             return HttpResponseRedirect(self.get_success_url())
#         else:
#             # フォームが無効な場合
#             return self.form_invalid(form)
#     def get_success_url(self):
#         return self.success_url
#     def form_invalid(self, form):
#         context = self.get_context_data()
#         context['diary_form_errors'] = True
#         return self.render_to_response(context)

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    template_name = "diary/diary.html"
    success_url = reverse_lazy("diary:diary")
    model = Diary
    def get(self, request, *args, **kwargs):
        return redirect(reverse_lazy('diary:diary'))
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        print(f"Deleted object with ID: {self.kwargs['pk']}")
        return response
    
class DiaryPhotoView(LoginRequiredMixin,generic.View):
    template_name ="diary/diary_photo.html"
    success_url = reverse_lazy("diary:diary")
    redirect_url = reverse_lazy('diary:diary_photo')

    def get(self, request, *args, **kwargs):
        photo_form = PhotoForm()
        # location_formset = LocationFormSet(queryset=Location.objects.none())
        diary_formset = DiaryFormSet(queryset=Diary.objects.none())
        return render(request, 
                    self.template_name, 
                    {'photo_form': photo_form, 'diary_formset': diary_formset}
                    )
    
    def post(self, request, *args: str, **kwargs: Any) -> HttpResponse:
        if "diary-new-form" in request.POST:
            diary_formset = DiaryFormSet(request.POST)
            # location_formset = LocationFormSet(request.POST)
            if diary_formset.is_valid():
                return self.formset_valid(diary_formset)
            else:
                return self.formset_invalid(diary_formset)
        else:
            print(f"post name error: {request.POST}")
            return self.formset_invalid(None)
    
    def get_success_url(self):
        return self.success_url
        
    def formset_valid(self, diary_formset):
        diaries = diary_formset.save(commit=False)
        for diary in diaries:
            diary.user = self.request.user  # 現在のユーザーを設定
            diary.save()  # 保存
        return HttpResponseRedirect(self.get_success_url())

    def formset_invalid(self, diary_formset=None):
        self.request.session['diaryphoto_form_errors'] = diary_formset.errors.as_json()
        return HttpResponseRedirect(self.redirect_url)
    
    def get_form_kwargs(self):
        kwargs = {'data': self.request.POST or None, 'files': self.request.FILES or None}
        kwargs['request'] = self.request
        return kwargs


# 写真データから位置情報を取り出して送る
def photos2Locations(request,form):
    if request.method == 'POST':
        photo_list = form.cleaned_data.get("image")
        data_list = []
        for photo in photo_list:
            photo_data = get_photo_info(photo)
            data_list.append(photo_data.to_dict())

        return JsonResponse(data_list, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)