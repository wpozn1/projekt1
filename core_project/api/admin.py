from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Movie

class MyUserAdmin(UserAdmin):
    filter_horizontal = ('watched_movies',)
    fieldsets = UserAdmin.fieldsets + (
        ('Biblioteka użytkownika', {'fields': ('watched_movies',)}),
    )

admin.site.register(User, MyUserAdmin) 
admin.site.register(Movie)