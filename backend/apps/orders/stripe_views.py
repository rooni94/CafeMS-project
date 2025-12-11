import stripe, json
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django.conf import settings

# هنا نستخدم المتغيرات اللي عرّفناها في settings.py
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['POST'])
def create_checkout_session(request):
    items = request.data.get('items', [])
    line_items = []
    for item in items:
        line_items.append({
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': item.get('name')},
                'unit_amount': int(float(item.get('price',0)) * 100),
            },
            'quantity': int(item.get('quantity',1)),
        })
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=line_items,
        mode='payment',
        success_url=request.data.get('success_url','http://localhost:5173/success'),
        cancel_url=request.data.get('cancel_url','http://localhost:5173/cancel'),
    )
    return JsonResponse({'id': session.id})

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        return HttpResponse(status=400)
    # handle event types
    return HttpResponse(status=200)
