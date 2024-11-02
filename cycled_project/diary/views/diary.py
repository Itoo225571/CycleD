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
from django.core.exceptions import ValidationError
from django.contrib import messages
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone

from ..forms import DiaryForm,AddressSearchForm,LocationForm,LocationCoordForm,LocationFormSet,DiaryFormSet,PhotosForm
from ..models import Diary,Location,TempImage
from ..serializers import DiarySerializer,LocationSerializer

from .address import geocode,regeocode,regeocode_async
from subs.photo_info.photo_info import get_photo_info,to_jpeg,to_pHash

from datetime import timedelta
import json
import tempfile
import uuid
import os
import asyncio
import aiofiles
from asgiref.sync import sync_to_async
from concurrent.futures import ThreadPoolExecutor
import logging
from datetime import datetime
from PIL import Image as PILImage
import io
logger = logging.getLogger(__name__)

"""______Diary関係______"""
class HomeView(LoginRequiredMixin,generic.ListView):
    template_name="diary/home.html"
    model = Diary
    context_object_name = 'diaries_mine'  # テンプレートで使用するコンテキスト変数の名前
    def get_queryset(self, **kwargs):
        return Diary.objects.filter(user=self.request.user).order_by('-date_last_updated').order_by('-date')[:5] #自分の日記
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # context['diaries_publish'] = Diary.objects.filter(
        #     is_publish=True,
        #     date=timezone.now().date(),
        # ).order_by('-date_last_updated')[:5]  # 全体で公開された日記
        return context

# ajaxでDiary日情報を送る用の関数
@api_view(['GET'])
def sendDairies(request):
    # Diaryをコンテキストに含める
    # すべてのDiaryと関連するLocationを一度に取得
    current_date = now().date()
    one_year_ago = current_date - timedelta(days=365)
    diaries = Diary.objects.prefetch_related('locations').filter(
        date__gte=one_year_ago,
        date__lte=current_date,
        user=request.user,
    )
    serializer = DiarySerializer(diaries, many=True)

    return Response(serializer.data)

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
                response = {"data_list":geocode(request,keyword)}
                return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
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
            loc.location_id = None
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
    success_url = reverse_lazy("diary:home")
    redirect_url = reverse_lazy('diary:diary_photo')
    form_class = PhotosForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['photo_form'] = context.pop('form', None)
        context['diary_formset'] = DiaryFormSet(queryset=Diary.objects.none())
        context['MAX_LOCATIONS'] = Diary.MAX_LOCATIONS
        return context
    
    def get(self, request: HttpRequest, *args: str, **kwargs) -> HttpResponse:
        # TempImage削除
        TempImage.objects.filter(user=request.user).delete()
        return super().get(request, *args, **kwargs)

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
        angles = {}
        try:
            with transaction.atomic():
                for diary, form in zip(diaries, diary_formset.forms):
                    diary.user = self.request.user  # 現在のユーザーを設定
                    angles[diary.date] = form.cleaned_data.get("thumbnail_rotate_angle")  # フォームから値を取得
                    diary.save()  # 保存
                for form in location_formset.forms:
                    # locationがすでに存在しているか確認
                    location = form.cleaned_data.get("location_id")
                    if location:
                        form.instance = location  # 既存のインスタンスをフォームに設定
                        # フォームのデータを既存のインスタンスに適用
                        form.instance.label = form.cleaned_data.get("label")
                        form.instance.is_thumbnail = form.cleaned_data.get("is_thumbnail")
                    else:
                        location = form.save(commit=False)
                    id = form.cleaned_data.get("id_of_image")
                    date = form.cleaned_data.get("date_of_Diary")

                    # tempImageの場合
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
                            temp_image.delete()
                    # Location編集の場合
                    else:
                        print(location.location_id)
                        pass

                    location.diary = get_object_or_404(Diary, user=self.request.user, date=date)
                    # 今日中に作成されたものかどうか(0がGOLD)
                    if id:
                        if datetime.now().date() == temp_image.date_photographed.date() == temp_image.date_lastModified.date():
                            location.diary.rank = 0
                            self.request.user.coin.add()
                            location.diary.save()
                    location.full_clean()  # バリデーションを実行
                    location.save()
                    angle = angles.get(date, 0)  # 回転角度を取得
                    if location.image:
                        org_img = PILImage.open(location.image)
                        ret_img = org_img.rotate(-angle,expand=True)
                        buffer = io.BytesIO()
                        ret_img.save(fp=buffer, format=org_img.format)
                        buffer.seek(0)  # バッファの先頭に戻す
                        location.image.save(name=os.path.basename(location.image.name),content=buffer)

                return super().form_valid(diary_formset)
        except Exception as e:
            print(f"Error occurred: {e}")
            return self.formset_invalid(diary_formset, location_formset)

    def formset_invalid(self, diary_formset=None, location_formset=None,errors=None):
        # diary_formset が提供されている場合のエラー処理
        if diary_formset:
            for form_error in diary_formset.errors:
                # 各エラーメッセージを追加
                messages.error(self.request, form_error)
        # location_formset が提供されている場合のエラー処理
        if location_formset:
            for form_error in location_formset.errors:
                # 各エラーメッセージを追加
                messages.error(self.request, form_error)
        if errors:
            for err in errors:
                messages.error(self.request,err)
        return self.render_to_response(self.get_context_data())
    
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

