from django.contrib import admin

from .models import NIKIRunUserInfo,NIKIRunScore

class NIKIRunUserInfoAdmin(admin.ModelAdmin):
    pass
class NIKIRunScoreAdmin(admin.ModelAdmin):
    pass

admin.site.register(NIKIRunUserInfo,NIKIRunUserInfoAdmin)
admin.site.register(NIKIRunScore,NIKIRunScoreAdmin)
