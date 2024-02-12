from django.test import TestCase

from django.urls import reverse,resolve

from diary.views import *


class TestUrls(TestCase):
    def test_user_index_url(self):
        url=reverse('diary:user_index')
        self.assertEqual(resolve(url).func.view_class,UserIndexView)
        
    def test_user_detail_url(self):
        pass
    def test_diary_update_url(self):
        pass
    def test_diary_create_url(self):
        pass
    def test_diary_write_url(self):
        pass
        # url=reverse('diary:diary_write')
        # self.assertEqual(resolve(url).func,diary_write)