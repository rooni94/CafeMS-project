from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ["id", "number", "order", "pdf_url", "created_at"]

    def get_pdf_url(self, obj):
        request = self.context.get("request")
        if obj.pdf and hasattr(obj.pdf, "url"):
            url = obj.pdf.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None
