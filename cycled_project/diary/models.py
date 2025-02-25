from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model

import uuid
from subs.photo_info.photo_info import to_pHash

User = get_user_model()

class Location(models.Model):
    # homeの場合のuser
    user = models.OneToOneField(User, on_delete=models.CASCADE, blank=True, null=True, verbose_name="ユーザー")

    location_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
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
    rotate_angle = models.IntegerField(default=0 , blank=True, null=True, verbose_name="角度")
    
    diary = models.ForeignKey('Diary',on_delete=models.CASCADE,null=True,related_name="locations")
    
    is_home = models.BooleanField(default=False, verbose_name="登録地域か否か") # homeか否か
    is_thumbnail = models.BooleanField(default=False, verbose_name="サムネイル")
    
    def __str__(self) -> str:
        return self.label
    
    def save(self, *args, **kwargs):
        self.rotate_angle = self.rotate_angle % 360 # 360度以内にする

        if self.diary:  #日記作成の場合
            if self.image and not self.image_hash:
                self.image_hash = to_pHash(self.image)   # pHashの生成
            # is_thumbnailがTrueの場合、同じDiary内の他のLocationのis_thumbnailをFalseにする
            if self.is_thumbnail:
                # Diaryを取得
                diary = self.diary
                if diary:
                    # 同じDiary内の他のLocationのis_thumbnailをFalseにする
                    Location.objects.filter(diary=diary).exclude(location_id=self.location_id).update(is_thumbnail=False)
            # 他にis_thumbnail=Trueがなかったらself.is_thumbnailをTrueにする
            else:
                existing_thumbnail = self.diary.locations.filter(is_thumbnail=True).exclude(location_id=self.location_id).first()
                if not existing_thumbnail:
                    self.is_thumbnail = True
        super().save(*args, **kwargs)
    def clean(self):
        super().clean()
        if self.diary:  # 更新の場合
            if self.diary.diary_id:  # 更新の場合
                # 更新後のLocationの数をカウント
                location_count = self.diary.locations.count() 
                if location_count > self.diary.MAX_LOCATIONS:  # MAX_LOCATIONSは許可される最大数を指定
                    raise ValidationError(f"この日記には{self.diary.MAX_LOCATIONS}個以上の場所を追加できません。")

def upload_to(instance, filename):
    # 拡張子を取得
    ext = filename.split(".")[-1]  
    # ファイル名としてUUIDを生成し、元の拡張子を維持
    filename = f"{uuid.uuid4()}.{ext}"
    return f"temp/{filename}"

class TempImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User,on_delete=models.CASCADE)
    date_created = models.DateTimeField(verbose_name="作成日時",auto_now_add=True,null=True)
    image = models.ImageField(upload_to=upload_to)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    date_photographed = models.DateTimeField(verbose_name="撮影日時",null=True)
    date_lastModified = models.DateTimeField(verbose_name="ファイル更新日時",null=True)
    
class Diary(models.Model):
    diary_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    date = models.DateField(verbose_name="日記の日時", null=True, )
    date_created = models.DateField(verbose_name="作成日",auto_now_add=True,null=True)
    date_last_updated = models.DateField(verbose_name="最終更新日",auto_now=True,null=True)
    comment = models.TextField(blank=True,verbose_name="コメント")
    user = models.ForeignKey(User,on_delete=models.CASCADE,)
    MAX_LOCATIONS = 3  # 最大Location数
    is_public = models.BooleanField(default=False, verbose_name="日記を公開する")

    RANK_CHOICES = [
        (0, 'Gold'),
        (1, 'Normal'),
    ]
    rank = models.IntegerField(choices=RANK_CHOICES, default=1)

    class Meta:
        unique_together = ('user', 'date')  # ユーザーごとに日付をユニークにする
    def __str__(self):
        return str(self.date)
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="diary_date_unique"
            ),
        ]
    def clean(self):
        super().clean()  # 既存のバリデーションを保持
        if self.date and self.date > timezone.localdate():  # 今日より未来の日付かどうかを確認
            raise ValidationError("日記の日付は今日以前の日付でなければなりません。")

class Coin(models.Model):
    coin_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # UUIDを主キーとして設定
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="ユーザー")
    num = models.IntegerField(default=0)
    num_continue = models.IntegerField(default=0)
    timestamp = models.DateTimeField(null=True)
    @property
    def can_increment(self):
        if self.timestamp is None:
            return True  # まだ加算されたことがない場合
        return self.timestamp.date() != timezone.now().date()
    def add(self, amount=1):
        if self.can_increment:
            self.num += amount
            self.num_continue += 1
            self.timestamp = timezone.now()
            self.save()
        return self.num
    
class Good(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="good")
    diary = models.ForeignKey(Diary, on_delete=models.CASCADE, related_name="good")
    date_created = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'diary')  # 同じユーザーが同じ投稿に複数回いいねできないようにする
        
    def clean(self):
        super().clean()  # 既存のバリデーションを保持
        # ユーザーが自分の日記に「いいね」できないようにする
        if self.user == self.diary.user:
            raise ValidationError("自分の日記にはいいねできません。")