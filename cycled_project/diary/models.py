from django.db import models

class User(models.Model):
    username=models.CharField(max_length=128)
    email_address=models.EmailField()
    # password=models.CharField(max_length=128)
    # creation_date=models.DateField()
    # last_login_date=models.DateField()
    
    def __str__(self):
        return self.username
    
class Diary(models.Model):
    content=models.TextField()
    # place=models.CharField()
    creation_date=models.DateField()
    # last_update_date=models.DateField()
    # publish_flag=models.BooleanField(default=True)
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    # tags=models.CharField(max_length=64)
    # image=models.ImageField(upload_tp="images/")
    
    def __str__(self):
        return self.creation_date