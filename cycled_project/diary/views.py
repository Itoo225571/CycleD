from typing import Any
from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse,JsonResponse
from django.views import generic,View
from django.urls import reverse_lazy
from django.core.paginator import Paginator,PageNotAnInteger,EmptyPage
from django.shortcuts import render

from django.contrib.auth.views import LoginView,LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin

from .diary_weather_report import DiaryWeatherReport
from subs.get_location.get_location import geocode_gsi,regeocode_gsi

from .forms import *

# from datetime import datetime

class BaseView(generic.TemplateView):
    template_name="diary/base.html"
    def get_context_data(self, **kwargs: Any) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["user"]=request.user
        context["home"] = request.user.home
        return context

class TopView(generic.TemplateView):
    template_name="diary/top.html"
top=TopView.as_view()

class HomeView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/home.html"
home=HomeView.as_view()

def ajax_location2weather(request):
    if request.method == 'POST':
        # print(request.POST)
        latitude = float(request.POST.get('latitude',None))
        longitude = float(request.POST.get('longitude',None))
        weather=DiaryWeatherReport(latitude,longitude)
        
        # 位置情報を含むレスポンスを作成
        response = {
            'message': 'Location data received successfully.',
            "current": weather.current,
            "today":weather.today,
            "tomorrow":weather.tomorrow,
            # "location":weather.location_params,
        }
        
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
        if "address-search-form" in request.POST:
            form = AddressSearchForm(request.POST)
            if form.is_valid():
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return self.address_search(form)
                return self.form_valid(form)
            return self.form_invalid(form)
            
        elif "address-select-form" in request.POST:
            form = LocationForm(request.POST)
            if form.is_valid():
                loc = form.save(commit=False)
                loc.save()
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

                loc.save()
                request.user.home = loc
                request.user.save()
            else:
                return self.form_invalid(form)

        # else:
        #     form = self.get_form(self.form_class)
        return self.form_valid(form)
        
    def address_search(self,form):
        keyword = form.cleaned_data.get('keyword')
        geocode_data_list = geocode_gsi(keyword,to_json=True)

        response = {
            "data_list": geocode_data_list,
        }
        return JsonResponse(response, json_dumps_params={'ensure_ascii': False})

address = AddressView.as_view()

"""______User関係______"""
class UserProfileView(LoginRequiredMixin,generic.DetailView):
    template_name="diary/user_profile.html"
    form_class=UserForm
user_profile=UserProfileView.as_view()

class UserEditView(generic.UpdateView):
    pass
user_edit=UserEditView.as_view()

"""______Diary関係______"""
class DiaryView(generic.TemplateView):

    pass
diary=DiaryView.as_view()

class DiaryNew(generic.CreateView):
    pass
diary_new=DiaryNew.as_view()

class DiaryEdit(generic.UpdateView):
    pass
diary_edit=DiaryEdit.as_view()

class DiaryDelete(generic.DeleteView):
    pass
diary_delete=DiaryDelete.as_view()

class CalendarView(generic.TemplateView):
    pass
calendar=CalendarView.as_view()

    