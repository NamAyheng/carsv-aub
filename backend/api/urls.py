from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health, name='api-health'),
    path('status/', views.api_status, name='api-status'),
    path('catalog/', views.catalog, name='api-catalog'),
    path('bookings/', views.booking, name='api-bookings'),
    path('contact/', views.contact, name='api-contact'),
]
