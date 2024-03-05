from typing import Any
from django.db.models.query import QuerySet
from django.forms.models import BaseModelForm
from django.shortcuts import render,get_object_or_404,redirect
from django.http import HttpRequest, HttpResponse,HttpResponseRedirect
from django.views import generic
from django.urls import reverse,reverse_lazy

from django.contrib.auth.views import LoginView,LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import User,Diary
from .forms import SignupForm,SigninForm,DiaryForm

# from datetime import datetime

class TopView(generic.TemplateView):
    template_name="diary/top.html"
    
    def get(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        return super().get(request, *args, **kwargs)
top=TopView.as_view()

class HomeView(LoginRequiredMixin,generic.TemplateView):
    template_name="diary/home.html"
home=HomeView.as_view()

class SigninView(generic.FormView):
    template_name="diary/signin.html"
    form_class=SigninForm
    success_url=reverse_lazy("diary:home")
    
    def form_valid(self, form: Any) -> HttpResponse:
        return HttpResponseRedirect(self.get_success_url())
    
    def get(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        return super().get(request, *args, **kwargs)
signin=SigninView.as_view()

class SignoutView(LoginRequiredMixin,LogoutView):
    template_name="diary/signout.html"
signout=SignoutView.as_view()

class SignupView(generic.CreateView):
    template_name="diary/signup.html"
    form_class=SignupForm
    success_url=reverse_lazy("diary:home")
    
    def form_valid(self, form: BaseModelForm) -> HttpResponse:
        print("save data")
        print(form.cleaned_data)
        return super().form_valid(form)
signup=SignupView.as_view()

class UserProfileView(generic.DetailView):
    template_name="diary/user_profile.html"
    form_class=User
user_profile=UserProfileView.as_view()

class UserEditView(generic.UpdateView):
    pass
user_edit=UserEditView.as_view()


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