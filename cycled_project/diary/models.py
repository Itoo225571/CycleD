from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # username=models.CharField(max_length=128,verbose_name="name")
    email=models.EmailField(verbose_name="email address")
    password=models.CharField(max_length=128,verbose_name="password")
    date_created=models.DateField(verbose_name="creation date",auto_now_add=True,null=True)
    date_last_login=models.DateField(verbose_name="last login date",auto_now=True,null=True)
    is_admin=models.BooleanField(verbose_name="is admin",default=False)
    address=models.CharField(max_length=256,verbose_name="address",blank=True)
    place_favorite=models.CharField(max_length=128,blank=True,verbose_name="favorite place")
    
    def __str__(self):
        return self.username
    
class Diary(models.Model):
    date=models.DateField(verbose_name="diary date",null=True)
    name_place=models.CharField(max_length=128,verbose_name="place name",null=True)
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    image=models.ImageField(upload_to="images/",blank=True,null=True)
    date_created=models.DateField(verbose_name="creation date",auto_now_add=True,null=True)
    date_last_updated=models.DateField(verbose_name="last updated date",auto_now=True,null=True)
    is_publish=models.BooleanField(verbose_name="is publish",default=False)
    comment=models.TextField(blank=True)
    datetime=models.DateTimeField("time detail",blank=True)
    
    def __str__(self):
        return self.name_place
    