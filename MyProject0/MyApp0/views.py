from django.shortcuts import render
from django.http import HttpResponse

from MyApp0.models import Book

#各URLで表示するものの関数
def book_list(request):
    books=Book.objects.all().order_by("id")
    return render(request,
                  "MyApp0/book_list.html",
                  {"books":books})

def book_edit(request,book_id=None):
    return HttpResponse("書籍の編集")

def book_del(request,book_id):
    return HttpResponse("書籍の削除")