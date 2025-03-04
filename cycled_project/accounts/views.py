from allauth.account import views
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.hashers import check_password
from django.shortcuts import redirect
from django.views import generic
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import logout
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django_user_agents.utils import get_user_agent
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse, HttpResponseRedirect

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .forms import CustomLoginForm,CustomSignupForm,UserSettingForm,UserDynamicForm,UserLeaveForm
from .models import User
from diary.models import Diary,Coin  # diaryアプリから

class CustomLoginView(views.LoginView):
    template_name="account/login.html"
    form_class=CustomLoginForm
    next_page = 'diary:home'    # success_url (名前での指定が可)
    redirect_authenticated_user = True  # ログイン後にアクセスしたらnext_pageに飛ぶ

class CustomLogoutView(LoginRequiredMixin,views.LogoutView):
    template_name="account/logout.html"
    def post(self, request, *args, **kwargs):
        """AJAX用のログアウト処理"""
        logout(request)  # ユーザーをログアウト
        return JsonResponse({"status": "success", "message": ""})

class CustomSignupView(views.SignupView):
    form_class = CustomSignupForm
    template_name="account/signup.html"

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
        # fields の各フィールドに 'form-' をつけて request.POST に含まれるかをチェック
        form = self.get_form()  # フォームインスタンスを取得
        matched_field = next(
            (f"form-{field}" for field in form.fields if f"form-{field}" in request.POST), None
        )
        if matched_field:
            field_name = matched_field.replace('form-', '') #formを取り除く
            form = UserDynamicForm(request.POST, dynamic_fields=[field_name], instance=request.user)
            if form.is_valid():
                # request.user.save(update_fields=[field_name])  # 一致したフィールドだけ保存
                request.user.save()  # 一致したフィールドだけ保存
                return HttpResponseRedirect(self.success_url)
            else:
                # フォームのエラーを表示
                for field, errors in form.errors.items():
                    for error in errors:
                        messages.error(self.request, f"{field} のエラー: {error}")
                return HttpResponseRedirect(self.success_url)
        else:
            # fields に含まれない場合はエラーを表示
            messages.error(self.request, '不正なリクエストです')
            return HttpResponseRedirect(self.success_url)

class CustomPasswordChangeView(LoginRequiredMixin, views.PasswordChangeView):
    template_name = "account/password_change.html"
    success_url = reverse_lazy('accounts:setting')
    success_message = 'パスワードの変更に成功'

class UserEditView(LoginRequiredMixin,generic.UpdateView):
    pass

class UserLeaveView(LoginRequiredMixin,views.FormView):
    template_name = "account/leave.html"
    form_class = UserLeaveForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # 退会に際する注意事項のリストを追加
        leave_warnings = [
            # "退会後、アカウントは一時的に非アクティブ状態になります。",
            "退会処理を行うと、すぐにログインができなくなります。",
            "再入会をご希望の場合は、サポートまでご連絡ください。",
            # "退会後、通知やメッセージの受信が停止します。",
            "退会手続きは取り消しできませんので、十分ご確認の上、手続きを行ってください。"
        ]
        context['leave_warnings'] = leave_warnings
        return context

    def form_valid(self, form):
        # 入力されたパスワードを取得
        password = form.cleaned_data['password']
        user = self.request.user
        if user.check_password(password):
            # パスワードが正しい場合、退会処理
            user.is_active = False
            user.save()
            logout(self.request)
            messages.success(self.request, '退会が完了しました。ご利用いただきありがとうございました。')
            return redirect('diary:top')  # 退会後、topページにリダイレクト
        else:
            messages.error(self.request, 'パスワードが間違っています。')
            return redirect('accounts:leave')  # 退会ページにリダイレクト

    def form_invalid(self, form):
        # フォームが無効な場合（エラー時）
        messages.error(self.request, 'パスワードが間違っています。')
        return self.render_to_response({'form': form})