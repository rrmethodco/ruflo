"""
Stream connectors for various data sources
"""

import asyncio
import aiohttp
import websockets
import json
import pandas as pd
from typing import Callable, Dict, Any, Optional, AsyncIterator
from datetime import datetime
import requests
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class StreamConnector(ABC):
    """Base class for stream connectors"""
    
    @abstractmethod
    async def connect(self):
        """Establish connection to data source"""
        pass
    
    @abstractmethod
    async def read(self) -> Dict[str, Any]:
        """Read data from stream"""
        pass
    
    @abstractmethod
    async def close(self):
        """Close connection"""
        pass

class WebSocketConnector(StreamConnector):
    """WebSocket stream connector"""
    
    def __init__(self, url: str, headers: Optional[Dict] = None):
        self.url = url
        self.headers = headers or {}
        self.websocket = None
    
    async def connect(self):
        """Connect to WebSocket"""
        try:
            self.websocket = await websockets.connect(
                self.url,
                extra_headers=self.headers
            )
            logger.info(f"Connected to WebSocket: {self.url}")
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            raise
    
    async def read(self) -> Dict[str, Any]:
        """Read from WebSocket"""
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")
        
        try:
            message = await self.websocket.recv()
            return json.loads(message)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return {"error": "Invalid JSON", "raw": message}
    
    async def close(self):
        """Close WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            logger.info("WebSocket connection closed")

class SSEConnector(StreamConnector):
    """Server-Sent Events connector"""
    
    def __init__(self, url: str, headers: Optional[Dict] = None):
        self.url = url
        self.headers = headers or {}
        self.session = None
        self.response = None
    
    async def connect(self):
        """Connect to SSE endpoint"""
        self.session = aiohttp.ClientSession()
        self.response = await self.session.get(
            self.url,
            headers={**self.headers, 'Accept': 'text/event-stream'}
        )
        logger.info(f"Connected to SSE: {self.url}")
    
    async def read(self) -> Dict[str, Any]:
        """Read from SSE stream"""
        if not self.response:
            raise RuntimeError("SSE not connected")
        
        async for line in self.response.content:
            line = line.decode('utf-8').strip()
            if line.startswith('data: '):
                try:
                    data = json.loads(line[6:])
                    return data
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse SSE data: {e}")
                    continue
    
    async def close(self):
        """Close SSE connection"""
        if self.response:
            self.response.close()
        if self.session:
            await self.session.close()
        logger.info("SSE connection closed")

class HTTPPollingConnector(StreamConnector):
    """HTTP polling connector"""
    
    def __init__(self, url: str, interval: float = 1.0, 
                 headers: Optional[Dict] = None):
        self.url = url
        self.interval = interval
        self.headers = headers or {}
        self.session = None
    
    async def connect(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info(f"HTTP polling initialized: {self.url}")
    
    async def read(self) -> Dict[str, Any]:
        """Poll HTTP endpoint"""
        if not self.session:
            raise RuntimeError("HTTP session not initialized")
        
        try:
            async with self.session.get(self.url, headers=self.headers) as resp:
                data = await resp.json()
                await asyncio.sleep(self.interval)
                return data
        except Exception as e:
            logger.error(f"HTTP polling error: {e}")
            await asyncio.sleep(self.interval)
            return {"error": str(e)}
    
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
        logger.info("HTTP session closed")

class KafkaConnector(StreamConnector):
    """Kafka stream connector (requires kafka-python)"""
    
    def __init__(self, bootstrap_servers: str, topic: str, 
                 consumer_group: str = 'streamlit-consumer'):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.consumer_group = consumer_group
        self.consumer = None
    
    async def connect(self):
        """Connect to Kafka"""
        try:
            from kafka import KafkaConsumer
            self.consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.consumer_group,
                value_deserializer=lambda m: json.loads(m.decode('utf-8'))
            )
            logger.info(f"Connected to Kafka topic: {self.topic}")
        except ImportError:
            raise ImportError("kafka-python not installed. Run: pip install kafka-python")
    
    async def read(self) -> Dict[str, Any]:
        """Read from Kafka"""
        if not self.consumer:
            raise RuntimeError("Kafka not connected")
        
        # Kafka consumer is synchronous, so we run it in executor
        loop = asyncio.get_event_loop()
        message = await loop.run_in_executor(None, next, self.consumer)
        return message.value
    
    async def close(self):
        """Close Kafka consumer"""
        if self.consumer:
            self.consumer.close()
        logger.info("Kafka consumer closed")

class MQTTConnector(StreamConnector):
    """MQTT stream connector (requires paho-mqtt)"""
    
    def __init__(self, broker: str, port: int, topic: str,
                 username: Optional[str] = None, 
                 password: Optional[str] = None):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.username = username
        self.password = password
        self.client = None
        self.message_queue = asyncio.Queue()
    
    async def connect(self):
        """Connect to MQTT broker"""
        try:
            import paho.mqtt.client as mqtt
            
            self.client = mqtt.Client()
            
            if self.username and self.password:
                self.client.username_pw_set(self.username, self.password)
            
            def on_message(client, userdata, message):
                try:
                    data = json.loads(message.payload.decode('utf-8'))
                    asyncio.create_task(self.message_queue.put(data))
                except Exception as e:
                    logger.error(f"MQTT message error: {e}")
            
            self.client.on_message = on_message
            self.client.connect(self.broker, self.port)
            self.client.subscribe(self.topic)
            self.client.loop_start()
            
            logger.info(f"Connected to MQTT broker: {self.broker}:{self.port}")
        except ImportError:
            raise ImportError("paho-mqtt not installed. Run: pip install paho-mqtt")
    
    async def read(self) -> Dict[str, Any]:
        """Read from MQTT"""
        return await self.message_queue.get()
    
    async def close(self):
        """Close MQTT connection"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        logger.info("MQTT connection closed")

