from django.forms import ModelForm
from MyApp0.models import Book,Evaluation

# Form...データ送信のためのユーザーインターフェイス,フィールド(入力欄)＋ボタンから成る

class BookForm(ModelForm):
    #Metaを編集することで、Formに追加情報(fields等)を渡す
    class Meta:
        model=Book
        #本来は、name=models.CharField()みたく登録するが、modelsは既にmodels.pyで定義されてる
        fields=("name","publish","page")
        
class EvaluationForm(ModelForm):
    class Meta:
        model=Evaluation
        fields=("star","comment",)
