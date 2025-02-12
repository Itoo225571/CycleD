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
    template_name="accounts/login.html"
    form_class=CustomLoginForm
    success_url=reverse_lazy("diary:home")
    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('diary:home')  # 'home' にリダイレクト
        return super().get(request, *args, **kwargs)

class CustomLogoutView(LoginRequiredMixin,views.LogoutView):
    template_name="accounts/logout.html"

class CustomSignupView(views.SignupView):
    form_class = CustomSignupForm
    template_name="accounts/signup.html"
    def form_valid(self, form):
        response = super().form_valid(form)
        # フォームが有効な場合の追加処理をここに記述
        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

    def get_success_url(self):
        # サインアップ成功後のリダイレクト先をカスタマイズする場合はここで設定
        return super().get_success_url()
    
# class UserProfileView(LoginRequiredMixin,generic.TemplateView):
#     template_name="accounts/mypage.html"
#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         user = self.request.user  # 現在ログインしているユーザーを取得
#         context['user'] = user  # ユーザー情報をテンプレートに渡す
#         diary_all = Diary.objects.filter(user=user)
#         context['diary_count'] = diary_all.count()  # ユーザーの持っている日記の数をカウント
#         context['diary_count_ontheday'] = diary_all.filter(rank=0).count()
#         return context

class UserSettingView(LoginRequiredMixin,generic.UpdateView):
    model = User
    template_name="accounts/setting.html"
    fields = ['username', 'email', 'icon']
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user  # 現在ログインしているユーザーを取得
        context['user'] = user  # ユーザー情報をテンプレートに渡す
        diary_all = Diary.objects.filter(user=user)
        context['diary_count'] = diary_all.count()  # ユーザーの持っている日記の数をカウント
        context['diary_count_ontheday'] = diary_all.filter(rank=0).count()
        return context
    def get_object(self, queryset=None):
        # 常に現在ログイン中のユーザーを返す
        return self.request.user

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