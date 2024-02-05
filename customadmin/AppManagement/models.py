from django.db import models

class Book(models.Model):
    name=models.CharField(max_length=256)
    publish=models.CharField(max_length=64)
    author=
    
    def __str__(self):
        return self.name
    
class Author(models.Model):
    name=models.CharField(max_length=256)
    