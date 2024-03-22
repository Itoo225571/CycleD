from typing import Any
from django.forms import ModelForm,CharField
from django.contrib.auth.forms import UserCreationForm,AuthenticationForm

from diary.models import User,Diary

class SignupForm(UserCreationForm):
    class Meta:
        model=User
        fields=["username","email","password",]

class SigninForm(AuthenticationForm):
    # username_or_email = CharField(label='ユーザー名またはメールアドレス')
    class Meta:
        model=User
        fields=["username","password",]
        
class UserForm(ModelForm):
    class Meta:
        model=User
        fields=["username","email","password",]

class DiaryForm(ModelForm):
    class Meta:
        model=Diary
        fields=["date","name_place","image","is_publish","comment",]
        