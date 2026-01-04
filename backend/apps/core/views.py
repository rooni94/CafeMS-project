from django.http import JsonResponse
import os

def health(request):
    return JsonResponse({
        "status": "ok",
        "service": "cafe-backend",
        "whisper_model": os.getenv("WHISPER_MODEL_NAME", "not-set")
    })
