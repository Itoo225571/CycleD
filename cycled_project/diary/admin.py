from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User,Diary

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=1

class UserAdmin(BaseUserAdmin):
    add_fieldsets=[
        (None,{
            "classes":["wide",],
            "fields":["icon","username","email","password1","password2",]}
        ),
    ]
    fieldsets=[
        (None,{"fields":["username"]}),
        ("Email Information",{"fields":["email"]}),
        ("パスワード",{"fields":["password"]}),
        ("アイコン選択",{"fields":["icon"]}),
    ]
    inlines=[DiaryInline]
    list_display=["username",]
    search_fields=["username",]
    filter_horizontal =()
    list_filter = ()
    
admin.site.register(User,UserAdmin)
# admin.site.register(Diary)
