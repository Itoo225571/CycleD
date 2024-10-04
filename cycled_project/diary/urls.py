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
    
    # path("diary/",views.DiaryNewView.as_view(),name="diary"),
    path("diary/<uuid:pk>/edit",views.DiaryEditView.as_view(),name="diary_edit"),
    path("diary/<uuid:pk>/delete",views.DiaryDeleteView.as_view(),name="diary_delete"),    
    path("diary/list/",views.DiaryListView.as_view(),name="diary_list"),
    path("diary/photo/",views.DiaryPhotoView.as_view(),name="diary_photo"),

    # path("diary/address/",views.AddressHomeView.as_view(),name="address_diary" ),
    # path("diary/new/address",views.AddressDiaryNewView.as_view(),name="address_diary_new" ),
    # path("diary/edit/<int:pk>/address",views.AddressDiaryEditView.as_view(),name="address_diary_edit" ),
    
    path("calendar/",views.DiaryNewView.as_view(),name="calendar"),   

    path("home/location2weather/",views.ajax_location2weather,name="ajax_location2weather"), 
    path("diary/sendDiaries",views.sendDairies,name="sendDiaries"),
    path("diary/photos2Locations",views.photos2Locations,name="photos2Locations"),
    # path("diary/photos2Locations",views.photos2Locations,name="photos2Locations"),
]

