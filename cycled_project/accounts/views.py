from allauth.account import views
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import logout
from rest_framework.decorators import api_view
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django_user_agents.utils import get_user_agent
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse, HttpResponseRedirect

from .forms import CustomLoginForm,CustomSignupForm,UserSettingForm
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
    def post(self, request, *args, **kwargs):
        """AJAX用のログアウト処理"""
        logout(request)  # ユーザーをログアウト
        return JsonResponse({"status": "success", "message": ""})

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
    form_class = UserSettingForm
    success_url = reverse_lazy('accounts:setting')
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context
    def get_object(self, queryset=None):
        # 常に現在ログイン中のユーザーを返す
        return self.request.user
    def post(self, request, *args, **kwargs):
        # アイコン変更フォームが送信された場合
        form = UserSettingForm(request.POST, instance=request.user)
        if 'form-icon' in request.POST:  # アイコン変更フォームが送信された場合
            if form.is_valid():
                request.user.save(update_fields=['icon'])  # icon フィールドだけ保存
                return HttpResponseRedirect(self.success_url)
            else:
                # フォームのエラーを表示
                for field, errors in form.errors.items():
                    for error in errors:
                        messages.error(self.request, f"{field} のエラー: {error}")
                return HttpResponseRedirect(self.success_url)
        else:
            # 他のフォームが送信された場合
            messages.error(self.request, 'フォームが正しくありません')
            return HttpResponseRedirect(self.success_url)
    # def post(self, request, *args, **kwargs):
    #     return super().post(request, *args, **kwargs)

class CustomPasswordChangeView(LoginRequiredMixin, views.PasswordChangeView):
    template_name = "account/password_change.html"
    success_url = reverse_lazy('accounts:setting')
    success_message = 'パスワードの変更に成功'

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class UserDeleteView(LoginRequiredMixin,generic.DeleteView):
    pass

@api_view(['POST'])
@csrf_protect  # CSRF保護を追加
@login_required
def user_delete(request):
    user = request.user
    user.delete()
    messages.success(request, "アカウントは正常に削除されました。")
    return redirect('diary:top')  # ログインページにリダイレクト