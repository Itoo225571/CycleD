from django.contrib import admin

from .models import User,Diary

class UserAdmin(admin.ModelAdmin):
    fields=["name","email_address",]

admin.site.register(User)
admin.site.register(Diary)
