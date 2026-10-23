"""Staff admin access by CarSV role — same Unfold UI, modules appear/disappear."""

from __future__ import annotations

from django_app.models import User

STAFF_ROLES = frozenset(
    {
        User.Role.ADMIN,
        User.Role.MANAGER,
        User.Role.RECEPTIONIST,
        User.Role.MECHANIC,
        User.Role.CASHIER,
    }
)

A = User.Role.ADMIN
M = User.Role.MANAGER
R = User.Role.RECEPTIONIST
K = User.Role.MECHANIC
C = User.Role.CASHIER

# Who may open each admin module (Administrator always allowed via staff_role).
MODULE_ROLES: dict[str, frozenset[str]] = {
    "dashboard": frozenset({A, M, R, K, C}),
    "customers": frozenset({A, M, R}),
    "vehicles": frozenset({A, M, R}),
    "bookings": frozenset({A, M, R}),
    "services": frozenset({A, M, R}),
    "service_categories": frozenset({A, M, R}),
    "blog": frozenset({A, M}),
    "repair_jobs": frozenset({A, M, R, K}),
    "inspections": frozenset({A, M, R, K}),
    "mechanics": frozenset({A, M}),
    "staff": frozenset({A, M}),
    "spare_parts": frozenset({A, M, K}),
    "part_categories": frozenset({A, M}),
    "parts_usage": frozenset({A, M, K}),
    "part_requests": frozenset({A, M, K}),
    "invoices": frozenset({A, M, R, C}),
    "payments": frozenset({A, M, C}),
    "reports": frozenset({A, M}),
    "roles": frozenset({A}),
    "users": frozenset({A}),
    "estimates": frozenset({A, M, R, C}),
    "notifications": frozenset({A}),
    "auth_providers": frozenset({A}),
}

MODEL_MODULES: dict[str, str] = {
    "customer": "customers",
    "vehicle": "vehicles",
    "booking": "bookings",
    "service": "services",
    "servicecategory": "service_categories",
    "blogpost": "blog",
    "repairjob": "repair_jobs",
    "inspection": "inspections",
    "mechanic": "mechanics",
    "staff": "staff",
    "sparepart": "spare_parts",
    "sparepartcategory": "part_categories",
    "partsusage": "parts_usage",
    "partrequest": "part_requests",
    "invoice": "invoices",
    "payment": "payments",
    "garagereport": "reports",
    "role": "roles",
    "user": "users",
    "estimate": "estimates",
    "notification": "notifications",
    "authprovider": "auth_providers",
}


def staff_role(user) -> str | None:
    """Return staff role code, or None if not allowed in admin."""
    if not user or not getattr(user, "is_authenticated", False):
        return None
    if not user.is_active:
        return None
    if user.is_superuser:
        return User.Role.ADMIN
    role = getattr(user, "role", None)
    if role in STAFF_ROLES:
        return role
    return None


def can_use_admin(user) -> bool:
    return staff_role(user) is not None and bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


def can_access_module(user, module: str) -> bool:
    role = staff_role(user)
    if role is None:
        return False
    if role == User.Role.ADMIN:
        return True
    allowed = MODULE_ROLES.get(module)
    if allowed is None:
        return False
    return role in allowed


def module_for_model(model) -> str | None:
    if model is None:
        return None
    return MODEL_MODULES.get(model._meta.model_name)


def _nav(module: str):
    def checker(request) -> bool:
        return can_access_module(request.user, module)

    checker.__name__ = f"can_nav_{module}"
    checker.__qualname__ = f"can_nav_{module}"
    return checker


can_nav_customers = _nav("customers")
can_nav_vehicles = _nav("vehicles")
can_nav_bookings = _nav("bookings")
can_nav_services = _nav("services")
can_nav_service_categories = _nav("service_categories")
can_nav_blog = _nav("blog")
can_nav_repair_jobs = _nav("repair_jobs")
can_nav_inspections = _nav("inspections")
can_nav_mechanics = _nav("mechanics")
can_nav_staff = _nav("staff")
can_nav_spare_parts = _nav("spare_parts")
can_nav_part_categories = _nav("part_categories")
can_nav_parts_usage = _nav("parts_usage")
can_nav_part_requests = _nav("part_requests")
can_nav_invoices = _nav("invoices")
can_nav_payments = _nav("payments")
can_nav_reports = _nav("reports")
can_nav_roles = _nav("roles")
can_nav_users = _nav("users")


class RoleGatedAdminMixin:
    """Hide admin modules the signed-in staff role cannot use."""

    role_module: str | None = None

    def get_role_module(self) -> str | None:
        if self.role_module:
            return self.role_module
        return module_for_model(getattr(self, "model", None))

    def role_allows(self, request) -> bool:
        module = self.get_role_module()
        if not module:
            return staff_role(request.user) == User.Role.ADMIN
        return can_access_module(request.user, module)

    def has_module_permission(self, request):
        return self.role_allows(request)

    def has_view_permission(self, request, obj=None):
        return self.role_allows(request)

    def has_add_permission(self, request):
        module = self.get_role_module()
        if module == "reports":
            return False
        return self.role_allows(request)

    def has_change_permission(self, request, obj=None):
        return self.role_allows(request)

    def has_delete_permission(self, request, obj=None):
        if self.get_role_module() == "reports":
            return False
        return self.role_allows(request)
