from typing import Any
from django.forms import ModelForm

from diary.models import User,Diary

class UserForm(ModelForm):
    pass

class DiaryForm(ModelForm):
    class Meta:
        model=Diary
        fields=("place",)
        