from django.db import models

#model：データベースのテーブルを表現する
class Book(models.Model):
    name=models.CharField("書籍名",max_length=100)
    publish=models.CharField("出版社",max_length=100,blank=True)
    page=models.IntegerField("ページ数",blank=True,default=0)
    
    def __str__(self):
        return self.name

#評価    
class Evaluation(models.Model):
    book=models.ForeignKey(Book,verbose_name="書籍",related_name="evaluation",on_delete=models.CASCADE)
    star=models.IntegerField("星",default=0)
    comment=models.TextField("コメント",blank=True)
    
    def __str__(self):
        return self.comment