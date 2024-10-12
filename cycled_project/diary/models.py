from typing import Collection
from django.db import models
from django.forms.models import model_to_dict
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_delete,pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.core.exceptions import ObjectDoesNotExist
from django.core.cache import cache

import uuid
from subs.photo_info.photo_info import to_pHash

class Location(models.Model):
    location_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    # user = models.ForeignKey(User,on_delete=models.CASCADE)
    lat = models.FloatField()
    lon = models.FloatField()
    # 市区町村
    state = models.CharField(max_length=128,blank=True,verbose_name="市区町村")
    # 表示名
    display = models.CharField(max_length=128,blank=True,verbose_name="表示名")
    label = models.CharField(max_length=128,blank=True,verbose_name="ラベル")
    # 画像(日記作成の時につける)
    image = models.ImageField(upload_to="locations/",blank=True,null=True,verbose_name="サイクリング画像")
    image_hash = models.CharField(max_length=128,blank=True,null=True)
    
    diary = models.ForeignKey('Diary',on_delete=models.CASCADE,null=True,related_name="locations")
    
    is_home = models.BooleanField(default=False, verbose_name="登録地域か否か") # homeか否か
    is_thumbnail = models.BooleanField(default=False, verbose_name="サムネイル")
    
    def __str__(self) -> str:
        return self.label
    
    # def to_dict(self):
    #     location_dict = model_to_dict(self)
    #     # 画像フィールドを URL に変換
    #     location_dict['image'] = self.image.url if self.image else None
    #     location_dict['location_id'] = self.id  # 手動で追加
    #     return location_dict
    
    def save(self, *args, **kwargs):
        if self.image and not self.image_hash:
            self.image_hash = to_pHash(self.image)   # pHashの生成
        # is_thumbnailがTrueの場合、同じDiary内の他のLocationのis_thumbnailをFalseにする
        if self.is_thumbnail:
            # Diaryを取得
            diary = self.diary
            if diary:
                # 同じDiary内の他のLocationのis_thumbnailをFalseにする
                Location.objects.filter(diary=diary).exclude(location_id=self.location_id).update(is_thumbnail=False)
        super().save(*args, **kwargs)
# モデル削除後に`image`を削除する。
@receiver(post_delete, sender=Location)
def delete_file(sender, instance, **kwargs):
    if instance.image:
        try:
            instance.image.delete(False)
        except Exception as e:
            print(f"Error deleting file {instance.image.name}: {e}")
# モデル削除直前に他にis_thumbnailを移動
@receiver(pre_delete, sender=Location)
def set_thumbnail_on_delete(sender, instance, **kwargs):
    instance.refresh_from_db()
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

def upload_to(instance, filename):
    # 拡張子を取得
    ext = filename.split(".")[-1]  
    # ファイル名としてUUIDを生成し、元の拡張子を維持
    filename = f"{uuid.uuid4()}.{ext}"
    return f"temp/{filename}"

class TempImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey('User',on_delete=models.CASCADE,)
    date_created = models.DateTimeField(verbose_name="作成日時",auto_now_add=True,null=True)
    image = models.ImageField(upload_to=upload_to)
    date = models.CharField(max_length=16,null=True)
    lat = models.FloatField(null=True)
    lon = models.FloatField(null=True)
@receiver(post_delete, sender=TempImage)
def delete_file(sender, instance, **kwargs):
    if instance.image:
        try:
            instance.image.delete(False)
        except Exception as e:
            print(f"Error deleting file {instance.image.name}: {e}")

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    # username=models.CharField(max_length=128,verbose_name="user   name")
    # email=None
    first_name = None
    last_name = None
    # groups = None
    icon = models.ImageField(upload_to="images/",blank=True,null=True,verbose_name="アイコン")
    home = models.OneToOneField(Location,on_delete=models.CASCADE,blank=True,null=True,verbose_name="お気に入りの場所")
    # password=models.CharField(max_length=128,verbose_name="password")
    # date_created=models.DateField(verbose_name="creation date",auto_now_add=True,null=True)
    # date_last_login=models.DateField(verbose_name="last login date",auto_now=True,null=True)
    # is_admin=models.BooleanField(verbose_name="is admin",default=False)
    
    REQUIRED_FIELDS = ["email",]
    
    class Meta:
        db_table = 'CycleDiary_User'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.username
    
class Diary(models.Model):
    diary_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    date = models.DateField(verbose_name="日記の日時", null=True, unique=True)
    # 詳しい時間
    # datetime = models.DateTimeField("time detail",blank=True)
    # name_place = models.CharField(max_length=128,verbose_name="place name",null=True)
    
    date_created = models.DateField(verbose_name="作成日",auto_now_add=True,null=True)
    date_last_updated = models.DateField(verbose_name="最終更新日",auto_now=True,null=True)
    # is_publish = models.BooleanField(verbose_name="is publish",default=False)
    comment = models.TextField(blank=True,verbose_name="コメント")
    
    # locations = models.ManyToManyField('Location', verbose_name="場所情報", related_name="diaries")
    user = models.ForeignKey(User,on_delete=models.CASCADE,)
    
    def __str__(self):
        return str(self.date)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="diary_date_unique"
            ),
        ]
    
    # def clean(self):
    #     super().clean()  # 親クラスのcleanを呼び出す
    #     user = self.user
    #     # フォームのインスタンスが新規作成か更新かを判定
    #     if self.pk:
    #         # 更新の場合は他のインスタンスの重複をチェック
    #         if Diary.objects.filter(date=self.date, user=user).exclude(pk=self.pk).exists():
    #             raise ValidationError(f"この日時の日記はすでに存在します。pk={self.pk}")
    #     else:
    #         # 新規作成の場合はすべてのインスタンスの重複をチェック
    #         if Diary.objects.filter(date=self.date, user=user).exists():
    #             raise ValidationError("この日時の日記はすでに存在します。")
    
@receiver(models.signals.post_save, sender=Diary)
def update_cache_on_create_or_update(sender, instance, created, **kwargs):
    # キャッシュを削除または更新する
    cache_key = f'diaries_{instance.user.id}'
    cache.delete(cache_key)  # Diaryが作成または更新されたときにキャッシュを削除

@receiver(models.signals.post_delete, sender=Diary)
def update_cache_on_delete(sender, instance, **kwargs):
    # キャッシュを削除する
    cache_key = f'diaries_{instance.user.id}'
    cache.delete(cache_key)  # Diaryが削除されたときにキャッシュを削除