# async def regeocode_addImage(request, img_data):
#     geo_data = await regeocode_async(request, img_data.lat, img_data.lon)
#     geo_data['image'] = img_data.image.url
#     geo_data['id_of_image'] = img_data.id
#     geo_data['date'] = img_data.date  # 日付も格納
#     return geo_data

executor = ThreadPoolExecutor(max_workers=4)

# async def to_jpeg_async(file):
#     loop = asyncio.get_event_loop()
#     image_file = await loop.run_in_executor(executor, to_jpeg, file)
#     jpeg_file = InMemoryUploadedFile(
#         image_file, field_name=None, name='temp.jpg', content_type='image/jpg',
#         size=image_file.getbuffer().nbytes, charset=None
#     )
#     return jpeg_file

async def to_pHash_async(file):
    loop = asyncio.get_event_loop()
    image_file = await loop.run_in_executor(executor, to_pHash, file)
    return image_file

async def async_temp_file_writer(img_file):
    # 一時ファイルを作成
    temp_file = tempfile.NamedTemporaryFile(delete=False)  # delete=False にしてファイルを保持
    temp_file_path = temp_file.name
    temp_file.close()  # 先にファイルを閉じて他の操作を可能にします
    # 非同期にファイルに書き込み
    async with aiofiles.open(temp_file_path, 'wb') as f:
        file_content = await sync_to_async(img_file.read)() 
        await f.write(file_content)
    return temp_file_path

