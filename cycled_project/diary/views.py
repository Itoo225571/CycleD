from typing import Any
from django.http import HttpRequest, HttpResponse
from django.views import generic
from django.urls import reverse_lazy

from django.contrib.auth.views import LoginView,LogoutView
from django.contrib.auth.mixins import LoginRequiredMixin

from .forms import *

# from datetime import datetime

class HomeView(generic.TemplateView):
    template_name="diary/home.html"
    def get(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        context={"user":request.user}
        return self.render_to_response(context)
home=HomeView.as_view()

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

class UserProfileView(LoginRequiredMixin,generic.DetailView):
    template_name="diary/user_profile.html"
    form_class=UserForm
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