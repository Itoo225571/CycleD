from django.db import models
from django.contrib.auth.models import AbstractUser

class Location(models.Model):
    # user = models.ForeignKey(User,on_delete=models.CASCADE)
    lat = models.FloatField()
    lon = models.FloatField()
    # 市区町村
    state = models.CharField(max_length=128,blank=True,verbose_name="市区町村")
    # 表示名
    display = models.CharField(max_length=128,blank=True,verbose_name="表示名")
    label = models.CharField(max_length=128,blank=True,verbose_name="ラベル")
    # 画像(日記作成の時につける)
    image = models.ImageField(upload_to="images/",blank=True,null=True)
    diary = models.ForeignKey('Diary',on_delete=models.CASCADE,null=True,related_name="locations")
    # homeか否か
    is_home = models.BooleanField(default=False, verbose_name="登録地域か否か")
    
    def __str__(self) -> str:
        return self.display

class User(AbstractUser):
    # username=models.CharField(max_length=128,verbose_name="user   name")
    # email=None
    first_name = None
    last_name = None
    # groups = None
    icon = models.ImageField(upload_to="images/",blank=True,null=True,verbose_name="アイコン")
    home = models.OneToOneField(Location,on_delete=models.CASCADE,blank=True,null=True,verbose_name="お気に入りの場所")
    # password=models.CharField(max_length=128,verbose_name="password")
    # date_created=models.DateField(verbose_name="creation date",auto_now_add=True,null=True)
    # date_last_login=models.DateField(verbose_name="last login date",auto_now=True,null=True)
    # is_admin=models.BooleanField(verbose_name="is admin",default=False)
    
    REQUIRED_FIELDS = ["email",]
    
    class Meta:
        db_table = 'CycleDiary_User'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.username
    
class Diary(models.Model):
    date = models.DateField(verbose_name="日記の日時", null=True)
    # 詳しい時間
    # datetime = models.DateTimeField("time detail",blank=True)
    # name_place = models.CharField(max_length=128,verbose_name="place name",null=True)
    
    date_created = models.DateField(verbose_name="作成日",auto_now_add=True,null=True)
    date_last_updated = models.DateField(verbose_name="最終更新日",auto_now=True,null=True)
    # is_publish = models.BooleanField(verbose_name="is publish",default=False)
    comment = models.TextField(blank=True,verbose_name="コメント")
    
    # locations = models.ManyToManyField('Location', verbose_name="場所情報", related_name="diaries")
    user = models.ForeignKey(User,on_delete=models.CASCADE,)
    
    def __str__(self):
        return str(self.date)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="diary_date_unique"
            ),
        ]