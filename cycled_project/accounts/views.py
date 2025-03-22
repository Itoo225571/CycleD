from allauth.account import views as account_views
from allauth.socialaccount import views as socialaccount_views
from allauth.account.models import EmailAddress

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
from django_ratelimit.decorators import ratelimit
from django.conf import settings

from .forms import CustomLoginForm,CustomSignupForm,UserLeaveForm,AllauthUserLeaveForm,CustomEmailForm
from .forms import UserSettingForm,UserUsernameForm,UserIconForm
from .models import User

# 1分間に10回までログイン試行可能
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='post')
class CustomLoginView(account_views.LoginView):
    template_name="account/login.html"
    form_class=CustomLoginForm
    next_page = 'diary:home'    # success_url (名前での指定が可)
    redirect_authenticated_user = True  # ログイン後にアクセスしたらnext_pageに飛ぶ

class CustomLogoutView(LoginRequiredMixin,account_views.LogoutView):
    template_name="account/logout.html"
    def post(self, request, *args, **kwargs):
        """AJAX用のログアウト処理"""
        logout(request)  # ユーザーをログアウト
        return JsonResponse({"status": "success", "message": ""})

class CustomSignupView(account_views.SignupView):
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
    def form_valid(self, request, *args, **kwargs):
        # fields の各フィールドに 'form-' をつけて request.POST に含まれるかをチェック
        form = self.get_form()  # フォームインスタンスを取得
        matched_field = next(
            (f"form-{field}" for field in form.fields if f"form-{field}" in request.POST), None
        )
        field_name = matched_field.replace('form-', '') #formを取り除く
        form_class = form.form_map.get(field_name)
        if form_class:
            form = form_class(request.POST, instance=request.user)
        else:
            # fields に含まれない場合はエラーを表示
            messages.error(self.request, '不正なリクエストです')
            return self.form_invalid(form)
        if form.is_valid():
            # request.user.save(update_fields=[field_name])  # 一致したフィールドだけ保存
            request.user.save()  # 一致したフィールドだけ保存
            return super().form_valid(form)
        else:
            # フォームのエラーを表示
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(self.request, f"{field} のエラー: {error}")
            return super().form_invalid(form)

class CustomPasswordChangeView(LoginRequiredMixin, account_views.PasswordChangeView):
    template_name = "account/password_change.html"
    success_url = reverse_lazy('accounts:setting')
    success_message = 'パスワードの変更に成功'

class CustomPasswordSetView(LoginRequiredMixin, account_views.PasswordSetView):
    template_name = "account/password_set.html"
    success_url = reverse_lazy('accounts:setting')
    success_message = 'パスワードの設定に成功'

class UserLeaveView(LoginRequiredMixin, account_views.FormView):
    template_name = "account/leave.html"
    form_class = UserLeaveForm  # デフォルトは通常のフォーム

    def dispatch(self, request, *args, **kwargs):
        user = request.user
        if user.is_authenticated:
            if not user.has_usable_password():
                # Allauthログインユーザーなら、パスワード不要のフォームに変更
                self.form_class = AllauthUserLeaveForm
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["leave_warnings"] = [
            "退会処理を行うと、すぐにログインができなくなります。",
            "再入会をご希望の場合は、サポートまでご連絡ください。",
            "退会手続きは取り消しできませんので、十分ご確認の上、手続きを行ってください。",
        ]
        return context

    def form_valid(self, form):
        user = self.request.user
        if isinstance(form, UserLeaveForm):
            password = form.cleaned_data["password"]
            if not user.check_password(password):
                messages.error(self.request, "パスワードが間違っています。")
                return redirect("accounts:leave")
        
        # 退会処理を実行
        user.is_active = False
        user.save()
        logout(self.request)
        messages.success(self.request, "退会が完了しました。ご利用いただきありがとうございました。")
        return redirect("diary:top")

    def form_invalid(self, form):
        messages.error(self.request, "入力内容が正しくありません。")
        return self.render_to_response(self.get_context_data(form=form))
    
class CustomConnectionsView(socialaccount_views.ConnectionsView):
    template_name = "socialaccount/connections.html"
    def post(self, request, *args, **kwargs):
        if not request.user.has_usable_password():
            messages.error(request, "アカウント連携を解除するには先にパスワードを設定してください。")
            return redirect('accounts:password_set')
        return super().post(request, *args, **kwargs)
    
class CustomEmailView(account_views.EmailView):
    form_class = CustomEmailForm
    template_name = "account/email.html"    
    success_url = reverse_lazy('accounts:setting')
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["explanation"] = (
            "入力されたメールアドレスに確認メールが送信されます。"
            if settings.ACCOUNT_EMAIL_VERIFICATION in ["mandatory", "optional"] 
            else ""
        )
        return context
    def post(self, request, *args, **kwargs):
        if "action_add" in request.POST:
            return super().post(request, *args, **kwargs)  # action_add の場合のみ親クラスの処理
        return HttpResponseRedirect(self.success_url)  # それ以外はリダイレクト
    def form_valid(self, form):
        # メールアドレスが正常に追加された場合
        response = super().form_valid(form)
        # メールアドレスが変更された際にメッセージを送信
        email = form.cleaned_data["email"]
        # メッセージをユーザーに表示
        if settings.ACCOUNT_EMAIL_VERIFICATION == "none":
            messages.success(self.request, f"メールアドレスが{email}に変更されました。")
        else:
            messages.success(self.request, f"{email}に確認のメールを送信しました。")
        return response