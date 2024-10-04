from django.utils import timezone
from diary.models import TempImage

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import timedelta

def delete_tempImages():
    time_threshold = timezone.now() - timedelta(hours=3)
    TempImage.objects.filter(date_created__lt=time_threshold).delete()

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(delete_tempImages,'interval', hours=3, seconds=0) #3時間ごとに実行
    scheduler.start()
