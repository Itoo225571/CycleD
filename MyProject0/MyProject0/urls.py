"""
urlpatternsリストは、URLをビューにルーティングします。詳細については以下を参照してください：
https://docs.djangoproject.com/en/5.0/topics/http/urls/

例：
    関数ベースのビュー
        1. インポートを追加: from my_app import views
        2. urlpatternsにURLを追加: path('', views.home, name='home')
        
    クラスベースのビュー
        1. インポートを追加: from other_app.views import Home
        2. urlpatternsにURLを追加: path('', Home.as_view(), name='home')
    
    別のURLconfを含める
        1. include()関数をインポート: from django.urls import include, path
        2. urlpatternsにURLを追加: path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include

urlpatterns = [
    path("admin/", admin.site.urls),
    #アプリのパス
    #これを追加することでアプリごとのurlsを取り込める<-include関数
    path("MyApp0/",include("MyApp0.urls")),
]
