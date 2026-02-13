from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import NotificationCampaign, PushToken
from apps.accounts.push import send_expo_push


def _target_roles(target: str):
    if target == "customers":
        return ["customer"]
    if target == "staff":
        return ["staff", "supervisor", "manager"]
    return ["customer", "staff", "supervisor", "manager"]


class Command(BaseCommand):
    help = "Send due scheduled notification campaigns"

    def handle(self, *args, **options):
        now = timezone.now()
        campaigns = NotificationCampaign.objects.filter(
            status="scheduled", scheduled_at__lte=now
        ).order_by("scheduled_at", "id")

        total_campaigns = 0
        total_tokens = 0

        for campaign in campaigns:
            roles = _target_roles(campaign.target)
            tokens = list(
                PushToken.objects.filter(user__role__in=roles, is_active=True).values_list(
                    "token", flat=True
                )
            )
            if tokens:
                send_expo_push(
                    tokens,
                    title=campaign.title,
                    body=campaign.message,
                    data={
                        "type": "marketing_campaign",
                        "campaign_id": campaign.id,
                        **(campaign.extra_data or {}),
                    },
                )

            campaign.sent_at = timezone.now()
            campaign.sent_count = len(tokens)
            campaign.status = "sent"
            campaign.save(update_fields=["sent_at", "sent_count", "status", "updated_at"])

            total_campaigns += 1
            total_tokens += len(tokens)

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {total_campaigns} campaigns and sent to {total_tokens} devices."
            )
        )
