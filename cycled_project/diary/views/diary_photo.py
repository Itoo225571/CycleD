from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy,reverse
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.http import JsonResponse,HttpResponseForbidden
from django.utils.timezone import now
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.exceptions import ValidationError,ObjectDoesNotExist
from django.contrib import messages
from django.core.cache import cache
from django.utils import timezone
from django.utils.safestring import mark_safe
from django.templatetags.static import static

from ..forms import AddressSearchForm,AddressForm,LocationFormSet,DiaryFormSet,PhotosForm
from ..models import Diary,Location,TempImage,Good
from ..serializers import DiarySerializer,LocationSerializer

from .address import geocode,regeocode,regeocode_async
from subs.photo_info.photo_info import get_photo_info,to_jpeg,to_pHash
from .cache_and_session import update_diaries,get_diaries_async,update_diaries_async

from datetime import timedelta
import json
import tempfile
import os
import asyncio
import aiofiles
from asgiref.sync import sync_to_async
from concurrent.futures import ThreadPoolExecutor
import logging
from datetime import datetime
from PIL import Image as PILImage
import io
from urllib.parse import urlencode
from pprint import pprint
import traceback 
logger = logging.getLogger(__name__)

# 外見
class DiaryPhotoView(LoginRequiredMixin, generic.FormView):
    template_name ="diary/diary_photo.html"
    success_url = reverse_lazy("diary:home")
    redirect_url = reverse_lazy('diary:diary_photo')
    form_class = PhotosForm

    def get_context_data(self, **kwargs):
        diary_formset = DiaryFormSet(queryset=Diary.objects.none())
        location_formset = LocationFormSet(queryset=Location.objects.none())

        context = super().get_context_data(**kwargs)
        context['photo_form'] = context.pop('form', None)
        context['diary_formset'] = diary_formset
        context['location_formset'] = location_formset
        context['MAX_LOCATIONS'] = Diary.MAX_LOCATIONS
        context['MAX_DIARIES'] = diary_formset.max_num

        context['addressseach_form'] = AddressSearchForm()
        context['addressselect_form'] = AddressForm()
        return context
    
    def get(self, request: HttpRequest, *args: str, **kwargs) -> HttpResponse:
        # TempImage削除
        TempImage.objects.filter(user=request.user).delete()
        request.session.pop('image_hash_list', None)
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
        try:
            user = self.request.user
            coin_num = 0
            with transaction.atomic():
                for form_diary in diary_formset.forms:
                    diary = form_diary.instance
                    diary.user = user  # 現在のユーザーを設定
                    to_delete = form_diary.cleaned_data.get('DELETE', False)
                    if to_delete:
                        if diary.pk:  # 既存なら削除
                            diary.delete()
                        continue
                    diary.save()  # 保存
                for form_loc in location_formset.forms:
                    to_delete = form_loc.cleaned_data.get('DELETE', False)
                    if to_delete:
                        if form_loc.instance.pk:
                            form_loc.instance.delete()
                        continue
                    # locationがすでに存在しているか確認
                    location = form_loc.cleaned_data.get("location_id")
                    if location:
                        form_loc.instance = location  # 既存のインスタンスをフォームに設定
                        # フォームのデータを既存のインスタンスに適用
                        form_loc.instance.label = form_loc.cleaned_data.get("label")
                        form_loc.instance.is_thumbnail = form_loc.cleaned_data.get("is_thumbnail")
                    else:
                        location = form_loc.save(commit=False)
                    id = form_loc.cleaned_data.get("id_of_image")
                    date = form_loc.cleaned_data.get("date_of_Diary")
                    # print(id)

                    # tempImageの場合
                    if id:
                        temp_image = get_object_or_404(TempImage, id=id, user=user)
                        image = temp_image.image
                        if image:
                            image_file = ContentFile(image.read(), name=image.name)
                            image = InMemoryUploadedFile(
                                image_file, field_name=None, name=image.name ,content_type='image/jpg',
                                size=image.file.size, charset=None
                            )
                            form_loc.instance.image = image
                            temp_image.delete()
                        # DELETEがtrueの場合スキップ(新規作成時)
                    #     if form.cleaned_data.get('DELETE', False):
                    #         continue
                    # # Location編集の場合
                    # else:
                    #     if form.cleaned_data.get('DELETE', False):
                    #         location.delete()   # 元のDiaryを削除
                    #         continue

                    location.diary = get_object_or_404(Diary, user=user, date=date)
                    # 今日中に作成されたものかどうか(0がGOLD)
                    if id:
                        if datetime.now().date() == temp_image.date_photographed.date() == temp_image.date_lastModified.date():
                            location.diary.rank = 0

                    coin_num += user.coin.add(location.diary)    # ここでコイン計算
                    location.diary.save()
                    
                    location.full_clean()  # バリデーションを実行
                    location.save()

                # キャッシュ更新
                update_diaries(self.request)
                img_url = static('diary/img/coin_icon.gif')
                coin_msg = mark_safe(f'''
                <div style="font-size: 1rem; font-weight: bold; display: flex; align-items: center; justify-content: center; padding-bottom: 0.5em;">
                    <img src="{img_url}" alt="coin" style="height: 3.5em; vertical-align: middle; margin-right: 0.3em;">
                    <div style="display: inline-block; vertical-align: bottom;">
                        <span style="font-size: 1.5rem; padding-right: 0.3em;">+ {coin_num}</span>
                    </div>
                </div>
                ''') if coin_num else ''

                msg = f'<h3 style="font-size: 1.75em; font-weight: bold; margin: 0.5em 0;">写真の投稿に成功しました！</h3>' + coin_msg
                # HTML形式のメッセージ（スタイル付き）
                messages.success(self.request, mark_safe(msg), extra_tags='html')
                return redirect(self.get_success_url())
        except Exception as e:
            print(f"Error occurred: {e}")
            traceback.print_exc()  # ここでエラー箇所とスタックトレースを表示
            return self.formset_invalid(diary_formset, location_formset)

    def formset_invalid(self, diary_formset=None, location_formset=None,errors=None):
        # TempImage削除
        TempImage.objects.filter(user=self.request.user).delete()
        for key, value in self.request.POST.items():
            if 'form-' in key:
                print(f"{key}: {value}")
        for key, value in self.request.POST.items():
            if 'locations-' in key:
                print(f"{key}: {value}")
        # diary_formset が提供されている場合のエラー処理
        if diary_formset:
            for form in diary_formset:
                if form.errors:  # エラーがある場合
                    for field, error_list in form.errors.items():
                        for error in error_list:
                            message = f"{form.instance} のフィールド '{field}' にエラー: {error}"
                            print(message)
                            messages.error(self.request, message)
        # location_formset が提供されている場合のエラー処理
        if location_formset:
            for form in location_formset:
                if form.errors:  # エラーがある場合
                    for field, error_list in form.errors.items():
                        for error in error_list:
                            message = f"{form.instance} のフィールド '{field}' にエラー: {error}"
                            print(message)
                            messages.error(self.request, message)
        if errors:
            for err in errors:
                print(f'その他 Error:{err}')
                messages.error(self.request,err)
        return self.render_to_response(self.get_context_data())
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['request'] = self.request
        return kwargs
    
    def handle_diary_formset(self, request):
        dates = [request.POST.get(f"form-{i}-date") for i in range(int(request.POST.get("form-TOTAL_FORMS", 0)))]
        diaries = Diary.objects.filter(user=request.user,date__in=dates)
        locations = Location.objects.filter(diary__in=diaries)
        diary_formset = DiaryFormSet(request.POST, request=request, queryset=diaries, prefix='form')
        location_formset = LocationFormSet(request.POST,request.FILES, queryset=locations, prefix='locations')
        
        if diary_formset.is_valid() and location_formset.is_valid():
            return self.form_valid(diary_formset,location_formset)
        else:  
            return self.formset_invalid(diary_formset,location_formset)

