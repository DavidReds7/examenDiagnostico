from django.urls import include, path
from rest_framework.routers import DefaultRouter

from libros.views import LibroViewSet

router = DefaultRouter()
router.register(r"libros", LibroViewSet, basename="libro")

urlpatterns = [
    path("", include(router.urls)),
]
