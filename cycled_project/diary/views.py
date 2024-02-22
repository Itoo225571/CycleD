from typing import Any
from django.db.models.query import QuerySet
from django.shortcuts import render,get_object_or_404,redirect
from django.http import HttpResponse,HttpResponseRedirect
from django.views import generic
from django.urls import reverse,reverse_lazy

from .models import User,Diary
from .forms import UserForm,DiaryForm

# from datetime import datetime

