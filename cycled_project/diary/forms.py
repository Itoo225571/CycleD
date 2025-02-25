from typing import Any
from django import forms
from django.forms.renderers import BaseRenderer
from django.forms.utils import ErrorList
from django.core.exceptions import ValidationError
from diary.models import Location,Diary

from pathlib import Path
import os
from subs.photo_info.photo_info import to_pHash
import mimetypes

def validate_file_extension(value):
    ext = os.path.splitext(value.name)[1]  # 拡張子を取得
    valid_extensions = ['.jpg', '.jpeg', '.png', '.heic']
    if not ext.lower() in valid_extensions:
        raise ValidationError(f'Unsupported file extension. Supported formats are: {", ".join(valid_extensions)}')

"""___FormSet用のMixin"""
class ModelFormWithFormSetMixin:
    def __init__(self, *args, **kwargs):
        super(ModelFormWithFormSetMixin, self).__init__(*args, **kwargs)
        self.formset = self.formset_class(
            instance=self.instance,
            data=self.data if self.is_bound else None,
        )

    def is_valid(self):
        return super(ModelFormWithFormSetMixin, self).is_valid() and self.formset.is_valid()

    def save(self, commit=True):
        saved_instance = super(ModelFormWithFormSetMixin, self).save(commit)
        self.formset.save(commit)
        return saved_instance

"""___Address関連___"""
class AddressSearchForm(forms.Form):
    keyword = forms.CharField(
                        label="",
                        max_length=64,
                        widget=forms.TextInput(attrs={"placeholder":" 地名・施設名・駅名など"})
                    )
    
class LocationForm(forms.ModelForm):
    date_of_Diary = forms.DateField(required=False, widget=forms.HiddenInput())
    id_of_image = forms.UUIDField(required=False, widget=forms.HiddenInput())
    rank = forms.ChoiceField(choices=Diary.RANK_CHOICES, initial=1, required=False, widget=forms.HiddenInput())
    class Meta:
        model = Location
        fields = [
            "lat","lon","state","display",
            "label","is_thumbnail","rotate_angle",
            "date_of_Diary","id_of_image","rank",
        ]
        labels = {
            "label": "表示名",
        }
        help_texts = {
            "label": "サイクリング先の名前(編集できます)",
        }
        
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)

    def clean_image(self):
        data = self.cleaned_data["image"]
        phash = to_pHash(data)  # pHashを生成
        phash_all = Location.objects.filter(diary__user=self.request.user).values_list('image_hash', flat=True)
        if phash in phash_all:
            self.add_error("image","同じ画像が既に存在します。")
        return data
            
LocationFormSet = forms.inlineformset_factory(
        Diary,
        Location,
        form=LocationForm,
        extra=0,
        can_delete=True,
        max_num=50,
        validate_max=True,
        min_num=1,
        validate_min=True,
)

class LocationCoordForm(forms.ModelForm):
    class Meta:
        model = Location
        fields = ["lat","lon",]

"""___Diary関連___"""
class DiaryForm(ModelFormWithFormSetMixin, forms.ModelForm):
    formset_class = LocationFormSet
    # keyword = forms.CharField(
    #     label="",
    #     max_length=64,
    #     required=False,
    #     widget=forms.TextInput(attrs={"placeholder": "地名・施設名・駅名など", 'type': 'search'}),
    # )

    def __init__(self, *args, widgets=None, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        # `widgets` が渡された場合、それを適用
        if widgets:
            for field_name, widget in widgets.items():
                if field_name in self.fields:
                    self.fields[field_name].widget = widget

    class Meta:
        model = Diary
        fields = ["date", "comment", "is_public"]
        labels = {
            "date": "サイクリング日時",
            "comment": "コメント",
        }
        help_texts = {
            "date": "サイクリングに行った日を入力",
            "comment": "",
        }
        widgets = {
            'comment': forms.Textarea(attrs={
                'rows': 3,
                'placeholder': 'コメントを入力してください',
                'style': 'resize: none; width: 100%;',
                'oninput': 'checkLineLimit(this)',
            }),
        }

    def clean_date(self):
        date = self.cleaned_data["date"]
        user = self.request.user
        # フォームのインスタンスが新規作成か更新かを判定
        if not self.instance.pk:
            if Diary.objects.filter(date=date, user=user).exists():
                self.add_error('date',"この日時の日記はすでに存在します。")
        return date
    
    def clean(self):
        cleaned_data = super().clean()
        # フォームセットのバリデーションを実行
        formset_valid = self.formset.is_valid()
        # フォームセットのエラーをフォームに追加する
        if not formset_valid:
            non_form_errors = self.formset.non_form_errors()
            if non_form_errors:
                for error in non_form_errors:
                    self.add_error(None, error)
            for form in self.formset:
                for error in form.non_field_errors():
                    self.add_error(None, error)
        # 少なくとも1つのフォームが有効であることを確認
        has_valid_data = any(form.cleaned_data for form in self.formset)
        if not has_valid_data:
            self.add_error(None, "少なくとも1つのロケーションを追加してください。")
        return cleaned_data

class DiaryDynamicForm(forms.ModelForm):
    class Meta:
        model=Diary
        fields=["comment","is_public"]
    def __init__(self, *args, **kwargs):
        dynamic_fields = kwargs.pop('dynamic_fields', None)
        super(DiaryDynamicForm, self).__init__(*args, **kwargs)
        if dynamic_fields:
            self.fields = {field: self.fields.get(field) for field in dynamic_fields if field in self.fields}

class BaseDiaryFormSet(forms.BaseModelFormSet):
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)

    def get_form_kwargs(self,index):
        kwargs = super().get_form_kwargs(index)
        kwargs['request'] = self.request
        return kwargs

DiaryFormSet = forms.modelformset_factory(
    Diary,
    form=DiaryForm,
    formset=BaseDiaryFormSet,
    extra=0,  
    can_delete=True,
    min_num=0,
    validate_min=True,
    max_num=50,
    validate_max=True,
)

class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True
    def __init__(self, attrs=None):
        if attrs is None:
            attrs = {'accept': 'image/*,image/heic,image/heif'}
        else:
            attrs.update({'accept': 'image/*,image/heic,image/heif'})
        super().__init__(attrs)
    
class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_file_clean = super().clean
        allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/heic','image/heif']
        if isinstance(data, (list, tuple)):         
            result = []
            for d in data:
                file = single_file_clean(d, initial)
                mime_type, _ = mimetypes.guess_type(file.name)
                if mime_type:
                    file.content_type = mime_type
                elif file.name.lower().endswith('.heic') or file.name.lower().endswith('.heif'):
                    file.content_type = 'image/heic'  # または適切なMIMEタイプ
                if file.content_type not in allowed_mime_types:
                    raise forms.ValidationError(f"{file.name} は許可されていないファイルタイプです。")
                result.append(file)
        else:
            file = single_file_clean(data, initial)
            if file.content_type not in allowed_mime_types:
                raise forms.ValidationError(f"{file.name} は許可されていないファイルタイプです。")
            result = file
        return result
    
class PhotosForm(forms.Form):
    images = MultipleFileField(label='写真を選択', required=False,)
    def __init__(self, *args, **kwargs):
        # viewsでrequestを使用可能にする
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
