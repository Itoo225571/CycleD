from django.db import models
from django.contrib.auth.models import AbstractUser
# from django.templatetags.static import static
from django.conf import settings
from django.core.exceptions import ValidationError

import uuid

class User(AbstractUser):
    ICON_BASE_PATH = f'{settings.STATIC_URL}accounts/img/user_icons/'
    ICON_CHOICES = [
        (f'{ICON_BASE_PATH}user_icon_1.png', 'User Image1'),
        (f'{ICON_BASE_PATH}user_icon_2.png', 'User Image2'),
        (f'{ICON_BASE_PATH}user_icon_3.png', 'User Image3'),
        (f'{ICON_BASE_PATH}user_icon_4.png', 'User Image4'),
        (f'{ICON_BASE_PATH}user_icon_5.png', 'User Image5'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    username=models.CharField(max_length=8,unique=True,verbose_name="ユーザー名")
    email = models.EmailField(unique=True, blank=False, verbose_name="メールアドレス")  # メールアドレスを一意に設定
    first_name = None
    last_name = None
    icon = models.CharField(
        max_length=100,
        choices=ICON_CHOICES,
        default=f'{ICON_BASE_PATH}user_icon_1.png',  # ここでデフォルト画像を指定
        verbose_name="アイコン",
    )
    class Meta:
        db_table = 'CycleDiary_User'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    def __str__(self):
        return self.username
    def clean(self):
        super().clean()
        min_length = 3
        if len(self.username) < min_length:
            raise ValidationError({
                'username': '名前が短すぎます',
            })
        if '@' not in self.email:
            raise ValidationError({
                'email': '正しいメールアドレスを入力してください'
            })