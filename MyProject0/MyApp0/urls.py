#URLとファンクションの紐づけ

from django.urls import path
from MyApp0 import views

app_name="MyApp0"
book="book/"
urlpatterns=[
    #path(指定URL,送信するデータ,URL名)
    #<型名(int,str等):引数名>
    #URL名を付けることで、URLを変更しても使える
    path("book/",views.book_list,name="book_list"),
    path("book/add/",views.book_edit,name="book_add"),
    path("book/mod/<int:book_id>/",views.book_edit,name="book_mod"),
    path("book/del/<int:book_id>/",views.book_del,name="book_del"),
]
