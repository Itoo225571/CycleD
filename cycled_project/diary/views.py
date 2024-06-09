from typing import Any
from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse,JsonResponse
from django.views import generic,View
from django.urls import reverse_lazy
from django.conf import settings

from django_ratelimit.decorators import ratelimit

from django.shortcuts import render
from django.templatetags.static import static

from django.contrib.auth.views import LoginView,LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin

from subs.get_location.get_location import geocode_gsi,geocode_yahoo,regeocode_gsi,ResponseEmptyError
from subs.weather_report.weather_report import get_weather

from .forms import *

from datetime import datetime,timedelta

class BaseView(generic.TemplateView):
    template_name="diary/base.html"
    def get_context_data(self, **kwargs: Any) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["user"]=request.user
        # context["home"] = request.user.home
        return context

class TopView(generic.TemplateView):
    template_name="diary/top.html"
top=TopView.as_view()

class HomeView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/home.html"
home=HomeView.as_view()

def ajax_location2weather(request):
    if request.method == 'POST':
        session_data = request.session.get('weather_data', False)
        dt = datetime.now()
        time_bool = False

        latitude = float(request.POST.get('latitude',None))
        longitude = float(request.POST.get('longitude',None))
        latlon = str(latitude) + str(longitude)

        if session_data:
            datetime_1 = session_data.get('time')
            #str -> datetime型
            session_dt = datetime.strptime(datetime_1, '%Y-%m-%d %H:%M:%S')
            time_bool = bool(dt.year==session_dt.year) and bool(dt.month==session_dt.month) and bool(dt.day==session_dt.day) and bool(dt.hour==session_dt.hour) 
            latlon_bool = bool(session_data.get('latlon') == latlon)

        if session_data and time_bool and latlon_bool:
            weather = session_data.get('weather')
        else:
            img_path = static('diary_weather_report/img/')
            
            weather_json = get_weather(latitude,longitude,dir_name = img_path,time_range=48)
            weather = weather_json.model_dump()
        
        # 位置情報を含むレスポンスを作成
        response = {
            'message': 'Location data received successfully.',
            "weather": weather,
            'time': f'{dt:%Y-%m-%d %H:%M:%S}',
            'latlon': latlon,
        }
        request.session['weather_data'] = response
        return JsonResponse(response)
    else:
        return JsonResponse({'error': 'Invalid request method.'}, status=400)

"""_____SignIn関係______"""
class SigninView(LoginView):
    template_name="diary/signin.html"
    form_class=SigninForm
    success_url=reverse_lazy("diary:home")
signin=SigninView.as_view()

class SignoutView(LoginRequiredMixin,LogoutView):
    template_name="diary/signout.html"
signout=SignoutView.as_view()

class SignupView(generic.CreateView):
    template_name="diary/signup.html"
    form_class=SignupForm
    success_url=reverse_lazy("diary:home")
signup=SignupView.as_view()

"""______Address関係______"""
@ratelimit(key='user', rate='100/d', method='POST')
def address_search(request,form):
    keyword = form.cleaned_data.get('keyword')
    try:
        geocode_data_list = geocode_gsi(keyword)
    except ResponseEmptyError:
        try:
            geocode_data_list = geocode_yahoo(keyword,settings.CLIANT_ID_YAHOO)
        except :
            raise
    except Exception as e:
        print(f"その他のエラーが発生しました: {e}")
        raise

    response = {
        "data_list": geocode_data_list.model_dump(),
    }
    return JsonResponse(response, json_dumps_params={'ensure_ascii': False})

class AddressView(LoginRequiredMixin,generic.FormView):
    template_name = "diary/address.html"
    form_class = AddressSearchForm
    success_url = reverse_lazy('diary:address')

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
            return reverse_lazy('diary:address')
        elif "address-select-form" in self.request.POST or "get-current-address-form" in self.request.POST:
            return reverse_lazy('diary:home')
        return super().get_success_url()

    def post(self, request: HttpRequest, *args: str, **kwargs: Any) -> HttpResponse:
        # print(request.POST)
        if "address-search-form" in request.POST:
            form = AddressSearchForm(request.POST)
            if form.is_valid():
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return address_search(request,form)
                return self.form_valid(form)
            return self.form_invalid(form)
            
        elif "address-select-form" in request.POST:
            form = LocationForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                loc.save()
                if request.user.home:
                    request.user.home.delete()
                request.user.home = loc
                request.user.save()
            else:
                return self.form_invalid(form)
        
        elif "get-current-address-form" in self.request.POST:
            form = LocationCoordForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                
                lat = form.cleaned_data["lat"]
                lon = form.cleaned_data["lon"]
                geo = regeocode_gsi(lat,lon)
                loc.state = geo.address.state
                loc.display = geo.address.display
                
                if request.user.home:
                    request.user.home.delete()

                loc.save()
                request.user.home = loc
                request.user.save()
            else:
                return self.form_invalid(form)

        # else:
        #     form = self.get_form(self.form_class)
        return self.form_valid(form)

address = AddressView.as_view()

"""______User関係______"""
class UserProfileView(LoginRequiredMixin,generic.UpdateView):
    template_name="diary/user_profile.html"
    form_class = UserEditForm
user_profile=UserProfileView.as_view()

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass
user_edit=UserEditView.as_view()

"""______Diary関係______"""
class DiaryView(LoginRequiredMixin,generic.TemplateView):
    pass
diary=DiaryView.as_view()

class DiaryNew(LoginRequiredMixin,generic.CreateView):
    pass
diary_new=DiaryNew.as_view()

class DiaryEdit(LoginRequiredMixin,generic.UpdateView):
    pass
diary_edit=DiaryEdit.as_view()

class DiaryDelete(LoginRequiredMixin,generic.DeleteView):
    pass
diary_delete=DiaryDelete.as_view()

class CalendarView(LoginRequiredMixin,generic.TemplateView):
    pass
calendar=CalendarView.as_view()

    