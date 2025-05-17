from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User
from diary.models import Diary,Coin,TempImage  # ← 他アプリ（diary）からのインポート
from games.models import NIKIRunUserInfo,NIKIRunScore

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=1

class TempImageInline(admin.TabularInline):
    model = TempImage
    extra = 1

class CoinInline(admin.TabularInline):
    model = Coin
    extra = 1

class NIKIRunUserInfoInline(admin.TabularInline):
    model = NIKIRunUserInfo
class NIKIRuScoreInline(admin.TabularInline):
    model = NIKIRunScore

class UserAdmin(BaseUserAdmin):
    add_fieldsets=[
        (None,{
            "classes":["wide",],
            "fields":["icon","username","email","password1","password2",]}
        ),
    ]
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('個人情報', {'fields': ('email', 'icon')}),
        ('権限', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            ),
        }),
        ('重要な日付', {'fields': ('last_login', 'date_joined')}),
    )
    # fields = "__all__"
    inlines=[DiaryInline,CoinInline,TempImageInline,NIKIRunUserInfoInline,NIKIRuScoreInline]
    list_display=["username",]
    search_fields = ["username", "email"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
    filter_horizontal =()
    list_filter = ()

admin.site.register(User,UserAdmin)