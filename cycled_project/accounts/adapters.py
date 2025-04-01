from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialAccount
from allauth.core.exceptions import ImmediateHttpResponse

from django.core.exceptions import ValidationError
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils import timezone

# from accounts.models import CustomEmailAddress

class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        # サインアップを許可する
        return True

    def clean_username(self, username, shallow=False):
        if username == 'admin':
            raise ValidationError('この名前は許可されていません')
        return super().clean_username(username, shallow)

    # 送信するemailのカスタマイズ
    def send_mail(self, template_prefix, email, context):
        # ユーザーのタイムゾーンを取得（ここではデフォルトでタイムゾーンを使用）
        user_timezone = timezone.get_current_timezone()
        # 現在の時刻をタイムゾーン対応で取得
        send_time = timezone.localtime(timezone.now(), timezone=user_timezone)
        # context に送信時刻を追加（タイムゾーン対応）
        context['send_time'] = send_time
        return super().send_mail(template_prefix, email, context)

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # ユーザーが認証されているか確認
        if not request.user.is_authenticated:
            return super().pre_social_login(request, sociallogin)

        # ユーザーがすでにこのプロバイダーで連携したアカウントを持っているかチェック
        if SocialAccount.objects.filter(user=request.user, provider=sociallogin.account.provider).exists():
            # エラーメッセージを設定
            messages.error(request, "複数アカウントを連携することはできません")
            # ImmediateHttpResponse を使用してログイン処理を中止
            response = HttpResponseRedirect(reverse('accounts:connections'))  # ログインページにリダイレクト
            raise ImmediateHttpResponse(response)
        return super().pre_social_login(request, sociallogin)
