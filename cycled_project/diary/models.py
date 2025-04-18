from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model

import uuid
from subs.photo_info.photo_info import to_pHash
import datetime

User = get_user_model()

class Location(models.Model):
    # homeの場合のuser
    user = models.OneToOneField(User, on_delete=models.CASCADE, blank=True, null=True, verbose_name="ユーザー")

    location_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    lat = models.FloatField(null=False,blank=True)
    lon = models.FloatField(null=False,blank=True)
    # 市区町村
    state = models.CharField(max_length=128,blank=True,verbose_name="市区町村")
    # 表示名
    display = models.CharField(max_length=128,blank=True,verbose_name="表示名")
    label = models.CharField(max_length=128,blank=True,verbose_name="ラベル")
    # 画像(日記作成の時につける)
    image = models.ImageField(upload_to="locations/",blank=True,null=True,verbose_name="サイクリング画像")
    image_hash = models.CharField(max_length=256,blank=True,null=True)
    rotate_angle = models.IntegerField(default=0 , blank=True, null=True, verbose_name="角度")
    
    diary = models.ForeignKey('Diary',on_delete=models.CASCADE,null=True,related_name="locations")
    
    is_home = models.BooleanField(default=False, verbose_name="登録地域か否か") # homeか否か
    is_thumbnail = models.BooleanField(default=False, verbose_name="サムネイル")
    
    def __str__(self) -> str:
        return self.label
    
    def save(self, *args, **kwargs):
        self.rotate_angle = self.rotate_angle % 360  # 360度以内にする
        if not self.is_home and self.image and not self.image_hash:
            self.image_hash = to_pHash(self.image)
        super().save(*args, **kwargs)
        
    def clean(self):
        super().clean()
        if self.diary:  # 更新の場合
            if self.diary.diary_id:  # 更新の場合
                # 更新後のLocationの数をカウント
                location_count = self.diary.locations.count() 
                if location_count > self.diary.MAX_LOCATIONS:  # MAX_LOCATIONSは許可される最大数を指定
                    raise ValidationError(f"この日記には{self.diary.MAX_LOCATIONS}個以上の場所を追加できません。")
                
        # Diaryの場合に検証するフィールドリスト
        if not self.is_home:
             if not getattr(self, 'delete', False):  # deleteフラグがFalseの場合
                errors = {}
                fields_to_validate = {
                    "lat": "緯度を入力してください。",
                    "lon": "経度を入力してください。",
                    "state": "都道府県を入力してください。",
                    "display": "表示名を入力してください。",
                    "label": "ラベルを入力してください。",
                }
                for field, message in fields_to_validate.items():
                    value = getattr(self, field, None)
                    if value is None or (isinstance(value, str) and value.strip() == ''):
                        errors[field] = message
                
                if errors:
                    raise ValidationError(errors)

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
    date_list = models.JSONField(default=list)  # ここで複数日付を保存

    rate = {
        'Gold': 10,
        'Normal': 1,
    }

    num_continue = models.IntegerField(default=0)
    timestamp = models.DateField(null=True)

    def _can_increment(self, diary):
        return str(diary.date) not in self.date_list  # diary.date を文字列に変換して比較
    def _rate_convert(self, diary):
        # rankを文字列に変換してrateを取得する
        rank = diary.get_rank_display()  # 'Gold' or 'Normal'
        return self.rate.get(rank, 0)  # rank に対応する rate を取得
    def _date_process(self, diary):
        yesterday = timezone.now().date() - datetime.timedelta(days=1)
        # rankが'Gold'の場合に連続記録数を加算
        if diary.get_rank_display() == 'Gold':
            if self.timestamp and self.timestamp <= yesterday:
                self.num_continue += 1
            elif not self.timestamp:  # 初めて日記を作成する場合も考慮
                self.num_continue = 1  # 初回は1に設定
            else:
                self.num_continue = 0
            self.timestamp = timezone.now()     # rankがGoldの場合timestampを更新
        if self._can_increment(diary):   # 念の為
            self.date_list.append(str(diary.date))  # diary.date を文字列に変換して追加
    
    # Coin仕様:
    # 1. Diaryが今日中に作成された場合:
    #     ・連続記録数が加算される
    #     ・rateに応じて獲得数が増える
    # 2. Diaryが今日のものでなかった場合
    #     ・rateに応じたCoinが手に入る
    def add(self, diary):
        if self._can_increment(diary):
            self.num += self._rate_convert(diary)
            self._date_process(diary)
            self.save()
        return self.num
    
    def sub(self, num):
        if self.num - num > 0:
            self.num -= num
            self.save()
            return True
        else:
            return False
    
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