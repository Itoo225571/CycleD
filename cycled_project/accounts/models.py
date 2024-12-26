from django.db import models
from django.contrib.auth.models import AbstractUser
from django.templatetags.static import static

import uuid

class User(AbstractUser):
    ICON_CHOICES = [
        ('accounts/img/user_icons/user_icon_default_man.png', 'User Image1'),
        # ('user_icons/default2.jpg', 'User Image 2'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    username=models.CharField(max_length=8,unique=True,verbose_name="ユーザー名")
    first_name = None
    last_name = None
    icon = models.CharField(
        max_length=100,
        choices=ICON_CHOICES,
        default='accounts/img/user_icons/user_icon_default_man.png',  # ここでデフォルト画像を指定
        verbose_name="アイコン",
    )
    # home = models.OneToOneField('diary.Location',on_delete=models.CASCADE,blank=True,null=True,verbose_name="お気に入りの場所")
    # coin = models.OneToOneField('diary.Coin',on_delete=models.CASCADE, blank=True, null=True, verbose_name="サイクルコイン")
    REQUIRED_FIELDS = ["email",]
    class Meta:
        db_table = 'CycleDiary_User'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    def __str__(self):
        return self.username
    def icon_url(self):
        return static(self.icon)