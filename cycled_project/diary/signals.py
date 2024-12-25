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
    
@receiver(post_save, sender=Diary)
def update_cache_on_create_or_update(sender, instance, created, **kwargs):
    # キャッシュを削除または更新する
    cache_key = f'diaries_{instance.user.id}'
    cache.delete(cache_key)  # Diaryが作成または更新されたときにキャッシュを削除

@receiver(post_delete, sender=Diary)
def update_cache_on_delete(sender, instance, **kwargs):
    # キャッシュを削除する
    cache_key = f'diaries_{instance.user.id}'
    cache.delete(cache_key)  # Diaryが削除されたときにキャッシュを削除

    # 削除した日記のrankが0の場合、連続数をリセット
    if instance.rank == 0:
        instance.user.coin.num_continue = 0
        instance.user.coin.num -= 1
        if instance.user.coin.num < 0:
            instance.user.coin.num = 0
        instance.user.coin.save()

@receiver(post_save, sender=User)
def create_coin_for_user(sender, instance, created, **kwargs):
    if created and instance.coin is None:  # ユーザーが新規作成された場合のみ
        coin = Coin.objects.create(num=0, timestamp=None)  # Coinインスタンスを作成
        instance.coin = coin  # ユーザーのcoinフィールドに関連付け
        instance.save()  # Userインスタンスを保存
@receiver(user_logged_in)
def reset_num_continue(sender, request, user, **kwargs):
    if user.coin is None:
        coin = Coin.objects.create(num=0, timestamp=None)  # Coinインスタンスを作成
        user.coin = coin  # ユーザーのcoinフィールドに関連付け
        user.save()  # Userインスタンスを保存  
    if user.coin.timestamp:
        if user.coin.timestamp.date() < timezone.now().date() - timedelta(days=1):
            user.coin.num_continue = 0
            user.coin.save()