# backend/apps/orders/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class OrderConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
        else:
            self.group_name = f'user_{user.id}'
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def order_update(self, event):
        await self.send_json(event['data'])
