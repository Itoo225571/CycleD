from typing import Any, Mapping
from django.forms import ModelForm,CharField,PasswordInput,ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm,UserChangeForm,AuthenticationForm
from django.contrib.auth.hashers import make_password,check_password
from django import forms
from django.forms.renderers import BaseRenderer
from django.forms.utils import ErrorList

from diary.models import *

class SignupForm(UserCreationForm):
    '''     定義文      '''
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs={"placeholder":"ユーザー名入力欄"}
        self.fields["email"].widget.attrs={"placeholder":"メールアドレス入力欄"}
        self.fields['email'].required = True

    class Meta:
        model = get_user_model()
        fields=["username","email","password1",]
        labels = {
            "username": "ユーザー名",
            "email": "mailアドレス",
            "password1": "パスワード",
        }
        help_texts = {
            "username": "",
            "email": "",
            "password1": "",
        }
        widgets={"password1":PasswordInput(attrs={"placeholder":"パスワード入力欄"})}

    password2=CharField(
        label="パスワード再入力欄",
        required=True,
        strip=False,
        widget=PasswordInput(attrs={"placeholder":"確認用パスワード入力欄"})
        )

    '''     以下検証       '''
    def clean_username(self):
        value = self.cleaned_data['username']
        min_length=3
        if len(value) < min_length:
            raise ValidationError('%(min_length)s文字以上で入力してください', params={'min_length':min_length})
        return value
    #email
    def clean_email(self):
        value = self.cleaned_data['email']
        return value
    #password
    def clean_password(self):
        value = self.cleaned_data['password1']
        return value
    #フォーム全体
    def clean(self):
        password = self.cleaned_data['password1']
        password2 = self.cleaned_data['password2']
        if password != password2:
            raise ValidationError("パスワードと確認用パスワードが合致しません")
        super().clean()
    
class SigninForm(AuthenticationForm):
    # username_or_email = CharField(label='ユーザー名またはメールアドレス')
    class Meta:
        model = get_user_model()
        fields=["username","password",]

"""___Address関連___"""
class AddressSearchForm(forms.Form):
    keyword = forms.CharField(
                        label="",
                        max_length=64,
                        widget=forms.TextInput(attrs={"placeholder":" 地名・施設名・駅名など"})
                        )
    
class LocationForm(ModelForm):
    class Meta:
        model = Location
        fields = ["lat","lon","state","display",]

class LocationCoordForm(ModelForm):
    class Meta:
        model = Location
        fields = ["lat","lon",]
    
"""___User関連___"""
class UserEditForm(UserChangeForm):
    class Meta:
        model = get_user_model()
        fields = ["username","email","password"]
        labels = {
            "username": "ユーザー名",
            "email": "メールアドレス",
            "password": "パスワード",
        }
        help_texts = {
            "username": "",
            "email": "",
            "password": "",
        }

class DiaryForm(ModelForm):
    class Meta:
        model=Diary
        fields=["date","name_place","image","is_publish","comment",]
        