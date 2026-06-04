import json
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages active WebSocket connections for real-time notifications."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept connection and add to active client list."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove connection from active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message directly to a single socket client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Broadcast event notification to all connected socket clients."""
        logger.info(f"Broadcasting websocket event: {message.get('type')}")
        disconnected_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message, marking connection for cleanup: {e}")
                disconnected_sockets.append(connection)
                
        # Clean up any dead connections
        for socket in disconnected_sockets:
            self.disconnect(socket)

# Global connection manager instance
manager = ConnectionManager()
