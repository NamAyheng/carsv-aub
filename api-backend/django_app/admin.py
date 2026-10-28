import csv
import re
from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.contrib.admin.actions import delete_selected as django_delete_selected
from django.contrib.admin.utils import NestedObjects, capfirst, unquote
from django.contrib.admin.views.main import ChangeList
from django.db import router
from django.db.models import BooleanField, Case, Count, DateField, DateTimeField, F, FileField, ImageField, IntegerField, Max, Prefetch, Q, Sum, TimeField, When
from django.db.models.functions import Coalesce
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.utils.html import format_html
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.timezone import localdate, now
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.forms import AdminPasswordChangeForm

from django_app.role_access import RoleGatedAdminMixin, staff_role
from django_app.models import (
    AuthProvider,
    Booking,
    BookingService,
    Customer,
    BlogPost,
    Estimate,
    GarageReport,
    Inspection,
    InspectionImage,
    InspectionRecommendation,
    Notification,
    save_inspection_recommendations,
    Invoice,
    Mechanic,
    PartRequest,
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
    advance_part_request,
    booking_blocking_part_requests,
    booking_can_cancel,
    booking_can_check_in,
    booking_can_confirm,
    booking_can_finish,
    BOOKING_STATUS_ORDER,
    booking_slot_taken,
    booking_status_locked,
    cancel_booking,
    cancel_part_request,
    check_in_booking,
    complete_booking,
    confirm_part_request,
    ensure_confirmed_job,
    inspection_fields_filled,
    inspection_is_complete,
    inspection_missing_fields,
    job_advance_block_reason,
    job_can_reach,
    customer_must_confirm,
    linked_job,
    next_inspection_status,
    next_invoice_status,
    next_job_status,
    next_part_request_status,
    next_payment_number,
    progress_for_job_status,
    reject_payment,
    sync_booking_from_job,
    sync_vehicle_shop_status,
    verify_payment,
    verified_payment_total,
    invoice_payment_state,
    refresh_invoice_status,
    visit_service_total,
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


class ModelAdmin(RoleGatedAdminMixin, CarsvDeleteMixin, UnfoldModelAdmin):
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
                    "data-photo": _file_url(user.photo),
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
        final_attrs = self.build_attrs(self.attrs, attrs)
        invoice_follow = final_attrs.get("data-invoice-follow")
        if invoice_follow:
            return format_html(
                '<div class="cf-locked-value" data-locked-for="{}" data-invoice-follow="{}">{}</div>',
                name,
                invoice_follow,
                text,
            )
        payment_follow = final_attrs.get("data-payment-follow")
        if payment_follow:
            return format_html(
                '<div class="cf-locked-value" data-locked-for="{}" data-payment-follow="{}">{}</div>',
                name,
                payment_follow,
                text,
            )
        part_follow = final_attrs.get("data-part-request-follow")
        if part_follow:
            return format_html(
                '<div class="cf-locked-value" data-locked-for="{}" data-part-request-follow="{}">{}</div>',
                name,
                part_follow,
                text,
            )
        return format_html(
            '<div class="cf-locked-value" data-locked-for="{}">{}</div>',
            name,
            text,
        )


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


class StatusToneSelect(forms.Select):
    """Status choices use the same colors as the badges on the lists."""

    TONE = {
        "WAITING": "waiting",
        "DIAGNOSING": "progress",
        "WAITING_APPROVAL": "pending",
        "REPAIRING": "progress",
        "CHECKING": "progress",
        "CHECK_IN": "progress",
        "QUALITY_CHECK": "inspection",
        "READY_FOR_PICKUP": "ready",
        "COMPLETED": "completed",
        "PENDING": "pending",
        "CONFIRMED": "confirmed",
        "CHECKED_IN": "confirmed",
        "IN_SERVICE": "progress",
        "CANCELLED": "cancelled",
        "ACTIVE": "ready",
        "INACTIVE": "inactive",
        "IN_SHOP": "progress",
        "DRAFT": "inactive",
        "UNPAID": "unpaid",
        "PARTIAL": "pending",
        "PAID": "ready",
        "FAILED": "cancelled",
        "REFUNDED": "inactive",
        "NOTED": "pending",
        "SENT": "progress",
        "APPROVED": "ready",
        "REJECTED": "cancelled",
    }

    def __init__(self, attrs=None, choices=(), tone_map=None, disabled_values=None, disabled_suffix=""):
        super().__init__(attrs, choices)
        self.tone_map = tone_map or self.TONE
        self.disabled_values = {str(item) for item in (disabled_values or [])}
        self.disabled_suffix = disabled_suffix

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        key = str(getattr(value, "value", value) or "")
        tone = self.tone_map.get(key)
        if tone:
            option["attrs"]["data-tone"] = tone
        if key and key in self.disabled_values:
            option["attrs"]["disabled"] = "disabled"
            option["attrs"]["class"] = (option["attrs"].get("class", "") + " is-disabled").strip()
            if self.disabled_suffix and key:
                option["label"] = f"{label}{self.disabled_suffix}"
        return option


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
            "status": StatusToneSelect(attrs={"class": "cf-input"}),
            "notes": forms.Textarea(attrs={"class": "cf-input", "rows": 3, "placeholder": "Vehicle preferences, preferred contact times, discount arrangements..."}),
            "photo": forms.ClearableFileInput(
                attrs={"class": "cf-file", "accept": "image/jpeg,image/png,image/webp,image/gif"}
            ),
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


def _is_image_filename(value):
    from django_app.uploads import looks_like_image_filename

    return looks_like_image_filename(value)


def _vehicle_title(vehicle):
    brand = "" if _is_image_filename(vehicle.brand) else vehicle.brand
    return f"{brand} {vehicle.model} ({vehicle.year})".replace("  ", " ").strip()


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
            "image",
        )
        widgets = {
            "customer": forms.Select(attrs={"class": "cf-input"}),
            "brand": forms.TextInput(
                attrs={
                    "class": "cf-input",
                    "placeholder": "e.g. Toyota",
                    "ondrop": "event.preventDefault()",
                    "ondragover": "event.preventDefault()",
                }
            ),
            "model": forms.TextInput(
                attrs={
                    "class": "cf-input",
                    "placeholder": "e.g. Camry",
                    "ondrop": "event.preventDefault()",
                    "ondragover": "event.preventDefault()",
                }
            ),
            "year": forms.NumberInput(attrs={"class": "cf-input"}),
            "plate": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. 2BD-9988"}),
            "vin": forms.TextInput(attrs={"class": "cf-input", "placeholder": "17-character VIN"}),
            "color": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Pearl White"}),
            "mileage": forms.NumberInput(attrs={"class": "cf-input"}),
            "vehicle_type": forms.TextInput(attrs={"class": "cf-input", "placeholder": "e.g. Sedan, Hybrid"}),
            "engine_number": forms.TextInput(attrs={"class": "cf-input"}),
            "status": StatusToneSelect(attrs={"class": "cf-input"}),
            "next_service_date": forms.DateInput(attrs={"class": "cf-input", "type": "date"}),
            "next_service_mileage": forms.NumberInput(attrs={"class": "cf-input"}),
            "notes": forms.Textarea(
                attrs={"class": "cf-input", "rows": 3, "placeholder": "Diagnostic notes, existing wear, special modifications..."}
            ),
            "image": forms.ClearableFileInput(
                attrs={"class": "cf-file", "accept": "image/jpeg,image/png,image/webp,image/gif"}
            ),
        }

    def clean_plate(self):
        from django_app.plates import normalize_vehicle_plate, require_vehicle_plate

        plate = normalize_vehicle_plate(self.cleaned_data.get("plate"))
        current = normalize_vehicle_plate(getattr(self.instance, "plate", ""))
        if self.instance.pk and plate == current:
            return self.instance.plate
        return require_vehicle_plate(plate)

    def clean_brand(self):
        brand = (self.cleaned_data.get("brand") or "").strip()
        if _is_image_filename(brand):
            previous = (getattr(self.instance, "brand", "") or "").strip()
            if previous and not _is_image_filename(previous):
                return previous
            raise forms.ValidationError("Enter the vehicle make, for example Toyota or Honda.")
        return brand


class LinkedSelect(forms.Select):
    """Select whose options carry the foreign keys they belong to."""

    def __init__(self, attrs=None, choices=(), option_attrs=None):
        super().__init__(attrs, choices)
        self.option_attrs = option_attrs or {}

    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        key = str(getattr(value, "value", value) or "")
        extra = self.option_attrs.get(key)
        if extra:
            option["attrs"].update(extra)
        return option


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
            "status": StatusToneSelect(attrs={"class": "cf-input"}),
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
        if booking_status_locked(self.instance):
            self.fields["status"].disabled = True
            self.fields["status"].help_text = "This follows the work order. Change the status on the work order."
            css = self.fields["status"].widget.attrs.get("class", "cf-input")
            if "is-locked" not in css:
                self.fields["status"].widget.attrs["class"] = f"{css} is-locked"
        else:
            self.fields["status"].choices = (
                (Booking.Status.PENDING, "Pending"),
                (Booking.Status.CONFIRMED, "Confirmed"),
                (Booking.Status.CANCELLED, "Cancelled"),
            )

    def clean(self):
        cleaned = super().clean()
        customer = cleaned.get("customer")
        vehicle = cleaned.get("vehicle")
        if customer and vehicle and vehicle.customer_id != customer.id:
            self.add_error("vehicle", "This vehicle does not belong to the selected customer.")
        status = cleaned.get("status")
        if status == Booking.Status.CANCELLED and getattr(self.instance, "pk", None) and not booking_can_cancel(self.instance):
            self.add_error("status", "This visit is already in the workshop. Finish the work order instead of cancelling the booking.")
        previous = getattr(self.instance, "status", None)
        if (
            status == Booking.Status.CONFIRMED
            and previous == Booking.Status.PENDING
            and getattr(self.instance, "pk", None)
            and booking_blocking_part_requests(self.instance).exists()
        ):
            self.add_error(
                "status",
                "Confirm or cancel every part request before accepting this booking.",
            )
        if (
            vehicle
            and cleaned.get("booking_date")
            and status != Booking.Status.CANCELLED
            and booking_slot_taken(
                vehicle,
                cleaned.get("booking_date"),
                cleaned.get("booking_time"),
                ignore_pk=getattr(self.instance, "pk", None),
            )
        ):
            self.add_error("booking_time", "That vehicle already has a booking at this time.")
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
            if name == "status" and not isinstance(field.widget, StatusToneSelect):
                tone = StatusToneSelect(attrs={"class": "cf-input"})
                if list(getattr(field, "choices", []) or []):
                    tone.choices = field.choices
                else:
                    tone.choices = (("ACTIVE", "Active"), ("INACTIVE", "Inactive"))
                field.widget = tone


def garage_form(model, fields):
    meta = type("Meta", (), {"model": model, "fields": fields})
    return type(f"{model.__name__}GarageForm", (GarageModelForm,), {"Meta": meta})


ServiceCategoryGarageForm = garage_form(ServiceCategory, ("name", "status"))
ServiceGarageForm = garage_form(
    Service, ("category", "name", "description", "price", "duration_minutes", "status", "image")
)


