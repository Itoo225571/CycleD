from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.http import JsonResponse
from django.utils.timezone import now
from django.core.files import File
from django.core.files.uploadedfile import InMemoryUploadedFile
from ..forms import *

from .address import address_search,regeocode
from subs.photo_info.photo_info import get_photo_info,to_jpeg,to_base64

from datetime import timedelta
import json
import tempfile
from pprint import pprint

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

    def form_invalid(self, form):
        # エラーをセッションに保存(Editでも使えるようにする)
        self.request.session['diary_form_errors'] = json.dumps(form.errors,ensure_ascii=False)
        # 新規作成画面にリダイレクト
        return redirect(reverse_lazy('diary:diary'))
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        # ユーザーをフォームに渡す
        kwargs['request'] = self.request
        return kwargs
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # セッションからエラー情報を取得
        form_errors = self.request.session.pop('diary_form_errors', None)
        if form_errors:
            # エラー情報を辞書形式に変換してコンテキストに追加(リストにするのは複数ある他と合わせるため)
            context['form_errors'] = [json.loads(form_errors)]
        return context

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
        diary = get_object_or_404(Diary, pk=pk, user=request.user)
        form = DiaryForm(request.POST, instance=diary, request=request)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)
    
class DiaryDeleteView(LoginRequiredMixin, generic.DeleteView):
    template_name = "diary/diary.html"
    success_url = reverse_lazy("diary:diary")
    model = Diary
    
    def get(self, request, *args, **kwargs):
        return redirect(reverse_lazy('diary:diary'))
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # print(f"Deleted object with ID: {self.kwargs['pk']}")
        return response

class DiaryPhotoView(LoginRequiredMixin,generic.FormView):
    template_name ="diary/diary_photo.html"
    success_url = reverse_lazy("diary:diary")
    redirect_url = reverse_lazy('diary:diary_photo')
    form_class = PhotoForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['photo_form'] = context.pop('form', None)
        context['diary_formset'] = DiaryFormSet(queryset=Diary.objects.none())
        return context
    
    def post(self, request, *args: str, **kwargs: Any) -> HttpResponse:
        if "diary-new-form" in request.POST:
            return self.handle_diary_formset(request)
        elif "photos-form" in request.POST:
            return self.photos2LocationsAndDate(request)
        else:
            print(f"post name error: {request.POST}")
            return self.form_invalid(None)
        
    def form_valid(self, diary_formset, location_formset):
        diaries = diary_formset.save(commit=False)
        for diary in diaries:
            diary.user = self.request.user  # 現在のユーザーを設定
            diary.save()  # 保存
        for form in location_formset.forms:
            image_file = form.cleaned_data.get("temp_image")
            if image_file:
                image_file = to_jpeg(image_file)
                # 後で変えるので名前はなんでもいい
                jpeg_file = InMemoryUploadedFile(
                    image_file, field_name=None, name='temp.jpg' ,content_type='image/jpg',
                    size=image_file.getbuffer().nbytes, charset=None
                )
                form.instance.image = jpeg_file

            location = form.save(commit=False)
            date = form.cleaned_data.get("date_of_Diary")
            # location.diary = diaries[index]
            location.diary = get_object_or_404(Diary, user=self.request.user, date=date)
            print("diary_in_location{location.diary}")
            location.save()
        return super().form_valid(diary_formset)

    def formset_invalid(self, diary_formset=None, location_formset=None):
        # コンテキストを取得
        context = self.get_context_data()
        context['form_errors'] = []
        # diary_formset が提供されている場合のエラー処理
        if diary_formset:
            context['form_errors'].extend(diary_formset.errors)
        # location_formset が提供されている場合のエラー処理
        if location_formset:
            context['form_errors'].extend(location_formset.errors)
        # コンテキストを使用してレスポンスをレンダリング
        return self.render_to_response(context)
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['request'] = self.request
        return kwargs
    
    def handle_diary_formset(self, request):
        # print(request.POST)
        diary_ids = [id for id in (request.POST.get(f'form-{i}-id') for i in range(int(request.POST.get('form-TOTAL_FORMS')))) if id]
        instance = Diary.objects.filter(user=request.user, id__in=diary_ids).first()
        # diary_queryset = Diary.objects.all()
        diary_formset = DiaryFormSet(request.POST, request=request,)
        # location_formset = LocationFormSet(request.POST,request.FILES,instance=Diary.objects.none().first())
        location_formset = LocationFormSet(request.POST,request.FILES,)

        if diary_formset.is_valid() and location_formset.is_valid():
            return self.form_valid(diary_formset,location_formset)
        else:  
            return self.formset_invalid(diary_formset,location_formset)

    # 写真データから位置情報を取り出して送る 
    def photos2LocationsAndDate(self,request):
        form = PhotoForm(request.POST,request.FILES)
        if form.is_valid():
            files = request.FILES.getlist('location_files')
            location_dict = {}
            dates = set()
            messages = {}
            for i,img_file in enumerate(files):
                with tempfile.NamedTemporaryFile(delete=True) as temp_file:
                    temp_file.write(img_file.read())
                    temp_file_path = temp_file.name
                    photo_data = get_photo_info(temp_file_path)
                    photo_review = to_jpeg(temp_file_path,50)
                if photo_data.errors:
                    for e in photo_data.errors:
                        print(f"Photo data Eorrors: {e}")
                        messages['none_field'] = e
                    continue
                date = photo_data.dt.strftime('%Y-%m-%d')
                dates.add(date)
                geo = regeocode(photo_data.lat,photo_data.lon)
                geo_data = geo.model_dump()

                # 仮置きフィールドから写真を取り出すための変数
                geo_data["file_order"] = i

                geo_data["photo_review"] = to_base64(photo_review)
                location_dict.setdefault(date,[]).append(geo_data)
            
            diary_existed = {}
            location_existed = {}
            diary_existed_query = Diary.objects.filter(date__in=list(dates), user=request.user).prefetch_related('locations')
            for diary in diary_existed_query:
                date = diary.date.strftime('%Y-%m-%d')
                diary_data = {
                    'id': diary.id,
                    'date': date,
                    'comment': diary.comment,
                }
                diary_existed[date] = diary_data
                for location in diary.locations.all():
                    location_existed.setdefault(date,[]).append(location.to_dict())
            
            # すべての既存ロケーションを (date, lat, lon) のタプルに変換
            existing_locations = {
                (diary.date.strftime('%Y-%m-%d'), loc.lat, loc.lon)
                for diary in diary_existed_query
                for loc in diary.locations.all()
            }
            # location_dict から既存ロケーションと一致するものを削除
            for date in list(location_dict.keys()):  # キーのリストを作成してループ
                filtered_geo_data = []
                for geo_data in location_dict[date]:
                    if (date, geo_data['lat'], geo_data['lon']) in existing_locations:
                        messages[date] = '選択した写真と同じものが既に使用されています。'
                    else:
                        filtered_geo_data.append(geo_data)
                location_dict[date] = filtered_geo_data
            location_dict = {k: v for k, v in location_dict.items() if v not in [None, '', [], {}]}

            response = {
                "location_new": location_dict,
                "diary_existed": diary_existed,
                "location_existed": location_existed,
                "message": list(messages),
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            self.form_invalid(form)
