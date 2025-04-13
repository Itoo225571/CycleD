from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

from .models import Diary,Location,Coin,TempImage

User = get_user_model()
# インラインの設定
# これをしないと、子要素の編集が同時にできないゾ
class DiaryInline(admin.TabularInline):
    model=Diary
    extra=1

class LocationInline(admin.TabularInline):
    model = Location
    extra = 1

class TempImageInline(admin.TabularInline):
    model = TempImage
    extra = 1

class CoinInline(admin.TabularInline):
    model = Coin
    extra = 1

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
    inlines=[DiaryInline,CoinInline,TempImageInline]
    list_display=["username",]
    search_fields = ["username", "email"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
    filter_horizontal =()
    list_filter = ()
    
class LocationInline(admin.TabularInline):
    model = Location
    extra = 1
    
class DiaryAdmin(admin.ModelAdmin):
    inlines = [LocationInline,]
    pass

admin.site.register(User,UserAdmin)
admin.site.register(Diary,DiaryAdmin)
