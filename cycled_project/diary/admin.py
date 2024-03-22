from django.contrib import admin

from .models import User,Diary

class DiaryInline(admin.TabularInline):
    model=Diary
    extra=3

class UserAdmin(admin.ModelAdmin):
    fieldsets=[
        (None,{"fields":["username"]}),
        ("Email Information",{"fields":["email"]})
    ]
    inlines=[DiaryInline]
    list_display=["username","date_created","date_last_login",]
    search_fields=["username",]
    
admin.site.register(User,UserAdmin)
# admin.site.register(Diary)
