from django.db import models

class User(models.Model):
    name=models.CharField(max_length=128)
    email_address=models.EmailField()
    password=models.CharField(max_length=128,verbose_name="password",null=True,blank=False)
    creation_date=models.DateField(verbose_name="creation date",auto_now_add=True,null=True,blank=False)
    last_login_date=models.DateField(verbose_name="last login date",auto_now=True,null=True,blank=False)
    
    def __str__(self):
        return self.name
    
class Diary(models.Model):
    comment=models.TextField(blank=True)
    place=models.CharField(max_length=256,null=True,blank=False)
    creation_date=models.DateField(verbose_name="creation date",auto_now_add=True,null=True,blank=False)
    last_updated_date=models.DateField(verbose_name="last updated date",auto_now=True,null=True,blank=False)
    # publish_flag=models.BooleanField(default=True)
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    # tags=models.CharField(max_length=64)
    # image=models.ImageField(upload_tp="images/")
    
    def __str__(self):
        return self.creation_date.strftime("%Y/%m/%d")