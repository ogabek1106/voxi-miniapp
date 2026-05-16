from datetime import datetime
from typing import Optional

from pydantic import BaseModel


NOTIFICATION_CATEGORIES = {
    "low_balance",
    "inactive_user",
    "abandoned_activity",
    "result_ready",
    "new_mock_test",
    "new_reading",
    "new_listening",
    "new_writing",
    "new_speaking",
    "new_shadow_writing",
    "new_word_shuffle",
    "new_odd_one_out",
    "daily_reminder",
    "streak_reminder",
    "unfinished_mock",
    "unfinished_reading",
    "unfinished_listening",
    "unfinished_writing",
    "unfinished_speaking",
    "coins_added",
    "payment_approved",
    "payment_rejected",
    "maintenance_notice",
    "system_update",
    "feature_release",
    "weekly_challenge",
    "monthly_mastery_test",
    "admin_announcement",
    "welcome_message",
    "special_event",
    "achievement_unlocked",
    "level_up",
    "exam_tip",
    "motivation_reminder",
    "subscription_warning",
    "premium_offer",
    "return_reminder",
    "account_warning",
    "security_notice",
    "leaderboard_update",
    "test_expiring",
    "mock_available_again",
    "custom_manual_notification",
}


class NotificationIn(BaseModel):
    admin_id: int
    category: str = "custom_manual_notification"
    title: str
    message: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    link_type: Optional[str] = "none"
    schedule_mode: str = "now"
    scheduled_at: Optional[datetime] = None
    repeat_interval_hours: Optional[int] = None
    max_send_count: Optional[int] = None
    cooldown_hours: Optional[int] = None
    is_enabled: bool = True


class NotificationUpdateIn(NotificationIn):
    pass


class NotificationReadIn(BaseModel):
    telegram_id: Optional[int] = None
