from django.db import models


def default_hero_cards():
    return [
        {
            "image": "/media/products/lk_menu/v60.jpg",
            "title": "قهوة V60 المقطرة",
            "description": "تحضير يدوي هادئ يبرز نكهات القهوة بوضوح وقوام خفيف ومتوازن.",
            "button_text": "اطلب V60",
            "button_link": "/menu",
        },
        {
            "image": "/media/products/lk_menu/mango_orange_smoothie.jpg",
            "title": "سموثي مانجو وبرتقال",
            "description": "مزيج فاكهي بارد من المانجو والبرتقال لانتعاش طبيعي في كل وقت.",
            "button_text": "تصفّح المنعشات",
            "button_link": "/menu",
        },
        {
            "image": "/media/products/lk_menu/fruit_danish.jpg",
            "title": "دانش فواكه طازج",
            "description": "مخبوز هش مزين بالفواكه والتوت، مناسب لمرافقة كوب القهوة.",
            "button_text": "استكشف المخبوزات",
            "button_link": "/menu",
        },
    ]


class StoreSettings(models.Model):
    store_name = models.CharField(max_length=200, default="CafeMS Demo")
    tagline = models.CharField(max_length=255, blank=True, default="")

    primary_color = models.CharField(max_length=20, default="#f59e0b")
    secondary_color = models.CharField(max_length=20, default="#4c1d95")
    accent_color = models.CharField(max_length=20, default="#0f172a")
    background_color = models.CharField(max_length=20, default="#f8fafc")
    text_color = models.CharField(max_length=20, default="#111827")

    header_title = models.CharField(max_length=255, blank=True, default="")
    header_subtitle = models.CharField(max_length=500, blank=True, default="")
    footer_text = models.TextField(blank=True, default="")

    contact_email = models.EmailField(blank=True, default="")
    support_email = models.EmailField(blank=True, default="")
    notification_email = models.EmailField(
        blank=True,
        default="",
        help_text="العنوان الرئيسي الذي تُرسل منه التنبيهات والتحقق.",
    )
    contact_phone = models.CharField(max_length=50, blank=True, default="")
    smtp_host = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Ø®Ø§Ø¯Ù… SMTP Ø§Ù„Ù…Ø³Ø¦ÙˆÙ„ Ø¹Ù† Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯.",
    )
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True, default="")
    smtp_password = models.CharField(max_length=255, blank=True, default="")
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)
    verification_email = models.EmailField(blank=True, default="")
    verification_smtp_host = models.CharField(max_length=255, blank=True, default="")
    verification_smtp_port = models.PositiveIntegerField(default=587)
    verification_smtp_username = models.CharField(max_length=255, blank=True, default="")
    verification_smtp_password = models.CharField(max_length=255, blank=True, default="")
    verification_smtp_use_tls = models.BooleanField(default=True)
    verification_smtp_use_ssl = models.BooleanField(default=False)
    support_reply_email = models.EmailField(blank=True, default="")
    support_smtp_host = models.CharField(max_length=255, blank=True, default="")
    support_smtp_port = models.PositiveIntegerField(default=587)
    support_smtp_username = models.CharField(max_length=255, blank=True, default="")
    support_smtp_password = models.CharField(max_length=255, blank=True, default="")
    support_smtp_use_tls = models.BooleanField(default=True)
    support_smtp_use_ssl = models.BooleanField(default=False)

    logo = models.ImageField(upload_to="store/logo/", blank=True, null=True)
    favicon = models.ImageField(upload_to="store/favicon/", blank=True, null=True)
    hero_image = models.ImageField(upload_to="store/hero/", blank=True, null=True)
    about_image = models.ImageField(upload_to="store/about/", blank=True, null=True)
    hero_card_image_1 = models.ImageField(
        upload_to="store/hero_cards/", blank=True, null=True
    )
    hero_card_image_2 = models.ImageField(
        upload_to="store/hero_cards/", blank=True, null=True
    )
    hero_card_image_3 = models.ImageField(
        upload_to="store/hero_cards/", blank=True, null=True
    )

    header_links = models.JSONField(default=list, blank=True)
    footer_links = models.JSONField(default=list, blank=True)
    social_links = models.JSONField(default=dict, blank=True)

    hero_title = models.CharField(max_length=255, blank=True, default="")
    hero_subtitle = models.TextField(blank=True, default="")
    hero_button_text = models.CharField(max_length=100, blank=True, default="")
    hero_button_link = models.CharField(max_length=255, blank=True, default="")
    hero_cards = models.JSONField(default=default_hero_cards, blank=True)
    about_title = models.CharField(max_length=255, blank=True, default="")
    about_subtitle = models.CharField(max_length=255, blank=True, default="")
    about_description = models.TextField(blank=True, default="")
    about_highlights = models.JSONField(default=list, blank=True)
    contact_title = models.CharField(max_length=255, blank=True, default="")
    contact_subtitle = models.CharField(max_length=255, blank=True, default="")
    contact_description = models.TextField(blank=True, default="")
    contact_address = models.CharField(max_length=255, blank=True, default="")
    contact_hours = models.CharField(max_length=255, blank=True, default="")
    contact_map_embed = models.TextField(blank=True, default="")
    contact_whatsapp = models.CharField(max_length=50, blank=True, default="")
    wallet_pass_base_url = models.URLField(
        blank=True,
        default="https://example.invalid",
        help_text="الدومين الأساسي المستخدم في روابط بطاقات الولاء (Apple/Google Wallet).",
    )
    apple_pass_template = models.TextField(
        blank=True,
        default="",
        help_text="محتوى pass.json أو البيانات الإضافية المطلوبة من Apple Wallet.",
    )
    google_wallet_jwt_template = models.TextField(
        blank=True,
        default="",
        help_text="قالب JWT المستخدم لإنشاء بطاقة Google Wallet.",
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Store Settings ({self.store_name})"

    class Meta:
        verbose_name = "Store Settings"
        verbose_name_plural = "Store Settings"