executor = ThreadPoolExecutor(max_workers=4)

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
            error_values = []
            for field, errors in e.message_dict.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
                    error_values.append(error)
            return {'error':error_values}
        
        retry_count = 3  # 最大リトライ回数
        attempt = 0  # 現在の試行回数
        geo_data = {
            "image": temp_image.image.url,
            "id_of_image": temp_image.id,
            "date": temp_image.date_photographed.strftime('%Y-%m-%d'),
        }
        # GPS情報がない場合
        if not (temp_image.lat and temp_image.lon):
            return geo_data
        
        while attempt < retry_count:
            try:
                result = await regeocode_async(request, temp_image.lat, temp_image.lon)
                attempt += 1
                if result:
                    if result.get("address", {}).get("locality") == "（その他）":
                        logger.info(f"試行 {attempt + 1}/{retry_count}: 'その他' が返されたため再試行します。")
                        continue  # 再試行
                    geo_data.update(result)
                    break
                    # return geo_data  # 成功したら返す
                else:
                    logger.error("住所取得に失敗しました。geo_data が None です。")
                    return {'error': "住所取得に失敗しました。geo_data が None です。"}
            except Exception as e:
                # エラー時はメッセージを表示
                messages.error(request, f"エラー: {e}")
                logger.error(f"エラー: {e}")
                return {'error': str(e)}
        
        if lastModifiedDate:
            if datetime.now().date() == temp_image.date_photographed.date() == temp_image.date_lastModified.date():
                geo_data['rank'] = 0
        
        image_hash_list.append(photo_hash)
        request.session['image_hash_list'] = image_hash_list

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
            # diaries = await cache.aget(f'diaries_{self.user.id}')
            data_all = await get_diaries_async(request,['mine'])
            diaries = data_all.get('diaries_mine')
            diaries_dict = await sync_to_async(lambda qs: {diary.date: diary for diary in qs})(diaries)
            image_hash_list = request.session.get('image_hash_list', [])

            if not image_hash_list:
                image_hash_list = []
                for diary in diaries:
                    # locations.all()は同期的な操作なので非同期化する
                    locations = await sync_to_async(list)(diary.locations.all())
                    for location in locations:
                        if location.image_hash:
                            image_hash_list.append(location.image_hash)
                request.session['image_hash_list'] = image_hash_list

            # TempImageの作成と添削
            # `files` が空でない場合にのみ処理を実行
            if len(files) > 0:
                location_new = await process_image_file(files[0], image_hash_list, request)
            else:
                # 何かエラーを返す
                return JsonResponse({'error': 'No file found in the request'}, status=400)

            if location_new.get('error'):
                return JsonResponse(location_new, json_dumps_params={'ensure_ascii': False})

            date_str = location_new['date']
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
                
            # diary_query = await sync_to_async(lambda: diaries.filter(date=date).first())()
            diary_query = await sync_to_async(lambda: diaries_dict.get(date))()

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
        