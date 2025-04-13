from allauth.account import views as account_views
from allauth.socialaccount import views as socialaccount_views
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.adapter import get_adapter
from allauth.account.utils import send_email_confirmation

from django.urls import reverse_lazy,reverse
from django.shortcuts import get_object_or_404
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
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django_ratelimit.decorators import ratelimit
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from .forms import CustomLoginForm,CustomSignupForm,UserLeaveForm,AllauthUserLeaveForm,CustomEmailForm,CustomResetPasswordForm
from .forms import UserSettingForm
from .models import User

# 1分間に10回までログイン試行可能
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='post')
class CustomLoginView(account_views.LoginView):
    template_name="account/login.html"
    form_class=CustomLoginForm
    next_page = 'diary:home'    # success_url (名前での指定が可)
    redirect_authenticated_user = True  # ログイン後にアクセスしたらnext_pageに飛ぶ
    def form_valid(self, form):
        email_or_username = form.cleaned_data.get('login')
        if '@' in email_or_username:
            email = email_or_username
        else:
            try:
                user = get_user_model().objects.get(username=email_or_username)
                email = user.email  # ユーザー名からメールアドレスを取得
            except get_user_model().DoesNotExist:
                messages.error(self.request, "ユーザー名が見つかりません。再確認してください。")
                return self.form_invalid(form)
        # メールアドレスをセッションに保存
        self.request.session['unconfirmed_email'] = email
        return super().form_valid(form)    

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
    
    def post(self, request, *args, **kwargs):
        form = self.form_class(self.request.POST, instance=self.request.user)
        matched_fields = [
            f"form-{field}" for field in form.fields if f"form-{field}" in self.request.POST
        ]
        field_names = [field.replace('form-', '') for field in matched_fields]
        form = self.form_class(self.request.POST, instance=self.request.user, update_field=field_names)
        if form.is_valid():
            return self.form_valid(form)
        else: 
            return self.form_invalid(form)
    
    def get_object(self, queryset=None):
        # 常に現在ログイン中のユーザーを返す
        return self.request.user
    def form_valid(self,form):
        # 更新されたフィールドだけを保存
        updated_fields = form.cleaned_data.keys()
        self.request.user.save(update_fields=updated_fields)
        return super().form_valid(form)
    def form_invalid(self, form):
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

class CustomPasswordResetView(account_views.PasswordResetView):
    form_class = CustomResetPasswordForm
    def form_invalid(self, form):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # フォームエラーをJSONで返す
            errors = {}
            for field in form:
                if field.errors:
                    errors[field.name] = field.errors
            return JsonResponse({"success": False, "errors": errors}, status=400)
        return super().form_invalid(form)

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
        messages.success(self.request, "退会が完了しました　ご利用いただきありがとうございました")
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
    # success_url = reverse_lazy('accounts:setting')
    def post(self, request, *args, **kwargs):
        if "action_add" in request.POST or "action_send" in request.POST or "action_remove" in request.POST:
            return super().post(request, *args, **kwargs)  # action_add の場合のみ親クラスの処理
        return HttpResponseRedirect(self.success_url)  # それ以外はリダイレクト
    def form_valid(self, form):
        # メールアドレスが正常に追加された場合
        response = super().form_valid(form)
        # メールアドレスが変更された際にメッセージを送信
        email = form.cleaned_data["email"]
        # メッセージをユーザーに表示
        if settings.ACCOUNT_EMAIL_VERIFICATION == "none":
            messages.success(self.request, f"メールアドレスが{email}に変更されました")
        else:
            messages.success(self.request, f"{email}に確認のメールを送信しました")
        return response
    
class CustomEmailVerificationSentView(account_views.EmailVerificationSentView):
    def post(self, request, *args, **kwargs):
        email = request.session.get("unconfirmed_email")
        return resend_confirm_email(request,email)

def resend_confirm_email(request,email):
    if not email:
        messages.error(request, "再送信できるメールアドレスが見つかりません。")
        return redirect("account_login")  # 必要に応じて変更
    try:
        User = get_user_model()
        user = User.objects.get(email=email)
        email_address = EmailAddress.objects.get(user=user, email=email)
        if email_address.verified:
            messages.info(request, "このメールアドレスはすでに確認済みです")
        else:
            confirmation = EmailConfirmation.objects.filter(email_address=email_address).order_by('-sent').first()
            if not confirmation:
                # 確認メールを手動で作成・送信
                confirmation = EmailConfirmation.create(email_address)
                confirmation.sent = timezone.now()
                confirmation.save()

            adapter = get_adapter(request)
            signup = True  # 新規登録用のテンプレートを使う
            adapter.send_confirmation_mail(request, confirmation, signup)

            messages.success(request, "確認メールを再送信しました")
    except User.DoesNotExist:
        messages.error(request, "ユーザーが見つかりません。")
    return HttpResponseRedirect(request.path_info)  # 現在のページをリロード
