from typing import Any
from django.db.models.query import QuerySet
from django.shortcuts import render,get_object_or_404
from django.http import HttpResponse,HttpResponseRedirect
from django.views import generic
from django.urls import reverse

from .models import User,Diary

from datetime import datetime

class UserIndexView(generic.ListView):
        template_name="diary/user_index.html"
        context_object_name="user_list"
        # def get_queryset(self):
        #         return User.objects.order_by("id")
        model=User

        
class UserDetailView(generic.DetailView):
        model=User
        template_name="diary/user_detail.html"
        
class DiaryWriteView(generic.UpdateView):
        pass

def diary_write(request,user_id):
        user=get_object_or_404(User,pk=user_id)
        try:
                content=user.diary_set.get(pk=request.POST["diary_write"])
        except(KeyError,Diary.DoesNotExist):
                error_message="なんにもかいてないよぅ"
                return render(request,
                              "diary/user_detail.html",
                              {"user":user,"error_message":error_message},
                              )
        else:
                content.save()
        
        return HttpResponseRedirect(reverse("diary:diary_check"),
                                    args=(user.id)
                                    )
        
def diary_check(request,user_id):
        user=get_object_or_404(User,pk=user_id)
        return render(request,
                      "diary/diary_check.html",
                      {"user":user}
                      )