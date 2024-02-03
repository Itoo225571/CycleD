from django.shortcuts import render,get_object_or_404,redirect
from django.http import HttpResponse

from MyApp0.models import Book
from MyApp0.forms import BookForm

#各URLで表示するものの関数
def book_list(request):
    books=Book.objects.all().order_by("id")
    return render(request,
                  "MyApp0/book_list.html",
                  {"books":books})

def book_edit(request,book_id=None):
    if book_id:
        book=get_object_or_404(Book,pk=book_id)
    else:
        book=Book()
    
    if request.method=="POST":
        #POSTされたrequestのデータからフォームを作る
        form=BookForm(request.POST,instance=book)
        if form.is_valid():
            book=form.save(commit=False)
            book.save()
            return redirect("MyApp0:book_list")
    elif request.method=="GET":
        form=BookForm(request,"MyApp0/book_edit.html",dict(form=form,book_id=book_id))

def book_del(request,book_id):
    return HttpResponse("書籍の削除")