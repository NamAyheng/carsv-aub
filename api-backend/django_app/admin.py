import csv
import re
from decimal import Decimal

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.contrib.admin.actions import delete_selected as django_delete_selected
from django.contrib.admin.utils import NestedObjects, capfirst, unquote
from django.contrib.admin.views.main import ChangeList
from django.db import router
from django.db.models import BooleanField, Case, Count, DateField, DateTimeField, F, IntegerField, Max, Prefetch, Q, Sum, TimeField, When
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.timezone import localdate, now
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.forms import AdminPasswordChangeForm

from django_app.models import (
    Booking,
    Customer,
    Inspection,
    Invoice,
    Mechanic,
    PartsUsage,
    Payment,
    RepairJob,
    Role,
    Service,
    ServiceCategory,
    SparePart,
    SparePartCategory,
    Staff,
    User,
    Vehicle,
    apply_user_identity,
    current_customer_qs,
    role_choices,
    role_codes,
    role_display_name,
)

admin.site.unregister(Group)


class CarsvDeleteMixin:
    delete_confirmation_template = "admin/django_app/delete_confirmation.html"
    delete_selected_confirmation_template = "admin/django_app/delete_selected_confirmation.html"

    def _admin_changelist_url(self):
        return reverse(f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist")

    def _delete_page_context(self, objs, plural=False):
        noun = str(self.opts.verbose_name_plural if plural else self.opts.verbose_name)
        ctx = {
            "list_url": self._admin_changelist_url(),
            "delete_noun": noun,
            "objects_name": noun,
            "unlink_rows": [],
            "protect_reason": "",
            "warn_reason": "",
            "cascade_kinds": [],
            "cascade_count": 0,
            "has_fk_warning": False,
        }
        objs = [item for item in objs if item is not None]
        if not objs:
            return ctx
        impact = _related_delete_impact(objs)
        ctx["unlink_rows"] = impact["unlink_rows"]
        ctx["protect_reason"] = impact["protect_reason"]
        ctx["warn_reason"] = impact["warn_reason"]
        ctx["cascade_kinds"] = impact["cascade_kinds"]
        ctx["cascade_count"] = impact["cascade_count"]
        ctx["has_fk_warning"] = impact["state"] == "warn"
        return ctx

    def delete_view(self, request, object_id, extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, unquote(object_id))
        extra_context.update(self._delete_page_context([obj] if obj else []))
        return super().delete_view(request, object_id, extra_context=extra_context)

    def render_delete_form(self, request, context):
        context.setdefault("list_url", self._admin_changelist_url())
        context.setdefault("delete_noun", str(self.opts.verbose_name))
        context.setdefault("objects_name", context["delete_noun"])
        if context.get("protected") and not context.get("protect_reason"):
            context["protect_reason"] = (
                f"This {self.opts.verbose_name} cannot be deleted while related protected records still exist."
            )
        return super().render_delete_form(request, context)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            _func, name, description = actions["delete_selected"]
            actions["delete_selected"] = (self.carsv_delete_selected, name, description)
        return actions

    @staticmethod
    def carsv_delete_selected(modeladmin, request, queryset):
        response = django_delete_selected(modeladmin, request, queryset)
        ctx = getattr(response, "context_data", None)
        if ctx is None:
            return response
        extra = modeladmin._delete_page_context(list(queryset[:50]), plural=True)
        ctx.update(extra)
        return response


class ModelAdmin(CarsvDeleteMixin, UnfoldModelAdmin):
    pass


def _staff_role_codes():
    return role_codes(in_staff=True)


def _customer_role_codes():
    return role_codes(in_customers=True)


def _technician_role_codes():
    return role_codes(in_technicians=True)


def _bind_role_field(form):
    field = form.fields.get("role")
    if not field:
        return
    choices = list(role_choices())
    current = getattr(form.instance, "role", "") or ""
    if current and current not in dict(choices):
        choices.insert(0, (current, role_display_name(current)))
    field.choices = [("", "Select a role")] + choices
    field.help_text = "Changing role moves this account to Customers, Staff, and/or Technicians."
    field.widget = forms.Select(attrs={"class": "cf-input"}, choices=field.choices)


def _user_fk_label(user):
    name = user.get_full_name() or user.username
    return f"#{_code('USR', user.id)} · {user.username} · {name}"


def _users_for_link(roles, related_name, instance):
    current_id = instance.user_id if instance is not None and getattr(instance, "pk", None) else None
    qs = User.objects.filter(role__in=roles)
    if current_id:
        qs = User.objects.filter(Q(pk=current_id) | Q(role__in=roles))
    qs = qs.annotate(
        already_linked=Case(
            When(**{f"{related_name}__isnull": False}, then=1),
            default=0,
            output_field=IntegerField(),
        )
    )
    return qs.order_by("already_linked", "username")


def _taken_user_ids(related_name, instance=None):
    taken = User.objects.filter(**{f"{related_name}__isnull": False})
    current_id = instance.user_id if instance is not None and getattr(instance, "pk", None) else None
    if current_id:
        taken = taken.exclude(pk=current_id)
    return {str(pk) for pk in taken.values_list("pk", flat=True)}


def _clean_available_user(form, related_attr, noun):
    user = form.cleaned_data.get("user")
    if not user:
        return user
    linked = None
    try:
        linked = getattr(user, related_attr)
    except Exception:
        linked = None
    if linked is not None and getattr(linked, "pk", None) and linked.pk != getattr(form.instance, "pk", None):
        raise forms.ValidationError(f"This user already has a {noun} profile.")
    return user


class UserIdentitySelect(forms.Select):
    def __init__(self, attrs=None, choices=(), disabled_ids=None, taken_label="already linked"):
        super().__init__(attrs, choices)
        self.disabled_ids = {str(item) for item in (disabled_ids or [])}
        self.taken_label = taken_label

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        raw = getattr(value, "value", value)
        pk = "" if raw in (None, "") else str(raw)
        user = getattr(value, "instance", None)
        if pk and pk in self.disabled_ids:
            option["attrs"]["disabled"] = "disabled"
            option["attrs"]["class"] = "is-taken"
            option["label"] = f"{label} — {self.taken_label}"
        if user is not None:
            option["attrs"].update(
                {
                    "data-name": user.get_full_name() or user.username,
                    "data-email": user.email or "",
                    "data-phone": user.phone or "",
                    "data-status": user.get_status_display(),
                    "data-photo": user.photo or "",
                    "data-department": user.department or "",
                    "data-position": user.position or "",
                }
            )
        return option


class LockedDisplayWidget(forms.TextInput):
    input_type = "text"

    def __init__(self, display="", attrs=None):
        merged = {"class": "cf-input is-locked", "readonly": "readonly", "tabindex": "-1"}
        if attrs:
            merged.update(attrs)
            merged["class"] = "cf-input is-locked"
            merged["readonly"] = "readonly"
        super().__init__(merged)
        self.display = display

    def format_value(self, value):
        text = self._resolve_display(value)
        return text

    def _resolve_display(self, value):
        if self.display:
            return self.display
        if hasattr(value, "username"):
            return _user_fk_label(value)
        if value in (None, ""):
            return ""
        user = User.objects.filter(pk=value).first()
        if user:
            return _user_fk_label(user)
        return str(value)

    def render(self, name, value, attrs=None, renderer=None):
        text = self._resolve_display(value) or "—"
        return format_html('<div class="cf-locked-value">{}</div>', text)


def _inner_widget(widget):
    return getattr(widget, "widget", widget)


def _locked_field_display(form, name, field):
    instance = form.instance
    if name == "user":
        user_id = getattr(instance, "user_id", None)
        if user_id:
            linked = User.objects.filter(pk=user_id).first()
            if linked:
                return _user_fk_label(linked)
        return ""
    value = getattr(instance, name, None) if instance is not None else None
    display_method = getattr(instance, f"get_{name}_display", None) if instance is not None else None
    if callable(display_method) and value not in (None, ""):
        return display_method()
    if isinstance(field, forms.ModelChoiceField) and value:
        obj = value if hasattr(value, "_meta") else field.queryset.filter(pk=getattr(value, "pk", value)).first()
        if obj is not None:
            return field.label_from_instance(obj)
    choices = list(getattr(field, "choices", []) or [])
    if choices:
        mapping = dict(choices)
        if value in mapping:
            return mapping[value]
    if value in (None, ""):
        return ""
    return str(value)


def _lock_user_owned_fields(form, field_names, related_name="", taken_label="already linked"):
    editing = bool(getattr(form.instance, "pk", None))
    if "user" in form.fields:
        form.fields["user"].label_from_instance = _user_fk_label
        form.fields["user"].empty_label = "Select a user account"
        if editing:
            form.fields["user"].disabled = True
            form.fields["user"].required = False
            form.fields["user"].widget = LockedDisplayWidget(
                display=_locked_field_display(form, "user", form.fields["user"])
            )
            form.fields["user"].help_text = "Linked login account. Edit this on Users."
        else:
            form.fields["user"].widget = UserIdentitySelect(
                attrs={"class": "cf-input", "data-user-picker": "1"},
                disabled_ids=_taken_user_ids(related_name, form.instance) if related_name else [],
                taken_label=taken_label,
            )
            form.fields["user"].widget.choices = form.fields["user"].choices
            form.fields["user"].help_text = (
                "New users can be selected. Accounts that already have this role are listed but disabled."
            )
    for name in field_names:
        field = form.fields.get(name)
        if not field:
            continue
        field.required = False
        field.help_text = "Comes from the linked User account and cannot be edited here."
        if editing:
            field.disabled = True
            display = _locked_field_display(form, name, field)
            if isinstance(_inner_widget(field.widget), forms.Select):
                field.widget = LockedDisplayWidget(display=display)
            else:
                css = field.widget.attrs.get("class", "cf-input")
                if "is-locked" not in css:
                    field.widget.attrs["class"] = f"{css} is-locked"
                field.widget.attrs["readonly"] = True
                field.widget.attrs.pop("disabled", None)
        else:
            field.disabled = True
            field.widget = forms.TextInput(
                attrs={
                    "class": "cf-input is-locked",
                    "readonly": "readonly",
                    "data-user-field": name,
                    "placeholder": "Select a user to fill this",
                }
            )


class CustomerGarageForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ("user", "name", "phone", "email", "address", "gender", "status", "notes", "photo")
        widgets = {
            "user": forms.Select(attrs={"class": "cf-input"}),
            "name": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. John Doe"}),
            "phone": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. +855 12 345 678"}),
            "email": forms.EmailInput(attrs={"class": "cf-input", "placeholder": "e.g. client@example.com"}),
            "address": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. St. 271, Sangkat Boeung Tumpun, Phnom Penh"}),
            "gender": forms.Select(attrs={"class": "cf-input"}),
            "status": forms.Select(attrs={"class": "cf-input"}),
            "notes": forms.Textarea(attrs={"class": "cf-input", "rows": 3, "placeholder": "Vehicle preferences, preferred contact times, discount arrangements..."}),
            "photo": forms.URLInput(attrs={"class": "cf-input", "placeholder": "https://..."}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["user"].required = True
        self.fields["user"].queryset = _users_for_link(
            _customer_role_codes(),
            "customer",
            self.instance,
        )
        _lock_user_owned_fields(
            self,
            ("name", "phone", "email", "status", "photo"),
            related_name="customer",
            taken_label="already a customer",
        )
        self.fields["gender"].required = False
        self.fields["notes"].required = False
        self.fields["address"].required = False

    def clean_user(self):
        return _clean_available_user(self, "customer", "customer")

    def save(self, commit=True):
        customer = super().save(commit=False)
        if customer.user_id:
            apply_user_identity(customer, customer.user)
        if commit:
            customer.save()
        return customer


class VehicleGarageForm(forms.ModelForm):
    class Meta:
        model = Vehicle
        fields = (
            "customer",
            "brand",
            "model",
            "year",
            "plate",
            "vin",
            "color",
            "mileage",
            "vehicle_type",
            "engine_number",
            "status",
            "next_service_date",
            "next_service_mileage",
            "notes",
        )
        widgets = {
            "customer": forms.Select(attrs={"class": "cf-input"}),
            "brand": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Toyota"}),
            "model": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Camry"}),
            "year": forms.NumberInput(attrs={"class": "cf-input"}),
            "plate": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. PP-1234"}),
            "vin": forms.TextInput(attrs={"class": "cf-input", "placeholder": "17-character VIN"}),
            "color": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Pearl White"}),
            "mileage": forms.NumberInput(attrs={"class": "cf-input"}),
            "vehicle_type": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Sedan, Hybrid"}),
            "engine_number": forms.TextInput(attrs={"class": "cf-input"}),
            "status": forms.Select(attrs={"class": "cf-input"}),
            "next_service_date": forms.DateInput(attrs={"class": "cf-input", "type": "date"}),
            "next_service_mileage": forms.NumberInput(attrs={"class": "cf-input"}),
            "notes": forms.Textarea(
                attrs={"class": "cf-input", "rows": 3, "placeholder": "Diagnostic notes, existing wear, special modifications..."}
            ),
        }


class VehicleByCustomerSelect(forms.Select):
    def __init__(self, attrs=None, choices=(), customer_map=None):
        super().__init__(attrs=attrs, choices=choices)
        self.customer_map = customer_map or {}

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        key = str(getattr(value, "value", value) or "")
        customer_id = self.customer_map.get(key)
        if customer_id:
            option["attrs"]["data-customer"] = customer_id
        return option


class BookingGarageForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = (
            "customer",
            "vehicle",
            "service",
            "booking_date",
            "booking_time",
            "status",
            "problem",
            "note",
            "cancel_reason",
        )
        widgets = {
            "customer": forms.Select(attrs={"class": "cf-input"}),
            "vehicle": VehicleByCustomerSelect(attrs={"class": "cf-input"}),
            "service": forms.Select(attrs={"class": "cf-input"}),
            "booking_date": forms.DateInput(attrs={"class": "cf-input", "type": "date"}),
            "booking_time": forms.TimeInput(attrs={"class": "cf-input", "type": "time"}),
            "status": forms.Select(attrs={"class": "cf-input"}),
            "problem": forms.Textarea(
                attrs={
                    "class": "cf-input",
                    "rows": 3,
                    "placeholder": "Reported noises, warning lights, vibrations, or specific customer requests...",
                }
            ),
            "note": forms.Textarea(attrs={"class": "cf-input", "rows": 2, "placeholder": "Front desk note"}),
            "cancel_reason": forms.Textarea(attrs={"class": "cf-input", "rows": 2, "placeholder": "Reason if this booking is cancelled"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        vehicles = Vehicle.objects.select_related("customer").order_by("plate")
        self.fields["vehicle"].queryset = vehicles
        self.fields["vehicle"].widget.customer_map = {str(item.id): str(item.customer_id) for item in vehicles}
        self.fields["vehicle"].label_from_instance = (
            lambda item: f"{item.plate} — {item.brand} {item.model} ({item.year})"
        )
        self.fields["customer"].queryset = Customer.objects.order_by("name")
        self.fields["customer"].label_from_instance = (
            lambda item: f"{item.name} ({item.phone})" if item.phone else item.name
        )
        self.fields["service"].queryset = Service.objects.select_related("category").order_by("name")
        self.fields["service"].label_from_instance = (
            lambda item: f"{item.name} — ${item.price:g} ({item.duration_minutes} min)"
        )
        self.fields["booking_time"].required = False
        self.fields["problem"].required = False
        self.fields["note"].required = False
        self.fields["cancel_reason"].required = False

    def clean(self):
        cleaned = super().clean()
        customer = cleaned.get("customer")
        vehicle = cleaned.get("vehicle")
        if customer and vehicle and vehicle.customer_id != customer.id:
            self.add_error("vehicle", "This vehicle does not belong to the selected customer.")
        return cleaned


class GarageModelForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if isinstance(field.widget, forms.CheckboxInput):
                continue
            field.widget.attrs.setdefault("class", "cf-input")
            if isinstance(field.widget, forms.Textarea):
                field.widget.attrs.setdefault("rows", "3")
            if name == "status" and not list(getattr(field, "choices", []) or []):
                field.widget = forms.Select(
                    choices=(("ACTIVE", "Active"), ("INACTIVE", "Inactive")),
                    attrs={"class": "cf-input"},
                )


def garage_form(model, fields):
    meta = type("Meta", (), {"model": model, "fields": fields})
    return type(f"{model.__name__}GarageForm", (GarageModelForm,), {"Meta": meta})


ServiceCategoryGarageForm = garage_form(ServiceCategory, ("name", "status"))
ServiceGarageForm = garage_form(Service, ("category", "name", "description", "price", "duration_minutes", "status"))

STAFF_POSITION_CHOICES = (
    ("Administrator", "Administrator"),
    ("Manager", "Manager"),
    ("Front desk", "Front desk"),
    ("Receptionist", "Receptionist"),
    ("Senior mechanic", "Senior mechanic"),
    ("Mechanic", "Mechanic"),
    ("Cashier", "Cashier"),
)
STAFF_POSITION_TONE = {
    "Administrator": "admin",
    "Manager": "manager",
    "Front desk": "receptionist",
    "Receptionist": "receptionist",
    "Senior mechanic": "mechanic",
    "Mechanic": "mechanic",
    "Cashier": "cashier",
}


class StaffGarageForm(GarageModelForm):
    class Meta:
        model = Staff
        fields = ("user", "department", "position", "status")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["user"].queryset = _users_for_link(_staff_role_codes(), "staff_profile", self.instance)
        current = (self.instance.position if self.instance and self.instance.pk else "") or ""
        choices = list(STAFF_POSITION_CHOICES)
        if current and current not in dict(choices):
            choices.insert(0, (current, current))
        self.fields["position"] = forms.ChoiceField(
            choices=[("", "Select position")] + choices,
            required=False,
            widget=forms.Select(attrs={"class": "cf-input"}),
        )
        if current:
            self.fields["position"].initial = current
        _lock_user_owned_fields(
            self,
            ("position", "status"),
            related_name="staff_profile",
            taken_label="already staff",
        )
        self.fields["department"].disabled = False
        self.fields["department"].required = False
        self.fields["department"].help_text = ""
        self.fields["department"].widget = forms.TextInput(
            attrs={"class": "cf-input", "placeholder": "e.g. Reception, Workshop, Finance"}
        )

    def save(self, commit=True):
        staff = super().save(commit=False)
        if staff.user_id:
            user = staff.user
            if not (staff.department or "").strip():
                staff.department = user.department
            staff.position = user.position
            staff.status = user.status
        if commit:
            staff.save()
        return staff

    def clean_user(self):
        return _clean_available_user(self, "staff_profile", "staff")


class MechanicGarageForm(GarageModelForm):
    class Meta:
        model = Mechanic
        fields = ("user", "skills", "specialization", "available", "status")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["user"].queryset = _users_for_link(_technician_role_codes(), "mechanic", self.instance)
        _lock_user_owned_fields(
            self,
            ("status",),
            related_name="mechanic",
            taken_label="already a technician",
        )

    def clean_user(self):
        return _clean_available_user(self, "mechanic", "technician")

    def save(self, commit=True):
        mechanic = super().save(commit=False)
        if mechanic.user_id:
            mechanic.status = mechanic.user.status
        if commit:
            mechanic.save()
        return mechanic

InspectionGarageForm = garage_form(
    Inspection,
    (
        "booking",
        "mileage",
        "fuel_level",
        "front_brake_mm",
        "rear_brake_mm",
        "tire_tread_mm",
        "condition",
        "damage",
        "complaint",
        "note",
        "photos",
        "staff",
    ),
)
RepairJobGarageForm = garage_form(
    RepairJob,
    ("booking", "customer", "vehicle", "mechanic", "problem", "diagnosis", "start_date", "estimated_end", "status", "progress"),
)
SparePartCategoryGarageForm = garage_form(SparePartCategory, ("name", "status"))
SparePartGarageForm = garage_form(
    SparePart,
    ("part_number", "name", "category", "brand", "unit_price", "quantity", "min_stock", "status"),
)
PartsUsageGarageForm = garage_form(PartsUsage, ("repair_job", "spare_part", "quantity", "unit_price", "recorded_by"))
InvoiceGarageForm = garage_form(
    Invoice,
    ("number", "customer", "vehicle", "repair_job", "labor_cost", "service_cost", "parts_cost", "discount", "tax", "status"),
)
PaymentGarageForm = garage_form(
    Payment,
    ("number", "invoice", "customer", "amount", "method", "paid_at", "reference", "received_by", "status", "receipt_number"),
)


class RoleGarageForm(GarageModelForm):
    class Meta:
        model = Role
        fields = (
            "code",
            "name",
            "description",
            "in_customers",
            "in_staff",
            "in_technicians",
            "default_position",
            "default_department",
            "status",
            "sort_order",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["code"].help_text = "Short key stored on Users, for example CASHIER or MECHANIC."
        self.fields["in_customers"].help_text = "Users with this role appear in the Customer table."
        self.fields["in_staff"].help_text = "Users with this role appear in the Staff table."
        self.fields["in_technicians"].help_text = "Users with this role appear in the Technician table."
        self.fields["default_position"].help_text = "Copied onto the user when their role is changed to this one."
        self.fields["default_department"].help_text = "Copied onto the user when their role is changed to this one."
        if self.instance.pk:
            self.fields["code"].disabled = True
            self.fields["code"].help_text = "Code cannot be changed because Users already store it."


class ModalFormMixin:
    change_form_template = "admin/django_app/modal_change_form.html"
    modal_title_add = ""
    modal_title_edit = ""
    modal_subtitle = "Fill in the garage record and save."
    modal_save_add = "Save"
    modal_save_edit = "Save"
    modal_wide = True

    def _admin_changelist_url(self):
        return reverse(f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist")

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        is_add = object_id is None
        noun = self.model._meta.verbose_name
        extra_context.update(
            {
                "modal_is_add": is_add,
                "list_url": self._admin_changelist_url(),
                "modal_title": (self.modal_title_add or f"Add {noun}") if is_add else (self.modal_title_edit or f"Edit {noun}"),
                "modal_subtitle": self.modal_subtitle,
                "modal_save": (self.modal_save_add or "Save") if is_add else (self.modal_save_edit or "Save"),
                "modal_wide": self.modal_wide,
            }
        )
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect(self._admin_changelist_url())

    def response_change(self, request, obj):
        return redirect(self._admin_changelist_url())

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        field = super().formfield_for_dbfield(db_field, request, **kwargs)
        if not field:
            return field
        if isinstance(db_field, BooleanField) or isinstance(field.widget, forms.CheckboxInput):
            field.widget = forms.CheckboxInput(attrs={"class": "cf-check-input"})
            return field
        if isinstance(db_field, DateTimeField):
            field.widget = forms.DateTimeInput(
                format="%Y-%m-%dT%H:%M",
                attrs={"class": "cf-input", "type": "datetime-local"},
            )
            field.input_formats = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"]
            return field
        if isinstance(db_field, DateField):
            field.widget = forms.DateInput(format="%Y-%m-%d", attrs={"class": "cf-input", "type": "date"})
            field.input_formats = ["%Y-%m-%d"]
            return field
        if isinstance(db_field, TimeField):
            field.widget = forms.TimeInput(format="%H:%M", attrs={"class": "cf-input", "type": "time"})
            field.input_formats = ["%H:%M", "%H:%M:%S"]
            return field
        field.widget.attrs.setdefault("class", "cf-input")
        if isinstance(field.widget, forms.Textarea):
            field.widget.attrs.setdefault("rows", "3")
        return field


class UserGarageChangeForm(GarageModelForm):
    new_password = forms.CharField(
        label="New password",
        required=False,
        widget=forms.PasswordInput(attrs={"class": "cf-input", "autocomplete": "new-password"}),
        help_text="Leave blank to keep the current password.",
    )

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "phone", "role", "status", "is_staff")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _bind_role_field(self)

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("new_password")
        if password:
            user.set_password(password)
        if commit:
            user.save()
        return user


class UserGarageAddForm(GarageModelForm):
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={"class": "cf-input", "autocomplete": "new-password"}),
    )
    password2 = forms.CharField(
        label="Confirm password",
        widget=forms.PasswordInput(attrs={"class": "cf-input", "autocomplete": "new-password"}),
    )

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "phone", "role", "status", "is_staff")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _bind_role_field(self)

    def clean(self):
        cleaned = super().clean()
        password1 = cleaned.get("password1")
        password2 = cleaned.get("password2")
        if password1 and password2 and password1 != password2:
            self.add_error("password2", "Passwords do not match.")
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


@admin.register(User)
class UserAdmin(ModalFormMixin, BaseUserAdmin, ModelAdmin):
    form = UserGarageChangeForm
    add_form = UserGarageAddForm
    change_password_form = AdminPasswordChangeForm
    change_list_template = "admin/django_app/carsv_page.html"
    add_form_template = "admin/django_app/modal_change_form.html"
    list_display = ("username", "email", "role", "status", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ()
    filter_horizontal = ()
    ordering = ("username",)
    fieldsets = (
        (
            None,
            {"fields": ("username", "first_name", "last_name", "email", "phone", "role", "status", "is_staff", "new_password")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {"fields": ("username", "password1", "password2", "first_name", "last_name", "email", "phone", "role", "status", "is_staff")},
        ),
    )
    modal_title_add = "Add User"
    modal_title_edit = "Edit User"
    modal_subtitle = "Login account for staff or a customer. On edit, leave the password blank to keep it."
    modal_save_add = "Create User"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["page"] = self._build_user_page(request)
        return super().changelist_view(request, extra_context=extra_context)

    def _build_user_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(phone__icontains=query)
            )
        role = request.GET.get("role")
        known_roles = dict(role_choices())
        if role in known_roles:
            qs = qs.filter(role=role)
        status = request.GET.get("status")
        if status in dict(User.Status.choices):
            qs = qs.filter(status=status)
        rows = []
        for user in qs.order_by("username"):
            initials = f"{(user.first_name or user.username)[:1]}{(user.last_name or '')[:1]}".upper()
            change_url = reverse("admin:django_app_user_change", args=[user.id])
            delete_url = reverse("admin:django_app_user_delete", args=[user.id])
            rows.append(
                {
                    "off": user.status != User.Status.ACTIVE,
                    "cells": [
                        format_html(
                            '<div class="cc-person"><span class="cc-avatar cc-avatar-round">{}</span><div><div class="cc-name">{}</div>{}</div></div>',
                            initials,
                            user.username,
                            _id_html("USR", user.id),
                        ),
                        format_html('<span class="cc-muted">{}</span>', user.email or "—"),
                        format_html('<span class="cc-role cc-role-{}">{}</span>', user.role.lower(), role_display_name(user.role)),
                        _badge("active" if user.status == User.Status.ACTIVE else "inactive", user.get_status_display()),
                        _badge("ready" if user.is_staff else "inactive", "Staff" if user.is_staff else "No"),
                        _actions(change_url, delete_url, obj=user, extra_blocked=user.pk == request.user.pk),
                    ],
                }
            )
        return {
            "title": "Users",
            "subtitle": "Login accounts for administrators, garage staff, and customers.",
            "count": User.objects.count(),
            "count_label": "Users",
            "model": "user",
            "add_url": reverse("admin:django_app_user_add"),
            "add_label": "Add User",
            "search_placeholder": "Search by username, email, or name...",
            "search_query": query,
            "filters": [
                {
                    "name": "role",
                    "value": role or "",
                    "options": [{"value": "", "label": "All roles"}]
                    + [{"value": value, "label": label} for value, label in role_choices()],
                },
                {
                    "name": "status",
                    "value": status or "",
                    "options": [
                        {"value": "", "label": "All statuses"},
                        {"value": "ACTIVE", "label": "Active"},
                        {"value": "INACTIVE", "label": "Inactive"},
                    ],
                },
            ],
            "columns": ["Username", "Email", "Role", "Status", "Staff access", "Actions"],
            "hidden": {key: value for key, value in (("role", role), ("status", status)) if value},
            "rows": rows,
            "empty": "No users match this search.",
        }


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(Role)
class RoleAdmin(ModalFormMixin, ModelAdmin):
    form = RoleGarageForm
    change_list_template = "admin/django_app/carsv_page.html"
    list_display = ("name", "code", "in_customers", "in_staff", "in_technicians", "status")
    search_fields = ("name", "code")
    ordering = ("sort_order", "name")
    modal_title_add = "Add Role"
    modal_title_edit = "Edit Role"
    modal_subtitle = "Decide which tables a user appears in when this role is assigned."
    modal_save_add = "Create Role"
    modal_wide = False

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["page"] = self._build_role_page(request)
        return super().changelist_view(request, extra_context=extra_context)

    def _build_role_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(code__icontains=query) | Q(description__icontains=query))
        status = request.GET.get("status")
        if status in dict(Role.Status.choices):
            qs = qs.filter(status=status)
        user_counts = dict(
            User.objects.values_list("role").annotate(total=Count("id")).values_list("role", "total")
        )
        rows = []
        for role in qs.order_by("sort_order", "name"):
            count = user_counts.get(role.code, 0)
            rows.append(
                {
                    "off": role.status != Role.Status.ACTIVE,
                    "cells": [
                        format_html(
                            '<div class="cc-name">{}</div>{}',
                            role.name,
                            _id_html("ROLE", role.id),
                        ),
                        format_html('<span class="cc-role cc-role-{}">{}</span>', role.code.lower(), role.code),
                        _badge("ready" if role.in_customers else "inactive", "Yes" if role.in_customers else "No"),
                        _badge("ready" if role.in_staff else "inactive", "Yes" if role.in_staff else "No"),
                        _badge("ready" if role.in_technicians else "inactive", "Yes" if role.in_technicians else "No"),
                        format_html('<span class="cc-muted">{}</span>', count),
                        _badge("active" if role.status == Role.Status.ACTIVE else "inactive", role.get_status_display()),
                        _actions(
                            reverse("admin:django_app_role_change", args=[role.id]),
                            reverse("admin:django_app_role_delete", args=[role.id]),
                            obj=role,
                        ),
                    ],
                }
            )
        return {
            "title": "Roles",
            "subtitle": "Update a role to move its users between Customers, Staff, and Technicians.",
            "count": Role.objects.count(),
            "count_label": "Roles",
            "model": "role",
            "add_url": reverse("admin:django_app_role_add"),
            "add_label": "Add Role",
            "search_placeholder": "Search by role name or code...",
            "search_query": query,
            "filters": [
                {
                    "name": "status",
                    "value": status or "",
                    "options": [
                        {"value": "", "label": "All statuses"},
                        {"value": "ACTIVE", "label": "Active"},
                        {"value": "INACTIVE", "label": "Inactive"},
                    ],
                }
            ],
            "columns": ["Name", "Code", "Customers", "Staff", "Technicians", "Users", "Status", "Actions"],
            "hidden": {key: value for key, value in (("status", status),) if value},
            "rows": rows,
            "empty": "No roles match this search.",
        }


@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    form = CustomerGarageForm
    list_display = ("name", "email", "phone", "status", "user")
    search_fields = ("name", "email", "phone")
    change_list_template = "admin/django_app/customer_change_list.html"
    change_form_template = "admin/django_app/customer_change_form.html"

    def get_queryset(self, request):
        qs = super().get_queryset(request).annotate(
            vehicle_count=Count("vehicles", distinct=True),
            total_spent=Coalesce(Sum("invoices__grand_total", filter=Q(invoices__status="PAID")), Decimal("0")),
            last_visit=Max("bookings__booking_date"),
        )
        status = request.GET.get("status")
        if status in (Customer.Status.ACTIVE, Customer.Status.INACTIVE):
            qs = qs.filter(status=status)
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(email__icontains=query) | Q(phone__icontains=query))
        qs = qs.filter(user__role__in=_customer_role_codes()).select_related("user").order_by("name")

        if request.GET.get("export") == "csv":
            return self._export_csv(qs)

        extra_context.update(
            {
                "customer_rows": [self._row(customer) for customer in qs],
                "account_count": current_customer_qs().count(),
                "status_filter": request.GET.get("status") or "ALL",
                "search_query": query,
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        is_add = object_id is None
        editing = is_add or request.method == "POST" or request.GET.get("edit") == "1"
        extra_context.update(
            {
                "customer_editing": editing,
                "customer_is_add": is_add,
                "list_url": reverse("admin:django_app_customer_changelist"),
                "add_job_url": reverse("admin:django_app_repairjob_add"),
                "add_vehicle_url": reverse("admin:django_app_vehicle_add"),
            }
        )
        if object_id:
            extra_context["profile"] = self._profile(object_id)
            extra_context["edit_url"] = reverse("admin:django_app_customer_change", args=[object_id]) + "?edit=1"
            extra_context["view_url"] = reverse("admin:django_app_customer_change", args=[object_id])
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:django_app_customer_change", obj.pk)

    def response_change(self, request, obj):
        return redirect("admin:django_app_customer_change", obj.pk)

    def _profile(self, object_id):
        customer = (
            Customer.objects.filter(pk=object_id)
            .select_related("user")
            .prefetch_related(
                "vehicles__repair_jobs",
                "bookings__service",
                "bookings__vehicle",
                "repair_jobs__vehicle",
                "repair_jobs__mechanic__user",
                "invoices__vehicle",
            )
            .annotate(
                vehicle_count=Count("vehicles", distinct=True),
                repair_count=Count("repair_jobs", distinct=True),
                booking_count=Count("bookings", distinct=True),
                invoice_count=Count("invoices", distinct=True),
                total_spent=Coalesce(Sum("invoices__grand_total", filter=Q(invoices__status="PAID")), Decimal("0")),
            )
            .first()
        )
        if not customer:
            return None
        parts = customer.name.split()
        initials = "".join(part[:1] for part in parts[:2]).upper() or "?"
        return {
            "obj": customer,
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "gender": customer.get_gender_display() if customer.gender else "",
            "status": customer.status,
            "status_label": customer.get_status_display(),
            "notes": customer.notes,
            "photo": customer.photo,
            "initials": initials,
            "user_code": _code("USR", customer.user_id) if customer.user_id else "",
            "username": customer.user.username if customer.user_id else "",
            "vehicle_count": customer.vehicle_count,
            "repair_count": customer.repair_count,
            "booking_count": customer.booking_count,
            "invoice_count": customer.invoice_count,
            "total_spent": customer.total_spent or Decimal("0"),
            "vehicles": [self._vehicle_card(vehicle) for vehicle in customer.vehicles.all()],
            "bookings": customer.bookings.all()[:20],
            "jobs": customer.repair_jobs.all()[:20],
            "invoices": customer.invoices.all()[:20],
        }

    def _vehicle_card(self, vehicle):
        job = max(vehicle.repair_jobs.all(), key=lambda item: item.id, default=None)
        job_map = {
            RepairJob.Status.WAITING: ("pending", "WAITING"),
            RepairJob.Status.DIAGNOSING: ("inspection", "INSPECTION"),
            RepairJob.Status.WAITING_APPROVAL: ("assigned", "ASSIGNED"),
            RepairJob.Status.REPAIRING: ("repair", "IN REPAIR"),
            RepairJob.Status.WAITING_PARTS: ("waiting", "WAITING PARTS"),
            RepairJob.Status.QUALITY_CHECK: ("inspection", "INSPECTION"),
            RepairJob.Status.READY_FOR_PICKUP: ("ready", "READY"),
        }
        if job and job.status != RepairJob.Status.COMPLETED:
            status_class, status_label = job_map.get(job.status, ("repair", job.get_status_display().upper()))
        else:
            status_class, status_label = {
                Vehicle.Status.ACTIVE: ("ready", "READY"),
                Vehicle.Status.IN_SHOP: ("repair", "IN REPAIR"),
                Vehicle.Status.INACTIVE: ("inactive", "INACTIVE"),
            }.get(vehicle.status, ("ready", vehicle.get_status_display().upper()))
        next_service = "—"
        if vehicle.next_service_date:
            next_service = vehicle.next_service_date.isoformat()
        if vehicle.next_service_mileage:
            next_service = f"{next_service} / {vehicle.next_service_mileage:,} km" if vehicle.next_service_date else f"{vehicle.next_service_mileage:,} km"
        return {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "title": f"{vehicle.brand} {vehicle.model} ({vehicle.year})",
            "mileage": f"{vehicle.mileage:,}",
            "color": vehicle.color or "—",
            "vin": vehicle.vin or "—",
            "vehicle_type": vehicle.vehicle_type or "—",
            "engine": vehicle.engine_number or "—",
            "next_service": next_service,
            "status_class": status_class,
            "status_label": status_label,
            "url": reverse("admin:django_app_vehicle_change", args=[vehicle.id]),
        }

    def _row(self, customer):
        parts = customer.name.split()
        initials = "".join(part[:1] for part in parts[:2]).upper() or "?"
        view_url = reverse("admin:django_app_customer_change", args=[customer.id])
        return {
            "id": customer.id,
            "code": _code("CUST", customer.id),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "status": customer.status,
            "status_label": customer.get_status_display(),
            "photo": customer.photo,
            "initials": initials,
            "user_code": _code("USR", customer.user_id) if customer.user_id else "",
            "username": customer.user.username if customer.user_id else "",
            "vehicle_count": customer.vehicle_count,
            "total_spent": customer.total_spent or Decimal("0"),
            "last_visit": customer.last_visit,
            "view_url": view_url,
            "edit_url": f"{view_url}?edit=1",
            "delete_url": reverse("admin:django_app_customer_delete", args=[customer.id]),
            **_delete_icon_flags(customer),
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Name", "Email", "Phone", "Status", "Vehicles", "Total spent", "Last visit"])
        for customer in queryset:
            writer.writerow(
                [
                    customer.id,
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.status,
                    customer.vehicle_count,
                    customer.total_spent,
                    customer.last_visit or "",
                ]
            )
        return response


@admin.register(Vehicle)
class VehicleAdmin(ModelAdmin):
    form = VehicleGarageForm
    list_display = ("plate", "brand", "model", "year", "customer", "status")
    search_fields = ("plate", "brand", "model", "vin", "customer__name")
    change_list_template = "admin/django_app/vehicle_change_list.html"
    change_form_template = "admin/django_app/vehicle_change_form.html"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("customer").prefetch_related("repair_jobs")
        brand = request.GET.get("brand")
        if brand:
            qs = qs.filter(brand=brand)
        status = request.GET.get("status")
        if status in (Vehicle.Status.ACTIVE, Vehicle.Status.IN_SHOP, Vehicle.Status.INACTIVE):
            qs = qs.filter(status=status)
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(plate__icontains=query)
                | Q(brand__icontains=query)
                | Q(model__icontains=query)
                | Q(vin__icontains=query)
                | Q(customer__name__icontains=query)
            )
        qs = qs.order_by("plate")

        if request.GET.get("export") == "csv":
            return self._export_csv(qs)

        extra_context.update(
            {
                "vehicle_rows": [self._row(vehicle) for vehicle in qs],
                "vehicle_count": Vehicle.objects.count(),
                "brand_filter": request.GET.get("brand") or "ALL",
                "status_filter": request.GET.get("status") or "ALL",
                "search_query": query,
                "brand_options": list(
                    Vehicle.objects.order_by("brand").values_list("brand", flat=True).distinct()
                ),
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        customer_id = request.GET.get("customer")
        if customer_id:
            initial["customer"] = customer_id
        return initial

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        is_add = object_id is None
        editing = is_add or request.method == "POST" or request.GET.get("edit") == "1"
        extra_context.update(
            {
                "vehicle_editing": editing,
                "vehicle_is_add": is_add,
                "list_url": reverse("admin:django_app_vehicle_changelist"),
                "add_job_url": reverse("admin:django_app_repairjob_add"),
                "add_booking_url": reverse("admin:django_app_booking_add"),
            }
        )
        if object_id:
            extra_context["profile"] = self._profile(object_id)
            extra_context["edit_url"] = reverse("admin:django_app_vehicle_change", args=[object_id]) + "?edit=1"
            extra_context["view_url"] = reverse("admin:django_app_vehicle_change", args=[object_id])
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:django_app_vehicle_change", obj.pk)

    def response_change(self, request, obj):
        return redirect("admin:django_app_vehicle_change", obj.pk)

    def _profile(self, object_id):
        vehicle = (
            Vehicle.objects.filter(pk=object_id)
            .select_related("customer")
            .prefetch_related(
                Prefetch(
                    "repair_jobs",
                    queryset=RepairJob.objects.select_related(
                        "mechanic__user", "invoice", "booking__service"
                    ).order_by("-id"),
                ),
                Prefetch(
                    "bookings",
                    queryset=Booking.objects.select_related("service", "inspection__staff__user").order_by(
                        "-booking_date", "-booking_time", "-id"
                    ),
                ),
                Prefetch("invoices", queryset=Invoice.objects.order_by("-invoice_date", "-id")),
            )
            .annotate(
                repair_count=Count("repair_jobs", distinct=True),
                booking_count=Count("bookings", distinct=True),
                invoice_count=Count("invoices", distinct=True),
            )
            .first()
        )
        if not vehicle:
            return None
        status_class, status_label = self._status_badge(vehicle)
        last_job = (
            vehicle.repair_jobs.filter(status=RepairJob.Status.COMPLETED)
            .order_by("-id")
            .first()
        )
        last_service = None
        if last_job:
            last_service = last_job.estimated_end or last_job.start_date
        inspections = []
        for booking in vehicle.bookings.all():
            try:
                inspections.append(booking.inspection)
            except Inspection.DoesNotExist:
                pass
        inspections.sort(key=lambda item: item.checked_in_at, reverse=True)
        next_due = "—"
        if vehicle.next_service_date:
            next_due = vehicle.next_service_date.isoformat()
        elif vehicle.next_service_mileage:
            next_due = f"{vehicle.next_service_mileage:,} km"
        return {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "title": f"{vehicle.brand} {vehicle.model} ({vehicle.year})",
            "brand": vehicle.brand,
            "model": vehicle.model,
            "year": vehicle.year,
            "vin": vehicle.vin or "—",
            "color": vehicle.color or "—",
            "vehicle_type": vehicle.vehicle_type or "—",
            "engine": vehicle.engine_number or "—",
            "mileage": f"{vehicle.mileage:,}",
            "notes": vehicle.notes,
            "status_class": status_class,
            "status_label": status_label,
            "owner": vehicle.customer.name,
            "owner_url": reverse("admin:django_app_customer_change", args=[vehicle.customer_id]),
            "repair_count": vehicle.repair_count,
            "booking_count": vehicle.booking_count,
            "invoice_count": vehicle.invoice_count,
            "inspection_count": len(inspections),
            "last_service": last_service,
            "next_due": next_due,
            "next_service_date": vehicle.next_service_date,
            "next_service_mileage": vehicle.next_service_mileage,
            "jobs": [self._job_card(job) for job in vehicle.repair_jobs.all()[:20]],
            "bookings": [self._booking_card(booking) for booking in vehicle.bookings.all()[:20]],
            "invoices": [self._invoice_card(invoice) for invoice in vehicle.invoices.all()[:20]],
            "inspection": self._inspection_card(inspections[0]) if inspections else None,
        }

    def _job_card(self, job):
        status_map = {
            RepairJob.Status.WAITING: ("pending", "WAITING"),
            RepairJob.Status.DIAGNOSING: ("inspection", "DIAGNOSING"),
            RepairJob.Status.WAITING_APPROVAL: ("assigned", "WAITING APPROVAL"),
            RepairJob.Status.REPAIRING: ("progress", "IN PROGRESS"),
            RepairJob.Status.WAITING_PARTS: ("waiting", "WAITING PARTS"),
            RepairJob.Status.QUALITY_CHECK: ("inspection", "QUALITY CHECK"),
            RepairJob.Status.READY_FOR_PICKUP: ("ready", "READY"),
            RepairJob.Status.COMPLETED: ("completed", "COMPLETED"),
        }
        status_class, status_label = status_map.get(job.status, ("pending", job.get_status_display().upper()))
        amount = None
        if hasattr(job, "invoice") and job.invoice:
            amount = job.invoice.grand_total
        elif job.booking_id and getattr(job.booking, "service", None):
            amount = job.booking.service.price
        return {
            "id": job.id,
            "number": f"WO-{job.id:04d}",
            "status_class": status_class,
            "status_label": status_label,
            "problem": job.problem or job.diagnosis or "No problem notes recorded.",
            "tech": str(job.mechanic) if job.mechanic else "Unassigned",
            "progress": job.progress,
            "amount": amount,
            "url": reverse("admin:django_app_repairjob_change", args=[job.id]),
        }

    def _booking_card(self, booking):
        status_map = {
            Booking.Status.PENDING: ("pending", "PENDING"),
            Booking.Status.CONFIRMED: ("confirmed", "CONFIRMED"),
            Booking.Status.CHECKED_IN: ("checked_in", "CHECKED-IN"),
            Booking.Status.IN_SERVICE: ("progress", "IN PROGRESS"),
            Booking.Status.COMPLETED: ("completed", "COMPLETED"),
            Booking.Status.CANCELLED: ("cancelled", "CANCELLED"),
        }
        status_class, status_label = status_map.get(booking.status, ("pending", booking.get_status_display().upper()))
        time_label = booking.booking_time.strftime("%H:%M") if booking.booking_time else "—"
        return {
            "id": booking.id,
            "time": time_label,
            "service": str(booking.service),
            "date": booking.booking_date.isoformat() if booking.booking_date else "—",
            "status_class": status_class,
            "status_label": status_label,
            "url": reverse("admin:django_app_booking_change", args=[booking.id]),
        }

    def _invoice_card(self, invoice):
        status_map = {
            Invoice.Status.DRAFT: ("pending", "DRAFT"),
            Invoice.Status.UNPAID: ("waiting", "UNPAID"),
            Invoice.Status.PARTIAL: ("progress", "PARTIAL"),
            Invoice.Status.PAID: ("ready", "PAID"),
            Invoice.Status.CANCELLED: ("cancelled", "CANCELLED"),
        }
        status_class, status_label = status_map.get(invoice.status, ("pending", invoice.get_status_display().upper()))
        return {
            "id": invoice.id,
            "number": invoice.number,
            "date": invoice.invoice_date,
            "amount": invoice.grand_total,
            "status_class": status_class,
            "status_label": status_label,
            "url": reverse("admin:django_app_invoice_change", args=[invoice.id]),
        }

    def _inspection_card(self, inspection):
        fuel_value, fuel_pct = self._fuel_tile(inspection.fuel_level)
        front = self._pad_tile(inspection.front_brake_mm)
        rear = self._pad_tile(inspection.rear_brake_mm)
        tread = self._tread_tile(inspection.tire_tread_mm)
        return {
            "id": inspection.id,
            "url": reverse("admin:django_app_inspection_change", args=[inspection.id]),
            "fuel_value": fuel_value,
            "fuel_pct": fuel_pct,
            "front": front,
            "rear": rear,
            "tread": tread,
        }

    def _fuel_tile(self, fuel):
        raw = (fuel or "").strip()
        named = {
            "full": (100, "Full Tank"),
            "3/4": (75, "3/4 Tank"),
            "half": (50, "1/2 Tank"),
            "1/2": (50, "1/2 Tank"),
            "1/4": (25, "1/4 Tank"),
            "quarter": (25, "1/4 Tank"),
            "empty": (0, "Empty"),
        }
        key = re.sub(r"\s+", " ", raw.lower().replace("tank", "").replace("%", "")).strip()
        if key in named:
            pct, label = named[key]
            return f"{pct}% ({label})", pct
        match = re.search(r"(\d+)", raw)
        if match:
            pct = min(int(match.group(1)), 100)
            fractions = {100: "Full Tank", 75: "3/4 Tank", 50: "1/2 Tank", 25: "1/4 Tank"}
            label = fractions.get(pct)
            return (f"{pct}% ({label})" if label else f"{pct}%"), pct
        return raw or "—", None

    def _pad_tile(self, mm):
        if mm is None:
            return {"value": "—", "tone": "", "hint": "Not recorded"}
        worn = mm < Decimal("3")
        return {
            "value": f"{mm} mm ({'Worn' if worn else 'Good'})",
            "tone": "warn" if worn else "ok",
            "hint": "⚠ Replacement Required" if worn else "✓ Safe Operating Range",
        }

    def _tread_tile(self, mm):
        if mm is None:
            return {"value": "—", "tone": "neutral", "hint": "Not recorded"}
        low = mm < Decimal("3")
        descriptor = "Low" if low else "Average" if mm < Decimal("7") else "Good"
        return {
            "value": f"{mm} mm {descriptor}",
            "tone": "warn" if low else "neutral",
            "hint": "⚠ Replacement Required" if low else "✓ Good Traction",
        }

    def _row(self, vehicle):
        badge_class, badge_label = self._status_badge(vehicle)
        owner_url = reverse("admin:django_app_customer_change", args=[vehicle.customer_id])
        view_url = reverse("admin:django_app_vehicle_change", args=[vehicle.id])
        return {
            "id": vehicle.id,
            "code": _code("VEH", vehicle.id),
            "plate": vehicle.plate,
            "title": f"{vehicle.brand} {vehicle.model} ({vehicle.year})",
            "vin": vehicle.vin or "—",
            "owner": vehicle.customer.name,
            "owner_url": owner_url,
            "mileage": f"{vehicle.mileage:,}",
            "status_class": badge_class,
            "status_label": badge_label,
            "next_service": vehicle.next_service_date,
            "color": vehicle.color,
            "view_url": view_url,
            "edit_url": f"{view_url}?edit=1",
            "delete_url": reverse("admin:django_app_vehicle_delete", args=[vehicle.id]),
            **_delete_icon_flags(vehicle),
        }

    def _status_badge(self, vehicle):
        job = max(vehicle.repair_jobs.all(), key=lambda item: item.id, default=None)
        job_map = {
            RepairJob.Status.WAITING: ("pending", "WAITING"),
            RepairJob.Status.DIAGNOSING: ("inspection", "INSPECTION"),
            RepairJob.Status.WAITING_APPROVAL: ("assigned", "ASSIGNED"),
            RepairJob.Status.REPAIRING: ("repair", "IN REPAIR"),
            RepairJob.Status.WAITING_PARTS: ("waiting", "WAITING PARTS"),
            RepairJob.Status.QUALITY_CHECK: ("inspection", "INSPECTION"),
            RepairJob.Status.READY_FOR_PICKUP: ("ready", "READY"),
        }
        if job and job.status != RepairJob.Status.COMPLETED:
            return job_map.get(job.status, ("repair", job.get_status_display().upper()))
        vehicle_map = {
            Vehicle.Status.ACTIVE: ("ready", "READY"),
            Vehicle.Status.IN_SHOP: ("repair", "IN REPAIR"),
            Vehicle.Status.INACTIVE: ("inactive", "INACTIVE"),
        }
        return vehicle_map.get(vehicle.status, ("ready", vehicle.get_status_display().upper()))

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="vehicles.csv"'
        writer = csv.writer(response)
        writer.writerow(["Plate", "Brand", "Model", "Year", "Owner", "Mileage", "Status", "VIN", "Next service"])
        for vehicle in queryset:
            _, label = self._status_badge(vehicle)
            writer.writerow(
                [
                    vehicle.plate,
                    vehicle.brand,
                    vehicle.model,
                    vehicle.year,
                    vehicle.customer.name,
                    vehicle.mileage,
                    label,
                    vehicle.vin or "",
                    vehicle.next_service_date or "",
                ]
            )
        return response


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(ModalFormMixin, ModelAdmin):
    form = ServiceCategoryGarageForm
    list_display = ("name", "status")
    search_fields = ("name",)
    change_list_template = "admin/django_app/service_category_change_list.html"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    modal_title_add = "Add Service Category"
    modal_title_edit = "Edit Service Category"
    modal_subtitle = "Groups used to filter and manage the service catalog."
    modal_save_add = "Add Category"
    modal_wide = False

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(service_count=Count("services"))

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(name__icontains=query)
        qs = qs.order_by("name")
        extra_context.update(
            {
                "category_rows": [self._row(category) for category in qs],
                "category_count": ServiceCategory.objects.count(),
                "search_query": query,
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def _row(self, category):
        return {
            "id": category.id,
            "code": _code("SCAT", category.id),
            "name": category.name,
            "status": category.status,
            "status_label": "Active" if category.status == "ACTIVE" else "Disabled",
            "service_count": category.service_count,
            "view_url": reverse("admin:django_app_servicecategory_change", args=[category.id]),
            "delete_url": reverse("admin:django_app_servicecategory_delete", args=[category.id]),
            **_delete_icon_flags(category),
        }


@admin.register(Service)
class ServiceAdmin(ModalFormMixin, ModelAdmin):
    form = ServiceGarageForm
    list_display = ("name", "category", "price", "duration_minutes", "status")
    search_fields = ("name", "description")
    change_list_template = "admin/django_app/service_change_list.html"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    modal_title_add = "Create New Service Item"
    modal_title_edit = "Edit Service Package"
    modal_subtitle = "Define labor parameters, description, and base garage rate."
    modal_save_add = "Create Service"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("category")
        category_id = request.GET.get("category")
        if category_id and category_id.isdigit():
            qs = qs.filter(category_id=int(category_id))
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action == "toggle" and pk:
            service = Service.objects.filter(pk=pk).first()
            if service:
                service.status = "INACTIVE" if service.status == "ACTIVE" else "ACTIVE"
                service.save(update_fields=["status"])
            return redirect("admin:django_app_service_changelist")

        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(Q(name__icontains=query) | Q(description__icontains=query) | Q(category__name__icontains=query))
        qs = qs.order_by("category__name", "name")

        if request.GET.get("export") == "csv":
            return self._export_csv(qs)

        extra_context.update(
            {
                "service_rows": [self._row(service) for service in qs],
                "service_count": Service.objects.count(),
                "search_query": query,
                "category_filter": request.GET.get("category") or "ALL",
                "category_options": list(ServiceCategory.objects.order_by("name")),
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def _row(self, service):
        minutes = service.duration_minutes or 0
        hours = minutes / 60
        hours_label = f"{int(hours)} hrs" if hours == int(hours) else f"{hours:g} hrs"
        return {
            "id": service.id,
            "code": _code("SVC", service.id),
            "name": service.name,
            "description": service.description,
            "category": service.category.name,
            "price": service.price,
            "hours": hours_label,
            "active": service.status == "ACTIVE",
            "view_url": reverse("admin:django_app_service_change", args=[service.id]),
            "delete_url": reverse("admin:django_app_service_delete", args=[service.id]),
            **_delete_icon_flags(service),
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="service-catalog.csv"'
        writer = csv.writer(response)
        writer.writerow(["Name", "Category", "Description", "Duration minutes", "Price", "Status"])
        for service in queryset:
            writer.writerow(
                [
                    service.name,
                    service.category.name,
                    service.description,
                    service.duration_minutes,
                    service.price,
                    service.status,
                ]
            )
        return response


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    form = BookingGarageForm
    list_display = ("id", "customer", "vehicle", "service", "booking_date", "status")
    search_fields = ("problem", "note", "customer__name", "vehicle__plate", "customer__phone", "service__name")
    change_list_template = "admin/django_app/appointment_change_list.html"
    change_form_template = "admin/django_app/booking_change_form.html"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    def get_queryset(self, request):
        qs = (
            super()
            .get_queryset(request)
            .select_related("customer", "vehicle", "service", "inspection__staff__user")
        )
        status = request.GET.get("status")
        if status in dict(Booking.Status.choices):
            qs = qs.filter(status=status)
        if request.GET.get("view") == "day":
            day = request.GET.get("date") or str(localdate())
            qs = qs.filter(booking_date=day)
        return qs

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        vehicle_id = request.GET.get("vehicle")
        if vehicle_id:
            vehicle = Vehicle.objects.filter(pk=vehicle_id).first()
            if vehicle:
                initial["vehicle"] = vehicle.pk
                initial["customer"] = vehicle.customer_id
        customer_id = request.GET.get("customer")
        if customer_id and "customer" not in initial:
            initial["customer"] = customer_id
        if not initial.get("booking_date"):
            initial["booking_date"] = localdate()
        if not initial.get("status"):
            initial["status"] = Booking.Status.PENDING
        return initial

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        field = super().formfield_for_foreignkey(db_field, request, **kwargs)
        if not field:
            return field
        if db_field.name == "vehicle":
            vehicles = Vehicle.objects.select_related("customer").order_by("plate")
            field.queryset = vehicles
            field.widget = VehicleByCustomerSelect(
                attrs={"class": "cf-input"},
                customer_map={str(item.id): str(item.customer_id) for item in vehicles},
            )
            field.widget.choices = field.choices
            field.label_from_instance = lambda item: f"{item.plate} — {item.brand} {item.model} ({item.year})"
        elif db_field.name == "customer":
            field.widget.attrs["class"] = "cf-input"
            field.label_from_instance = lambda item: f"{item.name} ({item.phone})" if item.phone else item.name
        elif db_field.name == "service":
            field.widget.attrs["class"] = "cf-input"
            field.label_from_instance = (
                lambda item: f"{item.name} — ${item.price:g} ({item.duration_minutes} min)"
            )
        return field

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action and pk:
            self._apply_status(pk, action, request.user)
            return redirect("admin:django_app_booking_changelist")

        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(customer__name__icontains=query)
                | Q(customer__phone__icontains=query)
                | Q(vehicle__plate__icontains=query)
                | Q(service__name__icontains=query)
                | Q(note__icontains=query)
                | Q(problem__icontains=query)
            )
        qs = qs.order_by("booking_date", "booking_time", "id")

        if request.GET.get("export") == "csv":
            return self._export_csv(qs)

        extra_context.update(
            {
                "appointment_rows": [self._row(booking) for booking in qs],
                "booking_count": Booking.objects.count(),
                "status_filter": request.GET.get("status") or "ALL",
                "search_query": query,
                "view_mode": request.GET.get("view") or "list",
                "day_filter": request.GET.get("date") or str(localdate()),
                "today": str(localdate()),
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        if object_id and request.method == "GET" and request.GET.get("action"):
            self._apply_status(object_id, request.GET.get("action"), request.user)
            return redirect("admin:django_app_booking_change", object_id)
        is_add = object_id is None
        editing = is_add or request.method == "POST" or request.GET.get("edit") == "1"
        extra_context.update(
            {
                "booking_editing": editing,
                "booking_is_add": is_add,
                "list_url": reverse("admin:django_app_booking_changelist"),
            }
        )
        if object_id:
            extra_context["profile"] = self._profile(object_id)
            extra_context["edit_url"] = reverse("admin:django_app_booking_change", args=[object_id]) + "?edit=1"
            extra_context["view_url"] = reverse("admin:django_app_booking_change", args=[object_id])
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:django_app_booking_change", obj.pk)

    def response_change(self, request, obj):
        return redirect("admin:django_app_booking_change", obj.pk)

    def save_model(self, request, obj, form, change):
        if obj.status == Booking.Status.CANCELLED:
            if not obj.cancelled_at:
                obj.cancelled_at = now()
            if not obj.cancelled_by_id:
                obj.cancelled_by = request.user
        super().save_model(request, obj, form, change)

    def _apply_status(self, pk, action, user):
        booking = Booking.objects.filter(pk=pk).first()
        if not booking:
            return
        if action == "confirm" and booking.status == Booking.Status.PENDING:
            booking.status = Booking.Status.CONFIRMED
            booking.save(update_fields=["status"])
        elif action == "checkin" and booking.status in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
            booking.status = Booking.Status.CHECKED_IN
            booking.save(update_fields=["status"])
        elif action == "finish" and booking.status in (Booking.Status.CHECKED_IN, Booking.Status.IN_SERVICE):
            booking.status = Booking.Status.COMPLETED
            booking.save(update_fields=["status"])
        elif action == "cancel" and booking.status not in (Booking.Status.COMPLETED, Booking.Status.CANCELLED):
            booking.status = Booking.Status.CANCELLED
            booking.cancelled_at = now()
            booking.cancelled_by = user
            booking.save(update_fields=["status", "cancelled_at", "cancelled_by"])

    def _profile(self, object_id):
        booking = (
            Booking.objects.filter(pk=object_id)
            .select_related(
                "customer",
                "vehicle",
                "service",
                "inspection__staff__user",
                "cancelled_by",
                "repair_job__invoice",
            )
            .first()
        )
        if not booking:
            return None
        job = None
        invoice = None
        try:
            job = booking.repair_job
        except RepairJob.DoesNotExist:
            job = None
        if job:
            try:
                invoice = job.invoice
            except Invoice.DoesNotExist:
                invoice = None
        inspection = None
        try:
            inspection = booking.inspection
        except Inspection.DoesNotExist:
            inspection = None
        status_map = {
            Booking.Status.PENDING: ("pending", "PENDING"),
            Booking.Status.CONFIRMED: ("confirmed", "CONFIRMED"),
            Booking.Status.CHECKED_IN: ("checked_in", "CHECKED-IN"),
            Booking.Status.IN_SERVICE: ("progress", "IN PROGRESS"),
            Booking.Status.COMPLETED: ("completed", "COMPLETED"),
            Booking.Status.CANCELLED: ("cancelled", "CANCELLED"),
        }
        status_class, status_label = status_map.get(
            booking.status, ("pending", booking.get_status_display().upper())
        )
        minutes = booking.service.duration_minutes if booking.service_id else 0
        hours = minutes / 60 if minutes else 0
        hours_label = f"{int(hours)} hrs" if hours == int(hours) else f"{hours:g} hrs"
        return {
            "id": booking.id,
            "number": f"BK-{booking.id:04d}",
            "status_class": status_class,
            "status_label": status_label,
            "customer": booking.customer.name,
            "customer_phone": booking.customer.phone or "—",
            "customer_email": booking.customer.email or "—",
            "customer_url": reverse("admin:django_app_customer_change", args=[booking.customer_id]),
            "vehicle": f"{booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})",
            "plate": booking.vehicle.plate,
            "vehicle_url": reverse("admin:django_app_vehicle_change", args=[booking.vehicle_id]),
            "service": booking.service.name,
            "service_price": booking.service.price,
            "duration": hours_label if minutes else "—",
            "date": booking.booking_date,
            "time": booking.booking_time.strftime("%H:%M") if booking.booking_time else "—",
            "problem": booking.problem,
            "note": booking.note,
            "created": booking.created_at,
            "staff": str(inspection.staff) if inspection and inspection.staff_id else "—",
            "cancel_reason": booking.cancel_reason,
            "cancelled_at": booking.cancelled_at,
            "cancelled_by": str(booking.cancelled_by) if booking.cancelled_by_id else "",
            "is_cancelled": booking.status == Booking.Status.CANCELLED,
            "can_confirm": booking.status == Booking.Status.PENDING,
            "can_checkin": booking.status in (Booking.Status.PENDING, Booking.Status.CONFIRMED),
            "can_finish": booking.status in (Booking.Status.CHECKED_IN, Booking.Status.IN_SERVICE),
            "can_cancel": booking.status not in (Booking.Status.COMPLETED, Booking.Status.CANCELLED),
            "job_url": reverse("admin:django_app_repairjob_change", args=[job.id]) if job else "",
            "job_number": f"WO-{job.id:04d}" if job else "",
            "inspection_url": reverse("admin:django_app_inspection_change", args=[inspection.id]) if inspection else "",
            "invoice_url": reverse("admin:django_app_invoice_change", args=[invoice.id]) if invoice else "",
            "invoice_number": invoice.number if invoice else "",
            "add_job_url": reverse("admin:django_app_repairjob_add") + f"?vehicle={booking.vehicle_id}",
        }

    def _row(self, booking):
        receptionist = ""
        try:
            if booking.inspection.staff_id:
                receptionist = str(booking.inspection.staff)
        except Inspection.DoesNotExist:
            receptionist = ""
        view_url = reverse("admin:django_app_booking_change", args=[booking.id])
        return {
            "id": booking.id,
            "code": _code("BK", booking.id),
            "time": booking.booking_time.strftime("%H:%M") if booking.booking_time else "—",
            "date": booking.booking_date,
            "customer": booking.customer.name,
            "phone": booking.customer.phone,
            "vehicle": f"{booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.plate})",
            "service": booking.service.name,
            "notes": booking.note or booking.problem,
            "receptionist": receptionist,
            "status": booking.status,
            "status_label": booking.get_status_display().upper(),
            "status_class": booking.status.lower(),
            "view_url": view_url,
            "edit_url": f"{view_url}?edit=1",
            "delete_url": reverse("admin:django_app_booking_delete", args=[booking.id]),
            **_delete_icon_flags(booking),
            "can_confirm": booking.status == Booking.Status.PENDING,
            "can_checkin": booking.status in (Booking.Status.PENDING, Booking.Status.CONFIRMED),
            "can_finish": booking.status in (Booking.Status.CHECKED_IN, Booking.Status.IN_SERVICE),
            "can_cancel": booking.status not in (Booking.Status.COMPLETED, Booking.Status.CANCELLED),
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="bookings.csv"'
        writer = csv.writer(response)
        writer.writerow(["Date", "Time", "Customer", "Phone", "Vehicle", "Service", "Status", "Notes"])
        for booking in queryset:
            writer.writerow(
                [
                    booking.booking_date,
                    booking.booking_time or "",
                    booking.customer.name,
                    booking.customer.phone,
                    booking.vehicle.plate,
                    booking.service.name,
                    booking.status,
                    booking.note or booking.problem,
                ]
            )
        return response


_DELETE_SKIP_MODELS = {"logentry", "session", "contenttype"}


def _related_delete_impact(objs, extra_blocked=False):
    objs = [item for item in objs if item is not None and getattr(item, "pk", None)]
    impact = {
        "state": "safe",
        "protected_kinds": [],
        "cascade_kinds": [],
        "cascade_count": 0,
        "unlink_rows": [],
        "protect_reason": "",
        "warn_reason": "",
    }
    if extra_blocked:
        impact["state"] = "blocked"
        impact["protect_reason"] = "This record cannot be deleted."
        return impact
    if not objs:
        return impact
    if len(objs) == 1 and objs[0]._meta.model_name == "role":
        users = User.objects.filter(role=getattr(objs[0], "code", "")).count()
        if users:
            impact["state"] = "blocked"
            impact["protect_reason"] = f"This role is assigned to {users} user(s) and cannot be deleted."
            return impact

    using = router.db_for_write(objs[0].__class__)
    collector = NestedObjects(using=using, origin=objs)
    try:
        collector.collect(objs)
    except Exception:
        return impact

    protected_kinds = sorted({str(capfirst(item._meta.verbose_name_plural)) for item in collector.protected})
    if protected_kinds:
        noun = str(objs[0]._meta.verbose_name)
        impact["state"] = "blocked"
        impact["protected_kinds"] = protected_kinds
        impact["protect_reason"] = (
            f"This {noun} is still used by {', '.join(protected_kinds)}. "
            "Those records are protected by a foreign key, so they must be changed or removed first."
        )
        return impact

    origin_keys = {(item._meta.model_name, item.pk) for item in objs}
    cascade_counts = {}
    for model, instances in collector.data.items():
        if model._meta.model_name in _DELETE_SKIP_MODELS:
            continue
        extra = 0
        for item in instances:
            if (item._meta.model_name, item.pk) in origin_keys:
                continue
            extra += 1
        if extra:
            label = str(capfirst(model._meta.verbose_name_plural if extra != 1 else model._meta.verbose_name))
            cascade_counts[label] = extra

    unlink_rows = []
    seen = set()
    for (field, _value), batches in collector.field_updates.items():
        for batch in batches:
            for item in batch:
                key = (item._meta.model_name, item.pk)
                if key in seen:
                    continue
                seen.add(key)
                unlink_rows.append(
                    {
                        "kind": capfirst(item._meta.verbose_name),
                        "label": str(item),
                        "hint": f"{capfirst(field.verbose_name or field.name)} will be cleared",
                    }
                )
                if len(unlink_rows) >= 40:
                    break

    impact["cascade_kinds"] = sorted(cascade_counts.items())
    impact["cascade_count"] = sum(cascade_counts.values())
    impact["unlink_rows"] = unlink_rows
    if impact["cascade_count"] or unlink_rows:
        impact["state"] = "warn"
        noun = str(objs[0]._meta.verbose_name)
        kinds = [name for name, _count in impact["cascade_kinds"]]
        if kinds:
            impact["warn_reason"] = (
                f"This {noun} is connected to {', '.join(kinds)}. "
                "Deleting it will also remove those related records."
            )
        else:
            impact["warn_reason"] = (
                f"This {noun} is still linked to other records. "
                "Those links will be cleared if you delete it."
            )
    return impact


def _delete_state(obj, extra_blocked=False):
    return _related_delete_impact([obj], extra_blocked=extra_blocked)["state"]


def _delete_icon_flags(obj, extra_blocked=False):
    state = _delete_state(obj, extra_blocked=extra_blocked)
    return {
        "can_delete": state != "blocked",
        "delete_warn": state == "warn",
        "delete_state": state,
    }


def _record_can_delete(obj, extra_blocked=False):
    return _delete_state(obj, extra_blocked=extra_blocked) != "blocked"


def _delete_icon_html(delete_url, state="safe"):
    if state == "blocked":
        return (
            '<a class="blocked" href="{delete}" title="Cannot delete — this record is still in use">'
            '<span class="material-symbols-outlined icon-delete-off">delete</span></a>'
        )
    if state == "warn":
        return (
            '<a class="warn" href="{delete}" title="Delete with warning — related records will also be removed">'
            '<span class="material-symbols-outlined">delete</span></a>'
        )
    return (
        '<a class="danger" href="{delete}" title="Delete">'
        '<span class="material-symbols-outlined">delete</span></a>'
    )


def _badge(kind, label):
    return format_html('<span class="cc-status {}">{}</span>', kind, label)


def _actions(view_url, delete_url=None, obj=None, extra_blocked=False):
    state = "safe"
    if extra_blocked:
        state = "blocked"
    elif obj is not None:
        state = _delete_state(obj)
    elif not delete_url:
        state = "blocked"
    html = (
        '<span class="cc-actions">'
        '<a href="{view}" title="View"><span class="material-symbols-outlined">visibility</span></a>'
        '<a href="{view}" title="Edit"><span class="material-symbols-outlined">edit</span></a>'
        + _delete_icon_html(delete_url, state)
        + "</span>"
    )
    return format_html(html, view=view_url, delete=delete_url or view_url)


def _pair(title, subtitle=""):
    if subtitle:
        return format_html('<div class="cc-name">{}</div><div class="cc-id">{}</div>', title, subtitle)
    return format_html('<div class="cc-name">{}</div>', title)


def _code(prefix, pk):
    return f"{prefix}-{int(pk):04d}"


def _id_html(prefix, pk):
    return format_html('<div class="cc-id">ID: #{}</div>', _code(prefix, pk))


def _id_link(prefix, pk, url):
    return format_html('<a class="wo-num" href="{}">#{}</a>', url, _code(prefix, pk))


PAGE_QUERY_KEYS = ("stock", "category", "status", "role", "method", "export", "action", "pk", "view", "date")


class CarsvChangeList(ChangeList):
    def get_filters_params(self, params=None):
        lookup_params = super().get_filters_params(params)
        for key in PAGE_QUERY_KEYS:
            lookup_params.pop(key, None)
        return lookup_params


class CarsvPageAdmin(ModalFormMixin, ModelAdmin):
    change_list_template = "admin/django_app/carsv_page.html"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    def prepare_page(self, request):
        page = self.build_page(request)
        hidden = dict(page.get("hidden") or {})
        for filt in page.get("filters") or []:
            if filt.get("value") and filt["name"] not in hidden:
                hidden[filt["name"]] = filt["value"]
        page["hidden"] = hidden
        return page

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["page"] = self.prepare_page(request)
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(Staff)
class StaffAdmin(CarsvPageAdmin):
    form = StaffGarageForm
    list_display = ("user", "department", "position", "status")
    search_fields = ("user__username", "user__first_name", "user__last_name", "position")
    modal_title_add = "Add Staff"
    modal_title_edit = "Edit Staff"
    modal_subtitle = "Link a login account to a garage role, department, and position."
    modal_save_add = "Add Staff"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("user")
        status = request.GET.get("status")
        if status in dict(Staff.Status.choices):
            qs = qs.filter(status=status)
        return qs

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(user__first_name__icontains=query)
                | Q(user__last_name__icontains=query)
                | Q(user__username__icontains=query)
                | Q(position__icontains=query)
                | Q(department__icontains=query)
            )
        rows = []
        for staff in qs.order_by("user__first_name"):
            user = staff.user
            initials = f"{(user.first_name or user.username)[:1]}{(user.last_name or '')[:1]}".upper()
            rows.append(
                {
                    "off": staff.status != Staff.Status.ACTIVE,
                    "cells": [
                        format_html(
                            '<div class="cc-person"><span class="cc-avatar cc-avatar-round">{}</span><div><div class="cc-name">{}</div>{}{}</div></div>',
                            initials,
                            str(staff),
                            _id_html("STF", staff.id),
                            _id_html("USR", user.id),
                        ),
                        format_html('<span class="cc-muted">{}</span>', user.email or "—"),
                        format_html(
                            '<span class="cc-role cc-role-{}">{}</span>',
                            STAFF_POSITION_TONE.get(staff.position, "default"),
                            staff.position or "—",
                        ),
                        format_html('<span class="cc-muted">{}</span>', staff.department or "—"),
                        _badge("active" if staff.status == Staff.Status.ACTIVE else "inactive", staff.get_status_display()),
                        _actions(
                            reverse("admin:django_app_staff_change", args=[staff.id]),
                            reverse("admin:django_app_staff_delete", args=[staff.id]),
                            obj=staff,
                        ),
                    ]
                }
            )
        return {
            "title": "Staff",
            "subtitle": "Garage employees linked to login accounts: reception, workshop, and cashier.",
            "count": Staff.objects.count(),
            "count_label": "Staff",
            "model": "staff",
            "add_url": reverse("admin:django_app_staff_add"),
            "add_label": "Add Staff",
            "search_placeholder": "Search by name, position, or department...",
            "search_query": query,
            "filters": [
                {
                    "name": "status",
                    "value": request.GET.get("status") or "",
                    "options": [
                        {"value": "", "label": "All statuses"},
                        {"value": "ACTIVE", "label": "Active"},
                        {"value": "INACTIVE", "label": "Inactive"},
                    ],
                }
            ],
            "columns": ["Name", "Email", "Position", "Department", "Status", "Actions"],
            "rows": rows,
            "empty": "No staff match this search.",
        }


@admin.register(Inspection)
class InspectionAdmin(CarsvPageAdmin):
    form = InspectionGarageForm
    list_display = ("id", "booking", "mileage", "staff", "checked_in_at")
    modal_title_add = "Add Inspection"
    modal_title_edit = "Edit Inspection"
    modal_subtitle = "Record check-in measurements, condition, and customer complaint."
    modal_save_add = "Save Inspection"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "booking__customer", "booking__vehicle", "booking__service", "staff__user"
        )

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(booking__customer__name__icontains=query)
                | Q(booking__vehicle__plate__icontains=query)
                | Q(complaint__icontains=query)
                | Q(note__icontains=query)
            )
        cards = []
        for item in qs.order_by("-checked_in_at"):
            booking = item.booking
            cards.append(
                {
                    "initials": f"IN-{item.id:02d}",
                    "title": booking.customer.name,
                    "record_id": f"ID: #{_code('INSP', item.id)}",
                    "kicker": f"{booking.vehicle.plate} · {booking.vehicle.brand} {booking.vehicle.model}",
                    "status_class": booking.status.lower(),
                    "status_label": booking.get_status_display().upper(),
                    "lines": [
                        f"Mileage: {item.mileage:,} km · Fuel: {item.fuel_level or '—'}",
                        f"Staff: {item.staff or '—'}",
                        item.complaint or item.condition or item.note or "No inspection notes.",
                    ],
                    "footer": item.checked_in_at.strftime("%Y-%m-%d %H:%M") if item.checked_in_at else "",
                    "view_url": reverse("admin:django_app_inspection_change", args=[item.id]),
                    "delete_url": reverse("admin:django_app_inspection_delete", args=[item.id]),
                    **_delete_icon_flags(item),
                }
            )
        return {
            "title": "Inspections",
            "subtitle": "Check-in condition, mileage, and complaints recorded at the front desk.",
            "count": Inspection.objects.count(),
            "count_label": "Inspections",
            "model": "inspection",
            "add_url": reverse("admin:django_app_inspection_add"),
            "add_label": "Add Inspection",
            "search_placeholder": "Search by customer, plate, or complaint...",
            "search_query": query,
            "layout": "cards",
            "cards": cards,
            "empty": "No inspections match this search.",
        }


@admin.register(Mechanic)
class MechanicAdmin(CarsvPageAdmin):
    form = MechanicGarageForm
    list_display = ("user", "specialization", "available", "status")
    search_fields = ("user__username", "specialization")
    modal_title_add = "Add Technician"
    modal_title_edit = "Edit Technician"
    modal_subtitle = "Link a login account to workshop skills, specialization, and availability."
    modal_save_add = "Add Technician"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("repair_jobs")

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(user__first_name__icontains=query)
                | Q(user__last_name__icontains=query)
                | Q(specialization__icontains=query)
                | Q(skills__icontains=query)
                | Q(user__phone__icontains=query)
            )
        status = request.GET.get("status")
        cards = []
        for mechanic in qs.order_by("user__first_name"):
            jobs = mechanic.repair_jobs.exclude(status=RepairJob.Status.COMPLETED).count()
            inactive = mechanic.status == Mechanic.Status.INACTIVE
            busy = (not inactive) and ((not mechanic.available) or jobs > 0)
            if status == "AVAILABLE" and (busy or inactive):
                continue
            if status == "BUSY" and not busy:
                continue
            if status == "INACTIVE" and not inactive:
                continue
            user = mechanic.user
            initials = f"{(user.first_name or user.username)[:1]}{(user.last_name or '')[:1]}".upper()
            if inactive:
                status_class, status_label = "inactive", "INACTIVE"
            elif busy:
                status_class, status_label = "busy", f"BUSY ({jobs})"
            else:
                status_class, status_label = "ready", "IDLE"
            cards.append(
                {
                    "initials": initials,
                    "title": str(mechanic),
                    "record_id": f"ID: #{_code('TECH', mechanic.id)} · User #{_code('USR', user.id)}",
                    "kicker": mechanic.specialization or "General",
                    "status_class": status_class,
                    "status_label": status_label,
                    "lines": [
                        f"Specialty: {mechanic.specialization or mechanic.skills or '—'}",
                        f"Phone: {user.phone or '—'}",
                    ],
                    "footer": f"Active bay jobs: {jobs}",
                    "view_url": reverse("admin:django_app_mechanic_change", args=[mechanic.id]),
                    "delete_url": reverse("admin:django_app_mechanic_delete", args=[mechanic.id]),
                    **_delete_icon_flags(mechanic),
                }
            )
        return {
            "title": "Technicians & Mechanics",
            "subtitle": "Workshop labor force, specializations, and current bay assignments.",
            "count": Mechanic.objects.count(),
            "count_label": "Specialists",
            "model": "mechanic",
            "add_url": reverse("admin:django_app_mechanic_add"),
            "add_label": "Add Technician",
            "search_placeholder": "Search by mechanic name, specialization, or phone...",
            "search_query": query,
            "filters": [
                {
                    "name": "status",
                    "value": status or "",
                    "options": [
                        {"value": "", "label": "All work statuses"},
                        {"value": "AVAILABLE", "label": "Available (Idle)"},
                        {"value": "BUSY", "label": "Busy (In bay)"},
                        {"value": "INACTIVE", "label": "Inactive"},
                    ],
                }
            ],
            "layout": "cards",
            "cards": cards,
            "empty": "No technicians match this search.",
        }


@admin.register(RepairJob)
class RepairJobAdmin(ModalFormMixin, ModelAdmin):
    form = RepairJobGarageForm
    list_display = ("id", "vehicle", "mechanic", "status", "progress")
    search_fields = ("problem", "customer__name", "vehicle__plate")
    change_list_template = "admin/django_app/workorder_change_list.html"
    modal_title_add = "Create Work Order"
    modal_title_edit = "Edit Work Order"
    modal_subtitle = "Assign booking, vehicle, technician, and current job status."
    modal_save_add = "Create Work Order"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    STATUS_BADGE = {
        RepairJob.Status.WAITING: ("pending", "PENDING"),
        RepairJob.Status.DIAGNOSING: ("progress", "IN PROGRESS"),
        RepairJob.Status.WAITING_APPROVAL: ("assigned", "ASSIGNED"),
        RepairJob.Status.REPAIRING: ("progress", "IN PROGRESS"),
        RepairJob.Status.WAITING_PARTS: ("waiting", "WAITING PARTS"),
        RepairJob.Status.QUALITY_CHECK: ("inspection", "QUALITY CHECK"),
        RepairJob.Status.READY_FOR_PICKUP: ("ready", "READY FOR PICKUP"),
        RepairJob.Status.COMPLETED: ("completed", "COMPLETED"),
    }

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        vehicle_id = request.GET.get("vehicle")
        if vehicle_id:
            vehicle = Vehicle.objects.filter(pk=vehicle_id).first()
            if vehicle:
                initial["vehicle"] = vehicle.pk
                initial["customer"] = vehicle.customer_id
        return initial

    def get_queryset(self, request):
        qs = (
            super()
            .get_queryset(request)
            .select_related("customer", "vehicle", "mechanic__user", "booking__service", "invoice")
        )
        status = request.GET.get("status")
        if status in dict(RepairJob.Status.choices):
            qs = qs.filter(status=status)
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            lookup = (
                Q(problem__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(vehicle__plate__icontains=query)
                | Q(vehicle__brand__icontains=query)
                | Q(vehicle__model__icontains=query)
            )
            digits = query.replace("WO-", "").replace("wo-", "").replace("#", "").strip()
            if digits.isdigit():
                lookup |= Q(id=int(digits))
            qs = qs.filter(lookup)
        qs = qs.order_by("-id")

        if request.GET.get("export") == "csv":
            return self._export_csv(qs)

        rows = [self._row(job) for job in qs]
        if not request.GET.get("status"):
            pending = Booking.objects.filter(status=Booking.Status.PENDING).select_related(
                "customer", "vehicle", "service"
            )
            if query:
                pending = pending.filter(
                    Q(customer__name__icontains=query)
                    | Q(vehicle__plate__icontains=query)
                    | Q(problem__icontains=query)
                    | Q(service__name__icontains=query)
                )
            for booking in pending:
                if hasattr(booking, "repair_job"):
                    continue
                rows.append(self._booking_row(booking))

        extra_context.update(
            {
                "workorder_rows": rows,
                "order_count": RepairJob.objects.count(),
                "search_query": query,
                "status_filter": request.GET.get("status") or "ALL",
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def _row(self, job):
        badge_class, badge_label = self.STATUS_BADGE.get(job.status, ("pending", job.get_status_display().upper()))
        cost = None
        if hasattr(job, "invoice"):
            cost = job.invoice.grand_total
        elif job.booking_id and job.booking.service_id:
            cost = job.booking.service.price
        created = job.booking.created_at if job.booking_id else job.start_date
        return {
            "number": f"WO-{job.id:04d}",
            "created": created,
            "customer": job.customer.name,
            "problem": job.problem or (job.booking.problem if job.booking_id else ""),
            "vehicle": f"{job.vehicle.brand} {job.vehicle.model} ({job.vehicle.year})",
            "plate": job.vehicle.plate,
            "tech": str(job.mechanic) if job.mechanic_id else "Unassigned",
            "bay": "Bay #01" if job.vehicle.status == Vehicle.Status.IN_SHOP else "—",
            "status_class": badge_class,
            "status_label": badge_label,
            "cost": cost,
            "view_url": reverse("admin:django_app_repairjob_change", args=[job.id]),
            "delete_url": reverse("admin:django_app_repairjob_delete", args=[job.id]),
            **_delete_icon_flags(job),
        }

    def _booking_row(self, booking):
        return {
            "number": f"BK-{booking.id:04d}",
            "created": booking.created_at,
            "customer": booking.customer.name,
            "problem": booking.problem or booking.service.name,
            "vehicle": f"{booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})",
            "plate": booking.vehicle.plate,
            "tech": "Unassigned",
            "bay": "Bay #01" if booking.vehicle.status == Vehicle.Status.IN_SHOP else "—",
            "status_class": "pending",
            "status_label": "PENDING",
            "cost": booking.service.price if booking.service_id else None,
            "view_url": reverse("admin:django_app_booking_change", args=[booking.id]),
            "delete_url": reverse("admin:django_app_booking_delete", args=[booking.id]),
            **_delete_icon_flags(booking),
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="work-orders.csv"'
        writer = csv.writer(response)
        writer.writerow(["WO", "Customer", "Vehicle", "Plate", "Technician", "Status", "Problem"])
        for job in queryset:
            row = self._row(job)
            writer.writerow(
                [row["number"], row["customer"], row["vehicle"], row["plate"], row["tech"], row["status_label"], row["problem"]]
            )
        return response


@admin.register(SparePartCategory)
class SparePartCategoryAdmin(CarsvPageAdmin):
    form = SparePartCategoryGarageForm
    list_display = ("name", "status")
    search_fields = ("name",)
    modal_title_add = "Add Part Category"
    modal_title_edit = "Edit Part Category"
    modal_subtitle = "Groups used to filter and manage parts inventory."
    modal_save_add = "Add Category"
    modal_wide = False

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(part_count=Count("parts"))

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(name__icontains=query)
        cards = []
        for category in qs.order_by("name"):
            cards.append(
                {
                    "initials": category.name[:2].upper(),
                    "title": category.name,
                    "record_id": f"ID: #{_code('PCAT', category.id)}",
                    "kicker": "Part category",
                    "status_class": "ready" if category.status == "ACTIVE" else "inactive",
                    "status_label": "Active" if category.status == "ACTIVE" else "Disabled",
                    "lines": [f"{category.part_count} part{'' if category.part_count == 1 else 's'} in this category."],
                    "footer": "",
                    "view_url": reverse("admin:django_app_sparepartcategory_change", args=[category.id]),
                    "delete_url": reverse("admin:django_app_sparepartcategory_delete", args=[category.id]),
                    **_delete_icon_flags(category),
                }
            )
        return {
            "title": "Part Categories",
            "subtitle": "Groups used to filter and manage spare parts stock.",
            "count": SparePartCategory.objects.count(),
            "count_label": "Categories",
            "model": "sparepartcategory",
            "add_url": reverse("admin:django_app_sparepartcategory_add"),
            "add_label": "Add Category",
            "extra_link": {"url": reverse("admin:django_app_sparepart_changelist"), "label": "View inventory"},
            "search_placeholder": "Search categories...",
            "search_query": query,
            "layout": "cards",
            "cards": cards,
            "empty": "No part categories match this search.",
        }


@admin.register(SparePart)
class SparePartAdmin(CarsvPageAdmin):
    form = SparePartGarageForm
    list_display = ("part_number", "name", "category", "quantity", "min_stock", "unit_price", "status")
    search_fields = ("part_number", "name")
    modal_title_add = "Add Inventory Part"
    modal_title_edit = "Edit Inventory Part"
    modal_subtitle = "SKU, stock levels, and unit price for the parts room."
    modal_save_add = "Add Part"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("category")
        category_id = request.GET.get("category")
        if category_id and category_id.isdigit():
            qs = qs.filter(category_id=int(category_id))
        stock = request.GET.get("stock")
        if stock == "LOW":
            qs = qs.filter(quantity__lte=F("min_stock"))
        elif stock == "NORMAL":
            qs = qs.filter(quantity__gt=F("min_stock"))
        return qs

    def changelist_view(self, request, extra_context=None):
        if request.GET.get("action") == "restock" and request.GET.get("pk"):
            part = SparePart.objects.filter(pk=request.GET["pk"]).first()
            if part:
                part.quantity += 10
                part.save(update_fields=["quantity"])
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            url = reverse("admin:django_app_sparepart_changelist")
            query = params.urlencode()
            return redirect(f"{url}?{query}" if query else url)
        extra_context = extra_context or {}
        extra_context["page"] = self.prepare_page(request)
        if request.GET.get("export") == "csv":
            return self._export_csv(self._filtered(request))
        return super(CarsvPageAdmin, self).changelist_view(request, extra_context=extra_context)

    def _filtered(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(part_number__icontains=query)
                | Q(brand__icontains=query)
                | Q(category__name__icontains=query)
            )
        return qs.order_by("name")

    def build_page(self, request):
        qs = self._filtered(request)
        query = (request.GET.get("q") or "").strip()
        low = SparePart.objects.filter(quantity__lte=F("min_stock"))
        rows = []
        for part in qs:
            is_low = part.quantity <= part.min_stock
            stock = format_html(
                '<span class="cc-spent {}">{}</span> {}',
                "danger" if is_low else "",
                part.quantity,
                format_html('<span class="cc-status waiting">LOW (Min: {})</span>', part.min_stock) if is_low else "",
            )
            restock_params = request.GET.copy()
            restock_params["action"] = "restock"
            restock_params["pk"] = str(part.id)
            restock = format_html(
                '<span class="inv-actions"><a class="wo-open" href="?{}" title="Restock +10">+10</a>{}</span>',
                restock_params.urlencode(),
                _actions(
                    reverse("admin:django_app_sparepart_change", args=[part.id]),
                    reverse("admin:django_app_sparepart_delete", args=[part.id]),
                    obj=part,
                ),
            )
            rows.append(
                {
                    "off": part.status != SparePart.Status.ACTIVE,
                    "cells": [
                        _id_link("PRT", part.id, reverse("admin:django_app_sparepart_change", args=[part.id])),
                        _pair(part.name, part.category.name),
                        format_html('<span class="cc-id">{}</span>', part.part_number),
                        stock,
                        format_html('<span class="cc-spent ok">${}</span>', part.unit_price),
                        part.brand or "—",
                        restock,
                    ]
                }
            )
        banner = None
        if low.exists():
            banner = {
                "title": f"Low inventory warning: {low.count()} item(s) below minimum",
                "text": " · ".join(f"{p.name} ({p.quantity} left)" for p in low[:6]),
                "href": "?stock=LOW",
                "cta": "Filter low stock",
            }
        return {
            "title": "Spare Parts & Inventory",
            "subtitle": "Warehouse catalog and stock levels for the workshop.",
            "count": SparePart.objects.count(),
            "count_label": "SKUs",
            "model": "sparepart",
            "add_url": reverse("admin:django_app_sparepart_add"),
            "add_label": "Add New Part",
            "export": True,
            "export_label": "Export CSV",
            "extra_link": {"url": reverse("admin:django_app_sparepartcategory_changelist"), "label": "Part categories"},
            "search_placeholder": "Search by part name, SKU, or brand...",
            "search_query": query,
            "banner": banner,
            "filters": [
                {
                    "name": "category",
                    "value": request.GET.get("category") or "",
                    "options": [{"value": "", "label": "All categories"}]
                    + [{"value": str(c.id), "label": c.name} for c in SparePartCategory.objects.order_by("name")],
                },
                {
                    "name": "stock",
                    "value": request.GET.get("stock") or "",
                    "options": [
                        {"value": "", "label": "All stock levels"},
                        {"value": "LOW", "label": "Low stock only"},
                        {"value": "NORMAL", "label": "Normal / adequate"},
                    ],
                },
            ],
            "columns": ["ID", "Part title & category", "SKU / Code", "Stock status", "Unit price", "Brand", "Actions"],
            "rows": rows,
            "empty": "No parts match this search.",
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="inventory.csv"'
        writer = csv.writer(response)
        writer.writerow(["SKU", "Name", "Category", "Brand", "Quantity", "Min stock", "Unit price", "Status"])
        for part in queryset:
            writer.writerow(
                [part.part_number, part.name, part.category.name, part.brand, part.quantity, part.min_stock, part.unit_price, part.status]
            )
        return response


@admin.register(PartsUsage)
class PartsUsageAdmin(CarsvPageAdmin):
    form = PartsUsageGarageForm
    list_display = ("repair_job", "spare_part", "quantity", "total", "used_at")
    modal_title_add = "Record Parts Usage"
    modal_title_edit = "Edit Parts Usage"
    modal_subtitle = "Log parts issued against a work order. Total is calculated on save."
    modal_save_add = "Record Usage"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("repair_job__vehicle", "spare_part", "recorded_by__user")

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(spare_part__name__icontains=query)
                | Q(spare_part__part_number__icontains=query)
                | Q(repair_job__vehicle__plate__icontains=query)
            )
        rows = []
        for usage in qs.order_by("-used_at"):
            rows.append(
                {
                    "cells": [
                        _id_link("USE", usage.id, reverse("admin:django_app_partsusage_change", args=[usage.id])),
                        format_html(
                            '<a class="wo-num" href="{}">WO-{}</a>',
                            reverse("admin:django_app_repairjob_change", args=[usage.repair_job_id]),
                            f"{usage.repair_job_id:04d}",
                        ),
                        _pair(usage.spare_part.name, usage.spare_part.part_number),
                        usage.quantity,
                        format_html('<span class="cc-spent">${}</span>', usage.total),
                        usage.recorded_by or "—",
                        usage.used_at.strftime("%Y-%m-%d %H:%M") if usage.used_at else "—",
                        _actions(
                            reverse("admin:django_app_partsusage_change", args=[usage.id]),
                            reverse("admin:django_app_partsusage_delete", args=[usage.id]),
                            obj=usage,
                        ),
                    ]
                }
            )
        return {
            "title": "Parts Usage",
            "subtitle": "Parts issued onto repair jobs, with quantity and cost.",
            "count": PartsUsage.objects.count(),
            "count_label": "Usages",
            "model": "partsusage",
            "add_url": reverse("admin:django_app_partsusage_add"),
            "add_label": "Record Usage",
            "search_placeholder": "Search by part, SKU, or vehicle plate...",
            "search_query": query,
            "columns": ["ID", "Work order", "Part", "Qty", "Total", "Recorded by", "Used at", "Actions"],
            "rows": rows,
            "empty": "No parts usage matches this search.",
        }


@admin.register(Invoice)
class InvoiceAdmin(CarsvPageAdmin):
    form = InvoiceGarageForm
    list_display = ("number", "customer", "grand_total", "status", "invoice_date")
    modal_title_add = "Create Invoice"
    modal_title_edit = "Edit Invoice"
    modal_subtitle = "Labor, service, and parts amounts. Subtotal and grand total are calculated on save."
    modal_save_add = "Create Invoice"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("customer", "vehicle", "repair_job")
        status = request.GET.get("status")
        if status in dict(Invoice.Status.choices):
            qs = qs.filter(status=status)
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["page"] = self.prepare_page(request)
        qs = self._filtered(request)
        if request.GET.get("export") == "csv":
            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="invoices.csv"'
            writer = csv.writer(response)
            writer.writerow(["Number", "Customer", "Vehicle", "Total", "Status", "Date"])
            for invoice in qs:
                writer.writerow([invoice.number, invoice.customer.name, invoice.vehicle.plate, invoice.grand_total, invoice.status, invoice.invoice_date])
            return response
        return super(CarsvPageAdmin, self).changelist_view(request, extra_context=extra_context)

    def _filtered(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(number__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(vehicle__plate__icontains=query)
            )
        return qs.order_by("-id")

    def build_page(self, request):
        qs = self._filtered(request)
        query = (request.GET.get("q") or "").strip()
        paid = Invoice.objects.filter(status=Invoice.Status.PAID)
        pending = Invoice.objects.filter(status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT))
        paid_total = paid.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        pending_total = pending.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        paid_count = paid.count() or 1
        badge_map = {
            Invoice.Status.PAID: "ready",
            Invoice.Status.UNPAID: "waiting",
            Invoice.Status.PARTIAL: "pending",
            Invoice.Status.DRAFT: "inactive",
            Invoice.Status.CANCELLED: "cancelled",
        }
        rows = []
        for invoice in qs:
            rows.append(
                {
                    "cells": [
                        format_html('<a class="wo-num" href="{}">{}</a>', reverse("admin:django_app_invoice_change", args=[invoice.id]), invoice.number),
                        invoice.customer.name,
                        _pair(f"{invoice.vehicle.brand} {invoice.vehicle.model}", invoice.vehicle.plate),
                        invoice.invoice_date,
                        format_html('<span class="cc-spent">${}</span>', invoice.grand_total),
                        _badge(badge_map.get(invoice.status, "pending"), invoice.get_status_display().upper()),
                        _actions(
                            reverse("admin:django_app_invoice_change", args=[invoice.id]),
                            reverse("admin:django_app_invoice_delete", args=[invoice.id]),
                            obj=invoice,
                        ),
                    ]
                }
            )
        return {
            "title": "Invoices & Billing",
            "subtitle": "Bills for workshop repair jobs. Cash received is on the Payments page.",
            "count": Invoice.objects.count(),
            "count_label": "Invoices",
            "model": "invoice",
            "add_url": reverse("admin:django_app_invoice_add"),
            "add_label": "Add Invoice",
            "export": True,
            "export_label": "Export Ledger",
            "extra_link": {"url": reverse("admin:django_app_payment_changelist"), "label": "Payments"},
            "search_placeholder": "Search by invoice #, customer, or vehicle...",
            "search_query": query,
            "kpis": [
                {"label": "Total paid revenue", "value": f"${paid_total:,.0f}", "hint": f"From {paid.count()} settled tickets", "tone": "ok"},
                {"label": "Pending receivables", "value": f"${pending_total:,.0f}", "hint": "Awaiting customer payment", "tone": "warn"},
                {"label": "Average ticket", "value": f"${(paid_total / paid_count):,.0f}", "hint": "Average per paid invoice", "tone": "blue"},
            ],
            "filters": [
                {
                    "name": "status",
                    "value": request.GET.get("status") or "",
                    "options": [{"value": "", "label": "All payment statuses"}]
                    + [{"value": value, "label": label} for value, label in Invoice.Status.choices],
                }
            ],
            "columns": ["Invoice #", "Customer", "Job / vehicle", "Issue date", "Total", "Status", "Actions"],
            "rows": rows,
            "empty": "No invoices match this search.",
        }


@admin.register(Payment)
class PaymentAdmin(CarsvPageAdmin):
    form = PaymentGarageForm
    list_display = ("number", "invoice", "amount", "method", "status", "paid_at")
    modal_title_add = "Record Payment"
    modal_title_edit = "Edit Payment"
    modal_subtitle = "Amount received against an invoice, with method and receipt details."
    modal_save_add = "Record Payment"

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("invoice", "customer", "received_by__user")
        method = request.GET.get("method")
        if method in dict(Payment.Method.choices):
            qs = qs.filter(method=method)
        return qs

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(number__icontains=query)
                | Q(invoice__number__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(reference__icontains=query)
            )
        badge_map = {
            Payment.Status.PAID: "ready",
            Payment.Status.UNPAID: "waiting",
            Payment.Status.PARTIAL: "pending",
            Payment.Status.FAILED: "cancelled",
            Payment.Status.REFUNDED: "inactive",
        }
        rows = []
        for payment in qs.order_by("-paid_at", "-id"):
            rows.append(
                {
                    "cells": [
                        format_html('<a class="wo-num" href="{}">{}</a>', reverse("admin:django_app_payment_change", args=[payment.id]), payment.number),
                        format_html('<a class="wo-num" href="{}">{}</a>', reverse("admin:django_app_invoice_change", args=[payment.invoice_id]), payment.invoice.number),
                        payment.customer.name,
                        format_html('<span class="cc-spent">${}</span>', payment.amount),
                        payment.get_method_display(),
                        payment.paid_at,
                        _badge(badge_map.get(payment.status, "pending"), payment.get_status_display().upper()),
                        _actions(
                            reverse("admin:django_app_payment_change", args=[payment.id]),
                            reverse("admin:django_app_payment_delete", args=[payment.id]),
                            obj=payment,
                        ),
                    ]
                }
            )
        return {
            "title": "Payments",
            "subtitle": "Front desk and cashier. Money received against invoices — not the invoice editor.",
            "count": Payment.objects.count(),
            "count_label": "Payments",
            "model": "payment",
            "add_url": reverse("admin:django_app_payment_add"),
            "add_label": "Add Payment",
            "extra_link": {"url": reverse("admin:django_app_invoice_changelist"), "label": "Invoices"},
            "search_placeholder": "Search by payment #, invoice, or customer...",
            "search_query": query,
            "filters": [
                {
                    "name": "method",
                    "value": request.GET.get("method") or "",
                    "options": [{"value": "", "label": "All methods"}]
                    + [{"value": value, "label": label} for value, label in Payment.Method.choices],
                }
            ],
            "columns": ["Payment #", "Invoice", "Customer", "Amount", "Method", "Date", "Status", "Actions"],
            "rows": rows,
            "empty": "No payments match this search.",
        }