class BlogPostGarageForm(GarageModelForm):
    class Meta:
        model = BlogPost
        fields = (
            "title",
            "slug",
            "category",
            "excerpt",
            "body",
            "tips",
            "author_name",
            "image",
            "read_minutes",
            "featured",
            "published",
            "published_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["slug"].required = False
        self.fields["slug"].help_text = "Leave blank and the address is built from the title."
        self.fields["excerpt"].widget.attrs["rows"] = 3
        self.fields["body"].widget.attrs["rows"] = 8
        self.fields["tips"].widget.attrs["rows"] = 4
        self.fields["tips"].help_text = "One tip per line. Shown at the end of the article."
        self.fields["body"].help_text = "Separate paragraphs with a blank line."
        self.fields["image"].help_text = "JPG, PNG, WEBP, or GIF. 5 MB maximum."
        self.fields["published"].help_text = "Only published articles appear on the public website."
        self.fields["published_at"].required = False

    def clean_slug(self):
        from django.core.exceptions import ValidationError
        from django.utils.text import slugify

        slug = (self.cleaned_data.get("slug") or "").strip()
        if not slug:
            slug = slugify(self.cleaned_data.get("title") or "")[:180]
        if not slug:
            raise ValidationError("Enter a title or a slug.")
        taken = BlogPost.objects.filter(slug=slug)
        if self.instance.pk:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise ValidationError("Another article already uses this slug.")
        return slug

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

class MultiImageInput(forms.FileInput):
    allow_multiple_selected = True

    def value_from_datadict(self, data, files, name):
        if hasattr(files, "getlist"):
            return files.getlist(name)
        file = files.get(name)
        return [file] if file else []


class MultiImageField(forms.FileField):
    widget = MultiImageInput

    def clean(self, data, initial=None):
        from django_app.uploads import validate_uploaded_image

        files = data if isinstance(data, (list, tuple)) else ([data] if data not in self.empty_values else [])
        files = [uploaded for uploaded in files if uploaded not in self.empty_values]
        if not files:
            if self.required:
                raise forms.ValidationError(self.error_messages["required"], code="required")
            return []
        cleaned = []
        for uploaded in files:
            validate_uploaded_image(uploaded)
            cleaned.append(uploaded)
        return cleaned


class InspectionGarageForm(GarageModelForm):
    complaint = forms.CharField(
        required=False,
        disabled=True,
        label="Complaint",
        widget=forms.Textarea(attrs={"class": "cf-input is-locked", "rows": 3}),
        help_text="Copied from the work order problem.",
    )
    images = MultiImageField(
        required=False,
        label="Images",
        widget=MultiImageInput(
            attrs={
                "class": "cf-file",
                "accept": "image/jpeg,image/png,image/webp,image/gif",
                "multiple": True,
            }
        ),
        help_text="JPG, PNG, WEBP, or GIF. 5 MB each. Choose more than one photo if you need to.",
    )
    recommend_services = forms.ModelMultipleChoiceField(
        required=False,
        queryset=Service.objects.none(),
        # Must stay visible so modal_form_fields.html can replace the widget UI.
        # MultipleHiddenInput is excluded from visible_fields and never rendered.
        widget=forms.CheckboxSelectMultiple,
        label="Recommended services",
    )
    recommend_parts = forms.ModelMultipleChoiceField(
        required=False,
        queryset=SparePart.objects.none(),
        widget=forms.CheckboxSelectMultiple,
        label="Recommended parts",
    )

    class Meta:
        model = Inspection
        fields = (
            "repair_job",
            "status",
            "mileage",
            "fuel_level",
            "front_brake_mm",
            "rear_brake_mm",
            "tire_tread_mm",
            "staff",
            "condition",
            "damage",
            "note",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        jobs = RepairJob.objects.select_related(
            "customer", "vehicle", "booking", "booking__service"
        ).order_by("-id")
        if self.instance.pk and self.instance.repair_job_id:
            jobs = jobs.filter(Q(inspection__isnull=True) | Q(pk=self.instance.repair_job_id))
        else:
            jobs = jobs.filter(inspection__isnull=True)
        option_attrs = {
            str(job.id): {"data-problem": (job.problem or "").replace("\n", "\\n")}
            for job in jobs
        }
        self.fields["repair_job"].queryset = jobs
        self.fields["repair_job"].empty_label = "Select value"
        self.fields["repair_job"].widget = LinkedSelect(
            attrs={"class": "cf-input", "data-inspection-job": "1"},
            option_attrs=option_attrs,
        )
        self.fields["repair_job"].widget.choices = self.fields["repair_job"].choices
        self.fields["repair_job"].label_from_instance = (
            lambda job: f"WO-{job.id:04d} · {job.vehicle.plate} · {job.customer.name}"
        )
        self.fields["repair_job"].label = "Work order"
        self.fields["fuel_level"].required = True
        self.fields["fuel_level"].empty_label = "Select percentage"
        self.fields["front_brake_mm"].required = True
        self.fields["rear_brake_mm"].required = True
        self.fields["tire_tread_mm"].required = True
        self.fields["condition"].required = True
        self.fields["damage"].required = True
        self.fields["note"].required = True
        self.fields["staff"].required = True
        self.fields["mileage"].required = True
        has_photos = bool(self.instance.pk and self.instance.images.exists())
        self.fields["images"].required = not has_photos
        self.fields["images"].help_text = (
            "At least one photo is required. JPG, PNG, WEBP, or GIF. 5 MB each. "
            "New uploads are added; existing photos stay until you delete them."
            if not has_photos
            else "JPG, PNG, WEBP, or GIF. 5 MB each. New uploads are added; existing photos stay until you delete them."
        )
        self.fields["status"].help_text = (
            "Pending → Check-in when an inspector is assigned → Completed only when every field is filled."
        )
        self.fields["staff"].label = "Inspector"
        self.fields["staff"].help_text = "Assigning an inspector moves this from Pending to Check-in."
        chosen = None
        if self.instance.pk and self.instance.repair_job_id:
            chosen = self.instance.repair_job
        posted = self.data.get("repair_job") if self.is_bound else None
        if posted:
            chosen = jobs.filter(pk=posted).first() or chosen
        self.fields["complaint"].initial = chosen.problem if chosen is not None else ""

        booked_service_ids = set()
        booked_service_labels = []
        booked_part_ids = set()
        booked_part_labels = []
        if chosen is not None and chosen.booking_id:
            booking = chosen.booking
            if booking.service_id:
                booked_service_ids.add(booking.service_id)
                booked_service_labels.append(booking.service.name)
            for extra in booking.added_services.exclude(source=BookingService.Source.INSPECTOR).select_related(
                "service"
            ):
                booked_service_ids.add(extra.service_id)
                if extra.service and extra.service.name not in booked_service_labels:
                    booked_service_labels.append(extra.service.name)
            for request_row in (
                PartRequest.objects.filter(booking=booking)
                .exclude(status=PartRequest.Status.CANCELLED)
                .exclude(source=PartRequest.Source.INSPECTOR)
                .select_related("spare_part")
            ):
                booked_part_ids.add(request_row.spare_part_id)
                label = request_row.spare_part.name if request_row.spare_part_id else ""
                if label and label not in booked_part_labels:
                    booked_part_labels.append(label)

        active_services = (
            Service.objects.filter(status="ACTIVE")
            .exclude(pk__in=booked_service_ids)
            .select_related("category")
            .order_by("name")
        )
        active_parts = (
            SparePart.objects.filter(status=SparePart.Status.ACTIVE, quantity__gt=0)
            .exclude(pk__in=booked_part_ids)
            .order_by("name")
        )
        self.fields["recommend_services"].queryset = active_services
        self.fields["recommend_parts"].queryset = active_parts
        self.booked_service_ids = booked_service_ids
        self.booked_part_ids = booked_part_ids

        existing_recs = list(self.instance.recommendations.all()) if self.instance.pk else []
        selected_services = [
            rec.service_id
            for rec in existing_recs
            if rec.kind == InspectionRecommendation.Kind.SERVICE
            and rec.service_id
            and rec.service_id not in booked_service_ids
            and not rec.customer_declined
        ]
        selected_parts = [
            rec.spare_part_id
            for rec in existing_recs
            if rec.kind == InspectionRecommendation.Kind.PART
            and rec.spare_part_id
            and rec.spare_part_id not in booked_part_ids
            and not rec.customer_declined
        ]
        if self.is_bound:
            selected_services = [
                int(v)
                for v in self.data.getlist("recommend_services")
                if str(v).isdigit() and int(v) not in booked_service_ids
            ]
            selected_parts = [
                int(v)
                for v in self.data.getlist("recommend_parts")
                if str(v).isdigit() and int(v) not in booked_part_ids
            ]
        self.fields["recommend_services"].initial = selected_services
        self.fields["recommend_parts"].initial = selected_parts
        self.recommendation_rows = self._build_recommendation_rows(
            existing_recs,
            selected_services,
            selected_parts,
            booked_service_labels,
            booked_part_labels,
        )

        self.order_fields(
            [
                "repair_job",
                "status",
                "mileage",
                "fuel_level",
                "front_brake_mm",
                "rear_brake_mm",
                "tire_tread_mm",
                "staff",
                "complaint",
                "condition",
                "recommend_services",
                "recommend_parts",
                "damage",
                "note",
                "images",
            ]
        )

    def _build_recommendation_rows(
        self, existing_recs, selected_services, selected_parts, booked_service_labels, booked_part_labels
    ):
        notes = {rec.service_id: rec.note for rec in existing_recs if rec.service_id}
        part_meta = {
            rec.spare_part_id: {"note": rec.note, "quantity": rec.quantity}
            for rec in existing_recs
            if rec.spare_part_id
        }
        service_rows = []
        for service in list(self.fields["recommend_services"].queryset[:60]):
            note = notes.get(service.id, "")
            if self.is_bound:
                note = self.data.get(f"rec_service_note_{service.id}", note)
            service_rows.append(
                {
                    "id": service.id,
                    "name": service.name,
                    "price": f"{service.price}",
                    "checked": service.id in selected_services,
                    "note": note or "",
                }
            )
        part_rows = []
        for part in list(self.fields["recommend_parts"].queryset[:60]):
            meta = part_meta.get(part.id) or {"note": "", "quantity": 1}
            note = meta.get("note") or ""
            qty = meta.get("quantity") or 1
            if self.is_bound:
                note = self.data.get(f"rec_part_note_{part.id}", note)
                qty = self.data.get(f"rec_part_qty_{part.id}", qty)
            part_rows.append(
                {
                    "id": part.id,
                    "name": part.name,
                    "sku": part.part_number,
                    "price": f"{part.unit_price}",
                    "stock": part.quantity,
                    "checked": part.id in selected_parts,
                    "note": note or "",
                    "quantity": qty or 1,
                }
            )
        return {
            "services": service_rows,
            "parts": part_rows,
            "booked_services": booked_service_labels,
            "booked_parts": booked_part_labels,
        }

    def clean(self):
        cleaned = super().clean()
        status = cleaned.get("status")
        staff = cleaned.get("staff")
        if status == Inspection.Status.CHECK_IN and not staff:
            self.add_error("staff", "Select the inspector for Check-in.")
        if staff and status == Inspection.Status.PENDING:
            cleaned["status"] = Inspection.Status.CHECK_IN
        if status == Inspection.Status.COMPLETED:
            new_photos = cleaned.get("images") or []
            has_photos = bool(new_photos) or (
                self.instance.pk and self.instance.images.exists()
            )
            if not has_photos:
                self.add_error("images", "Add at least one photo to complete the inspection.")

        booked_service_ids = getattr(self, "booked_service_ids", set()) or set()
        booked_part_ids = getattr(self, "booked_part_ids", set()) or set()
        service_items = []
        for service in cleaned.get("recommend_services") or []:
            if service.id in booked_service_ids:
                self.add_error(
                    "recommend_services",
                    f"{service.name} is already on the customer booking and cannot be recommended again.",
                )
                continue
            service_items.append({"service": service, "note": ""})
        part_items = []
        for part in cleaned.get("recommend_parts") or []:
            if part.id in booked_part_ids:
                self.add_error(
                    "recommend_parts",
                    f"{part.name} is already on the customer booking and cannot be recommended again.",
                )
                continue
            raw_qty = self.data.get(f"rec_part_qty_{part.id}") or "1"
            try:
                qty = max(int(raw_qty), 1)
            except (TypeError, ValueError):
                self.add_error("recommend_parts", f"Quantity for {part.name} must be a whole number.")
                continue
            if qty > (part.quantity or 0):
                self.add_error(
                    "recommend_parts",
                    f"{part.name}: only {part.quantity} in stock (requested {qty}).",
                )
                continue
            part_items.append({"spare_part": part, "quantity": qty, "note": ""})
        cleaned["recommendation_service_items"] = service_items
        cleaned["recommendation_part_items"] = part_items
        return cleaned

    def save(self, commit=True):
        inspection = super().save(commit=False)
        if inspection.staff_id and inspection.status == Inspection.Status.PENDING:
            inspection.status = Inspection.Status.CHECK_IN
        if commit:
            inspection.save()
            from django_app.models import InspectionImage

            for uploaded in self.cleaned_data.get("images") or []:
                InspectionImage.objects.create(inspection=inspection, image=uploaded)
            self._persist_recommendations(inspection)
        return inspection

    def _persist_recommendations(self, inspection):
        try:
            save_inspection_recommendations(
                inspection,
                service_items=self.cleaned_data.get("recommendation_service_items") or [],
                part_items=self.cleaned_data.get("recommendation_part_items") or [],
            )
        except ValidationError as exc:
            raise forms.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

class RepairJobGarageForm(GarageModelForm):
    class Meta:
        model = RepairJob
        fields = (
            "customer",
            "vehicle",
            "booking",
            "mechanic",
            "problem",
            "start_date",
            "estimated_end",
            "status",
            "progress",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        customers = Customer.objects.order_by("name")
        vehicles = Vehicle.objects.select_related("customer").order_by("plate")
        bookings = (
            Booking.objects.select_related("customer", "vehicle", "service")
            .exclude(status=Booking.Status.CANCELLED)
            .order_by("-booking_date", "-id")
        )
        if self.instance.pk and self.instance.booking_id:
            bookings = bookings.filter(Q(repair_job__isnull=True) | Q(pk=self.instance.booking_id))
        else:
            bookings = bookings.filter(repair_job__isnull=True)

        self.fields["customer"].queryset = customers
        self.fields["customer"].empty_label = "Select value"
        self.fields["customer"].label_from_instance = (
            lambda item: f"{item.name} ({item.phone})" if item.phone else item.name
        )
        self.fields["customer"].help_text = "Choose the customer first."
        self.fields["customer"].required = False

        self.fields["vehicle"].queryset = vehicles
        self.fields["vehicle"].empty_label = "Select value"
        self.fields["vehicle"].widget = LinkedSelect(
            attrs={"class": "cf-input"},
            option_attrs={str(item.id): {"data-customer": str(item.customer_id)} for item in vehicles},
        )
        self.fields["vehicle"].widget.choices = self.fields["vehicle"].choices
        self.fields["vehicle"].label_from_instance = (
            lambda item: f"{item.plate} — {item.brand} {item.model} ({item.year})"
        )
        self.fields["vehicle"].help_text = "Only vehicles registered to the customer."
        self.fields["vehicle"].required = False

        booking_attrs = {}
        for item in bookings:
            problem = (item.problem or "").replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n")
            booking_attrs[str(item.id)] = {
                "data-customer": str(item.customer_id),
                "data-vehicle": str(item.vehicle_id),
                "data-problem": problem,
                "data-start": item.booking_date.isoformat() if item.booking_date else "",
            }
        self.fields["booking"].queryset = bookings
        self.fields["booking"].empty_label = "Select value"
        self.fields["booking"].widget = LinkedSelect(
            attrs={"class": "cf-input", "data-visit-source": "1"},
            option_attrs=booking_attrs,
        )
        self.fields["booking"].widget.choices = self.fields["booking"].choices
        self.fields["booking"].label_from_instance = self._booking_label
        self.fields["booking"].help_text = "Only this vehicle's visits that do not already have a work order."

        self.fields["problem"].help_text = "Copied from the visit."
        self.fields["start_date"].help_text = "The visit date."
        self.fields["mechanic"].empty_label = "Unassigned"
        self.fields["mechanic"].required = False
        self.fields["estimated_end"].required = False

        linked = self._posted_booking()
        if self.instance.pk and self.instance.booking_id and linked is None:
            linked = (
                Booking.objects.select_related("customer", "vehicle")
                .filter(pk=self.instance.booking_id)
                .first()
            )
        if linked is not None:
            self.initial["customer"] = linked.customer_id
            self.initial["vehicle"] = linked.vehicle_id
            self.initial["booking"] = linked.pk
            self.initial["problem"] = linked.problem or ""
            self.initial["start_date"] = linked.booking_date
            for name in ("problem", "start_date"):
                self.fields[name].disabled = True
                self.fields[name].widget.attrs["data-server-locked"] = "1"
        elif not self.is_bound or not self.data.get("vehicle"):
            locked = ["booking", "mechanic", "problem", "start_date", "estimated_end", "status", "progress"]
            if not self.is_bound or not self.data.get("customer"):
                locked.insert(0, "vehicle")
            self._widget_lock(*locked)
        for field in self.fields.values():
            widgets = [field.widget]
            inner = getattr(field.widget, "widget", None)
            if inner is not None:
                widgets.append(inner)
            for widget in widgets:
                widget.attrs["class"] = "cf-input"
                if isinstance(widget, forms.Textarea):
                    widget.attrs["rows"] = 3
        status = StatusToneSelect(attrs={"class": "cf-input"})
        choices = [choice for choice in self.fields["status"].choices if choice[0] != RepairJob.Status.CANCELLED]
        if self.instance.pk and self.instance.status == RepairJob.Status.CANCELLED:
            choices.append((RepairJob.Status.CANCELLED, "Cancelled"))
        self.fields["status"].choices = choices
        status.choices = choices
        if self.fields["status"].widget.attrs.get("disabled"):
            status.attrs["disabled"] = True
        self.fields["status"].widget = status
        chosen_status = self.instance.status if self.instance.pk else RepairJob.Status.WAITING
        if self.is_bound and self.data.get("status"):
            chosen_status = self.data.get("status")
        self.initial["progress"] = progress_for_job_status(chosen_status)
        self.fields["progress"].disabled = True
        self.fields["progress"].required = False
        self.fields["progress"].help_text = "Follows the status. Waiting is 0% and Completed is 100%."
        self.fields["progress"].widget.attrs["data-progress-locked"] = "1"
        self.fields["progress"].widget.attrs["class"] = "cf-input is-locked"

    def _widget_lock(self, *names):
        for name in names:
            self.fields[name].widget.attrs["disabled"] = True

    def _posted_booking(self):
        if not self.is_bound:
            return None
        raw = self.data.get("booking")
        if not raw:
            return None
        return (
            Booking.objects.select_related("customer", "vehicle", "service")
            .filter(pk=raw)
            .exclude(status=Booking.Status.CANCELLED)
            .first()
        )

    @staticmethod
    def _booking_label(item):
        when = item.booking_date.isoformat()
        if item.booking_time:
            when = f"{when} {item.booking_time.strftime('%H:%M')}"
        service = item.service.name if item.service_id else "Visit"
        return f"BK-{item.id:04d} · {service} · {when}"

    def clean(self):
        cleaned = super().clean()
        booking = cleaned.get("booking")
        if booking is None:
            return cleaned
        if booking.status == Booking.Status.CANCELLED:
            self.add_error("booking", "A cancelled visit cannot have a work order.")
            return cleaned
        try:
            existing = booking.repair_job
        except RepairJob.DoesNotExist:
            existing = None
        if existing is not None and existing.pk != self.instance.pk:
            self.add_error("booking", "This visit already has a work order.")
            return cleaned
        cleaned["customer"] = booking.customer
        cleaned["vehicle"] = booking.vehicle
        cleaned["problem"] = booking.problem or ""
        cleaned["start_date"] = booking.booking_date
        mechanic = cleaned.get("mechanic")
        previous_mechanic = self.instance.mechanic_id if getattr(self.instance, "pk", None) else None
        if mechanic is not None and mechanic.pk != previous_mechanic:
            if mechanic.status != Mechanic.Status.ACTIVE or not mechanic.available:
                self.add_error("mechanic", "This technician is unavailable.")
            elif RepairJob.objects.filter(
                mechanic=mechanic,
                start_date=cleaned.get("start_date"),
            ).exclude(status=RepairJob.Status.COMPLETED).exclude(pk=self.instance.pk).exists():
                self.add_error("mechanic", "This technician already has a job on that date.")
        status = cleaned.get("status")
        if status:
            # Validate against the mechanic chosen on this save, not only the stored job.
            probe = self.instance
            probe.mechanic = cleaned.get("mechanic")
            reason = job_advance_block_reason(probe, status)
            if reason:
                self.add_error("status", reason)
        return cleaned
SparePartCategoryGarageForm = garage_form(SparePartCategory, ("name", "status"))
SparePartGarageForm = garage_form(
    SparePart,
    ("part_number", "name", "category", "brand", "image", "unit_price", "quantity", "min_stock", "status"),
)
PartsUsageGarageForm = garage_form(PartsUsage, ("repair_job", "spare_part", "quantity", "unit_price", "recorded_by"))
class PartRequestGarageForm(GarageModelForm):
    """
    Workshop install → booking (visit quote) is the parent FK; work order follows the booking.
    Counter / delivery → no booking; staff pick customer + vehicle.
    """

    class Meta:
        model = PartRequest
        fields = (
            "customer",
            "vehicle",
            "booking",
            "repair_job",
            "spare_part",
            "fulfillment",
            "notes",
            "cancel_reason",
            "status",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        issued = bool(self.instance.pk and self.instance.parts_usage_id)
        customers = Customer.objects.order_by("name")
        vehicles = Vehicle.objects.select_related("customer").order_by("plate")
        bookings = (
            Booking.objects.select_related("customer", "vehicle", "service", "repair_job")
            .exclude(status=Booking.Status.CANCELLED)
            .order_by("-booking_date", "-id")
        )
        jobs = RepairJob.objects.select_related("customer", "vehicle", "booking").order_by("-id")

        fulfillment = self._current_fulfillment()
        install = fulfillment == PartRequest.Fulfillment.INSTALL

        self.fields["customer"].queryset = customers
        self.fields["customer"].empty_label = "Select customer"
        self.fields["customer"].label_from_instance = self._customer_label
        self.fields["customer"].required = not install
        self.fields["customer"].help_text = (
            "Taken from the booking for workshop install."
            if install
            else "Customer buying the part at the counter or for delivery."
        )

        self.fields["vehicle"].queryset = vehicles
        self.fields["vehicle"].empty_label = "Select vehicle"
        self.fields["vehicle"].required = False
        self.fields["vehicle"].label_from_instance = self._vehicle_label
        self.fields["vehicle"].help_text = (
            "Taken from the booking for workshop install."
            if install
            else "Optional for counter / delivery."
        )
        if not install and not issued:
            self.fields["vehicle"].widget = LinkedSelect(
                attrs={"class": "cf-input"},
                option_attrs={str(item.id): {"data-customer": str(item.customer_id)} for item in vehicles},
            )
            self.fields["vehicle"].widget.choices = self.fields["vehicle"].choices

        booking_attrs = {}
        for item in bookings:
            job = linked_job(item)
            booking_attrs[str(item.id)] = {
                "data-customer": str(item.customer_id),
                "data-vehicle": str(item.vehicle_id),
                "data-job": str(job.id) if job is not None else "",
                "data-customer-label": self._customer_label(item.customer),
                "data-vehicle-label": self._vehicle_label(item.vehicle),
                "data-job-label": (
                    f"WO-{job.id:04d} · {item.vehicle.plate}" if job is not None else "No work order yet (quote)"
                ),
            }
        self.fields["booking"].queryset = bookings
        self.fields["booking"].empty_label = "Select booking (visit quote)"
        self.fields["booking"].required = install and not issued
        self.fields["booking"].label = "Booking"
        self.fields["booking"].help_text = (
            "Visit quote this part belongs to. Same booking as the customer quote page."
            if install
            else "Not used for counter pickup / delivery."
        )
        self.fields["booking"].label_from_instance = self._booking_label
        if install and not issued:
            self.fields["booking"].widget = LinkedSelect(
                attrs={"class": "cf-input", "data-part-request-booking": "1"},
                option_attrs=booking_attrs,
            )
            self.fields["booking"].widget.choices = self.fields["booking"].choices
        elif not install and not issued:
            self.fields["booking"].disabled = True
            self.fields["booking"].required = False
            self.fields["booking"].widget = LockedDisplayWidget(display="— (not used)")

        self.fields["repair_job"].queryset = jobs
        self.fields["repair_job"].empty_label = "Follows booking (or none yet)"
        self.fields["repair_job"].required = False
        self.fields["repair_job"].label = "Work order"
        self.fields["repair_job"].help_text = (
            "Filled from the booking’s work order when one exists. Quote-phase parts may show none yet."
        )
        self.fields["repair_job"].label_from_instance = self._job_label

        notes = self.fields["notes"].widget
        notes.attrs["class"] = "cf-input"
        notes.attrs["rows"] = 3
        reason = self.fields["cancel_reason"].widget
        reason.attrs["class"] = "cf-input"
        reason.attrs["rows"] = 3
        reason.attrs["placeholder"] = "Required when the part is cancelled (for example out of stock)."
        self.fields["cancel_reason"].help_text = "Required when status is Cancelled."
        self.fields["status"].help_text = (
            "Confirm issues one unit on the visit work order, reduces shelf stock, "
            "and adds the price to that job’s invoice. Cancel when the part is not available."
        )
        self.fields["fulfillment"].widget.attrs["data-part-request-fulfillment"] = "1"
        self.fields["fulfillment"].help_text = (
            "Workshop install stays on the booking quote. Counter pickup / delivery are parts-only (no booking)."
        )

        linked = self._posted_booking() if install else None
        if install and linked is None:
            booking_id = None
            if self.instance.pk and self.instance.booking_id:
                booking_id = self.instance.booking_id
            elif not self.is_bound:
                booking_id = self.initial.get("booking")
            if booking_id:
                linked = (
                    Booking.objects.select_related("customer", "vehicle", "service", "repair_job")
                    .filter(pk=booking_id)
                    .first()
                )
        job = linked_job(linked) if linked is not None else None
        if linked is not None:
            self.initial["booking"] = linked.pk
            self.initial["customer"] = linked.customer_id
            self.initial["vehicle"] = linked.vehicle_id
            if job is not None:
                self.initial["repair_job"] = job.pk
            self.fields["customer"].queryset = Customer.objects.filter(pk=linked.customer_id)
            self.fields["vehicle"].queryset = Vehicle.objects.filter(pk=linked.vehicle_id)
            if job is not None:
                self.fields["repair_job"].queryset = RepairJob.objects.filter(pk=job.pk)
            else:
                self.fields["repair_job"].queryset = RepairJob.objects.none()

        if issued:
            for name in (
                "customer",
                "vehicle",
                "booking",
                "repair_job",
                "spare_part",
                "fulfillment",
                "status",
                "cancel_reason",
            ):
                if name in self.fields:
                    self.fields[name].disabled = True
                    self.fields[name].required = False
                    self.fields[name].widget = LockedDisplayWidget(
                        display=_locked_field_display(self, name, self.fields[name]) or "—"
                    )
            wo = f"WO-{self.instance.repair_job_id:04d}" if self.instance.repair_job_id else "a work order"
            invoice = (
                Invoice.objects.filter(repair_job_id=self.instance.repair_job_id)
                .values_list("number", flat=True)
                .first()
                if self.instance.repair_job_id
                else None
            )
            billed = f" Billed on {invoice}." if invoice else ""
            self.fields["notes"].help_text = f"Already issued on {wo}.{billed} Record payment on that invoice."
        elif install:
            customer_display = (
                self._customer_label(linked.customer) if linked is not None else "Select a booking"
            )
            vehicle_display = (
                self._vehicle_label(linked.vehicle) if linked is not None else "Select a booking"
            )
            job_display = (
                self._job_label(job)
                if job is not None
                else ("No work order yet (quote)" if linked is not None else "Select a booking")
            )
            for name, display in (
                ("customer", customer_display),
                ("vehicle", vehicle_display),
                ("repair_job", job_display),
            ):
                self.fields[name].disabled = True
                self.fields[name].required = False
                self.fields[name].widget = LockedDisplayWidget(
                    display=display,
                    attrs={"data-part-request-follow": name},
                )

        self.order_fields(
            [
                "fulfillment",
                "booking",
                "repair_job",
                "customer",
                "vehicle",
                "spare_part",
                "notes",
                "cancel_reason",
                "status",
            ]
        )
        for field in self.fields.values():
            widgets = [field.widget]
            inner = getattr(field.widget, "widget", None)
            if inner is not None:
                widgets.append(inner)
            for widget in widgets:
                if isinstance(widget, LockedDisplayWidget):
                    continue
                css = widget.attrs.get("class", "cf-input")
                if "cf-input" not in css and not isinstance(widget, forms.Textarea):
                    widget.attrs["class"] = f"{css} cf-input".strip()

    def _current_fulfillment(self):
        if self.is_bound and self.data.get("fulfillment"):
            return self.data.get("fulfillment")
        if self.instance.pk and self.instance.fulfillment:
            return self.instance.fulfillment
        return self.initial.get("fulfillment") or PartRequest.Fulfillment.INSTALL

    def _posted_booking(self):
        if not self.is_bound:
            return None
        raw = self.data.get("booking")
        if not raw:
            return None
        return (
            Booking.objects.select_related("customer", "vehicle", "service", "repair_job")
            .filter(pk=raw)
            .first()
        )

    @staticmethod
    def _customer_label(item):
        return f"{item.name} ({item.phone})" if item.phone else item.name

    @staticmethod
    def _vehicle_label(item):
        return f"{item.plate} — {item.brand} {item.model} ({item.year})"

    @staticmethod
    def _job_label(item):
        return f"WO-{item.id:04d} · {item.vehicle.plate} · {item.customer.name}"

    @staticmethod
    def _booking_label(item):
        when = item.booking_date.isoformat() if item.booking_date else "—"
        if item.booking_time:
            when = f"{when} {item.booking_time.strftime('%H:%M')}"
        service = item.service.name if item.service_id else "Visit"
        return f"BK-{item.id:04d} · {service} · {item.vehicle.plate} · {when}"

    def clean(self):
        cleaned = super().clean()
        if self.instance.pk and self.instance.parts_usage_id:
            return cleaned
        fulfillment = cleaned.get("fulfillment") or getattr(self.instance, "fulfillment", None)
        booking = cleaned.get("booking")
        if booking is None and self.instance.pk and self.instance.booking_id and "booking" not in self.data:
            booking = self.instance.booking
            cleaned["booking"] = booking
        if fulfillment == PartRequest.Fulfillment.INSTALL:
            if booking is None:
                self.add_error("booking", "Workshop install needs a booking (the visit quote).")
            else:
                cleaned["customer"] = booking.customer
                cleaned["vehicle"] = booking.vehicle
                cleaned["repair_job"] = linked_job(booking)
        elif fulfillment in (PartRequest.Fulfillment.PICKUP, PartRequest.Fulfillment.DELIVERY):
            cleaned["booking"] = None
            cleaned["repair_job"] = None
        status = cleaned.get("status")
        if status == PartRequest.Status.CANCELLED:
            if not (cleaned.get("cancel_reason") or "").strip():
                self.add_error("cancel_reason", "Say why this part request was cancelled.")
            return cleaned
        if status != PartRequest.Status.CONFIRMED:
            return cleaned
        if not cleaned.get("vehicle"):
            self.add_error("vehicle", "Choose the vehicle. The work order and the invoice both need a car.")
        part = cleaned.get("spare_part")
        if part is not None and part.quantity < 1:
            self.add_error(
                "spare_part",
                "That part is out of stock, so it cannot be issued. Set status to Cancelled and say why.",
            )
        return cleaned
class InvoiceGarageForm(GarageModelForm):
    """
    One invoice → one work order → one customer + vehicle (+ booking via the job).
    Customer/vehicle/work order are not free-pick lists on edit.
    """

    booking = forms.CharField(required=False, label="Booking")

    class Meta:
        model = Invoice
        fields = (
            "number",
            "repair_job",
            "customer",
            "vehicle",
            "labor_cost",
            "service_cost",
            "parts_cost",
            "discount",
            "tax",
            "status",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        editing = bool(self.instance.pk)
        jobs = (
            RepairJob.objects.select_related("customer", "vehicle", "booking__service")
            .order_by("-id")
        )
        if editing and self.instance.repair_job_id:
            jobs = jobs.filter(Q(invoice__isnull=True) | Q(pk=self.instance.repair_job_id))
        else:
            jobs = jobs.filter(invoice__isnull=True)

        self.fields["repair_job"].label = "Work order"
        self.fields["repair_job"].queryset = jobs
        self.fields["repair_job"].empty_label = "Select work order"
        self.fields["repair_job"].label_from_instance = self._job_label
        self.fields["repair_job"].required = True
        self.fields["repair_job"].help_text = (
            "This invoice belongs to one work order. Customer, vehicle, and booking come from it."
        )
        if "status" in self.fields:
            paid = (
                verified_payment_total(self.instance).quantize(Decimal("0.01"))
                if editing
                else Decimal("0")
            )
            grand = Decimal(self.instance.grand_total or 0).quantize(Decimal("0.01")) if editing else Decimal("0")
            if paid <= 0:
                allowed = {Invoice.Status.UNPAID, Invoice.Status.CANCELLED}
                if not editing:
                    allowed.add(Invoice.Status.DRAFT)
                help_status = (
                    "All statuses stay listed. Paid / Partially paid stay disabled until "
                    "Payments has verified amounts covering this invoice."
                )
            elif paid < grand:
                allowed = {Invoice.Status.PARTIAL, Invoice.Status.CANCELLED}
                help_status = (
                    "Partially paid is available from verified Payments. Paid unlocks when the balance is covered."
                )
            else:
                allowed = {Invoice.Status.PAID, Invoice.Status.CANCELLED}
                help_status = "Paid is available from verified Payments."
            status_choices = list(Invoice.Status.choices)
            disabled = [value for value, _label in status_choices if value not in allowed]
            tone = StatusToneSelect(
                attrs={"class": "cf-input"},
                disabled_values=disabled,
                disabled_suffix=" — verify on Payments",
            )
            tone.choices = status_choices
            self.fields["status"].choices = status_choices
            self.fields["status"].widget = tone
            self.fields["status"].help_text = help_status
            current = self.instance.status if editing else Invoice.Status.UNPAID
            if current not in allowed:
                fallback = Invoice.Status.UNPAID if Invoice.Status.UNPAID in allowed else next(iter(allowed))
                self.initial["status"] = fallback
                self.fields["status"].initial = fallback

        self.fields["customer"].required = False
        self.fields["customer"].label_from_instance = self._customer_label
        self.fields["customer"].help_text = "Locked to the work order customer."
        self.fields["vehicle"].required = False
        self.fields["vehicle"].label_from_instance = self._vehicle_label
        self.fields["vehicle"].help_text = "Locked to the work order vehicle."

        linked = self._posted_job()
        if editing and self.instance.repair_job_id and linked is None:
            linked = (
                RepairJob.objects.select_related("customer", "vehicle", "booking__service")
                .filter(pk=self.instance.repair_job_id)
                .first()
            )
        if linked is not None:
            self.initial["repair_job"] = linked.pk
            self.initial["customer"] = linked.customer_id
            self.initial["vehicle"] = linked.vehicle_id
            self.fields["customer"].queryset = Customer.objects.filter(pk=linked.customer_id)
            self.fields["vehicle"].queryset = Vehicle.objects.filter(pk=linked.vehicle_id)
        else:
            self.fields["customer"].queryset = Customer.objects.none()
            self.fields["vehicle"].queryset = Vehicle.objects.none()

        booking_label = self._booking_label(linked.booking) if linked and linked.booking_id else "—"
        self.fields["booking"].initial = booking_label
        self.fields["booking"].disabled = True
        self.fields["booking"].required = False
        self.fields["booking"].help_text = "From the work order visit (not a separate invoice FK)."
        self.fields["booking"].widget = LockedDisplayWidget(display=booking_label)

        if editing:
            # Existing invoice: identity FKs are fixed — never a full customer list.
            for name in ("repair_job", "customer", "vehicle"):
                field = self.fields[name]
                field.disabled = True
                field.required = False
                field.widget = LockedDisplayWidget(
                    display=_locked_field_display(self, name, field)
                )
            self.fields["repair_job"].help_text = "Linked work order. Change it from Work Orders if needed."
            self.fields["customer"].help_text = "This invoice’s customer (from the work order)."
            self.fields["vehicle"].help_text = "This invoice’s vehicle (from the work order)."
        else:
            job_attrs = {}
            for item in jobs:
                job_attrs[str(item.id)] = {
                    "data-customer": str(item.customer_id),
                    "data-vehicle": str(item.vehicle_id),
                    "data-customer-label": self._customer_label(item.customer),
                    "data-vehicle-label": self._vehicle_label(item.vehicle),
                    "data-booking-label": self._booking_label(item.booking) if item.booking_id else "—",
                }
            self.fields["repair_job"].widget = LinkedSelect(
                attrs={"class": "cf-input", "data-invoice-source": "1"},
                option_attrs=job_attrs,
            )
            self.fields["repair_job"].widget.choices = self.fields["repair_job"].choices
            for name in ("customer", "vehicle"):
                field = self.fields[name]
                field.disabled = True
                field.widget = LockedDisplayWidget(
                    display=_locked_field_display(self, name, field) or "Select a work order"
                )
                field.widget.attrs["data-invoice-follow"] = name

        self.order_fields(
            [
                "number",
                "repair_job",
                "booking",
                "customer",
                "vehicle",
                "labor_cost",
                "service_cost",
                "parts_cost",
                "discount",
                "tax",
                "status",
            ]
        )
        for field in self.fields.values():
            widgets = [field.widget]
            inner = getattr(field.widget, "widget", None)
            if inner is not None:
                widgets.append(inner)
            for widget in widgets:
                if isinstance(widget, LockedDisplayWidget):
                    continue
                css = widget.attrs.get("class", "cf-input")
                if "cf-input" not in css:
                    widget.attrs["class"] = f"{css} cf-input".strip()

    def _posted_job(self):
        if not self.is_bound:
            return None
        raw = self.data.get("repair_job")
        if not raw:
            return None
        return (
            RepairJob.objects.select_related("customer", "vehicle", "booking__service")
            .filter(pk=raw)
            .first()
        )

    @staticmethod
    def _customer_label(item):
        return f"{item.name} ({item.phone})" if item.phone else item.name

    @staticmethod
    def _vehicle_label(item):
        return f"{item.plate} — {item.brand} {item.model} ({item.year})"

    @staticmethod
    def _job_label(item):
        plate = item.vehicle.plate if item.vehicle_id else "—"
        name = item.customer.name if item.customer_id else "—"
        return f"WO-{item.id:04d} · {plate} · {name}"

    @staticmethod
    def _booking_label(booking):
        if booking is None:
            return "—"
        when = booking.booking_date.isoformat() if booking.booking_date else "—"
        if booking.booking_time:
            when = f"{when} {booking.booking_time.strftime('%H:%M')}"
        service = booking.service.name if booking.service_id else "Visit"
        return f"BK-{booking.id:04d} · {service} · {when}"

    def clean(self):
        cleaned = super().clean()
        job = cleaned.get("repair_job")
        if job is None and self.instance.pk and self.instance.repair_job_id:
            job = self.instance.repair_job
            cleaned["repair_job"] = job
        if job is None:
            self.add_error("repair_job", "Select the work order for this invoice.")
            return cleaned
        try:
            existing = job.invoice
        except Invoice.DoesNotExist:
            existing = None
        if existing is not None and existing.pk != self.instance.pk:
            self.add_error("repair_job", "This work order already has an invoice.")
            return cleaned
        cleaned["customer"] = job.customer
        cleaned["vehicle"] = job.vehicle

        # Paid / partial are not free-pick — only statuses allowed by verified payments.
        status = cleaned.get("status")
        labor = Decimal(cleaned.get("labor_cost") or 0)
        service = Decimal(cleaned.get("service_cost") or 0)
        parts = Decimal(cleaned.get("parts_cost") or 0)
        discount = Decimal(cleaned.get("discount") or 0)
        tax = Decimal(cleaned.get("tax") or 0)
        grand = (labor + service + parts - discount + tax).quantize(Decimal("0.01"))
        paid = (
            verified_payment_total(self.instance)
            if getattr(self.instance, "pk", None)
            else Decimal("0")
        ).quantize(Decimal("0.01"))
        if paid <= 0:
            allowed = {Invoice.Status.UNPAID, Invoice.Status.CANCELLED, Invoice.Status.DRAFT}
        elif paid < grand:
            allowed = {Invoice.Status.PARTIAL, Invoice.Status.CANCELLED}
        else:
            allowed = {Invoice.Status.PAID, Invoice.Status.CANCELLED}
        if status and status not in allowed:
            self.add_error(
                "status",
                (
                    f"Status “{dict(Invoice.Status.choices).get(status, status)}” is not available. "
                    f"Verified payments: ${paid} of ${grand}. Use the Payments page."
                ),
            )
        return cleaned


class PaymentGarageForm(GarageModelForm):
    """Invoice is the parent FK. Customer and vehicle follow the invoice."""

    class Meta:
        model = Payment
        fields = (
            "number",
            "invoice",
            "customer",
            "vehicle",
            "amount",
            "method",
            "paid_at",
            "reference",
            "proof_image",
            "received_by",
            "status",
            "receipt_number",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        editing = bool(self.instance.pk)
        invoices = Invoice.objects.select_related("customer", "vehicle").order_by("-id")

        self.fields["invoice"].queryset = invoices
        self.fields["invoice"].empty_label = "Select invoice"
        self.fields["invoice"].label_from_instance = (
            lambda item: f"{item.number} — {item.customer.name} — {item.vehicle.plate}"
        )
        self.fields["invoice"].help_text = "One payment belongs to one invoice. Customer and vehicle come from it."

        self.fields["customer"].required = False
        self.fields["customer"].label_from_instance = (
            lambda item: f"{item.name} ({item.phone})" if item.phone else item.name
        )
        self.fields["customer"].help_text = "Locked to the invoice customer."
        self.fields["vehicle"].required = False
        self.fields["vehicle"].label_from_instance = (
            lambda item: f"{item.plate} — {item.brand} {item.model} ({item.year})"
        )
        self.fields["vehicle"].help_text = "Locked to the invoice vehicle."

        linked = self._posted_invoice()
        if editing and self.instance.invoice_id and linked is None:
            linked = (
                Invoice.objects.select_related("customer", "vehicle")
                .filter(pk=self.instance.invoice_id)
                .first()
            )
        if linked is not None:
            self.initial["invoice"] = linked.pk
            self.initial["customer"] = linked.customer_id
            self.initial["vehicle"] = linked.vehicle_id
            self.fields["customer"].queryset = Customer.objects.filter(pk=linked.customer_id)
            self.fields["vehicle"].queryset = Vehicle.objects.filter(pk=linked.vehicle_id)
        else:
            self.fields["customer"].queryset = Customer.objects.none()
            self.fields["vehicle"].queryset = Vehicle.objects.none()

        self.fields["proof_image"].help_text = "Cash bill or digital transfer screenshot. Required before Verify."
        self.fields["received_by"].empty_label = "Select staff"
        self.fields["received_by"].help_text = "Staff who received the payment. Required before Verify."
        self.fields["received_by"].label_from_instance = (
            lambda item: item.user.get_full_name() or item.user.username if item.user_id else str(item)
        )
        self.fields["status"].help_text = "Pending until staff verifies. Paid only after Verify."
        self.fields["receipt_number"].required = False
        self.fields["receipt_number"].help_text = "Filled with the payment id (PAY-####) when verified."
        if editing and self.instance.receipt_number:
            self.fields["receipt_number"].disabled = True
            self.fields["receipt_number"].widget = LockedDisplayWidget(
                display=self.instance.receipt_number
            )
        elif editing and self.instance.number:
            self.fields["receipt_number"].widget = LockedDisplayWidget(
                display=self.instance.number + " (on verify)"
            )
            self.fields["receipt_number"].disabled = True

        if editing:
            for name in ("invoice", "customer", "vehicle"):
                field = self.fields[name]
                field.disabled = True
                field.required = False
                field.widget = LockedDisplayWidget(
                    display=_locked_field_display(self, name, field)
                )
            self.fields["invoice"].help_text = "Linked invoice. Customer and vehicle stay with it."
        else:
            invoice_attrs = {
                str(item.id): {
                    "data-customer": str(item.customer_id),
                    "data-vehicle": str(item.vehicle_id),
                    "data-customer-label": (
                        f"{item.customer.name} ({item.customer.phone})"
                        if item.customer.phone
                        else item.customer.name
                    ),
                    "data-vehicle-label": (
                        f"{item.vehicle.plate} — {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})"
                    ),
                }
                for item in invoices
            }
            self.fields["invoice"].widget = LinkedSelect(
                attrs={"class": "cf-input", "data-payment-source": "1"},
                option_attrs=invoice_attrs,
            )
            self.fields["invoice"].widget.choices = self.fields["invoice"].choices
            for name in ("customer", "vehicle"):
                field = self.fields[name]
                field.disabled = True
                field.widget = LockedDisplayWidget(
                    display=_locked_field_display(self, name, field) or "Select an invoice",
                    attrs={"data-payment-follow": name},
                )

        if not editing and not self.initial.get("number"):
            self.fields["number"].initial = next_payment_number()
            self.initial["number"] = self.fields["number"].initial
        if not editing and not self.initial.get("status"):
            self.fields["status"].initial = Payment.Status.PENDING
            self.initial["status"] = Payment.Status.PENDING

        self.order_fields(
            [
                "number",
                "invoice",
                "customer",
                "vehicle",
                "amount",
                "method",
                "paid_at",
                "reference",
                "proof_image",
                "received_by",
                "status",
                "receipt_number",
            ]
        )
        for field in self.fields.values():
            widgets = [field.widget]
            inner = getattr(field.widget, "widget", None)
            if inner is not None:
                widgets.append(inner)
            for widget in widgets:
                if isinstance(widget, LockedDisplayWidget):
                    continue
                css = widget.attrs.get("class", "cf-input")
                if "cf-input" not in css and not isinstance(widget, forms.ClearableFileInput):
                    widget.attrs["class"] = f"{css} cf-input".strip()

    def _posted_invoice(self):
        if not self.is_bound:
            return None
        raw = self.data.get("invoice")
        if not raw:
            return None
        return Invoice.objects.select_related("customer", "vehicle").filter(pk=raw).first()

    def clean(self):
        cleaned = super().clean()
        invoice = cleaned.get("invoice")
        if invoice is None and self.instance.pk and self.instance.invoice_id:
            invoice = self.instance.invoice
            cleaned["invoice"] = invoice
        if invoice is not None:
            cleaned["customer"] = invoice.customer
            cleaned["vehicle"] = invoice.vehicle
            self.instance.customer = invoice.customer
            self.instance.vehicle = invoice.vehicle
        status = cleaned.get("status")
        if status == Payment.Status.PAID and not cleaned.get("received_by"):
            self.add_error("received_by", "Select staff (Received by) before marking Paid.")
        return cleaned


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
        if isinstance(db_field, (ImageField, FileField)):
            field.widget = forms.ClearableFileInput(
                attrs={"class": "cf-file", "accept": "image/jpeg,image/png,image/webp,image/gif"}
            )
            return field
        field.widget.attrs.setdefault("class", "cf-input")
        if isinstance(field.widget, forms.Textarea):
            field.widget.attrs.setdefault("rows", "3")
        if db_field.name == "status" and not isinstance(field.widget, StatusToneSelect):
            choices = list(getattr(field, "choices", None) or [])
            if not choices and getattr(db_field, "choices", None):
                choices = list(db_field.choices)
            if not choices:
                choices = [("ACTIVE", "Active"), ("INACTIVE", "Inactive")]
            tone_map = None
            if getattr(self, "model", None) is PartRequest:
                tone_map = {
                    **StatusToneSelect.TONE,
                    "CONFIRMED": "ready",
                    "NOTED": "pending",
                    "CANCELLED": "cancelled",
                }
            tone = StatusToneSelect(attrs={"class": "cf-input"}, tone_map=tone_map)
            tone.choices = choices
            if field.widget.attrs.get("disabled"):
                tone.attrs["disabled"] = True
            field.widget = tone
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
        fields = ("username", "first_name", "last_name", "email", "phone", "photo", "role", "status", "is_staff", "email_verified")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _bind_role_field(self)
        self.fields["email"].required = True

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
        fields = ("username", "first_name", "last_name", "email", "phone", "photo", "role", "status", "is_staff")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _bind_role_field(self)
        self.fields["email"].required = True

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
        user.email_verified = True
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
            {"fields": ("username", "first_name", "last_name", "email", "phone", "role", "status", "is_staff", "email_verified", "new_password")},
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
                            '<div class="cc-person">{}<div><div class="cc-name">{}</div>{}</div></div>',
                            _avatar_html(_file_url(user.photo), initials),
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
            "photo": _file_url(customer.photo),
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
            RepairJob.Status.QUALITY_CHECK: ("inspection", "QUALITY CHECK"),
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
            "title": _vehicle_title(vehicle),
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
            "photo": _file_url(customer.photo),
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
                    queryset=Booking.objects.select_related("service", "repair_job__inspection__staff__user").order_by(
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
        inspections = list(
            Inspection.objects.filter(repair_job__vehicle=vehicle)
            .select_related("staff__user")
            .order_by("-checked_in_at")
        )
        next_due = "—"
        if vehicle.next_service_date:
            next_due = vehicle.next_service_date.isoformat()
        elif vehicle.next_service_mileage:
            next_due = f"{vehicle.next_service_mileage:,} km"
        return {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "title": _vehicle_title(vehicle),
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
            "image": _file_url(vehicle.image),
            "jobs": [self._job_card(job) for job in vehicle.repair_jobs.all()[:20]],
            "bookings": [self._booking_card(booking) for booking in vehicle.bookings.all()[:20]],
            "invoices": [self._invoice_card(invoice) for invoice in vehicle.invoices.all()[:20]],
            "inspection": self._inspection_card(inspections[0]) if inspections else None,
        }

    def _job_card(self, job):
        status_map = {
            RepairJob.Status.WAITING: ("pending", "WAITING"),
            RepairJob.Status.DIAGNOSING: ("inspection", "INSPECTION"),
            RepairJob.Status.WAITING_APPROVAL: ("assigned", "WAITING APPROVAL"),
            RepairJob.Status.REPAIRING: ("progress", "IN PROGRESS"),
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
            "problem": job.problem or "No problem notes recorded.",
            "tech": str(job.mechanic) if job.mechanic else "Unassigned",
            "progress": job.progress,
            "amount": amount,
            "url": reverse("admin:django_app_repairjob_change", args=[job.id]),
        }

    def _booking_card(self, booking):
        status_class, status_label = booking_badge(booking.status)
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
            Invoice.Status.UNPAID: ("unpaid", "UNPAID"),
            Invoice.Status.PARTIAL: ("pending", "PARTIAL"),
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
        staff = inspection.staff if inspection.staff_id else None
        staff_user = staff.user if staff and staff.user_id else None
        staff_initials = ""
        if staff_user:
            staff_initials = f"{(staff_user.first_name or staff_user.username)[:1]}{(staff_user.last_name or '')[:1]}".upper()
        return {
            "id": inspection.id,
            "url": reverse("admin:django_app_inspection_change", args=[inspection.id]),
            "fuel_value": fuel_value,
            "fuel_pct": fuel_pct,
            "front": front,
            "rear": rear,
            "tread": tread,
            "staff_name": str(staff) if staff else "",
            "staff_photo": _file_url(staff_user.photo) if staff_user and staff_user.photo else "",
            "staff_initials": staff_initials,
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
            "title": _vehicle_title(vehicle),
            "vin": vehicle.vin or "—",
            "owner": vehicle.customer.name,
            "owner_url": owner_url,
            "mileage": f"{vehicle.mileage:,}",
            "status_class": badge_class,
            "status_label": badge_label,
            "next_service": vehicle.next_service_date,
            "color": vehicle.color,
            "image": _file_url(vehicle.image),
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
            RepairJob.Status.QUALITY_CHECK: ("inspection", "QUALITY CHECK"),
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


def booking_badge(status):
    badges = {
        Booking.Status.PENDING: ("pending", "PENDING"),
        Booking.Status.CONFIRMED: ("confirmed", "CONFIRMED"),
        Booking.Status.WAITING: ("waiting", "WAITING"),
        Booking.Status.DIAGNOSING: ("inspection", "INSPECTION"),
        Booking.Status.WAITING_APPROVAL: ("pending", "WAITING APPROVAL"),
        Booking.Status.REPAIRING: ("progress", "REPAIRING"),
        Booking.Status.QUALITY_CHECK: ("inspection", "QUALITY CHECK"),
        Booking.Status.READY_FOR_PICKUP: ("ready", "READY"),
        Booking.Status.CHECKED_IN: ("checked_in", "CHECKED-IN"),
        Booking.Status.IN_SERVICE: ("progress", "IN SERVICE"),
        Booking.Status.COMPLETED: ("completed", "COMPLETED"),
        Booking.Status.CANCELLED: ("cancelled", "CANCELLED"),
    }
    return badges.get(status, ("pending", str(status or "").replace("_", " ").upper()))


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
            .select_related("customer", "vehicle", "service", "repair_job__inspection__staff__user")
            .prefetch_related("part_requests")
        )
        status = request.GET.get("status")
        if status in dict(Booking.Status.choices):
            qs = qs.filter(status=status)
        if request.GET.get("view") == "day":
            day = request.GET.get("date") or str(localdate())
            qs = qs.filter(booking_date=day)
        status_rank = Case(
            *[When(status=code, then=rank) for code, rank in BOOKING_STATUS_ORDER.items()],
            default=50,
            output_field=IntegerField(),
        )
        return qs.annotate(_status_rank=status_rank)

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
            self._apply_status(pk, action, request)
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            url = reverse("admin:django_app_booking_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)

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
        qs = qs.order_by("_status_rank", "booking_date", "booking_time", "id")

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
            self._apply_status(object_id, request.GET.get("action"), request)
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
            if obj.pk:
                job = RepairJob.objects.filter(booking_id=obj.pk).first()
                if job is not None and job.status == RepairJob.Status.WAITING and not job.parts_used.exists() and not Invoice.objects.filter(repair_job=job).exists():
                    job.delete()
        super().save_model(request, obj, form, change)
        if obj.status == Booking.Status.CONFIRMED:
            ensure_confirmed_job(obj)
        sync_vehicle_shop_status(obj.vehicle)

    def _apply_status(self, pk, action, request):
        booking = Booking.objects.filter(pk=pk).first()
        if not booking:
            return
        user = request.user
        if action == "confirm" and booking.status == Booking.Status.PENDING:
            if not booking_can_confirm(booking):
                blocking = booking_blocking_part_requests(booking)
                if blocking.exists():
                    names = ", ".join(row.spare_part.name for row in blocking[:4])
                    more = f" (+{blocking.count() - 4} more)" if blocking.count() > 4 else ""
                    messages.error(
                        request,
                        f"Confirm or cancel every part request before accepting this booking: {names}{more}.",
                    )
                else:
                    messages.error(request, "This booking cannot be confirmed.")
                return
            booking.status = Booking.Status.CONFIRMED
            booking.save(update_fields=["status"])
            ensure_confirmed_job(booking)
        elif action == "checkin" and booking_can_check_in(booking):
            try:
                check_in_booking(booking, user)
            except ValidationError as exc:
                text = " ".join(exc.messages) if getattr(exc, "messages", None) else "This visit could not be checked in."
                messages.error(request, text)
        elif action == "finish" and booking_can_finish(booking):
            try:
                complete_booking(booking)
            except ValidationError as exc:
                text = " ".join(exc.messages) if getattr(exc, "messages", None) else "This visit could not be finished."
                messages.error(request, text)
        elif action == "cancel":
            try:
                cancel_booking(booking, user)
            except ValidationError as exc:
                text = " ".join(exc.messages) if getattr(exc, "messages", None) else "This visit could not be cancelled."
                messages.error(request, text)

    def _profile(self, object_id):
        booking = (
            Booking.objects.filter(pk=object_id)
            .select_related(
                "customer",
                "vehicle",
                "service",
                "cancelled_by",
                "repair_job__invoice",
                "repair_job__inspection__staff__user",
                "repair_job__mechanic__user",
            )
            .prefetch_related("added_services__service", "part_requests__spare_part")
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
        if job is not None:
            try:
                inspection = job.inspection
            except Inspection.DoesNotExist:
                inspection = None
        status_class, status_label = booking_badge(booking.status)
        minutes = booking.service.duration_minutes if booking.service_id else 0
        for extra in booking.added_services.all():
            minutes += extra.service.duration_minutes or 0
        hours = minutes / 60 if minutes else 0
        hours_label = f"{int(hours)} hrs" if hours == int(hours) else f"{hours:g} hrs"
        service_rows = []
        if booking.service_id:
            service_rows.append({"name": booking.service.name, "price": booking.service.price})
        for extra in booking.added_services.all():
            service_rows.append({"name": extra.service.name, "price": extra.price})
        service_total = sum((row["price"] or 0) for row in service_rows)
        part_rows = [
            {"number": item.number or f"PR-{item.id:04d}", "name": item.spare_part.name, "status": item.get_status_display()}
            for item in booking.part_requests.all()
        ]
        mechanic = "Unassigned"
        if job is not None and job.mechanic_id:
            mechanic = str(job.mechanic)
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
            "service": ", ".join(row["name"] for row in service_rows) or "—",
            "service_price": service_total,
            "service_rows": service_rows,
            "part_rows": part_rows,
            "mechanic": mechanic,
            "duration": hours_label if minutes else "—",
            "date": booking.booking_date,
            "time": booking.booking_time.strftime("%H:%M") if booking.booking_time else "—",
            "problem": booking.problem,
            "note": booking.note,
            "created": booking.created_at,
            "staff": str(inspection.staff) if inspection and inspection.staff_id else "—",
            "staff_photo": _file_url(inspection.staff.user.photo)
            if inspection and inspection.staff_id and inspection.staff.user_id and inspection.staff.user.photo
            else "",
            "cancel_reason": booking.cancel_reason,
            "cancelled_at": booking.cancelled_at,
            "cancelled_by": str(booking.cancelled_by) if booking.cancelled_by_id else "",
            "is_cancelled": booking.status == Booking.Status.CANCELLED,
            "can_confirm": booking_can_confirm(booking),
            "parts_pending": booking_blocking_part_requests(booking).exists(),
            "can_checkin": booking_can_check_in(booking),
            "can_finish": booking_can_finish(booking),
            "can_cancel": booking_can_cancel(booking),
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
            inspection = booking.repair_job.inspection
            if inspection.staff_id:
                receptionist = str(inspection.staff)
        except (RepairJob.DoesNotExist, Inspection.DoesNotExist):
            receptionist = ""
        view_url = reverse("admin:django_app_booking_change", args=[booking.id])
        parts_pending = booking_blocking_part_requests(booking).exists()
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
            "status_label": booking_badge(booking.status)[1],
            "status_class": booking_badge(booking.status)[0],
            "view_url": view_url,
            "edit_url": f"{view_url}?edit=1",
            "delete_url": reverse("admin:django_app_booking_delete", args=[booking.id]),
            **_delete_icon_flags(booking),
            "can_confirm": booking_can_confirm(booking),
            "parts_pending": parts_pending,
            "parts_pending_label": "Confirm or cancel part requests first" if parts_pending else "",
            "can_checkin": booking_can_check_in(booking),
            "can_finish": booking_can_finish(booking),
            "can_cancel": booking_can_cancel(booking),
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


def _file_url(field):
    """Safe URL for ImageField / FileField values."""
    if not field:
        return ""
    try:
        return field.url
    except (ValueError, AttributeError):
        return str(field) if field else ""


def _avatar_html(photo_url, initials):
    if photo_url:
        return format_html('<img class="cc-avatar-round" src="{}" alt="">', photo_url)
    return format_html('<span class="cc-avatar cc-avatar-round">{}</span>', initials)


def _badge(kind, label):
    return format_html('<span class="cc-status {}">{}</span>', kind, label)


def _actions(view_url, delete_url=None, obj=None, extra_blocked=False, edit_url=None):
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
        '<a href="{edit}" title="Edit"><span class="material-symbols-outlined">edit</span></a>'
        + _delete_icon_html(delete_url, state)
        + "</span>"
    )
    return format_html(html, view=view_url, edit=edit_url or view_url, delete=delete_url or view_url)


def _pair(title, subtitle=""):
    if subtitle:
        return format_html('<div class="cc-name">{}</div><div class="cc-id">{}</div>', title, subtitle)
    return format_html('<div class="cc-name">{}</div>', title)


def _code(prefix, pk):
    return f"{prefix}-{int(pk):04d}"


def _money(value):
    amount = Decimal(value or 0)
    return f"${amount:,.2f}"


def _qty_label(value):
    if value is None:
        return "—"
    quantized = Decimal(value).quantize(Decimal("0.01"))
    if quantized == quantized.to_integral():
        return str(int(quantized))
    return format(quantized.normalize(), "f").rstrip("0").rstrip(".")


def _id_html(prefix, pk):
    return format_html('<div class="cc-id">ID: #{}</div>', _code(prefix, pk))


def _id_link(prefix, pk, url):
    return format_html('<a class="wo-num" href="{}">#{}</a>', url, _code(prefix, pk))


PAGE_QUERY_KEYS = (
    "stock",
    "category",
    "status",
    "fulfillment",
    "role",
    "method",
    "export",
    "action",
    "pk",
    "mechanic",
    "staff",
    "view",
    "date",
)


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
                            '<div class="cc-person">{}<div><div class="cc-name">{}</div>{}{}</div></div>',
                            _avatar_html(_file_url(user.photo), initials),
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
    list_display = ("id", "repair_job", "status", "mileage", "staff", "checked_in_at")
    modal_title_add = "Add Inspection"
    modal_title_edit = "Edit Inspection"
    modal_subtitle = "Check the car, then optionally recommend extra services and parts for the quote."
    modal_save_add = "Save Inspection"
    STATUS_BADGE = {
        Inspection.Status.PENDING: "pending",
        Inspection.Status.CHECK_IN: "progress",
        Inspection.Status.COMPLETED: "completed",
    }

    def get_urls(self):
        info = self.model._meta.app_label, self.model._meta.model_name
        custom = [
            path(
                "<path:object_id>/delete-image/<int:image_id>/",
                self.admin_site.admin_view(self.delete_inspection_image),
                name="%s_%s_delete_image" % info,
            ),
        ]
        return custom + super().get_urls()

    def delete_inspection_image(self, request, object_id, image_id):
        if request.method != "POST":
            return HttpResponseForbidden("POST required")
        inspection = get_object_or_404(Inspection, pk=unquote(object_id))
        if not self.has_change_permission(request, inspection):
            return HttpResponseForbidden("Not allowed")
        shot = get_object_or_404(InspectionImage, pk=image_id, inspection=inspection)
        image_name = shot.image.name if shot.image else ""
        shot.image.delete(save=False)
        shot.delete()
        return JsonResponse({"ok": True, "id": image_id, "removed": image_name})

    def save_model(self, request, obj, form, change):
        # Admin always calls form.save(commit=False); append new photos (never wipe old).
        super().save_model(request, obj, form, change)
        for uploaded in form.cleaned_data.get("images") or []:
            InspectionImage.objects.create(inspection=obj, image=uploaded)
        # Recommendations must run here — form.save(commit=True) is never used by ModelAdmin.
        if hasattr(form, "_persist_recommendations"):
            try:
                form._persist_recommendations(obj)
            except forms.ValidationError as exc:
                messages.error(request, "; ".join(exc.messages) if hasattr(exc, "messages") else str(exc))
            except ValidationError as exc:
                messages.error(
                    request,
                    "; ".join(exc.messages) if getattr(exc, "messages", None) else str(exc),
                )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("repair_job__customer", "repair_job__vehicle", "staff__user")
            .prefetch_related("images", "recommendations")
        )

    def changelist_view(self, request, extra_context=None):
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action and pk:
            if action == "advance":
                self._advance(request, pk)
            elif action == "assign":
                self._assign_inspector(request, pk, request.GET.get("staff"))
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            params.pop("staff", None)
            url = reverse("admin:django_app_inspection_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)
        return super().changelist_view(request, extra_context=extra_context)

    def _assign_inspector(self, request, pk, staff_id):
        item = Inspection.objects.filter(pk=pk).first()
        if item is None:
            return
        if item.staff_id:
            return
        if item.status == Inspection.Status.COMPLETED:
            messages.error(request, "This inspection is already completed.")
            return
        staff = Staff.objects.filter(pk=staff_id, status=Staff.Status.ACTIVE).select_related("user").first()
        if staff is None:
            messages.error(request, "Choose an available inspector.")
            return
        item.staff = staff
        item.status = Inspection.Status.CHECK_IN
        item.save(update_fields=["staff", "status"])

    def _advance(self, request, pk):
        item = (
            Inspection.objects.filter(pk=pk)
            .select_related("staff")
            .prefetch_related("images")
            .first()
        )
        if item is None:
            return
        if not item.staff_id:
            messages.error(request, "Select the inspector before completing this inspection.")
            return
        if item.status == Inspection.Status.COMPLETED:
            return
        missing = inspection_missing_fields(item)
        if missing:
            messages.error(
                request,
                f"Fill every inspection field before Completed: {', '.join(missing)}.",
            )
            return
        item.status = Inspection.Status.COMPLETED
        item.save(update_fields=["status"])

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(repair_job__customer__name__icontains=query)
                | Q(repair_job__vehicle__plate__icontains=query)
                | Q(repair_job__problem__icontains=query)
                | Q(note__icontains=query)
            )
        inspectors = list(
            Staff.objects.filter(status=Staff.Status.ACTIVE)
            .select_related("user")
            .order_by("user__first_name", "user__username")
        )
        inspector_choices = [{"id": row.id, "label": str(row)} for row in inspectors]
        cards = []
        for item in qs.order_by("-checked_in_at"):
            job = item.repair_job
            staff_user = item.staff.user if item.staff_id and item.staff.user_id else None
            if staff_user:
                initials = f"{(staff_user.first_name or staff_user.username)[:1]}{(staff_user.last_name or '')[:1]}".upper()
                photo = _file_url(staff_user.photo)
            else:
                initials = f"IN-{item.id:02d}"
                photo = ""
            next_label = ""
            next_url = ""
            next_note = ""
            next_class = ""
            needs_inspector = not item.staff_id and item.status != Inspection.Status.COMPLETED
            # Badge: Pending until an inspector is assigned, then Check-in, then Completed.
            if item.status == Inspection.Status.COMPLETED:
                display_status = Inspection.Status.COMPLETED
            elif item.staff_id:
                display_status = Inspection.Status.CHECK_IN
            else:
                display_status = Inspection.Status.PENDING
            fields_ready = inspection_fields_filled(item) if item.staff_id else False
            if needs_inspector:
                next_note = "Select the inspector first"
            elif item.staff_id and item.status != Inspection.Status.COMPLETED and fields_ready:
                from urllib.parse import urlencode

                next_label = "Completed"
                next_class = "completed"
                params = {"action": "advance", "pk": item.id}
                if query:
                    params["q"] = query
                next_url = f"{reverse('admin:django_app_inspection_changelist')}?{urlencode(params)}"
            elif item.staff_id and item.status != Inspection.Status.COMPLETED:
                next_note = "Fill all inspection fields first"
            note = job.problem or item.condition or item.note or ""
            cards.append(
                {
                    "initials": initials,
                    "photo": photo,
                    "title": f"WO-{job.id:04d}",
                    "record_id": f"ID: #{_code('INSP', item.id)}",
                    "kicker": f"{job.vehicle.plate} · {job.customer.name}",
                    "status_class": self.STATUS_BADGE.get(display_status, "pending"),
                    "status_label": dict(Inspection.Status.choices).get(display_status, display_status).upper(),
                    "lines": [
                        f"Mileage: {item.mileage:,} km · Fuel: {item.get_fuel_level_display() or '—'}",
                    ],
                    "inspector_name": str(item.staff) if item.staff_id else "",
                    "needs_inspector": needs_inspector,
                    "inspector_choices": inspector_choices,
                    "assign_pk": item.id,
                    "note": note,
                    "footer": item.checked_in_at.strftime("%Y-%m-%d %H:%M") if item.checked_in_at else "",
                    "view_url": reverse("admin:django_app_inspection_change", args=[item.id]),
                    "next_url": next_url,
                    "next_label": next_label,
                    "next_class": next_class,
                    "next_note": next_note,
                    "delete_url": reverse("admin:django_app_inspection_delete", args=[item.id]),
                    **_delete_icon_flags(item),
                }
            )
        return {
            "title": "Inspections",
            "subtitle": "Assign an inspector (Check-in), finish the check (Completed), then the work order can wait for approval.",
            "count": Inspection.objects.count(),
            "count_label": "Inspections",
            "model": "inspection",
            "add_url": reverse("admin:django_app_inspection_add"),
            "add_label": "Add Inspection",
            "search_placeholder": "Search by work order, plate, or problem...",
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
                    "photo": _file_url(user.photo),
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
    modal_subtitle = "Choose the customer, then their vehicle, then the visit. The visit fills the locked fields."
    modal_save_add = "Create Work Order"

    def get_changelist(self, request, **kwargs):
        return CarsvChangeList

    STATUS_BADGE = {
        RepairJob.Status.WAITING: "waiting",
        RepairJob.Status.DIAGNOSING: "progress",
        RepairJob.Status.WAITING_APPROVAL: "pending",
        RepairJob.Status.REPAIRING: "progress",
        RepairJob.Status.QUALITY_CHECK: "inspection",
        RepairJob.Status.READY_FOR_PICKUP: "ready",
        RepairJob.Status.COMPLETED: "completed",
        RepairJob.Status.CANCELLED: "cancelled",
    }

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        sync_booking_from_job(obj)

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
            .select_related("customer", "vehicle", "mechanic__user", "booking__customer", "booking__vehicle", "booking__service", "invoice", "inspection")
            .prefetch_related("booking__added_services__service")
        )
        if staff_role(request.user) == User.Role.MECHANIC:
            qs = qs.filter(mechanic__user=request.user)
        status = request.GET.get("status")
        if status in dict(RepairJob.Status.choices):
            qs = qs.filter(status=status)
        return qs

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action and pk:
            if action == "advance":
                self._advance(request, pk)
            elif action == "assign":
                self._assign_technician(request, pk, request.GET.get("mechanic"))
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            params.pop("mechanic", None)
            url = reverse("admin:django_app_repairjob_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)
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

        technicians = list(
            Mechanic.objects.filter(status=Mechanic.Status.ACTIVE, available=True)
            .select_related("user")
            .order_by("user__first_name", "user__username")
        )
        rows = [self._row(job) for job in qs]

        extra_context.update(
            {
                "workorder_rows": rows,
                "order_count": RepairJob.objects.count(),
                "search_query": query,
                "status_filter": request.GET.get("status") or "ALL",
                "technician_choices": [{"id": tech.id, "label": str(tech)} for tech in technicians],
            }
        )
        return super().changelist_view(request, extra_context=extra_context)

    def _assign_technician(self, request, pk, mechanic_id):
        job = RepairJob.objects.filter(pk=pk).first()
        if job is None:
            return
        if job.mechanic_id:
            messages.info(request, "This work order already has a technician.")
            return
        if job.status in (RepairJob.Status.COMPLETED, RepairJob.Status.CANCELLED):
            messages.error(request, "This work order is closed.")
            return
        mechanic = (
            Mechanic.objects.filter(pk=mechanic_id, status=Mechanic.Status.ACTIVE, available=True)
            .select_related("user")
            .first()
        )
        if mechanic is None:
            messages.error(request, "Choose an available technician.")
            return
        if (
            job.start_date
            and RepairJob.objects.filter(mechanic=mechanic, start_date=job.start_date)
            .exclude(status=RepairJob.Status.COMPLETED)
            .exclude(pk=job.pk)
            .exists()
        ):
            messages.error(request, "This technician already has a job on that date.")
            return
        job.mechanic = mechanic
        job.save(update_fields=["mechanic"])

    def _advance(self, request, pk):
        job = RepairJob.objects.filter(pk=pk).select_related("inspection", "mechanic").first()
        if job is None:
            return
        nxt = next_job_status(job.status)
        if not nxt:
            return
        reason = job_advance_block_reason(job, nxt)
        if reason:
            messages.error(request, reason)
            return
        job.status = nxt
        job.save(update_fields=["status"])

    def _row(self, job):
        booking = job.booking if job.booking_id else None
        vehicle = booking.vehicle if booking is not None else job.vehicle
        customer = booking.customer if booking is not None else job.customer
        services = []
        if booking is not None and booking.service_id:
            services.append(booking.service.name)
            services.extend(extra.service.name for extra in booking.added_services.all())
        problem = ""
        when = ""
        if booking is not None:
            problem = booking.problem or (booking.service.name if booking.service_id else "")
            when = booking.booking_date.isoformat()
            if booking.booking_time:
                when = f"{when} {booking.booking_time.strftime('%H:%M')}"
        else:
            problem = job.problem
            when = job.start_date.isoformat() if job.start_date else ""
        nxt = next_job_status(job.status)
        next_label = ""
        inspection_note = ""
        needs_tech = not job.mechanic_id and job.status not in (
            RepairJob.Status.COMPLETED,
            RepairJob.Status.CANCELLED,
        )
        block = job_advance_block_reason(job, nxt) if nxt else ""
        if needs_tech:
            inspection_note = "Assign a technician first"
        elif nxt and not block:
            next_label = dict(RepairJob.Status.choices).get(nxt, "")
        elif block:
            inspection_note = block
        return {
            "id": job.id,
            "number": f"WO-{job.id:04d}",
            "when": when,
            "customer": customer.name,
            "problem": problem,
            "vehicle": f"{vehicle.brand} {vehicle.model} ({vehicle.year})",
            "plate": vehicle.plate,
            "tech": str(job.mechanic) if job.mechanic_id else "Unassigned",
            "needs_tech": needs_tech,
            "service": ", ".join(services) or "—",
            "status_class": self.STATUS_BADGE.get(job.status, "pending"),
            "status_label": job.get_status_display(),
            "progress": job.progress,
            "next_status": nxt or "",
            "next_label": next_label,
            "next_class": self.STATUS_BADGE.get(nxt, "") if next_label else "",
            "inspection_note": inspection_note,
            "cost": visit_service_total(booking) if booking is not None else None,
            "view_url": reverse("admin:django_app_repairjob_change", args=[job.id]),
            "delete_url": reverse("admin:django_app_repairjob_delete", args=[job.id]),
            **_delete_icon_flags(job),
        }

    def _export_csv(self, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="work-orders.csv"'
        writer = csv.writer(response)
        writer.writerow(["WO", "Visit", "Customer", "Vehicle", "Plate", "Technician", "Service", "Status", "Problem"])
        for job in queryset:
            row = self._row(job)
            writer.writerow(
                [
                    row["number"],
                    row["when"],
                    row["customer"],
                    row["vehicle"],
                    row["plate"],
                    row["tech"],
                    row["service"],
                    row["status_label"],
                    row["problem"],
                ]
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
    change_form_template = "admin/django_app/sparepart_change_form.html"
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

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        is_add = object_id is None
        editing = is_add or request.method == "POST" or request.GET.get("edit") == "1"
        extra_context.update(
            {
                "part_editing": editing,
                "part_is_add": is_add,
                "list_url": reverse("admin:django_app_sparepart_changelist"),
            }
        )
        if object_id:
            extra_context["profile"] = self._profile(object_id)
            extra_context["edit_url"] = reverse("admin:django_app_sparepart_change", args=[object_id]) + "?edit=1"
            extra_context["view_url"] = reverse("admin:django_app_sparepart_change", args=[object_id])
            restock_params = request.GET.copy()
            restock_params["action"] = "restock"
            restock_params["pk"] = str(object_id)
            extra_context["restock_url"] = (
                reverse("admin:django_app_sparepart_changelist") + "?" + restock_params.urlencode()
            )
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:django_app_sparepart_change", obj.pk)

    def response_change(self, request, obj):
        return redirect("admin:django_app_sparepart_change", obj.pk)

    def _profile(self, object_id):
        part = (
            SparePart.objects.filter(pk=object_id)
            .select_related("category")
            .annotate(usage_count=Count("usages", distinct=True))
            .first()
        )
        if not part:
            return None
        is_low = part.quantity <= part.min_stock
        stock_value = (part.unit_price or Decimal("0")) * Decimal(part.quantity or 0)
        usages = []
        for usage in (
            PartsUsage.objects.filter(spare_part=part)
            .select_related("repair_job")
            .order_by("-used_at", "-id")[:20]
        ):
            job = usage.repair_job
            usages.append(
                {
                    "job_id": job.id,
                    "job_label": f"WO-{job.id:04d}",
                    "quantity": usage.quantity,
                    "total": usage.total,
                    "when": usage.used_at.strftime("%Y-%m-%d %H:%M") if usage.used_at else "—",
                }
            )
        return {
            "id": part.id,
            "code": _code("PRT", part.id),
            "name": part.name,
            "part_number": part.part_number,
            "category": part.category.name if part.category_id else "—",
            "brand": part.brand,
            "image": _file_url(part.image),
            "unit_price": part.unit_price,
            "quantity": part.quantity,
            "min_stock": part.min_stock,
            "stock_value": stock_value,
            "status": part.status,
            "status_label": part.get_status_display(),
            "is_low": is_low,
            "usage_count": part.usage_count,
            "usages": usages,
        }

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
            view_url = reverse("admin:django_app_sparepart_change", args=[part.id])
            restock = format_html(
                '<span class="inv-actions"><a class="wo-open" href="?{}" title="Restock +10">+10</a>{}</span>',
                restock_params.urlencode(),
                _actions(
                    view_url,
                    reverse("admin:django_app_sparepart_delete", args=[part.id]),
                    obj=part,
                    edit_url=f"{view_url}?edit=1",
                ),
            )
            rows.append(
                {
                    "off": part.status != SparePart.Status.ACTIVE,
                    "cells": [
                        _id_link("PRT", part.id, view_url),
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
        writer.writerow(["SKU", "Name", "Category", "Brand", "Quantity", "Min stock", "Unit price", "Status", "Image"])
        for part in queryset:
            writer.writerow(
                [
                    part.part_number,
                    part.name,
                    part.category.name,
                    part.brand,
                    part.quantity,
                    part.min_stock,
                    part.unit_price,
                    part.status,
                    _file_url(part.image),
                ]
            )
        return response


@admin.register(PartRequest)
class PartRequestAdmin(CarsvPageAdmin):
    form = PartRequestGarageForm
    list_display = ("number", "booking", "customer", "vehicle", "spare_part", "fulfillment", "status", "repair_job", "created_at")
    search_fields = (
        "number",
        "customer__name",
        "vehicle__plate",
        "spare_part__name",
        "spare_part__part_number",
        "notes",
        "booking__id",
        "repair_job__id",
    )
    modal_title_add = "Add Part Request"
    modal_title_edit = "Edit Part Request"
    modal_subtitle = (
        "Workshop install links to a booking (visit quote); the work order follows that booking. "
        "Advance Pending → Noted → Confirmed to issue the part."
    )
    modal_save_add = "Save Request"
    modal_save_edit = "Save Request"
    STATUS_BADGE = {
        PartRequest.Status.PENDING: "waiting",
        PartRequest.Status.NOTED: "pending",
        PartRequest.Status.CONFIRMED: "ready",
        PartRequest.Status.CANCELLED: "cancelled",
    }
    NEXT_BUTTON_LABEL = {
        PartRequest.Status.NOTED: "Noted",
        PartRequest.Status.CONFIRMED: "Confirm",
    }

    def changelist_view(self, request, extra_context=None):
        if request.GET.get("action") == "advance" and request.GET.get("pk"):
            self._advance(request, request.GET.get("pk"))
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            url = reverse("admin:django_app_partrequest_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)
        return super().changelist_view(request, extra_context=extra_context)

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        if object_id and request.GET.get("cancel") == "1":
            extra_context.update(
                {
                    "modal_title": "Cancel Part Request",
                    "modal_subtitle": "Say why this part is not available (for example out of stock).",
                    "modal_save": "Cancel Request",
                }
            )
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        if request.GET.get("cancel") == "1":
            initial["status"] = PartRequest.Status.CANCELLED
        fulfillment = request.GET.get("fulfillment")
        if fulfillment in dict(PartRequest.Fulfillment.choices):
            initial["fulfillment"] = fulfillment
        booking_id = request.GET.get("booking")
        if booking_id and booking_id.isdigit():
            initial["booking"] = int(booking_id)
        return initial

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super().get_form(request, obj=obj, change=change, **kwargs)
        if request.GET.get("cancel") == "1" and obj is not None and not obj.parts_usage_id:

            class CancelPartRequestForm(form):
                def __init__(self, *args, **inner_kwargs):
                    super().__init__(*args, **inner_kwargs)
                    if not self.is_bound:
                        self.instance.status = PartRequest.Status.CANCELLED
                        self.initial["status"] = PartRequest.Status.CANCELLED
                        self.fields["status"].initial = PartRequest.Status.CANCELLED

            return CancelPartRequestForm
        return form

    def _advance(self, request, pk):
        item = PartRequest.objects.filter(pk=pk).select_related("spare_part").first()
        if item is None:
            return
        try:
            advance_part_request(item, user=request.user)
        except ValidationError as exc:
            messages.error(request, self._validation_text(exc) or "Could not update this part request.")

    def _validation_text(self, exc):
        if hasattr(exc, "message_dict"):
            return " ".join(error for errors in exc.message_dict.values() for error in errors)
        if getattr(exc, "messages", None):
            return " ".join(exc.messages)
        return str(exc)

    def save_model(self, request, obj, form, change):
        previous_status = PartRequest.Status.PENDING
        if change and obj.pk:
            previous_status = (
                PartRequest.objects.filter(pk=obj.pk).values_list("status", flat=True).first() or previous_status
            )
        if obj.status == PartRequest.Status.CANCELLED and previous_status != PartRequest.Status.CANCELLED:
            reason = ((form.cleaned_data.get("cancel_reason") if form else "") or obj.cancel_reason or "").strip()
            try:
                if change and obj.pk:
                    # Keep other field edits, then mark cancelled with reason + notify.
                    obj.status = previous_status
                    super().save_model(request, obj, form, change)
                    cancel_part_request(obj, reason=reason, user=request.user)
                else:
                    obj.cancel_reason = reason
                    super().save_model(request, obj, form, change)
                    cancel_part_request(obj, reason=reason, user=request.user)
            except ValidationError as exc:
                messages.error(request, self._validation_text(exc) or "Could not cancel this request.")
                if obj.pk:
                    PartRequest.objects.filter(pk=obj.pk).update(status=previous_status)
                    obj.status = previous_status
            return
        super().save_model(request, obj, form, change)
        if obj.status != PartRequest.Status.CONFIRMED or obj.parts_usage_id:
            return
        try:
            confirm_part_request(obj, user=request.user)
        except ValidationError as exc:
            PartRequest.objects.filter(pk=obj.pk).update(status=previous_status)
            obj.status = previous_status
            messages.error(request, self._validation_text(exc) or "Could not confirm this request.")

    def get_queryset(self, request):
        qs = (
            super()
            .get_queryset(request)
            .select_related(
                "customer",
                "vehicle",
                "spare_part",
                "booking__service",
                "repair_job__invoice",
            )
        )
        status = request.GET.get("status")
        if status in dict(PartRequest.Status.choices):
            qs = qs.filter(status=status)
        fulfillment = request.GET.get("fulfillment")
        if fulfillment in dict(PartRequest.Fulfillment.choices):
            qs = qs.filter(fulfillment=fulfillment)
        return qs

    def _row_actions(self, item, query, status_filter, fulfillment_filter):
        from urllib.parse import urlencode

        change_url = reverse("admin:django_app_partrequest_change", args=[item.id])
        delete_url = reverse("admin:django_app_partrequest_delete", args=[item.id])
        nxt = next_part_request_status(item.status)
        pieces = ['<span class="wo-actions">']
        args = []
        if nxt and not item.parts_usage_id:
            params = {"action": "advance", "pk": item.id}
            if query:
                params["q"] = query
            if status_filter:
                params["status"] = status_filter
            if fulfillment_filter:
                params["fulfillment"] = fulfillment_filter
            label = self.NEXT_BUTTON_LABEL.get(nxt, dict(PartRequest.Status.choices).get(nxt, nxt))
            pieces.append('<a class="ap-btn tone-{}" href="{}?{}">{}</a>')
            args.extend(
                [
                    self.STATUS_BADGE.get(nxt, "pending"),
                    reverse("admin:django_app_partrequest_changelist"),
                    urlencode(params),
                    label,
                ]
            )
        if item.status != PartRequest.Status.CANCELLED and not item.parts_usage_id:
            pieces.append('<a class="ap-btn cancel" href="{}?cancel=1">Cancel</a>')
            args.append(change_url)
        pieces.append("{}</span>")
        args.append(_actions(change_url, delete_url, obj=item))
        return format_html("".join(pieces), *args)

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(number__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(vehicle__plate__icontains=query)
                | Q(vehicle__brand__icontains=query)
                | Q(vehicle__model__icontains=query)
                | Q(spare_part__name__icontains=query)
                | Q(spare_part__part_number__icontains=query)
                | Q(notes__icontains=query)
                | Q(cancel_reason__icontains=query)
                | Q(booking__id__icontains=query)
                | Q(repair_job__id__icontains=query)
            )
        status_filter = request.GET.get("status") or ""
        fulfillment_filter = request.GET.get("fulfillment") or ""
        rows = []
        for item in qs.order_by("-created_at", "-id"):
            if item.booking_id:
                bk_url = reverse("admin:django_app_booking_change", args=[item.booking_id])
                service = item.booking.service.name if item.booking.service_id else "Visit"
                booking_cell = format_html(
                    '<a class="wo-num" href="{}">{}</a><div class="cc-email">{}</div>',
                    bk_url,
                    f"BK-{item.booking_id:04d}",
                    service,
                )
            else:
                booking_cell = "—"
            if item.vehicle_id:
                vehicle_cell = _pair(f"{item.vehicle.brand} {item.vehicle.model}", item.vehicle.plate)
            else:
                vehicle_cell = "—"
            if item.repair_job_id:
                wo_url = reverse("admin:django_app_repairjob_change", args=[item.repair_job_id])
                wo_label = f"WO-{item.repair_job_id:04d}"
                invoice = None
                try:
                    invoice = item.repair_job.invoice
                except Invoice.DoesNotExist:
                    invoice = None
                if invoice is not None:
                    inv_url = reverse("admin:django_app_invoice_change", args=[invoice.id])
                    job_cell = format_html(
                        '<a class="wo-num" href="{}">{}</a><div class="cc-email"><a href="{}">{}</a></div>',
                        wo_url,
                        wo_label,
                        inv_url,
                        invoice.number,
                    )
                else:
                    job_cell = format_html('<a class="wo-num" href="{}">{}</a>', wo_url, wo_label)
            else:
                job_cell = "—"
            change_url = reverse("admin:django_app_partrequest_change", args=[item.id])
            status_cell = _badge(self.STATUS_BADGE.get(item.status, "pending"), item.get_status_display())
            if item.status == PartRequest.Status.CANCELLED and item.cancel_reason:
                status_cell = format_html("{}{}", status_cell, _pair("", item.cancel_reason))
            rows.append(
                {
                    "cells": [
                        format_html('<a class="wo-num" href="{}">{}</a>', change_url, item.number),
                        booking_cell,
                        item.customer.name,
                        vehicle_cell,
                        _pair(item.spare_part.name, item.spare_part.part_number),
                        item.get_fulfillment_display(),
                        status_cell,
                        job_cell,
                        localdate(item.created_at).strftime("%b %d, %Y") if item.created_at else "—",
                        self._row_actions(item, query, status_filter, fulfillment_filter),
                    ]
                }
            )
        return {
            "title": "Part Requests",
            "subtitle": (
                "Workshop install parts belong on a booking (visit quote); the work order follows that booking. "
                "Use Noted / Confirm to issue. Cancel when the part is not available."
            ),
            "count": PartRequest.objects.count(),
            "count_label": "Requests",
            "model": "partrequest",
            "add_url": reverse("admin:django_app_partrequest_add"),
            "add_label": "Add Request",
            "extra_link": {"url": reverse("admin:django_app_sparepart_changelist"), "label": "Parts inventory"},
            "search_placeholder": "Search by request, booking, customer, plate, or part...",
            "search_query": query,
            "filters": [
                {
                    "name": "status",
                    "value": status_filter,
                    "options": [{"value": "", "label": "All statuses"}]
                    + [{"value": value, "label": label} for value, label in PartRequest.Status.choices],
                },
                {
                    "name": "fulfillment",
                    "value": fulfillment_filter,
                    "options": [{"value": "", "label": "All fulfillments"}]
                    + [{"value": value, "label": label} for value, label in PartRequest.Fulfillment.choices],
                },
            ],
            "columns": [
                "Request",
                "Booking",
                "Customer",
                "Vehicle",
                "Part",
                "Fulfillment",
                "Status",
                "Work order",
                "Requested",
                "Actions",
            ],
            "rows": rows,
            "empty": "No part requests match this search.",
        }


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
    change_form_template = "admin/django_app/invoice_change_form.html"
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

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        is_add = object_id is None
        editing = is_add or request.method == "POST" or request.GET.get("edit") == "1"
        extra_context.update(
            {
                "invoice_editing": editing,
                "invoice_is_add": is_add,
                "list_url": reverse("admin:django_app_invoice_changelist"),
                "page": self._backdrop_page(request),
            }
        )
        if object_id:
            extra_context["sheet"] = self._sheet(object_id)
            extra_context["edit_url"] = reverse("admin:django_app_invoice_change", args=[object_id]) + "?edit=1"
            extra_context["view_url"] = reverse("admin:django_app_invoice_change", args=[object_id])
        return super().changeform_view(request, object_id, form_url, extra_context=extra_context)

    def response_add(self, request, obj, post_url_continue=None):
        return redirect("admin:django_app_invoice_change", obj.pk)

    def response_change(self, request, obj):
        return redirect("admin:django_app_invoice_change", obj.pk)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Paid / unpaid / partial always follow verified payment totals.
        if obj.status != Invoice.Status.CANCELLED:
            refresh_invoice_status(obj)

    def _backdrop_page(self, request):
        page = self.prepare_page(request)
        page["form_action"] = reverse("admin:django_app_invoice_changelist")
        return page

    def _sheet(self, object_id):
        invoice = (
            Invoice.objects.filter(pk=object_id)
            .select_related(
                "customer",
                "vehicle",
                "repair_job__booking__service",
                "repair_job__mechanic__user",
            )
            .prefetch_related("payments", "repair_job__parts_used__spare_part")
            .first()
        )
        if not invoice:
            return None
        job = invoice.repair_job
        booking = getattr(job, "booking", None)
        service = getattr(booking, "service", None) if booking else None
        vehicle = invoice.vehicle
        customer = invoice.customer
        mechanic = ""
        if job and job.mechanic_id and job.mechanic.user_id:
            mechanic = job.mechanic.user.get_full_name() or job.mechanic.user.username
        hours = None
        if service and service.duration_minutes:
            hours = Decimal(service.duration_minutes) / Decimal("60")
        labor_rows = []
        if invoice.labor_cost:
            qty = hours if hours else Decimal("1")
            rate = (invoice.labor_cost / qty) if qty else invoice.labor_cost
            labor_rows.append(
                {
                    "desc": f"{service.name} (booked labor)" if service else "Labor",
                    "qty": _qty_label(qty),
                    "rate": _money(rate),
                    "total": _money(invoice.labor_cost),
                }
            )
        if invoice.service_cost:
            labor_rows.append(
                {
                    "desc": service.name if service else "Service",
                    "qty": "1",
                    "rate": _money(invoice.service_cost),
                    "total": _money(invoice.service_cost),
                }
            )
        part_rows = []
        has_extra_parts = False
        booked_on = getattr(booking, "booking_date", None)
        if job:
            from django_app.models import sync_invoice_costs, visit_open_part_requests

            sync_invoice_costs(job)
            invoice.refresh_from_db()
            for usage in job.parts_used.all():
                used_day = usage.used_at.date() if usage.used_at else None
                extra = bool(booked_on and used_day and used_day > booked_on)
                if extra:
                    has_extra_parts = True
                part_rows.append(
                    {
                        "name": usage.spare_part.name,
                        "sku": usage.spare_part.part_number,
                        "when": usage.used_at.strftime("%Y-%m-%d") if usage.used_at else "—",
                        "extra": extra,
                        "qty": usage.quantity,
                        "unit": _money(usage.unit_price),
                        "total": _money(usage.total),
                    }
                )
            for request_row in visit_open_part_requests(job):
                has_extra_parts = True
                part = request_row.spare_part
                part_rows.append(
                    {
                        "name": part.name,
                        "sku": part.part_number,
                        "when": "Requested",
                        "extra": True,
                        "qty": 1,
                        "unit": _money(part.unit_price),
                        "total": _money(part.unit_price),
                    }
                )
        paid = verified_payment_total(invoice)
        balance = invoice.grand_total - paid
        if balance < 0:
            balance = Decimal("0")
        badge_map = {
            Invoice.Status.PAID: "ready",
            Invoice.Status.UNPAID: "unpaid",
            Invoice.Status.PARTIAL: "pending",
            Invoice.Status.DRAFT: "inactive",
            Invoice.Status.CANCELLED: "cancelled",
        }
        note_parts = []
        if job and job.problem:
            note_parts.append(job.problem)
        pay_state = invoice_payment_state(invoice)
        pending_payment = (
            invoice.payments.filter(status=Payment.Status.PENDING).order_by("-id").first()
        )
        payments_url = reverse("admin:django_app_payment_changelist") + f"?q={invoice.number}"
        verify_url = ""
        if pending_payment is not None:
            verify_url = reverse("admin:django_app_payment_change", args=[pending_payment.id])
        if pay_state == "PENDING":
            payment_warning = (
                "A payment claim is waiting. Open Payments to upload proof if needed, "
                "select staff, then Verify."
            )
        elif pay_state == "PAID":
            payment_warning = ""
        elif balance > 0:
            payment_warning = (
                "Balance still due. Invoices are display-only — record and verify money "
                "on the Payments page."
            )
        else:
            payment_warning = ""
        return {
            "id": invoice.id,
            "number": invoice.number,
            "status": invoice.status,
            "status_label": invoice.status,
            "status_class": badge_map.get(invoice.status, "pending"),
            "pay_state": pay_state,
            "issued": invoice.invoice_date,
            "due": job.estimated_end if job else None,
            "has_extra_parts": has_extra_parts,
            "wo_number": f"WO-{job.id:04d}" if job else "—",
            "wo_url": reverse("admin:django_app_repairjob_change", args=[job.id]) if job else "",
            "customer_name": customer.name,
            "customer_email": customer.email,
            "customer_phone": customer.phone,
            "customer_url": reverse("admin:django_app_customer_change", args=[customer.id]),
            "vehicle_title": f"{vehicle.brand} {vehicle.model} ({vehicle.year})",
            "vehicle_plate": vehicle.plate,
            "vehicle_url": reverse("admin:django_app_vehicle_change", args=[vehicle.id]),
            "mechanic": mechanic,
            "labor_rows": labor_rows,
            "part_rows": part_rows,
            "labor_services": _money(invoice.labor_cost + invoice.service_cost),
            "parts_cost": _money(invoice.parts_cost),
            "subtotal": _money(invoice.subtotal),
            "discount": _money(invoice.discount),
            "has_discount": invoice.discount > 0,
            "tax": _money(invoice.tax),
            "has_tax": invoice.tax > 0,
            "grand_total": _money(invoice.grand_total),
            "paid": _money(paid),
            "has_paid": paid > 0,
            "balance": _money(balance),
            "has_balance": balance > 0,
            "note": "\n".join(note_parts),
            "can_verify": pending_payment is not None,
            "verify_url": verify_url or payments_url,
            "payments_url": payments_url,
            "payment_warning": payment_warning,
        }

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        if request.GET.get("action") == "advance" and request.GET.get("pk"):
            self._advance(request, request.GET.get("pk"))
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            url = reverse("admin:django_app_invoice_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)
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

    def _advance(self, request, pk):
        invoice = Invoice.objects.filter(pk=pk).first()
        if invoice is None:
            return
        nxt = next_invoice_status(invoice.status)
        if not nxt:
            return
        invoice.status = nxt
        invoice.save(update_fields=["status"])
        messages.success(request, f"{invoice.number} is now {invoice.get_status_display()}.")

    def _row_action(self, invoice, query, status_filter):
        from urllib.parse import urlencode

        badge_map = {
            Invoice.Status.PAID: "ready",
            Invoice.Status.UNPAID: "unpaid",
            Invoice.Status.PARTIAL: "pending",
            Invoice.Status.DRAFT: "inactive",
            Invoice.Status.CANCELLED: "cancelled",
        }
        nxt = next_invoice_status(invoice.status)
        next_html = ""
        if nxt:
            params = {"action": "advance", "pk": invoice.id}
            if query:
                params["q"] = query
            if status_filter:
                params["status"] = status_filter
            next_html = format_html(
                '<a class="ap-btn tone-{}" href="{}?{}">{}</a>',
                badge_map.get(nxt, "pending"),
                reverse("admin:django_app_invoice_changelist"),
                urlencode(params),
                dict(Invoice.Status.choices).get(nxt, nxt),
            )
        elif invoice.status not in (Invoice.Status.PAID, Invoice.Status.CANCELLED):
            # Invoice list is display-only for money — point staff to Payments.
            pay_state = invoice_payment_state(invoice)
            if pay_state == "PENDING":
                tip = "Pending payment — verify on Payments"
            else:
                tip = "Payment due — manage on Payments"
            next_html = format_html(
                '<span class="wo-scroll wo-scroll-note" title="Invoices do not take payment. Use the Payments page.">'
                '<span class="wo-scroll-text wo-note">{}</span></span>',
                tip,
            )
        return format_html(
            '<div class="wo-actions">{}{}</div>',
            next_html,
            _actions(
                reverse("admin:django_app_invoice_change", args=[invoice.id]),
                reverse("admin:django_app_invoice_delete", args=[invoice.id]),
                obj=invoice,
                edit_url=reverse("admin:django_app_invoice_change", args=[invoice.id]) + "?edit=1",
            ),
        )

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
        status_filter = request.GET.get("status") or ""
        paid = Invoice.objects.filter(status=Invoice.Status.PAID)
        pending = Invoice.objects.filter(status__in=(Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.DRAFT))
        paid_total = paid.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        pending_total = pending.aggregate(total=Sum("grand_total"))["total"] or Decimal("0")
        paid_count = paid.count() or 1
        badge_map = {
            Invoice.Status.PAID: "ready",
            Invoice.Status.UNPAID: "unpaid",
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
                        self._row_action(invoice, query, status_filter),
                    ]
                }
            )
        return {
            "title": "Invoices & Billing",
            "subtitle": "Invoice display for workshop jobs. Record and verify money on Payments — not here.",
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


@admin.register(GarageReport)
class GarageReportAdmin(RoleGatedAdminMixin, UnfoldModelAdmin):
    """Stock & billing → Reports. Administrator + Manager."""

    role_module = "reports"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return GarageReport.objects.none()

    def changelist_view(self, request, extra_context=None):
        from django.core.exceptions import PermissionDenied
        from django_app.reports import garage_reports

        if not self.role_allows(request):
            raise PermissionDenied("Only Administrator or Manager can open garage reports.")
        return garage_reports(request)


@admin.register(Payment)
class PaymentAdmin(CarsvPageAdmin):
    form = PaymentGarageForm
    list_display = ("number", "invoice", "amount", "method", "status", "paid_at")
    modal_title_add = "Record Payment"
    modal_title_edit = "Edit Payment"
    modal_subtitle = (
        "Tied to an invoice (same idea as booking → work order). "
        "Upload proof, select staff, then Verify — Pending does not mark the invoice paid."
    )
    modal_save_add = "Save Payment"
    STATUS_BADGE = {
        Payment.Status.PENDING: "pending",
        Payment.Status.PAID: "ready",
        Payment.Status.FAILED: "cancelled",
        Payment.Status.REFUNDED: "inactive",
    }

    def changelist_view(self, request, extra_context=None):
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action in {"verify", "reject"} and pk:
            if action == "verify":
                self._verify(request, pk)
            else:
                self._reject(request, pk)
            params = request.GET.copy()
            params.pop("action", None)
            params.pop("pk", None)
            url = reverse("admin:django_app_payment_changelist")
            if params:
                url = f"{url}?{params.urlencode()}"
            return redirect(url)
        return super().changelist_view(request, extra_context=extra_context)

    def _verify(self, request, pk):
        payment = Payment.objects.filter(pk=pk).select_related("invoice", "customer").first()
        if payment is None:
            return
        try:
            verify_payment(payment, user=request.user)
        except ValidationError as exc:
            messages.error(request, self._payment_error(exc) or "Could not verify this payment.")

    def _reject(self, request, pk):
        payment = Payment.objects.filter(pk=pk).select_related("invoice", "customer").first()
        if payment is None:
            return
        try:
            reject_payment(payment, user=request.user)
            messages.success(request, f"{payment.number} marked as failed.")
        except ValidationError as exc:
            messages.error(request, self._payment_error(exc) or "Could not reject this payment.")

    def _payment_error(self, exc):
        if hasattr(exc, "message_dict"):
            return " ".join(error for errors in exc.message_dict.values() for error in errors)
        if getattr(exc, "messages", None):
            return " ".join(exc.messages)
        return str(exc)

    def get_queryset(self, request):
        qs = (
            super()
            .get_queryset(request)
            .select_related("invoice", "customer", "vehicle", "received_by__user", "verified_by")
        )
        method = request.GET.get("method")
        if method in dict(Payment.Method.choices):
            qs = qs.filter(method=method)
        status = request.GET.get("status")
        if status in dict(Payment.Status.choices):
            qs = qs.filter(status=status)
        return qs

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        initial.setdefault("number", next_payment_number())
        initial.setdefault("status", Payment.Status.PENDING)
        initial.setdefault("paid_at", localdate())
        invoice_id = request.GET.get("invoice")
        if invoice_id:
            invoice = Invoice.objects.filter(pk=invoice_id).select_related("customer", "vehicle").first()
            if invoice:
                initial["invoice"] = invoice.pk
                initial["customer"] = invoice.customer_id
                initial["vehicle"] = invoice.vehicle_id
                remain = invoice.grand_total - verified_payment_total(invoice)
                pending = invoice.payments.filter(status=Payment.Status.PENDING).aggregate(
                    total=Sum("amount")
                )["total"] or Decimal("0")
                remain = remain - pending
                if remain > 0:
                    initial["amount"] = remain
        return initial

    def save_model(self, request, obj, form, change):
        if obj.invoice_id:
            obj.customer_id = obj.invoice.customer_id
            obj.vehicle_id = obj.invoice.vehicle_id
        if not change and not obj.number:
            obj.number = next_payment_number()
        if obj.status == Payment.Status.PAID and not obj.verified_at:
            # Saving as Paid from the form still requires proof + staff; treat like verify.
            has_proof = bool(obj.proof_image) or (
                change and Payment.objects.filter(pk=obj.pk).exclude(proof_image="").exists()
            )
            if not has_proof:
                messages.error(request, "Upload payment proof before marking Paid. Saved as Pending.")
                obj.status = Payment.Status.PENDING
            elif not obj.received_by_id:
                messages.error(request, "Select staff (Received by) before marking Paid. Saved as Pending.")
                obj.status = Payment.Status.PENDING
            else:
                obj.verified_at = obj.verified_at or now()
                if request.user.is_authenticated and not obj.verified_by_id:
                    obj.verified_by = request.user
                from django_app.models import receipt_number_for

                obj.receipt_number = receipt_number_for(obj)
        super().save_model(request, obj, form, change)

    def _row_actions(self, payment, query, method_filter, status_filter):
        from urllib.parse import urlencode

        change_url = reverse("admin:django_app_payment_change", args=[payment.id])
        delete_url = reverse("admin:django_app_payment_delete", args=[payment.id])
        pieces = ['<span class="wo-actions">']
        args = []
        if payment.status == Payment.Status.PENDING:
            params = {"action": "verify", "pk": payment.id}
            if query:
                params["q"] = query
            if method_filter:
                params["method"] = method_filter
            if status_filter:
                params["status"] = status_filter
            if payment.proof_image and payment.received_by_id:
                pieces.append('<a class="ap-btn tone-ready" href="{}?{}">Verify</a>')
                args.extend([reverse("admin:django_app_payment_changelist"), urlencode(params)])
            elif not payment.received_by_id:
                pieces.append(
                    '<span class="wo-scroll wo-scroll-note" title="Select Received by on Edit Payment first">'
                    '<span class="wo-scroll-text wo-note">Select staff first</span></span>'
                )
            else:
                pieces.append(
                    '<span class="wo-scroll wo-scroll-note" title="Upload proof on Edit Payment first">'
                    '<span class="wo-scroll-text wo-note">Upload proof first</span></span>'
                )
            reject_params = dict(params)
            reject_params["action"] = "reject"
            pieces.append('<a class="ap-btn cancel" href="{}?{}">Reject</a>')
            args.extend([reverse("admin:django_app_payment_changelist"), urlencode(reject_params)])
        pieces.append("{}</span>")
        args.append(_actions(change_url, delete_url, obj=payment))
        return format_html("".join(pieces), *args)

    def _proof_cell(self, payment):
        """List stays text-only; full image shows on Edit Payment."""
        if not payment.proof_image:
            return format_html('<span class="cc-id">{}</span>', "No proof")
        return format_html(
            '<a class="wo-num" href="{}" title="Open in edit">{}</a>',
            reverse("admin:django_app_payment_change", args=[payment.id]),
            "Has proof",
        )

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(number__icontains=query)
                | Q(invoice__number__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(reference__icontains=query)
                | Q(receipt_number__icontains=query)
            )
        method_filter = request.GET.get("method") or ""
        status_filter = request.GET.get("status") or ""
        rows = []
        for payment in qs.order_by("-paid_at", "-id"):
            rows.append(
                {
                    "cells": [
                        format_html(
                            '<a class="wo-num" href="{}">{}</a>',
                            reverse("admin:django_app_payment_change", args=[payment.id]),
                            payment.number,
                        ),
                        format_html(
                            '<a class="wo-num" href="{}">{}</a>',
                            reverse("admin:django_app_invoice_change", args=[payment.invoice_id]),
                            payment.invoice.number,
                        ),
                        payment.customer.name,
                        format_html('<span class="cc-spent">${}</span>', payment.amount),
                        payment.get_method_display(),
                        self._proof_cell(payment),
                        payment.paid_at,
                        _badge(
                            self.STATUS_BADGE.get(payment.status, "pending"),
                            payment.get_status_display().upper(),
                        ),
                        self._row_actions(payment, query, method_filter, status_filter),
                    ]
                }
            )
        pending_count = Payment.objects.filter(status=Payment.Status.PENDING).count()
        return {
            "title": "Payments",
            "subtitle": (
                "Each payment belongs to one invoice. Upload proof, select staff, then Verify "
                f"(same style as work orders). {pending_count} waiting for verification."
            ),
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
                    "name": "status",
                    "value": status_filter,
                    "options": [{"value": "", "label": "All statuses"}]
                    + [{"value": value, "label": label} for value, label in Payment.Status.choices],
                },
                {
                    "name": "method",
                    "value": method_filter,
                    "options": [{"value": "", "label": "All methods"}]
                    + [{"value": value, "label": label} for value, label in Payment.Method.choices],
                },
            ],
            "columns": [
                "Payment #",
                "Invoice",
                "Customer",
                "Amount",
                "Method",
                "Proof",
                "Date",
                "Status",
                "Actions",
            ],
            "rows": rows,
            "empty": "No payments match this search.",
        }


@admin.register(BlogPost)
class BlogPostAdmin(CarsvPageAdmin):
    form = BlogPostGarageForm
    list_display = ("title", "category", "featured", "published", "published_at")
    search_fields = ("title", "excerpt", "body", "category", "author_name")
    modal_title_add = "Add article"
    modal_title_edit = "Edit article"
    modal_subtitle = "Published articles appear on the public website. Drafts stay in the admin."
    modal_save_add = "Save article"
    modal_save_edit = "Save article"
    modal_wide = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        status = request.GET.get("status")
        if status == "published":
            qs = qs.filter(published=True)
        elif status == "draft":
            qs = qs.filter(published=False)
        category = (request.GET.get("category") or "").strip()
        if category:
            qs = qs.filter(category=category)
        return qs

    def changelist_view(self, request, extra_context=None):
        action = request.GET.get("action")
        pk = request.GET.get("pk")
        if action in {"publish", "feature"} and pk and str(pk).isdigit():
            post = BlogPost.objects.filter(pk=pk).first()
            if post and action == "publish":
                post.published = not post.published
                if post.published and not post.published_at:
                    post.published_at = localdate()
                post.save(update_fields=["published", "published_at"])
            elif post and action == "feature":
                turning_on = not post.featured
                if turning_on:
                    BlogPost.objects.exclude(pk=post.pk).update(featured=False)
                post.featured = turning_on
                post.save(update_fields=["featured"])
            return redirect(reverse("admin:django_app_blogpost_changelist"))
        return super().changelist_view(request, extra_context)

    def build_page(self, request):
        qs = self.get_queryset(request)
        query = (request.GET.get("q") or "").strip()
        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(excerpt__icontains=query)
                | Q(category__icontains=query)
                | Q(author_name__icontains=query)
            )
        list_url = reverse("admin:django_app_blogpost_changelist")
        rows = []
        for post in qs.order_by("-featured", "-published_at", "-id"):
            rows.append(
                {
                    "off": not post.published,
                    "cells": [
                        format_html(
                            '<div class="cc-name">{}</div><div class="cc-id">{}</div><div class="cc-muted">{}</div>',
                            post.title,
                            post.slug,
                            post.excerpt,
                        ),
                        post.category,
                        post.author_name,
                        format_html(
                            '<a href="{}?action=publish&amp;pk={}">{}</a>',
                            list_url,
                            post.pk,
                            _badge("ready" if post.published else "inactive", "Published" if post.published else "Draft"),
                        ),
                        format_html(
                            '<a href="{}?action=feature&amp;pk={}">{}</a>',
                            list_url,
                            post.pk,
                            _badge("active" if post.featured else "inactive", "Featured" if post.featured else "Not featured"),
                        ),
                        post.published_at.strftime("%b %d, %Y") if post.published_at else "—",
                        _actions(
                            reverse("admin:django_app_blogpost_change", args=[post.id]),
                            reverse("admin:django_app_blogpost_delete", args=[post.id]),
                            obj=post,
                        ),
                    ],
                }
            )
        categories = (
            BlogPost.objects.order_by("category").values_list("category", flat=True).distinct()
        )
        return {
            "title": "Blog",
            "subtitle": "Articles on the public website. Add, edit, or remove them here. Only published rows are visible to visitors.",
            "count": BlogPost.objects.count(),
            "count_label": "Articles",
            "model": "blogpost",
            "add_url": reverse("admin:django_app_blogpost_add"),
            "add_label": "Add article",
            "search_placeholder": "Search title, category, or author...",
            "search_query": query,
            "kpis": [
                {
                    "label": "Published",
                    "value": BlogPost.objects.filter(published=True).count(),
                    "hint": "Shown on the public blog",
                },
                {
                    "label": "Drafts",
                    "value": BlogPost.objects.filter(published=False).count(),
                    "hint": "Hidden from visitors",
                },
                {
                    "label": "Featured",
                    "value": BlogPost.objects.filter(featured=True).count(),
                    "hint": "Highlighted on the home page",
                },
            ],
            "filters": [
                {
                    "name": "status",
                    "value": request.GET.get("status") or "",
                    "options": [
                        {"value": "", "label": "All articles"},
                        {"value": "published", "label": "Published"},
                        {"value": "draft", "label": "Drafts"},
                    ],
                },
                {
                    "name": "category",
                    "value": request.GET.get("category") or "",
                    "options": [{"value": "", "label": "All categories"}]
                    + [{"value": name, "label": name} for name in categories],
                },
            ],
            "columns": ["Article", "Category", "Author", "Status", "Featured", "Published", "Actions"],
            "rows": rows,
            "empty": "No articles match this search.",
        }


@admin.register(Estimate)
class EstimateAdmin(RoleGatedAdminMixin, UnfoldModelAdmin):
    list_display = ("number", "customer", "vehicle", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("number", "customer__name", "vehicle__plate")
    autocomplete_fields = ("customer", "vehicle", "repair_job")


@admin.register(Notification)
class NotificationAdmin(RoleGatedAdminMixin, UnfoldModelAdmin):
    list_display = ("title", "customer", "kind", "read", "created_at")
    list_filter = ("kind", "read")
    search_fields = ("title", "message", "customer__name")
    autocomplete_fields = ("customer",)


@admin.register(AuthProvider)
class AuthProviderAdmin(RoleGatedAdminMixin, UnfoldModelAdmin):
    list_display = ("user", "provider", "provider_user_id", "created_at")
    search_fields = ("user__username", "user__email", "provider_user_id")
    list_filter = ("provider",)
    raw_id_fields = ("user",)
