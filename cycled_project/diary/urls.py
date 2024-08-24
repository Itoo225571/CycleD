from django.urls import path
from . import views

app_name="diary"

urlpatterns = [
    path("",views.TopView.as_view(),name="top"),
    path("home/",views.HomeView.as_view(),name="home"),
	path("home/address/",views.AddressHomeView.as_view(),name= "address_home"),
    
    path("signin/",views.SigninView.as_view(),name="signin"),
    path("signup/",views.SignupView.as_view(),name="signup"),
    path("signout/",views.SignoutView.as_view(),name="signout"),
    
    path("user/",views.UserProfileView.as_view(),name="user_profile"),
    path("user/edit/",views.UserEditView.as_view(),name="user_edit"),
    
    # path("diary/",views.DiaryView.as_view(),name="diary"),
    path("diary/",views.DiaryNewView.as_view(),name="diary"),
    path("diary/list/",views.DiaryListView.as_view(),name="diary_list"),
    path("diary/edit/<int:diary_id>",views.DiaryEditView.as_view(),name="diary_edit"),
    path("diary/delete/<int:diary_id>",views.DiaryDeleteView.as_view(),name="diary_delete"),

    # path("diary/address/",views.AddressHomeView.as_view(),name="address_diary" ),
    path("diary/new/address",views.AddressDiaryNewView.as_view(),name="address_diary_new" ),
    path("diary/edit/<int:diary_id>/address",views.AddressDiaryEditView.as_view(),name="address_diary_edit" ),
    
    # path("calendar/",views.calendar,name="calendar"),   

    path("home/location2weather/",views.ajax_location2weather,name="ajax_location2weather"), 
    path("diary/sendDiaries",views.sendDairies,name="sendDiaries"),
]