class FileStreamConnector(StreamConnector):
    """File-based stream connector for JSONL files"""
    
    def __init__(self, filepath: str, tail: bool = True, 
                 interval: float = 0.1):
        self.filepath = filepath
        self.tail = tail
        self.interval = interval
        self.file = None
        self.position = 0
    
    async def connect(self):
        """Open file for streaming"""
        self.file = open(self.filepath, 'r')
        if self.tail:
            # Move to end of file
            self.file.seek(0, 2)
            self.position = self.file.tell()
        logger.info(f"Opened file stream: {self.filepath}")
    
    async def read(self) -> Dict[str, Any]:
        """Read from file"""
        if not self.file:
            raise RuntimeError("File not opened")
        
        while True:
            line = self.file.readline()
            if line:
                try:
                    return json.loads(line.strip())
                except json.JSONDecodeError:
                    continue
            else:
                # No new data, wait and check again
                await asyncio.sleep(self.interval)
                
                # Check if file has grown
                self.file.seek(0, 2)
                new_position = self.file.tell()
                if new_position > self.position:
                    self.file.seek(self.position)
                    self.position = new_position
                else:
                    self.file.seek(self.position)
    
    async def close(self):
        """Close file"""
        if self.file:
            self.file.close()
        logger.info("File stream closed")

class StreamManager:
    """Manage multiple stream connectors"""
    
    def __init__(self):
        self.connectors: Dict[str, StreamConnector] = {}
        self.tasks: Dict[str, asyncio.Task] = {}
    
    async def add_connector(self, name: str, connector: StreamConnector,
                          callback: Callable[[Dict[str, Any]], None]):
        """Add a stream connector with callback"""
        await connector.connect()
        self.connectors[name] = connector
        
        # Create task to read from stream
        async def read_loop():
            try:
                while True:
                    data = await connector.read()
                    if data:
                        callback(data)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Stream {name} error: {e}")
        
        self.tasks[name] = asyncio.create_task(read_loop())
    
    async def remove_connector(self, name: str):
        """Remove a stream connector"""
        if name in self.tasks:
            self.tasks[name].cancel()
            await self.tasks[name]
            del self.tasks[name]
        
        if name in self.connectors:
            await self.connectors[name].close()
            del self.connectors[name]
    
    async def close_all(self):
        """Close all connectors"""
        for name in list(self.connectors.keys()):
            await self.remove_connector(name)

# Factory function to create connectors
def create_connector(source_type: str, **kwargs) -> StreamConnector:
    """Create a stream connector based on type"""
    connectors = {
        'websocket': WebSocketConnector,
        'sse': SSEConnector,
        'http': HTTPPollingConnector,
        'kafka': KafkaConnector,
        'mqtt': MQTTConnector,
        'file': FileStreamConnector
    }
    
    if source_type not in connectors:
        raise ValueError(f"Unknown connector type: {source_type}")
    
    return connectors[source_type](**kwargs)