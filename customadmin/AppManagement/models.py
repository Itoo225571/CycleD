from django.db import models

#ModelClassを定義した後は、マイグレーションの設定ファイルを作ること
#その後、マイグレーションを実行する(モデルクラスに対するテーブルを作成する)

class Author(models.Model):
    name=models.CharField(max_length=256)#作者名
    # books=#著作品
    
    def __str__(self):
        return self.name

class Book(models.Model):
    name=models.CharField(max_length=256)#タイトル
    author=models.ForeignKey(Author,on_delete=models.CASCADE)#作者
    publish=models.CharField(max_length=64)#出版社
    is_favorite=models.BooleanField()#お気に入り,〇か×か
    
    def __str__(self):
        return self.name
    
class Score(models.Model):
    book=models.OneToOneField(Book,on_delete=models.CASCADE)#どのBookか
    art=models.IntegerField()#絵に対する評価/100
    story=models.IntegerField()#お話に対する評価/100
    comment=models.CharField(max_length=2048)#コメント
    
    def __str__(self):
        return self.book.name+"'s Score"
    