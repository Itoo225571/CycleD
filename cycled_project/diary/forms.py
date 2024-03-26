from typing import Any
from django.forms import ModelForm,CharField,PasswordInput,ValidationError
from django.contrib.auth.forms import UserCreationForm,AuthenticationForm

from diary.models import User,Diary

class SignupForm(ModelForm):
    '''     定義文      '''
    class Meta:
        model=User
        fields=["username","email","password","icon",]
        widgets={"password":PasswordInput(attrs={"placeholder":"パスワード入力欄"})}
    password2=CharField(
        label="パスワード再入力欄",
        required=True,
        strip=False,
        widget=PasswordInput(attrs={"placeholder":"確認用パスワード入力欄"})
        )
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs={"placeholder":"ユーザー名入力欄"}
        self.fields["email"].widget.attrs={"placeholder":"メールアドレス入力欄"}
        
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
        value = self.cleaned_data['password']
        return value
    #フォーム全体
    def clean(self):
        password = self.cleaned_data['password']
        password2 = self.cleaned_data['password2']
        if password != password2:
            raise ValidationError("パスワードと確認用パスワードが合致しません")
        super().clean()
    
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
        