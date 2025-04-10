from django.db.models.signals import post_save,pre_save,post_delete,pre_delete
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
from django.core.cache import cache
from django.utils import timezone
from .models import Coin, Location, TempImage, Diary
from django.contrib.auth import get_user_model

User = get_user_model()

from datetime import timedelta

# Location削除後に`image`を削除する。
@receiver(post_delete, sender=Location)
def delete_file(sender, instance, **kwargs):
    if instance.image:
        try:
            instance.image.delete(False)
        except Exception as e:
            print(f"Error deleting file {instance.image.name}: {e}")
# Location削除直前に他にis_thumbnailを移動
@receiver(post_delete, sender=Location)
def set_thumbnail_on_delete(sender, instance, **kwargs):
    # instance.refresh_from_db()
    try:
        diary = instance.diary
        if instance.is_thumbnail:
            if diary:
                new_thumbnail_location = Location.objects.filter(diary=diary).exclude(location_id=instance.location_id).first()
                if new_thumbnail_location:
                    new_thumbnail_location.is_thumbnail = True
                    new_thumbnail_location.save()
    except ObjectDoesNotExist:
        return
    
@receiver(post_delete, sender=TempImage)
def delete_file(sender, instance, **kwargs):
    if instance.image:
        try:
            instance.image.delete(False)
        except Exception as e:
            print(f"Error deleting file {instance.image.name}: {e}")

@receiver(post_save, sender=User)
def create_coin_for_user(sender, instance, created, **kwargs):
    if created:  # ユーザーが新規作成された場合のみ
        coin = Coin.objects.create(user=instance)  # Coinインスタンスを作成
        coin.save()
@receiver(post_save, sender=Diary)
def add_coin_on_create_diary(sender, instance, created, **kwargs):
    if created:     # Diary新規作成時
        coin = instance.user.coin
        coin.add(instance)