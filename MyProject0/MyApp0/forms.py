from django.forms import ModelForm
from MyApp0.models import Book

class BookForm(ModelForm):
    class Meta:
        model=Book
        fields=("name","publish","page")