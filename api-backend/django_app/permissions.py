from rest_framework.permissions import BasePermission


def is_garage_admin(user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and getattr(user, "status", "") == "ACTIVE"
        and (user.is_superuser or getattr(user, "role", "") == "ADMIN")
    )


class IsGarageAdmin(BasePermission):
    """Admin (or superuser) tokens have full API access. Other roles are denied."""

    def has_permission(self, request, view):
        return is_garage_admin(request.user)


def _active_user(user):
    return bool(user and user.is_authenticated and user.is_active and getattr(user, "status", "") == "ACTIVE")


class IsActiveAccount(BasePermission):
    def has_permission(self, request, view):
        return _active_user(request.user)


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return _active_user(user) and getattr(user, "role", "") == "CUSTOMER"
