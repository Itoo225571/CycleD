from typing import Any
from django.forms import *

from diary.models import User,Diary

class SignupForm(ModelForm):
    class Meta:
        model=User
        fields=["name","email","password",]

class SigninForm(ModelForm):
    username_or_email = CharField(label='ユーザー名またはメールアドレス')
    class Meta:
        model=User
        fields=["username_or_email","password",]
        

class DiaryForm(ModelForm):
    class Meta:
        model=Diary
        fields=["date","name_place","image","is_publish","comment",]
        