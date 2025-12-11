import json
from rest_framework import serializers
from .models import StoreSettings, default_hero_cards


class StoreSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()
    hero_image_url = serializers.SerializerMethodField()
    about_image_url = serializers.SerializerMethodField()
    hero_card_image_1 = serializers.ImageField(
        required=False, allow_null=True, write_only=True
    )
    hero_card_image_2 = serializers.ImageField(
        required=False, allow_null=True, write_only=True
    )
    smtp_password_set = serializers.SerializerMethodField()
    verification_smtp_password_set = serializers.SerializerMethodField()
    support_smtp_password_set = serializers.SerializerMethodField()
    hero_card_image_3 = serializers.ImageField(
        required=False, allow_null=True, write_only=True
    )

    class Meta:
        model = StoreSettings
        fields = [
            "id",
            "store_name",
            "tagline",
            "primary_color",
            "secondary_color",
            "accent_color",
            "background_color",
            "text_color",
            "header_title",
            "header_subtitle",
            "footer_text",
            "contact_email",
            "support_email",
            "notification_email",
            "contact_phone",
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "smtp_use_tls",
            "smtp_use_ssl",
            "smtp_password_set",
            "verification_email",
            "verification_smtp_host",
            "verification_smtp_port",
            "verification_smtp_username",
            "verification_smtp_password",
            "verification_smtp_use_tls",
            "verification_smtp_use_ssl",
            "verification_smtp_password_set",
            "support_reply_email",
            "support_smtp_host",
            "support_smtp_port",
            "support_smtp_username",
            "support_smtp_password",
            "support_smtp_use_tls",
            "support_smtp_use_ssl",
            "support_smtp_password_set",
            "logo",
            "favicon",
            "hero_image",
            "about_image",
            "hero_card_image_1",
            "hero_card_image_2",
            "hero_card_image_3",
            "logo_url",
            "favicon_url",
            "hero_image_url",
            "about_image_url",
            "header_links",
            "footer_links",
            "social_links",
            "hero_title",
            "hero_subtitle",
            "hero_button_text",
            "hero_button_link",
            "hero_cards",
            "about_title",
            "about_subtitle",
            "about_description",
            "about_highlights",
            "contact_title",
            "contact_subtitle",
            "contact_description",
            "contact_address",
            "contact_hours",
            "contact_map_embed",
            "contact_whatsapp",
            "wallet_pass_base_url",
            "apple_pass_template",
            "google_wallet_jwt_template",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at", "logo_url", "favicon_url", "hero_image_url"]
        extra_kwargs = {
            "hero_card_image_1": {"write_only": True},
            "hero_card_image_2": {"write_only": True},
            "hero_card_image_3": {"write_only": True},
            "smtp_password": {"write_only": True},
            "verification_smtp_password": {"write_only": True},
            "support_smtp_password": {"write_only": True},
            "about_image": {"required": False, "allow_null": True},
        }

    def _maybe_parse_json(self, value, default):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return default
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("صيغة JSON غير صحيحة. تأكد من استخدام JSON صالح.")
        return value

    def validate_header_links(self, value):
        parsed = self._maybe_parse_json(value, [])
        if not isinstance(parsed, list):
            raise serializers.ValidationError("الروابط يجب أن تكون قائمة عناصر.")
        return parsed

    def validate_footer_links(self, value):
        parsed = self._maybe_parse_json(value, [])
        if not isinstance(parsed, list):
            raise serializers.ValidationError("روابط الفوتر يجب أن تكون قائمة عناصر.")
        return parsed

    def validate_social_links(self, value):
        parsed = self._maybe_parse_json(value, {})
        if not isinstance(parsed, dict):
            raise serializers.ValidationError("روابط التواصل يجب أن تكون كائن JSON.")
        return parsed

    def validate_hero_cards(self, value):
        parsed = self._maybe_parse_json(value, [])
        if not isinstance(parsed, list):
            raise serializers.ValidationError("بطاقات الهيرو يجب أن تكون قائمة عناصر.")
        max_cards = len(default_hero_cards())
        if len(parsed) > max_cards:
            parsed = parsed[:max_cards]
        return parsed

    def validate_about_highlights(self, value):
        parsed = self._maybe_parse_json(value, [])
        if not isinstance(parsed, list):
            raise serializers.ValidationError("عناصر قسم من نحن يجب أن تكون قائمة نصوص.")
        cleaned = [str(item).strip() for item in parsed if str(item).strip()]
        return cleaned

    def validate(self, attrs):
        attrs = super().validate(attrs)
        use_tls = attrs.get("smtp_use_tls")
        use_ssl = attrs.get("smtp_use_ssl")
        if use_tls and use_ssl:
            raise serializers.ValidationError("لا يمكن تفعيل TLS و SSL في نفس الوقت.")
        ver_tls = attrs.get("verification_smtp_use_tls")
        ver_ssl = attrs.get("verification_smtp_use_ssl")
        if ver_tls and ver_ssl:
            raise serializers.ValidationError("لا يمكن تفعيل TLS و SSL لبريد التحقق في الوقت نفسه.")
        support_tls = attrs.get("support_smtp_use_tls")
        support_ssl = attrs.get("support_smtp_use_ssl")
        if support_tls and support_ssl:
            raise serializers.ValidationError("لا يمكن تفعيل TLS و SSL لبريد الرد على الدعم في الوقت نفسه.")
        return attrs

    def _normalize_hero_cards(self, cards):
        template = default_hero_cards()
        normalized = []
        incoming = cards if isinstance(cards, list) else []
        for idx, template_card in enumerate(template):
            card_data = incoming[idx] if idx < len(incoming) and isinstance(incoming[idx], dict) else {}
            merged = {}
            for key, default_value in template_card.items():
                if key in card_data and card_data[key] is not None:
                    merged[key] = card_data[key]
                else:
                    merged[key] = default_value
            normalized.append(merged)
        return normalized

    def _request_has_flag(self, request, name):
        if not request:
            return False
        value = request.data.get(name)
        if value is None:
            return False
        return str(value).lower() in {"1", "true", "yes", "on"}

    def update(self, instance, validated_data):
        hero_cards_payload = validated_data.pop("hero_cards", None)
        request = self.context.get("request")
        hero_card_fields = ["hero_card_image_1", "hero_card_image_2", "hero_card_image_3"]
        image_fields = hero_card_fields + ["about_image"]
        smtp_password = validated_data.pop("smtp_password", serializers.empty)
        verification_password = validated_data.pop("verification_smtp_password", serializers.empty)
        support_password = validated_data.pop("support_smtp_password", serializers.empty)

        clear_flags = {}
        for field in image_fields:
            clear_key = f"clear_{field}"
            should_clear = self._request_has_flag(request, clear_key)
            if should_clear:
                clear_flags[field] = True
                existing = getattr(instance, field)
                if existing:
                    existing.delete(save=False)
                validated_data[field] = None

        instance = super().update(instance, validated_data)

        password_changed = False
        if smtp_password is not serializers.empty:
            instance.smtp_password = smtp_password
            password_changed = True
        elif self._request_has_flag(request, "clear_smtp_password"):
            if instance.smtp_password:
                instance.smtp_password = ""
                password_changed = True
        if password_changed:
            instance.save(update_fields=["smtp_password"])

        verification_changed = False
        if verification_password is not serializers.empty:
            instance.verification_smtp_password = verification_password
            verification_changed = True
        elif self._request_has_flag(request, "clear_verification_smtp_password"):
            if instance.verification_smtp_password:
                instance.verification_smtp_password = ""
                verification_changed = True
        if verification_changed:
            instance.save(update_fields=["verification_smtp_password"])

        support_changed = False
        if support_password is not serializers.empty:
            instance.support_smtp_password = support_password
            support_changed = True
        elif self._request_has_flag(request, "clear_support_smtp_password"):
            if instance.support_smtp_password:
                instance.support_smtp_password = ""
                support_changed = True
        if support_changed:
            instance.save(update_fields=["support_smtp_password"])

        current_cards = instance.hero_cards or []
        hero_cards = (
            self._normalize_hero_cards(hero_cards_payload)
            if hero_cards_payload is not None
            else self._normalize_hero_cards(current_cards)
        )
        changed = hero_cards_payload is not None or current_cards != hero_cards

        for idx, field in enumerate(hero_card_fields):
            file_field = getattr(instance, field, None)
            if clear_flags.get(field):
                if hero_cards[idx].get("image"):
                    hero_cards[idx]["image"] = ""
                    changed = True
            elif file_field:
                url = file_field.url
                if hero_cards[idx].get("image") != url:
                    hero_cards[idx]["image"] = url
                    changed = True

        if changed:
            instance.hero_cards = hero_cards
            instance.save(update_fields=["hero_cards"])

        about_field = "about_image"
        if clear_flags.get(about_field):
            existing = getattr(instance, about_field)
            if existing:
                existing.delete(save=False)
            setattr(instance, about_field, None)
            instance.save(update_fields=[about_field])

        return instance

    def get_smtp_password_set(self, obj):
        return bool(obj.smtp_password)

    def get_verification_smtp_password_set(self, obj):
        return bool(obj.verification_smtp_password)

    def get_support_smtp_password_set(self, obj):
        return bool(obj.support_smtp_password)

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        if obj.logo:
            return obj.logo.url
        return None

    def get_favicon_url(self, obj):
        request = self.context.get("request")
        if obj.favicon and request:
            return request.build_absolute_uri(obj.favicon.url)
        if obj.favicon:
            return obj.favicon.url
        return None

    def get_hero_image_url(self, obj):
        request = self.context.get("request")
        if obj.hero_image and request:
            return request.build_absolute_uri(obj.hero_image.url)
        if obj.hero_image:
            return obj.hero_image.url
        return None

    def get_about_image_url(self, obj):
        request = self.context.get("request")
        if obj.about_image and request:
            return request.build_absolute_uri(obj.about_image.url)
        if obj.about_image:
            return obj.about_image.url
        return None


class PublicStoreSettingsSerializer(StoreSettingsSerializer):
    class Meta(StoreSettingsSerializer.Meta):
        fields = [
            "store_name",
            "tagline",
            "primary_color",
            "secondary_color",
            "accent_color",
            "background_color",
            "text_color",
            "header_title",
            "header_subtitle",
            "footer_text",
            "contact_email",
            "support_email",
            "notification_email",
            "contact_phone",
            "logo_url",
            "favicon_url",
            "hero_image_url",
            "about_image_url",
            "header_links",
            "footer_links",
            "social_links",
            "hero_title",
            "hero_subtitle",
            "hero_button_text",
            "hero_button_link",
            "hero_cards",
            "about_title",
            "about_subtitle",
            "about_description",
            "about_highlights",
            "contact_title",
            "contact_subtitle",
            "contact_description",
            "contact_address",
            "contact_hours",
            "contact_map_embed",
            "contact_whatsapp",
            "wallet_pass_base_url",
        ]
