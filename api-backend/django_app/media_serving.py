"""Serve MEDIA_ROOT in production with public catalog vs signed private uploads."""

from __future__ import annotations

import mimetypes
from pathlib import Path, PurePosixPath
from urllib.parse import quote, unquote

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.views import View

# Catalog / marketing assets — safe to serve without a signature.
PUBLIC_MEDIA_PREFIXES = (
    "services/",
    "parts/",
    "blog/",
    "products/",
)

MEDIA_SIGN_SALT = "carsv-media"
MEDIA_SIGN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days — matches long-lived portal sessions


def _normalize_rel(path: str) -> str:
    raw = (path or "").replace("\\", "/").lstrip("/")
    if raw.startswith("media/"):
        raw = raw[6:]
    # Block path traversal.
    parts = PurePosixPath(raw).parts
    if ".." in parts or raw.startswith("/"):
        raise ValueError("invalid media path")
    return "/".join(parts)


def is_public_media_path(path: str) -> bool:
    try:
        rel = _normalize_rel(path)
    except ValueError:
        return False
    return any(rel.startswith(prefix) for prefix in PUBLIC_MEDIA_PREFIXES)


def sign_media_path(path: str) -> str:
    rel = _normalize_rel(path)
    return TimestampSigner(salt=MEDIA_SIGN_SALT).sign(rel)


def media_url_path(path: str, *, force_sign: bool = False) -> str:
    """Build `/media/...` URL; sign private paths unless DEBUG and not force_sign."""
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    rel = _normalize_rel(path)
    url = f"/media/{rel}"
    if is_public_media_path(rel):
        return url
    if settings.DEBUG and not force_sign:
        return url
    return f"{url}?m={quote(sign_media_path(rel), safe='')}"


def verify_media_token(path: str, token: str) -> bool:
    try:
        rel = _normalize_rel(path)
        unsigned = TimestampSigner(salt=MEDIA_SIGN_SALT).unsign(unquote(token or ""), max_age=MEDIA_SIGN_MAX_AGE)
        return unsigned == rel
    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return False


class MediaServeView(View):
    """Serve files under MEDIA_ROOT. Private prefixes need a valid `m` signature."""

    def get(self, request, path):
        try:
            rel = _normalize_rel(path)
        except ValueError as exc:
            raise Http404("Not found") from exc

        root = Path(settings.MEDIA_ROOT).resolve()
        target = (root / rel).resolve()
        try:
            target.relative_to(root)
        except ValueError as exc:
            raise Http404("Not found") from exc
        if not target.is_file():
            raise Http404("Not found")

        allowed = is_public_media_path(rel) or settings.DEBUG
        if not allowed:
            token = request.GET.get("m") or ""
            if not verify_media_token(rel, token):
                # Staff browsing admin without a signed URL may still open files while logged in.
                user = getattr(request, "user", None)
                if not (user and user.is_authenticated and (user.is_staff or user.is_superuser)):
                    return HttpResponseForbidden("This file requires a valid access link.")

        content_type, _ = mimetypes.guess_type(str(target))
        response = FileResponse(target.open("rb"), content_type=content_type or "application/octet-stream")
        response["Cache-Control"] = "private, max-age=3600" if not allowed else "public, max-age=86400"
        return response
