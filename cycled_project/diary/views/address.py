from typing import Any
from django.http import HttpRequest, HttpResponse,JsonResponse
from django.views import generic
from django.urls import reverse_lazy
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms.models import model_to_dict
from django.shortcuts import redirect

from ..forms import *

from subs.get_location.get_location import geocode_gsi,geocode_yahoo,regeocode_gsi,regeocode_HeartTails,ResponseEmptyError

import logging
logger = logging.getLogger(__name__)

"""______Address関係______"""
# requestはレート制限に必要
@ratelimit(key='user', rate='100/d', method='POST')
def geocode_gsi_ratelimit(request,keyword):
    return geocode_gsi(keyword)
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
        logger.error(f"{current_func.__name__}が失敗しました: {e}, リクエスト: {request}, 検索値: {keyword}")
        if count < len(func_list):
            return geocode(request,keyword,count)
        else:
            logger.error(f"すべてのregeocodeが失敗しました")
            raise

@ratelimit(key='user', rate='5/s', method='POST')
@ratelimit(key='user', rate='100/d', method='POST')
def regeocode_gsi_ratelimit(request,lat,lon):
    return regeocode_gsi(lat,lon)
@ratelimit(key='user', rate='5/s', method='POST')
@ratelimit(key='user', rate='100/d', method='POST')
def regeocode_HeartTails_ratelimit(request,lat,lon):
    return regeocode_HeartTails(lat,lon)

last_func_index_regeocode = 0
def regeocode(request,lat,lon,count=0):
    global last_func_index_regeocode
    func_list = [regeocode_gsi_ratelimit, regeocode_HeartTails_ratelimit,]
    current_func = func_list[last_func_index_regeocode]
    last_func_index_regeocode = (last_func_index_regeocode + 1) % len(func_list)
    try:
        geocode_data = current_func(request,lat,lon,)
        return geocode_data
    except Exception as e:
        count += 1
        logger.error(f"{current_func.__name__}が失敗しました: {e}, リクエスト: {request}, 緯度: {lat}, 経度: {lon}")
        if count < len(func_list):
            return regeocode(request,lat,lon,count)
        else:
            logger.error(f"すべてのregeocodeが失敗しました")
            raise        

class AddressHomeView(LoginRequiredMixin,generic.FormView):
    template_name = "diary/address.html"
    # ↓二つは後で変える
    form_class = AddressSearchForm
    success_url = reverse_lazy('diary:address_home')

    def get_form_class(self) -> type:
        if "address-search-form" in self.request.POST:
            return AddressSearchForm
        elif "address-select-form" in self.request.POST:
            return LocationForm
        elif "get-current-address-form" in self.request.POST:
            return LocationCoordForm
        return super().get_form_class()

    def get_success_url(self) -> str:
        if "address-search-form" in self.request.POST:
            return reverse_lazy('diary:address_home')
        elif "address-select-form" in self.request.POST or "get-current-address-form" in self.request.POST:
            return reverse_lazy('diary:home')
        return super().get_success_url()

    def post(self, request: HttpRequest, *args: str, **kwargs) -> HttpResponse:
        form = None
        # 検索した場合
        if "address-search-form" in request.POST:
            form = AddressSearchForm(request.POST)
            if form.is_valid():
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    keyword = form.cleaned_data.get('keyword')
                    response = {"data_list":geocode(request,keyword)}
                    return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
                return self.form_valid(form)
            return self.form_invalid(form)
            
        # 検索結果を選択した場合
        elif "address-select-form" in request.POST:
            form = LocationForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                # Homeの場合Trueにする
                loc.is_home = True
                loc.save()
                if request.user.home:
                    request.user.home.delete()
                request.user.home = loc
                request.user.save()
            else:
                return self.form_invalid(form)
        
        # 現在位置を取得した場合
        elif "get-current-address-form" in self.request.POST:
            form = LocationCoordForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                
                lat = form.cleaned_data["lat"]
                lon = form.cleaned_data["lon"]
                geo = regeocode(request,lat,lon)
                loc.state = geo.address.state
                loc.display = geo.address.display
                # Homeの場合Trueにする
                loc.is_home = True
                loc.save()
                
                if request.user.home:
                    request.user.home.delete()
                request.user.home = loc
                request.user.save()
            else:
                return self.form_invalid(form)

        return self.form_valid(form)
    
class AddressDiaryNewView(AddressHomeView):
    success_url = reverse_lazy('diary:calendar')

    def get_success_url(self) -> str:
        if "address-search-form" in self.request.POST:
            return reverse_lazy('diary:calendar')
        elif "address-select-form" in self.request.POST or "get-current-address-form" in self.request.POST:
            return reverse_lazy('diary:calendar')
        return super().get_success_url()

    def post(self, request: HttpRequest, *args: str, **kwargs) -> HttpResponse:
        form = None
        if "address-search-form" in request.POST:
            form = AddressSearchForm(request.POST)
            if form.is_valid():
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    keyword = form.cleaned_data.get('keyword')
                    response = {"data_list":geocode(request,keyword)}
                    return JsonResponse(response, json_dumps_params={'ensure_ascii': False})
                return self.form_valid(form)
            return self.form_invalid(form)
            
        elif "address-select-form" in request.POST:
            form = LocationForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                loc.save()
            else:
                return self.form_invalid(form)
        
        elif "get-current-address-form" in self.request.POST:
            form = LocationCoordForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                
                lat = form.cleaned_data["lat"]
                lon = form.cleaned_data["lon"]
                geo = regeocode(request,lat,lon)
                loc.state = geo.address.state
                loc.display = geo.address.display
                loc.label = geo.address.label
                loc.save()
            else:
                return self.form_invalid(form)
        return self.form_valid(form)
    
class AddressDiaryEditView(AddressDiaryNewView):
    success_url = reverse_lazy('diary:diary_edit')
    def get_success_url(self) -> str:
        if "address-search-form" in self.request.POST:
            return reverse_lazy('diary:address_diary_edit')
        elif "address-select-form" in self.request.POST or "get-current-address-form" in self.request.POST:
            return reverse_lazy('diary:diary_edit')
        return super().get_success_url()