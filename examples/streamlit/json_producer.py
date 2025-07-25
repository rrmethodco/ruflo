#!/usr/bin/env python3
"""
JSON Stream Producer - Generates sample JSON data streams for testing
"""

import json
import time
import random
import asyncio
import websockets
from datetime import datetime
import numpy as np
import argparse
from aiohttp import web
import threading
import queue

class JSONStreamProducer:
    """Produces JSON streams with various patterns"""
    
    def __init__(self, pattern='sine', base_value=50, noise_level=10):
        self.pattern = pattern
        self.base_value = base_value
        self.noise_level = noise_level
        self.start_time = time.time()
        self.message_count = 0
        
    def generate_data_point(self):
        """Generate a single data point based on pattern"""
        self.message_count += 1
        elapsed = time.time() - self.start_time
        
        # Base value calculation based on pattern
        if self.pattern == 'sine':
            value = self.base_value + np.sin(elapsed / 10) * 20
        elif self.pattern == 'random':
            value = self.base_value + random.uniform(-20, 20)
        elif self.pattern == 'trending':
            value = self.base_value + (elapsed / 10) + random.uniform(-5, 5)
        elif self.pattern == 'sawtooth':
            value = self.base_value + (elapsed % 20) * 2 - 20
        else:
            value = self.base_value
        
        # Add noise
        value += np.random.normal(0, self.noise_level)
        
        # Occasionally add anomalies
        if random.random() < 0.05:  # 5% chance
            value += random.choice([-1, 1]) * random.uniform(30, 60)
            status = "anomaly"
        else:
            status = "normal"
        
        # Create data point
        data = {
            "id": self.message_count,
            "timestamp": datetime.now().isoformat(),
            "value": round(value, 2),
            "category": random.choice(["A", "B", "C"]),
            "status": status,
            "metadata": {
                "pattern": self.pattern,
                "elapsed_seconds": round(elapsed, 2),
                "source": "json_producer"
            }
        }
        
        return data

class StreamServers:
    """Various server implementations for streaming JSON"""
    
    def __init__(self, producer):
        self.producer = producer
        self.data_queue = queue.Queue()
        
    async def websocket_handler(self, websocket, path):
        """WebSocket server handler"""
        print(f"WebSocket client connected from {websocket.remote_address}")
        try:
            while True:
                data = self.producer.generate_data_point()
                await websocket.send(json.dumps(data))
                await asyncio.sleep(1)
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket client disconnected")
    
    async def sse_handler(self, request):
        """Server-Sent Events handler"""
        response = web.StreamResponse()
        response.headers['Content-Type'] = 'text/event-stream'
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Access-Control-Allow-Origin'] = '*'
        await response.prepare(request)
        
        try:
            while True:
                data = self.producer.generate_data_point()
                await response.write(f"data: {json.dumps(data)}\n\n".encode('utf-8'))
                await asyncio.sleep(1)
        except ConnectionResetError:
            pass
        
        return response
    
    async def http_stream_handler(self, request):
        """HTTP streaming endpoint"""
        response = web.StreamResponse()
        response.headers['Content-Type'] = 'application/x-ndjson'
        response.headers['Access-Control-Allow-Origin'] = '*'
        await response.prepare(request)
        
        try:
            for _ in range(100):  # Send 100 records
                data = self.producer.generate_data_point()
                await response.write(f"{json.dumps(data)}\n".encode('utf-8'))
                await asyncio.sleep(0.1)
        except ConnectionResetError:
            pass
        
        return response
    
    def start_websocket_server(self, host='localhost', port=8765):
        """Start WebSocket server"""
        print(f"Starting WebSocket server on ws://{host}:{port}")
        start_server = websockets.serve(self.websocket_handler, host, port)
        asyncio.get_event_loop().run_until_complete(start_server)
        asyncio.get_event_loop().run_forever()
    
    def start_http_server(self, host='localhost', port=8080):
        """Start HTTP server with SSE and streaming endpoints"""
        app = web.Application()
        app.router.add_get('/sse', self.sse_handler)
        app.router.add_get('/stream', self.http_stream_handler)
        
        # Add a simple status endpoint
        async def status(request):
            return web.json_response({
                "status": "running",
                "message_count": self.producer.message_count,
                "pattern": self.producer.pattern
            })
        
        app.router.add_get('/status', status)
        
        print(f"Starting HTTP server on http://{host}:{port}")
        print(f"  SSE endpoint: http://{host}:{port}/sse")
        print(f"  Stream endpoint: http://{host}:{port}/stream")
        print(f"  Status endpoint: http://{host}:{port}/status")
        
        web.run_app(app, host=host, port=port)
    
    def write_to_file(self, filename, duration=60):
        """Write JSON stream to file"""
        print(f"Writing JSON stream to {filename} for {duration} seconds...")
        
        with open(filename, 'w') as f:
            start_time = time.time()
            while time.time() - start_time < duration:
                data = self.producer.generate_data_point()
                f.write(json.dumps(data) + '\n')
                f.flush()
                time.sleep(1)
        
        print(f"Finished writing to {filename}")
    
    def console_output(self, duration=None):
        """Output JSON to console"""
        print("Streaming JSON to console... (Press Ctrl+C to stop)")
        
        try:
            start_time = time.time()
            while True:
                if duration and time.time() - start_time > duration:
                    break
                
                data = self.producer.generate_data_point()
                print(json.dumps(data))
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStream stopped.")

def main():
    parser = argparse.ArgumentParser(description='JSON Stream Producer')
    parser.add_argument('mode', choices=['console', 'file', 'websocket', 'http'],
                        help='Output mode for the JSON stream')
    parser.add_argument('--pattern', choices=['sine', 'random', 'trending', 'sawtooth'],
                        default='sine', help='Data generation pattern')
    parser.add_argument('--base-value', type=float, default=50,
                        help='Base value for data generation')
    parser.add_argument('--noise-level', type=float, default=10,
                        help='Noise level for data generation')
    parser.add_argument('--host', default='localhost',
                        help='Host for server modes')
    parser.add_argument('--port', type=int, default=8080,
                        help='Port for server modes')
    parser.add_argument('--file', default='stream.jsonl',
                        help='Output file for file mode')
    parser.add_argument('--duration', type=int, default=60,
                        help='Duration in seconds for file/console mode')
    
    args = parser.parse_args()
    
    # Create producer
    producer = JSONStreamProducer(
        pattern=args.pattern,
        base_value=args.base_value,
        noise_level=args.noise_level
    )
    
    # Create server
    servers = StreamServers(producer)
    
    # Start appropriate mode
    if args.mode == 'console':
        servers.console_output(args.duration)
    elif args.mode == 'file':
        servers.write_to_file(args.file, args.duration)
    elif args.mode == 'websocket':
        servers.start_websocket_server(args.host, args.port or 8765)
    elif args.mode == 'http':
        servers.start_http_server(args.host, args.port)

if __name__ == '__main__':
    main()