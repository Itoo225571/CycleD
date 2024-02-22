from typing import Any
from django.forms import ModelForm

from diary.models import User,Diary

class UserForm(ModelForm):
    class Meta:
        model=User
        fields=["name","email","password","address",]

class DiaryForm(ModelForm):
    class Meta:
        model=Diary
        fields=["date","name_place","image","is_publish","comment",]
        