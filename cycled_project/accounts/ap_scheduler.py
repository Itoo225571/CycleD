from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from allauth.account.models import EmailAddress,EmailConfirmation
from django.conf import settings

from datetime import timedelta

def delete_unverified_emails():
    # 確認されていないメールアドレスのうち、指定された期間（例: ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS）が経過したものを削除
    expire_time = timezone.now() - timedelta(days=settings.ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS)
    # 期限切れの EmailConfirmation を取得
    expired_confirmations = EmailConfirmation.objects.filter(sent__lt=expire_time)
    # 関連する EmailAddress の ID を取得
    expired_email_ids = expired_confirmations.values_list("email_address_id", flat=True)
    # 期限切れの EmailConfirmation を削除
    expired_confirmations.delete()
    # `verified=False` かつ `EmailConfirmation` のない EmailAddress を削除
    EmailAddress.objects.filter(id__in=expired_email_ids, verified=False).delete()

def start():
    scheduler = BackgroundScheduler()
    # 定期的にタスクを実行（例：1時間ごと）
    scheduler.add_job(delete_unverified_emails, 'interval', hours=1)
    scheduler.start()
