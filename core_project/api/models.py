from django.db import models
from django.contrib.auth.models import AbstractUser

class Movie(models.Model):
    title = models.CharField(max_length=255)
    genre = models.CharField(max_length=100)
    length = models.IntegerField()
    description = models.TextField(blank=True)

    external_id = models.IntegerField(unique=True, null=True, blank=True)

    def __str__(self):
        return self.title

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    watched_movies = models.ManyToManyField(Movie, blank=True,related_name='watched_by')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

def __str__(self):
    return self.email



