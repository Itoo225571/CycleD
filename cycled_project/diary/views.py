from django.shortcuts import render,get_object_or_404

from .models import User,Diary

from datetime import datetime

def user_index(request):
    user_list=User.objects.order_by("id")
    # output=",".join([user.name for user in user_list])
    
    # template=loader.get_template("diary/user_index.html")
    template="diary/user_index.html"
    context={
            "user_list":user_list,
            }
    return render(context=context,
                  request=request,
                  template_name=template)

    
def user_detail(request,user_id):
        user=get_object_or_404(User,pk=user_id)
        return render(request=request,
                      template_name="diary/user_detail.html",
                      context={"user":user})