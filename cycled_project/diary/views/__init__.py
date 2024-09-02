from .address import AddressHomeView,AddressDiaryNewView,AddressDiaryEditView
from .base import TopView,BaseView,HomeView
from .diary import DiaryListView,DiaryNewView,DiaryEditView,DiaryDeleteView,DiaryPhotoView,sendDairies,photos2Locations
from .signin import SigninView,SignoutView,SignupView
from .subs import ajax_location2weather
from .user import UserEditView,UserProfileView