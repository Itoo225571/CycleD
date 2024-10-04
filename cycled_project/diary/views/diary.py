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

import asyncio
from asgiref.sync import sync_to_async
from concurrent.futures import ThreadPoolExecutor

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
        # elif "photos-form" in request.POST:
        #     return self.photos2LocationsAndDate(request)
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

async def regeocode_async(request, img_data):
    geo = await sync_to_async(regeocode)(request, img_data.lat, img_data.lon)
    geo_data = geo.model_dump()
    geo_data['image'] = img_data.image.url
    geo_data['id_of_image'] = img_data.id
    geo_data['date'] = img_data.date  # 日付も格納
    return geo_data

executor = ThreadPoolExecutor(max_workers=4)

async def to_jpeg_async(file):
    loop = asyncio.get_event_loop()
    image_file = await loop.run_in_executor(executor, to_jpeg, file)
    jpeg_file = InMemoryUploadedFile(
        image_file, field_name=None, name='temp.jpg', content_type='image/jpg',
        size=image_file.getbuffer().nbytes, charset=None
    )
    return jpeg_file

# 写真データから位置情報を取り出して送る 
async def photos2Locations(request):
    if request.method == 'POST':
        form = PhotoForm(request.POST, request.FILES)
        # ユーザーのTempImageを削除
        await sync_to_async(lambda: TempImage.objects.filter(user=request.user).delete(), thread_sensitive=False)()
        if form.is_valid():
            files = request.FILES.getlist('location_files')
            diaries = await sync_to_async(Diary.objects.filter)(user=request.user)
            image_hash_list = [
                location.image_hash 
                async for diary in diaries 
                async for location in await sync_to_async(diary.locations.all)() 
                if location.image_hash
            ]
            location_new = {}
            dates = set()
            messages = {}
            temp_images = []
            temp_files = []
            photo_data_list = []

            for img_file in files:
                try:
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(img_file.read())
                        temp_file_path = temp_file.name
                        photo_data = get_photo_info(temp_file_path)
                        photo_hash = to_pHash(temp_file_path)
                        if photo_hash in image_hash_list:
                            messages[date] = '選択した写真と同じものが既に使用されています。'
                            continue
                        if photo_data.errors:
                            for e in photo_data.errors:
                                print(f"Photo data Errors: {e}")
                                messages['none_field'] = e
                            continue
                        temp_files.append(temp_file_path)
                        photo_data_list.append(photo_data)
                        
                except Exception as e:
                    print(f"Error occurred: {e}")
                
                date = photo_data.dt.strftime('%Y-%m-%d')
                dates.add(date)

            tasks = [to_jpeg_async(temp_file) for temp_file in temp_files]
            jpeg_files = await asyncio.gather(*tasks) 

            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)

            for jpeg_file, photo_data in zip(jpeg_files, photo_data_list):
                # TempImageの作成を非同期で行う
                temp_image = await sync_to_async(TempImage.objects.create)(
                    image=jpeg_file,
                    user=request.user,
                    lat=photo_data.lat,
                    lon=photo_data.lon,
                    date=photo_data.dt.strftime('%Y-%m-%d'),
                )
                try:
                    await sync_to_async(temp_image.full_clean)()  # バリデーションを実行
                    await sync_to_async(temp_image.save)()  # 保存
                except ValidationError as e:
                    print("Validation errors:", e.message_dict)
                    messages['temp_image'] = e.message_dict.values()
                    continue
                
                temp_images.append(temp_image)

            # 非同期タスクを作成
            tasks = [regeocode_async(request, temp_image) for temp_image in temp_images]
            geo_data_list = await asyncio.gather(*tasks)

            for geo_data in geo_data_list:
                location_new.setdefault(geo_data['date'], []).append(geo_data)
            
            diary_existed = {}
            location_existed = {}
            diary_existed_query = await sync_to_async(list)(Diary.objects.filter(user=request.user, date__in=list(dates)))

            for diary in diary_existed_query:
                date = diary.date.strftime('%Y-%m-%d')
                diary_data = {
                    'id': diary.id,
                    'date': date,
                    'comment': diary.comment,
                }
                diary_existed[date] = diary_data
                locations = await sync_to_async(diary.locations.all)()
                for location in locations:
                    location_existed.setdefault(date, []).append(location.to_dict())

            response = {
                "location_new": location_new,
                "diary_existed": diary_existed,
                "location_existed": location_existed,
                "message": list(messages),
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            print('Photo Form Invalid')
            return JsonResponse({'error': '無効なフォームです。'}, status=400)
    else:
        context = {
            'photo_form': PhotoForm(),
            'diary_formset': DiaryFormSet(queryset=Diary.objects.none()),
        }
        return render(request, 'diary/diary_photo.html', context)
