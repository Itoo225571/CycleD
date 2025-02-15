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
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Prefetch
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect

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
from urllib.parse import urlencode
from pprint import pprint
logger = logging.getLogger(__name__)

"""______Diary関係______"""
class HomeView(LoginRequiredMixin, generic.TemplateView):
    template_name="diary/home.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # ユーザー自身の日記を一度だけ取得
        diary_all_myself = Diary.objects.filter(user=self.request.user)
        # カウントをキャッシュ
        diary_count = diary_all_myself.count()
        diary_count_ontheday = diary_all_myself.filter(rank=0).count()

        # サムネイルのプレフェッチ
        thumbnail_location = Prefetch(
            'locations',
            queryset=Location.objects.filter(is_thumbnail=True),
            to_attr='thumbnail_locations'
        )

        # 公開された日記を取得
        diaries = (
            Diary.objects.filter(
                # is_pulish=True,
                # date__gte=timezone.now().date(),
                rank=0
            )
            .order_by('-date_last_updated')  # 日付の降順で取得
            .prefetch_related(thumbnail_location, 'user')  # プレフェッチを最後に呼び出し
            [:10]  # 10 件に絞り込み
        )

        # 必要な情報をリストに格納
        diaries_data = [
            {
                "user": {
                    "username": diary.user.username,
                    # "icon_url": diary.user.icon_url,
                },
                "date": diary.date,
                # サムネイルの画像URLを `.first()` を使って取得
                "image": diary.thumbnail_locations[0].image.url if diary.thumbnail_locations else None,
                # "good" : diary.good,
            }
            for diary in diaries
        ]

        context['diaries_public'] = diaries_data
        context['diaries_mine'] = diary_all_myself.order_by('-date_last_updated', '-date')[:5]
        context['diary_count'] = diary_count  # キャッシュを利用
        context['diary_count_ontheday'] = diary_count_ontheday  # キャッシュを利用

        return context


class CalendarView(LoginRequiredMixin, generic.ListView):
    template_name="diary/calendar.html"
    model = Diary
    def form_valid(self, form):
        form.instance.user = self.request.user
        return  super().form_valid(form)
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['mock_uuid'] = uuid.uuid4() # 仮のPK
        context['diary'] = DiaryForm()
        form_errors = self.request.session.pop('diary_form_errors', None)   # セッションからエラー情報を取得
        if form_errors:
            # エラー情報を辞書形式に変換してコンテキストに追加(リストにするのは複数ある他と合わせるため)
            context['form_errors'] = [json.loads(form_errors)]
        return context

# ajaxでDiary日情報を送る用の関数
@api_view(['GET'])
@login_required
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

# ログインしているユーザー本人のすべての日記を削除
@api_view(['POST'])
@login_required
@csrf_protect  # CSRF保護を追加
def delete_all_diaries(request):
    try:
        # リクエストユーザーのすべての日記を取得
        diaries = Diary.objects.filter(user=request.user)
        if diaries.exists():
            # 日記があれば削除
            diaries.delete()
            msg = '全ての日記を削除しました'
            status = 'success'
        else:
            # 日記が存在しない場合
            msg = '日記が存在しませんでした'
            status = 'error'
        return JsonResponse({"status": status, "message": msg})

    except ObjectDoesNotExist:
        # オブジェクトが見つからないエラー処理
        return JsonResponse({"status": "error", "message": "データベースエラーが発生しました"})
    except Exception as e:
        # その他の例外処理
        return JsonResponse({"status": "error", "message": str(e)})

@api_view(['POST'])
@csrf_protect  # CSRF保護を追加
@login_required
def diary_edit_noPK(request):
    date = request.POST.get('date')
    diary = get_object_or_404(Diary, date=date, user=request.user)
    form = DiaryForm(request.POST, instance=diary, request=request)
    formset = LocationFormSet(request.POST, queryset=diary.locations.all(), instance=diary)

    if form.is_valid() and formset.is_valid():
        diary = form.save(commit=False)
        diary.save()  # Diaryを更新して保存

        for location_form in formset:
            location = location_form.save(commit=False)
            angle = location_form.cleaned_data.get("rotate_angle",0) % 360  # 回転角度を取得
            if angle != 0:
                org_img = PILImage.open(location.image)
                ret_img = org_img.rotate(-angle,expand=True)
                buffer = io.BytesIO()
                ret_img.save(fp=buffer, format=org_img.format)
                buffer.seek(0)  # バッファの先頭に戻す
                location.image.save(name=os.path.basename(location.image.name), content=buffer, save=True)
            # location.save()
        # フォームセットの保存処理
        formset.save()
        diary_data = DiarySerializer(diary).data
        return JsonResponse({"success": True, "message": "更新が完了しました。","diary":diary_data})
        # return JsonResponse({"success": None})
    else:
        error = {}
        error['Diary'] = form.errors
        error['Locations'] = formset.errors
        return JsonResponse({"success": False, "errors": error})

@api_view(['POST'])
@csrf_protect  # CSRF保護を追加
@login_required
def diary_delete_noPK(request):
    pk = request.POST.get('')
    diary = get_object_or_404(Diary, pk=pk, user=request.user)
    if diary:
        msg = f'{diary.date}の日記を削除しました'
        diary.delete()  # 日記を全て削除
    else:
        msg = '日記が存在しませんでした'
    return Response({"status": "success", "message": msg})

class DiaryDeleteView(LoginRequiredMixin,generic.DeleteView):
    model = Diary
    def get_queryset(self):
        # ログインユーザーが所有している日記だけを取得
        return Diary.objects.filter(user=self.request.user)
    def get_success_url(self):
        # ここで get_object を使用して diary_date を取得
        diary = self.get_object()
        query_params = urlencode({'diary_date': diary.date.strftime("%Y-%m")})
        return f"{reverse('diary:calendar')}?{query_params}"    

class DiaryPhotoView(LoginRequiredMixin, generic.FormView):
    template_name ="diary/diary_photo.html"
    success_url = reverse_lazy("diary:home")
    redirect_url = reverse_lazy('diary:diary_photo')
    form_class = PhotosForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['photo_form'] = context.pop('form', None)
        context['diary_formset'] = DiaryFormSet(queryset=Diary.objects.none())
        context['location_formset'] = LocationFormSet(queryset=Location.objects.none())
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
        try:
            with transaction.atomic():
                for diary, form in zip(diaries, diary_formset.forms):
                    diary.user = self.request.user  # 現在のユーザーを設定
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
                        # DELETEがtrueの場合スキップ(新規作成時)
                        if form.cleaned_data.get('DELETE', False):
                            continue
                    # Location編集の場合
                    else:
                        # print(location.location_id)
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
                    angle = form.cleaned_data.get("rotate_angle",0) % 360  # 回転角度を取得
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

        while attempt < retry_count:
            try:
                geo_data = await regeocode_async(request, temp_image.lat, temp_image.lon)
                if geo_data:
                    if geo_data['address']['locality'] == '（その他）':
                        # 'その他'の場合は再試行
                        attempt += 1
                        logger.info(f"試行 {attempt}/{retry_count}: 'その他'が返されたため再試行します。")
                        continue  # 再試行
                    else:
                        geo_data['image'] = temp_image.image.url
                        geo_data['id_of_image'] = temp_image.id
                        geo_data['date'] = temp_image.date_photographed.strftime('%Y-%m-%d')  # 日付も格納
                        return geo_data  # 成功した場合は結果を返す
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