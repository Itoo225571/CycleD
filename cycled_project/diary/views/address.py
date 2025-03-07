from typing import Any
from django.http import HttpRequest, HttpResponse,JsonResponse
from django.views import generic
from django.urls import reverse_lazy
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms.models import model_to_dict
from django.shortcuts import redirect
from django.core.exceptions import ValidationError

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..forms import AddressSearchForm,AddressForm,LocationCoordForm
from ..models import Location
from ..serializers import DiarySerializer,LocationSerializer

from subs.get_location import geocode_gsi,geocode_yahoo,regeocode_gsi,regeocode_HeartTails,regeocode_yahoo
from subs.get_location import regeocode_gsi_async,regeocode_HeartTails_async,regeocode_yahoo_async

import logging
import asyncio
logger = logging.getLogger(__name__)

"""______Address関係______"""
# requestはレート制限に必要
@ratelimit(key='user', rate='5/s', method='POST')
def geocode_gsi_ratelimit(request,keyword):
    return geocode_gsi(keyword)
@ratelimit(key='user', rate='5/s', method='POST')
@ratelimit(key='user', rate='100/d', method='POST')
def geocode_yahoo_ratelimit(request,keyword,id=settings.CLIANT_ID_YAHOO):
    return geocode_yahoo(keyword,id)

def geocode(request,keyword,count=0):
    func_list = [geocode_gsi_ratelimit, geocode_yahoo_ratelimit,]
    current_func = func_list[count]
    try:
        geocode_data_list = func_list[count](request,keyword)
        return geocode_data_list.model_dump()
    except Exception as e:
        count += 1
        logger.warning(f"{current_func.__name__}が失敗しました: {e}, リクエスト: {request}, 検索値: {keyword}")
        if count < len(func_list):
            return geocode(request,keyword,count)
        else:
            logger.error(f"すべてのregeocodeが失敗しました")
            raise

@ratelimit(key='user', rate='5/s', method='POST')
def regeocode_gsi_ratelimit(request,lat,lon):
    return regeocode_gsi(lat,lon)
@ratelimit(key='user', rate='5/s', method='POST')
def regeocode_HeartTails_ratelimit(request,lat,lon):
    return regeocode_HeartTails(lat,lon)
@ratelimit(key='user', rate='5/s', method='POST')
@ratelimit(key='user', rate='100/d', method='POST')
def regeocode_yahoo_ratelimit(request,lat,lon,id=settings.CLIANT_ID_YAHOO):
    return regeocode_yahoo(lat,lon,id)

def regeocode(request,lat,lon,count=0):
    func_list = [regeocode_gsi_ratelimit, regeocode_HeartTails_ratelimit,regeocode_yahoo_ratelimit]
    current_func = func_list[count]
    try:
        geocode_data = current_func(request,lat,lon,)
        return geocode_data
    except Exception as e:
        count += 1
        logger.warning(f"{current_func.__name__}が失敗しました: {e}, リクエスト: {request}, 緯度: {lat}, 経度: {lon}")
        if count < len(func_list):
            return regeocode(request,lat,lon,count)
        else:
            logger.error(f"すべてのregeocodeが失敗しました")
            raise 

@ratelimit(key='user', rate='5/s', method='POST')
async def regeocode_gsi_ratelimit_async(request,lat,lon):
    return await regeocode_gsi_async(lat,lon)
@ratelimit(key='user', rate='5/s', method='POST')
async def regeocode_HeartTails_ratelimit_async(request,lat,lon):
    return await regeocode_HeartTails_async(lat,lon)
@ratelimit(key='user', rate='5/s', method='POST')
@ratelimit(key='user', rate='100/d', method='POST')
async def regeocode_yahoo_ratelimit_async(request,lat,lon,id=settings.CLIANT_ID_YAHOO):
    return await regeocode_yahoo_async(lat,lon,id)

