from allauth.account import views
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from rest_framework.decorators import api_view
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django_user_agents.utils import get_user_agent

from .forms import CustomLoginForm,CustomSignupForm
from .models import User
from diary.models import Diary,Coin  # diaryアプリから

class CustomLoginView(views.LoginView):
    template_name="account/login.html"
    form_class=CustomLoginForm
    success_url=reverse_lazy("diary:home")
    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)

class CustomLogoutView(LoginRequiredMixin,views.LogoutView):
    template_name="account/logout.html"

class CustomSignupView(views.SignupView):
    form_class = CustomSignupForm
    template_name="account/signup.html"
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

    def get_success_url(self):
        # サインアップ成功後のリダイレクト先をカスタマイズする場合はここで設定
        return super().get_success_url()

class UserSettingView(LoginRequiredMixin,generic.UpdateView):
    model = User
    template_name="account/setting.html"
    fields = ['username', 'email', 'icon']
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context
    def get_object(self, queryset=None):
        # 常に現在ログイン中のユーザーを返す
        return self.request.user

class CustomPasswordChangeView(LoginRequiredMixin, views.PasswordChangeView):
    template_name = "account/password_change.html"
    success_url = reverse_lazy('accounts:setting')
    success_message = 'パスワードの変更に成功'

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class UserDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass

@api_view(['POST'])
@login_required
def user_delete(request):
    user = request.user
    user.delete()
    messages.success(request, "アカウントは正常に削除されました。")
    return redirect('diary:top')  # ログインページにリダイレクト