# 非同期で画像ファイルを処理する関数
async def process_image_file(img_file, image_hash_list, request):
    temp_file_path = None
    try:
        # 作成日時について
        metadata = request.POST.get('images')
        if metadata:
            lastModifiedDate = json.loads(metadata).get('lastModifiedDate')
            lastModifiedDate = datetime.strptime(lastModifiedDate, '%Y/%m/%d %H:%M:%S')

        temp_file_path = await async_temp_file_writer(img_file)
        # 非同期に写真の情報を取得
        photo_data = await sync_to_async(get_photo_info)(temp_file_path)
        # エラーチェック
        if photo_data.errors:
            for e in photo_data.errors:
                # messages.warning(request, f"Photo data Errors: {e}")
                logger.error(f"Photo data Errors: {e}")
            return {'error': f"Photo data Errors: {e}"}

        # 画像をJPEGに変換
        image_file = await sync_to_async(to_jpeg)(temp_file_path)
        jpeg_file = InMemoryUploadedFile(
            image_file, field_name=None, name='temp.jpg', content_type='image/jpg',
            size=image_file.getbuffer().nbytes, charset=None
        )
        # 非同期でpHashを取得&重複チェック (変換前後でpHash値は変化する)
        photo_hash = await to_pHash_async(jpeg_file)
        if photo_hash in image_hash_list:
            logger.error('選択した写真と同じものが既に使用されています。')
            return {'error':'選択した写真と同じものが既に使用されています。'}

        # TempImageを非同期に作成
        temp_image = await sync_to_async(TempImage.objects.create)(
            image=jpeg_file,
            user=request.user,
            lat=photo_data.lat,
            lon=photo_data.lon,
            # naiveなdatetimeをtimezone-awareなdatetimeに変換
            date_photographed = timezone.make_aware(photo_data.dt, timezone.get_current_timezone()),
            date_lastModified = timezone.make_aware(lastModifiedDate, timezone.get_current_timezone()),
        )

        # バリデーションと保存
        try:
            await sync_to_async(temp_image.full_clean)()  # バリデーションを実行
            await sync_to_async(temp_image.save)()  # 保存
            # await temp_image.asave()
        except ValidationError as e:
            # print("Validation errors:", e.message_dict)
            # messages['temp_image'] = e.message_dict.values()
            error_values = []
            for field, errors in e.message_dict.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
                    error_values.append(error)
            return {'error':error_values}
        try:
            geo_data = await regeocode_async(request, temp_image.lat, temp_image.lon)
        except Exception as e:
            messages.error(request, e)
            return {'error':e}
        if geo_data:
            geo_data['image'] = temp_image.image.url
            geo_data['id_of_image'] = temp_image.id
            geo_data['date'] = temp_image.date_photographed.strftime('%Y-%m-%d')  # 日付も格納
        else:
            logger.error(f"住所取得に失敗しました。")
            return {'error':"住所取得に失敗しました。"}
        
        if lastModifiedDate:
            if datetime.now().date() == temp_image.date_photographed.date() == temp_image.date_lastModified.date():
                geo_data['rank'] = 0

        return geo_data
    except Exception as e:
        print(f"Error occurred: {e}")
        return {'error':e}
    finally:
        # 最後に一時ファイルを削除
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# 写真データから位置情報を取り出して送る 
class Photos2LocationsView(generic.View):
    async def dispatch(self, request, *args, **kwargs):
        # ユーザー認証の確認
        self.user = await sync_to_async(lambda: request.user)()
        is_authenticated = await sync_to_async(lambda: self.user.is_authenticated)()
        if not is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=401)
        return await super().dispatch(request, *args, **kwargs)
    
    async def get(self, request):
        # TempImage削除
        # await sync_to_async(lambda: TempImage.objects.filter(user=request.user).delete(), thread_sensitive=False)()
        context = {
            'photo_form': PhotosForm(),
            'diary_formset': DiaryFormSet(queryset=Diary.objects.none()),
        }
        return render(request, 'diary/diary_photo.html', context)
    
    async def post(self,request):
        form = PhotosForm(request.POST, request.FILES)
        if form.is_valid():
            files = request.FILES.getlist('images')
            diaries = await cache.aget(f'diaries_{self.user.id}')
            image_hash_list = await cache.aget(f'image_hash_list_{self.user.id}')
            if not diaries or not image_hash_list:
                # 非同期にデータを取得しながら辞書に変換
                diary_queryset = await sync_to_async(Diary.objects.filter)(user=request.user)
                # diaries = await sync_to_async(list)(diary_queryset)
                diaries = await sync_to_async(lambda qs: {diary.date: diary for diary in qs})(diary_queryset)
                
                await cache.aset(f'diaries_{self.user.id}', diaries, timeout=600)
                image_hash_list = []
                for diary in diaries.values():
                    # locations.all()は同期的な操作なので非同期化する
                    locations = await sync_to_async(list)(diary.locations.all())
                    for location in locations:
                        if location.image_hash:
                            image_hash_list.append(location.image_hash)
                await cache.aset(f'image_hash_list_{self.user.id}', image_hash_list, timeout=600)

            # TempImageの作成と添削
            location_new = await process_image_file(files[0], image_hash_list, request)
            if location_new.get('error'):
                return JsonResponse(location_new, json_dumps_params={'ensure_ascii': False})

            date_str = location_new['date']
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
                
            # diary_query = await sync_to_async(lambda: diaries.filter(date=date).first())()
            diary_query = await sync_to_async(lambda: diaries.get(date))()

            if diary_query:
                diary_serializer = await sync_to_async(DiarySerializer)(diary_query)
                diary_data = await sync_to_async(lambda: diary_serializer.data)()
                diary = {
                    **diary_data,  # シリアライズ結果を追加
                    'empty': False,           # emptyフラグを設定
                }
            else:
                diary = {'date': date_str, 'empty':True, }

            response = {
                "diary": diary,
                "location_new": location_new,
            }
            return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
        else:
            print('Photo Form Invalid')
            return JsonResponse({'error': '無効なフォームです。'}, status=400, json_dumps_params={'ensure_ascii': False})