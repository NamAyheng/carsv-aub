from django.http import HttpResponse

ALLOWED_ORIGINS = {
    "http://127.0.0.1:3000",
    "http://localhost:3000",
}


class LocalhostCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.META.get("HTTP_ORIGIN", "")
        if request.method == "OPTIONS" and origin in ALLOWED_ORIGINS:
            response = HttpResponse()
            self._apply(response, origin)
            return response
        response = self.get_response(request)
        if origin in ALLOWED_ORIGINS:
            self._apply(response, origin)
        return response

    def _apply(self, response, origin):
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, X-CSRFToken"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Max-Age"] = "86400"
