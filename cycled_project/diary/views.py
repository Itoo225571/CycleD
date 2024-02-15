from typing import Any
from django.db.models.query import QuerySet
from django.shortcuts import render,get_object_or_404,redirect
from django.http import HttpResponse,HttpResponseRedirect
from django.views import generic
from django.urls import reverse,reverse_lazy

from .models import User,Diary

from .forms import UserForm,DiaryForm

# from datetime import datetime

class UserIndexView(generic.ListView):
        template_name="diary/user_index.html"
        context_object_name="user_list"
        # def get_queryset(self):
        #         return User.objects.order_by("id")
        model=User
        
class UserDetailView(generic.DetailView):
        model=User
        template_name="diary/user_detail.html"
        
class DiaryCreateView(generic.CreateView):
        model=Diary
        template_name="diary/diary_create.html"
        fields=("place","comment",)
        success_url=reverse_lazy("user_detail")

class DiaryUpdateView(generic.UpdateView):
        model=Diary
        template_name="diary/diary_update.html"
        fields=("place","comment",)
        success_url=reverse_lazy("user_detail")

def diary_write(request,user_id,diary_id=None):
        user=get_object_or_404(User,pk=user_id)
        
        if diary_id:
                diary=get_object_or_404(Diary,pk=diary_id)
        else:
                diary=Diary(user=user)
        # diary.creation_date=datetime.today()
        if request.method=="POST":
                form=DiaryForm(request.POST,instance=diary)
                if form.is_valid():
                        # diary=form.save(commit=False)
                        # diary.save()
                        form.save()
                        return redirect('diary:user_detail', pk=user_id)
        else:
                form=DiaryForm(instance=diary)
        return render(request, "diary/diary_create.html", {"form": form, "user": user})
        # try:
        #         comment=user.diary_set.get(pk=request.POST["diary_write"])
        #         place=user.diary_set.get(pk=request.POST[""])
        # except(KeyError,Diary.DoesNotExist):
        #         error_message="なんにもかいてないよぅ"
        #         return render(request,
        #                       "diary/user_detail.html",
        #                       {"user":user,"error_message":error_message}
        #                       )
        # else:
        #         comment.save()
        
        # return HttpResponseRedirect(reverse("diary:diary_check"),
        #                             args=(user.id)
        #                             )
        
def diary_check(request,user_id):
        user=get_object_or_404(User,pk=user_id)
        return render(request,
                      "diary/diary_check.html",
                      {"user":user}
                      )