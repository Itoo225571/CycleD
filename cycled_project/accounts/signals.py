from django.conf import settings
from allauth.account.models import EmailAddress
from allauth.account.signals import email_confirmed, email_added, user_signed_up,user_logged_in
from django.dispatch import receiver

def change_email(user,email_address):
    # 以前のプライマリメールを削除
    EmailAddress.objects.filter(user=user).exclude(email=email_address.email).delete()
    # 新しいメールを primary にする
    email_address.primary = True
    email_address.verified = True  # 即時適用
    email_address.save()
    # Userモデルの email フィールドを更新
    user.email = email_address.email
    user.save()

# 1️⃣ メール認証が必要な場合（"mandatory" or "optional"）
@receiver(email_confirmed)
def make_email_primary_after_confirmation(sender, email_address, **kwargs):
    if settings.ACCOUNT_EMAIL_VERIFICATION in ["mandatory", "optional"]:
        user = email_address.user
        if email_address.verified:
            change_email(user,email_address)

# 2️⃣ メール認証なしの場合（"none"）
@receiver(email_added)
def make_email_primary_immediately(request, email_address, **kwargs):
    if settings.ACCOUNT_EMAIL_VERIFICATION == "none":
        user = email_address.user
        change_email(user,email_address)

@receiver(user_signed_up)
@receiver(user_logged_in)
def save_email_in_session(request, user, **kwargs):
    email_address = EmailAddress.objects.filter(user=user, verified=False).first()
    if email_address:
        request.session['unconfirmed_email'] = email_address.email
    else:
        request.session.pop('unconfirmed_email', None)  # 認証済みなら削除