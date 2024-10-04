from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.http import JsonResponse
from django.utils.timezone import now
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile
from ..forms import DiaryForm,AddressSearchForm,LocationForm,LocationCoordForm,LocationFormSet,DiaryFormSet,PhotoForm
from ..models import Diary,Location,TempImage
from django.core.exceptions import ValidationError

from .address import geocode,regeocode
from subs.photo_info.photo_info import get_photo_info,to_jpeg,to_pHash

from datetime import timedelta
import json
import tempfile
import uuid
import os
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
                location_data = location.to_dict()
                diary_data["locations"].append(location_data)
            diaries_data.append(diary_data)
        return JsonResponse(diaries_data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)

# 日記作成・編集共通のクラス
class DiaryMixin(object):
    template_name = "diary/calendar.html"
    form_class = DiaryForm
    success_url = reverse_lazy("diary:calendar")
    model = Diary
    def form_valid(self, form):
        form.instance.user = self.request.user
        return  super().form_valid(form)

    def form_invalid(self, form):
        # エラーをセッションに保存(Editでも使えるようにする)
        self.request.session['diary_form_errors'] = json.dumps(form.errors,ensure_ascii=False)
        print(form.errors)
        # 新規作成画面にリダイレクト
        return redirect(reverse_lazy('diary:calendar'))
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        # ユーザーをフォームに渡す
        kwargs['request'] = self.request
        return kwargs
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # 仮のPK
        context['mock_uuid'] = uuid.uuid4()
        # セッションからエラー情報を取得
        form_errors = self.request.session.pop('diary_form_errors', None)
        if form_errors:
            # エラー情報を辞書形式に変換してコンテキストに追加(リストにするのは複数ある他と合わせるため)
            context['form_errors'] = [json.loads(form_errors)]
        return context

class DiaryNewView(LoginRequiredMixin,DiaryMixin,generic.CreateView):
    def post(self, request, *args: str, **kwargs) -> HttpResponse:
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
                keyword = form.cleaned_data.get('keyword')
                return geocode(request,keyword)
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
            geo = regeocode(request,lat, lon)
            loc.state = geo.address.state
            loc.display = geo.address.display
            loc.label = geo.address.label
            loc.id = None
            response = {
                "data": loc.to_dict(),
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            # 最初のフォームが無効な場合
            return self.form_invalid(form)

    def handle_diary_new(self, request):
        form = DiaryForm(request.POST, request=request)
        if form.is_valid():
            return self.form_valid(form)
        return self.form_invalid(form)

class DiaryEditView(LoginRequiredMixin,DiaryMixin,generic.UpdateView):
    is_update_view = True
    def get(self, request, *args, **kwargs):
        return redirect(reverse_lazy('diary:calendar'))

    def post(self, request, pk):
        diary = get_object_or_404(Diary, pk=pk, user=request.user)
        form = DiaryForm(request.POST, instance=diary, request=request)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

class DiaryDeleteView(LoginRequiredMixin, generic.DeleteView):
    template_name = "diary/calendar.html"
    success_url = reverse_lazy("diary:calendar")
    model = Diary
    
    def get(self, request, *args, **kwargs):
        return redirect(reverse_lazy('diary:calendar'))
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # print(f"Deleted object with ID: {self.kwargs['pk']}")
        return response

class DiaryPhotoView(LoginRequiredMixin,generic.FormView):
    template_name ="diary/diary_photo.html"
    success_url = reverse_lazy("diary:calendar")
    redirect_url = reverse_lazy('diary:diary_photo')
    form_class = PhotoForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['photo_form'] = context.pop('form', None)
        context['diary_formset'] = DiaryFormSet(queryset=Diary.objects.none())
        return context
    
    def post(self, request, *args: str, **kwargs) -> HttpResponse:
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
        try:
            for form in location_formset.forms:
                id = form.cleaned_data.get("id_of_image")
                location = form.save(commit=False)
                if id:
                    temp_image = get_object_or_404(TempImage, id=id, user=self.request.user)
                    image = temp_image.image
                    if image:
                        image_file = ContentFile(image.read(), name=image.name)
                        image = InMemoryUploadedFile(
                            image_file, field_name=None, name=image.name ,content_type='image/jpg',
                            size=image.file.size, charset=None
                        )
                        form.instance.image = image
                        # location.image = image
                        temp_image.delete() 
                date = form.cleaned_data.get("date_of_Diary")
                location.diary = get_object_or_404(Diary, user=self.request.user, date=date)
                location.full_clean()  # バリデーションを実行
                location.save()
            return super().form_valid(diary_formset)
        except Exception as e:
            for diary in diaries:
                diary.delete()
            TempImage.objects.filter(user=self.request.user).delete()
            print(f"Error occurred: {e}")
            return self.formset_invalid(diary_formset, location_formset)

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
        diary_formset = DiaryFormSet(request.POST, request=request,)
        location_formset = LocationFormSet(request.POST,request.FILES,)

        if diary_formset.is_valid() and location_formset.is_valid():
            return self.form_valid(diary_formset,location_formset)
        else:  
            return self.formset_invalid(diary_formset,location_formset)

    # 写真データから位置情報を取り出して送る 
    def photos2LocationsAndDate(self,request):
        form = PhotoForm(request.POST,request.FILES)
        TempImage.objects.filter(user=request.user).delete()
        if form.is_valid():
            files = request.FILES.getlist('location_files')
            diaries = Diary.objects.filter(user=request.user).prefetch_related('locations')
            image_hash_list = [location.image_hash for diary in diaries for location in diary.locations.all() if location.image_hash]
            location_new = {}
            dates = set()
            messages = {}
            for img_file in files:
                try:
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(img_file.read())
                        temp_file_path = temp_file.name
                        photo_data = get_photo_info(temp_file_path)
                        image_file = to_jpeg(temp_file_path)
                        jpeg_file = InMemoryUploadedFile(
                            image_file, field_name=None, name='temp.jpg' ,content_type='image/jpg',
                            size=image_file.getbuffer().nbytes, charset=None
                        )
                except Exception as e:
                    print(f"Error occurred: {e}")
                finally:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                        
                if photo_data.errors:
                    for e in photo_data.errors:
                        print(f"Photo data Eorrors: {e}")
                        messages['none_field'] = e
                    continue
                date = photo_data.dt.strftime('%Y-%m-%d')
                dates.add(date)
                photo_hash = to_pHash(jpeg_file)
                if photo_hash in image_hash_list:
                    messages[date] = '選択した写真と同じものが既に使用されています。'
                    continue
                temp_image = TempImage()
                temp_image.image = jpeg_file  # 画像ファイルを設定
                temp_image.user = request.user
                try:
                    temp_image.full_clean()
                    temp_image.save()  # 保存
                except ValidationError as e:
                    print("Validation errors:", e.message_dict)
                    messages['temp_image'] = e.message_dict.values()
                    continue

                geo = regeocode(request,photo_data.lat,photo_data.lon)
                geo_data = geo.model_dump()

                geo_data['image'] = temp_image.image.url
                geo_data['id_of_image'] = temp_image.id
                location_new.setdefault(date,[]).append(geo_data)
            
            diary_existed = {}
            location_existed = {}
            diary_existed_query = diaries.filter(date__in=list(dates))
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

            response = {
                "location_new": location_new,
                "diary_existed": diary_existed,
                "location_existed": location_existed,
                "message": list(messages),
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            print('Photo Form Invalid')
            self.form_invalid(form)