sem = asyncio.Semaphore(10)
last_func_index_regeocode = 0
async def regeocode_async(request,lat,lon,count=0):
    global last_func_index_regeocode
    func_list = [regeocode_gsi_ratelimit_async, regeocode_HeartTails_ratelimit_async,regeocode_yahoo_ratelimit_async]
    current_func = func_list[last_func_index_regeocode]
    last_func_index_regeocode = (last_func_index_regeocode + 1) % len(func_list)
    # 1度に実行できる数を制限
    async with sem:
        try:
            geocode_data = await current_func(request, lat, lon)
        except Exception as e:
            if isinstance(e, Ratelimited):
                logger.warning(f"{current_func.__name__}のレート制限に達しました\n緯度: {lat}, 経度: {lon}")
            else:
                logger.warning(f"{current_func.__name__}が失敗しました: {e}\n緯度: {lat}, 経度: {lon}")
            count += 1
            if count < len(func_list):
                return await regeocode_async(request, lat, lon, count)
            else:
                logger.error(f"すべてのregeocodeが失敗しました")
                raise
        # 1秒待機
        await asyncio.sleep(1)
    return geocode_data.model_dump()

class AddressUserView(LoginRequiredMixin,generic.FormView):
    template_name = "diary/address_user.html"
    form_class = AddressForm
    success_url = reverse_lazy('diary:weather_report')    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['addressseach_form'] = AddressSearchForm()
        context['addressselect_form'] = AddressForm()
        return context
    
    def form_valid(self, form):
        loc = form.save(commit=False)
        # 既存のデータがある場合は削除
        existing_location = Location.objects.filter(user=self.request.user, is_home=True)
        if existing_location:
            existing_location.delete()
        # 新しいデータを保存
        loc.user = self.request.user
        loc.is_home = True
        loc.save()
        return super().form_valid(form)

@api_view(['POST'])
@authentication_classes([SessionAuthentication])  # セッション認証
@permission_classes([IsAuthenticated])  # ログイン必須
def address_search(request):
    form = AddressSearchForm(request.POST)
    if form.is_valid():
        keyword = form.cleaned_data.get('keyword')
        data_list = geocode(request, keyword)  # geocode関数を呼び出す
        response = {"data_list": data_list}
        return Response(response, status=200)  # 正常にデータを返す

    # フォームが無効な場合、エラーメッセージを返す
    return Response({"error": "Invalid form data", "errors": form.errors}, status=400)

@api_view(['POST'])
@authentication_classes([SessionAuthentication])  # セッション認証
@permission_classes([IsAuthenticated])  # ログイン必須
def address_select(request):
    form = AddressForm(request.POST)
    if form.is_valid():
        loc = form.save(commit=False)
        loc.location_id = None  # 新規作成なのでidは空にする
        # ここにチェック？
        serializer = LocationSerializer(loc)
        return Response(serializer.data, status=200)  # シリアライズしたデータを返す

@api_view(['POST'])
@authentication_classes([SessionAuthentication])  # セッション認証
@permission_classes([IsAuthenticated])  # ログイン必須
def get_current_address(request):
    form = LocationCoordForm(request.POST)
    if form.is_valid():
        loc = form.save(commit=False)
        
        lat = form.cleaned_data["lat"]
        lon = form.cleaned_data["lon"]
        geo = regeocode(request,lat,lon)
        loc.state = geo.address.state
        loc.display = geo.address.display
        loc.label = geo.address.label
        loc.location_id = None  # 新規作成なのでidは空にする

        try:
            loc.clean()  # モデルのバリデーションを実行
        except ValidationError as e:
            return Response({"error": "モデルバリデーションエラー", "details": e.messages}, status=400)
        # saveはしない
        # loc.save()
        # シリアライズして返却
        serializer = LocationSerializer(loc)
        return Response(serializer.data, status=200)  # シリアライズしたデータを返す

    # フォームが無効な場合、エラーメッセージを返す
    return Response({"error": "Invalid form data", "errors": form.errors}, status=400)