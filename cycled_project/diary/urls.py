from django.urls import path

from . import views

app_name="diary"

urlpatterns = [
    path("",views.top,name="top"),
    path("home/",views.home,name="home"),

    path("home/location2weather",views.ajax_location2weather,name="ajax_location2weather"),
    
	path("home/address",views.address,name= "address_home"),
	path("diary/address",views.address,name="address_dairy" ),
    
    path("signin/",views.signin,name="signin"),
    path("signup/",views.signup,name="signup"),
    path("signout/",views.signout,name="signout"),
    
    path("user/",views.user_profile,name="user_profile"),
    path("user/edit/",views.user_edit,name="user_edit"),
    
    path("diary/",views.diary,name="diary"),
    path("diary/new/",views.diary_new,name="diary_new"),
    path("diary/edit/<int:diary_id>",views.diary_edit,name="diary_edit"),
    path("diary/delete/<int:diary_id>",views.diary_delete,name="diary_delete"),
    
    path("calendar/<int:user_id>",views.calendar,name="calendar"),    
]

