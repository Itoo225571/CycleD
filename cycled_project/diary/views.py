from django.shortcuts import render,get_object_or_404

from .models import User

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