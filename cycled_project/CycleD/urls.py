"""
    CycleDプロジェクト内のURL構成設定ファイル
    urlpatternsリストは、URLをビューにルーティングします。詳細については、以下を参照してください：
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
    例1:アプリのview.py中のURLを追加
        1. インポートを追加します： from application import views
        2. urlpatternsにURLを追加します： path('', views.home, name='home')
    例2:クラスベースのビュー
        1. インポートを追加します： from other_app.views import Home
        2. urlpatternsにURLを追加します： path('', Home.as_view(), name='home')
    例3:別のURLconfを含める
        1. include()関数をインポートします： from django.urls import include, path
        2. urlpatternsにURLを追加します： path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),#admin(管理)画面用のURL
    path("cycled/",include("diary.urls")),
    path("__debug__/",include("debug_toolbar.urls")),#Debug-toolbar追加
] +static(settings.STATIC_URL,document_root=settings.STATICFILES_DIRS) +static(settings.MEDIA_URL,document_root=settings.MEDIA_ROOT)
