from django.shortcuts import render,get_object_or_404,redirect
from django.http import HttpResponse
from django.views.generic.list import ListView

from MyApp0.models import Book,Evaluation
from MyApp0.forms import BookForm,EvaluationForm

class EvaluationList(ListView):
    context_object_name="evaluation"
    template_name="MyApp0/evaluation_list.html"
    paginate_by=3
    
    def get(self,request,*args,**kwargs):
        book=get_object_or_404(Book,pk=kwargs["book_id"])
        evaluations=book.evaluations.all().order_by("id")
        self.object_list=evaluations
        
        context=self.get_context_data(object_list=self.object_list,book=book)
        return self.render_to_response(context)

#requestに応じて、ModelとTemplateを適切に利用する
#各URLで実行するものの関数
def book_list(request):
    # book_listファイル内で使う変数booksの指定
    books=Book.objects.all().order_by("id")
    #render(HttpResponseのインスタンス,テンプレートファイルのパス,テンプレートファイルに埋め込みたいデータ...)
    #renderの返却値:データを埋め込んだHTMLをボディとするレスポンス
    return render(request=request, template_name="MyApp0/book_list.html", context={"books":books})
    
def book_edit(request,book_id=None):
    if book_id:#編集
        book=get_object_or_404(Book,pk=book_id)
    else:#追加
        book=Book()

    #POST:データ(ユーザーのコメント等)の送信
    #例：ログインに必要な情報の送信...URL+POST
    if request.method=="POST":
        #POSTされたrequestのデータからフォームを作る
        form=BookForm(request.POST,instance=book)
        if form.is_valid():
            book=form.save(commit=False)
            book.save()
            #MyApp0のurls内のURL名にリダイレクト(URLを直接指定することも可)
            return redirect("MyApp0:book_list")
            
    #GET：データ(なんかの登録画面等)の取得
    #例：ログイン画面の表示...URL+GET
    elif request.method=="GET":
        #DB上に保存された情報を付け足したHTMLを返却
        form=BookForm(instance=book)

    return render(request,"MyApp0/book_edit.html", dict(form=form,book_id=book_id))

def book_del(request,book_id):
    # return HttpResponse("書籍の削除")
    book=get_object_or_404(Book,pk=book_id)
    book.delete()
    return redirect("MyApp0:book_list")
