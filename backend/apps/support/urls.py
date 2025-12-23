# apps/support/urls.py
from django.urls import path
from .views import (
    MyConversationView,
    MyMessagesView,
    ConversationListView,
    ConversationDetailView,
    ConversationMessagesView,
    CloseConversationView,
    MarkConversationReadView,
    GuestRequestCodeView,
    GuestVerifyCodeView,
    GuestConversationMessagesView,
    DeleteConversationView,      
    MyCloseConversationView, 
    SupportStaffActivityListView,

)

urlpatterns = [
    path("my-conversation/", MyConversationView.as_view(), name="my-conversation"),
    path("my-messages/", MyMessagesView.as_view(), name="my-messages"),
    path("my-conversation/close/", MyCloseConversationView.as_view(), name="my_conversation_close"),

    path("conversations/", ConversationListView.as_view(), name="conversations"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<int:pk>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
    path("conversations/<int:pk>/close/", CloseConversationView.as_view(), name="conversation-close"),
    path("conversations/<int:pk>/mark-read/", MarkConversationReadView.as_view(), name="conversation-mark-read"),
    path("conversations/<int:pk>/delete/",DeleteConversationView.as_view(),name="support_conversation_delete",),
    path(
        "activities/",
        SupportStaffActivityListView.as_view(),
        name="support_staff_activities",
    ),
    

    path("guest-request-code/", GuestRequestCodeView.as_view(), name="guest-request-code"),
    path("guest-verify-code/", GuestVerifyCodeView.as_view(), name="guest-verify-code"),
    path(
        "guest-conversations/<int:pk>/messages/",
        GuestConversationMessagesView.as_view(),
        name="guest-conversation-messages",
    ),
]
