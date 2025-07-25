#!/usr/bin/env python3
"""
WebSocket server for streaming JSON data in real-time.
Supports Claude Code stream-json format and custom streams.
"""

import asyncio
import websockets
import json
import time
import random
import numpy as np
from datetime import datetime
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JSONStreamProducer:
    """Produces JSON streams in various formats including Claude Code format"""
    
    def __init__(self, format_type="claude-code"):
        self.format_type = format_type
        self.session_id = f"{random.randint(1000, 9999)}-{int(time.time())}"
        self.message_count = 0
        
    def generate_claude_code_message(self):
        """Generate Claude Code stream-json format message"""
        message_types = ["assistant", "user", "system", "tool_use", "tool_result"]
        
        # Simulate different message types
        msg_type = random.choice(message_types)
        
        if msg_type == "assistant":
            return {
                "type": "assistant",
                "message": {
                    "id": f"msg_{self.message_count:06d}",
                    "type": "message",
                    "role": "assistant",
                    "model": "claude-opus-4",
                    "content": [{
                        "type": "text",
                        "text": f"Processing task {self.message_count} with swarm coordination..."
                    }],
                    "usage": {
                        "input_tokens": random.randint(100, 1000),
                        "output_tokens": random.randint(50, 500)
                    }
                },
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            }
        
        elif msg_type == "tool_use":
            tools = ["mcp__claude-flow__swarm_init", "TodoWrite", "Task", "Bash", "Read", "Write"]
            return {
                "type": "tool_use",
                "tool": random.choice(tools),
                "input": {
                    "description": f"Executing tool operation {self.message_count}"
                },
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            }
        
        elif msg_type == "system":
            subtypes = ["init", "progress", "complete", "error"]
            return {
                "type": "system",
                "subtype": random.choice(subtypes),
                "data": {
                    "progress": random.uniform(0, 100),
                    "agents_active": random.randint(1, 8),
                    "tasks_completed": random.randint(0, 50)
                },
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            }
        
        else:
            # Generic metrics message
            return {
                "type": "metrics",
                "data": {
                    "cpu_usage": random.uniform(10, 90),
                    "memory_usage": random.uniform(20, 80),
                    "active_agents": random.randint(1, 8),
                    "tasks_queued": random.randint(0, 20),
                    "throughput": random.uniform(100, 1000)
                },
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            }
    
    def generate_swarm_metrics(self):
        """Generate swarm analysis metrics"""
        return {
            "type": "swarm_metrics",
            "data": {
                "swarm_id": f"swarm-{self.session_id}",
                "topology": random.choice(["mesh", "hierarchical", "ring", "star"]),
                "agents": {
                    "total": random.randint(3, 12),
                    "active": random.randint(1, 8),
                    "idle": random.randint(0, 4)
                },
                "performance": {
                    "tasks_per_second": random.uniform(0.5, 5.0),
                    "avg_response_time": random.uniform(100, 1000),
                    "success_rate": random.uniform(85, 99.9)
                },
                "coordination": {
                    "sync_score": random.uniform(0.7, 1.0),
                    "communication_overhead": random.uniform(5, 25),
                    "consensus_time": random.uniform(50, 500)
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_analysis_data(self):
        """Generate analysis data stream"""
        # Simulate various data patterns
        base_value = 50
        trend = np.sin(time.time() / 10) * 20
        noise = np.random.normal(0, 10)
        value = base_value + trend + noise
        
        # Occasionally add anomalies
        if random.random() < 0.1:
            value += random.choice([-1, 1]) * random.uniform(30, 60)
        
        return {
            "type": "analysis",
            "data": {
                "value": round(value, 2),
                "category": random.choice(["A", "B", "C", "D"]),
                "status": "anomaly" if abs(value - base_value) > 40 else "normal",
                "confidence": random.uniform(0.7, 0.99),
                "agent_id": f"agent-{random.randint(1, 8)}",
                "task_id": f"task-{self.message_count}"
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_message(self):
        """Generate a message based on format type"""
        self.message_count += 1
        
        if self.format_type == "claude-code":
            return self.generate_claude_code_message()
        elif self.format_type == "swarm":
            return self.generate_swarm_metrics()
        elif self.format_type == "analysis":
            return self.generate_analysis_data()
        elif self.format_type == "mixed":
            # Mix different message types
            generators = [
                self.generate_claude_code_message,
                self.generate_swarm_metrics,
                self.generate_analysis_data
            ]
            return random.choice(generators)()
        else:
            # Default simple format
            return {
                "type": "data",
                "value": random.uniform(0, 100),
                "timestamp": datetime.now().isoformat()
            }

async def handle_client(websocket, path):
    """Handle WebSocket client connections"""
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"Client connected: {client_id}")
    
    try:
        # Get client preferences
        try:
            init_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            config = json.loads(init_msg)
            format_type = config.get("format", "mixed")
            rate = config.get("rate", 1.0)  # messages per second
        except (asyncio.TimeoutError, json.JSONDecodeError):
            # Use defaults if no config received
            format_type = "mixed"
            rate = 1.0
        
        producer = JSONStreamProducer(format_type)
        
        # Send initial connection confirmation
        await websocket.send(json.dumps({
            "type": "connection",
            "status": "connected",
            "session_id": producer.session_id,
            "format": format_type,
            "rate": rate
        }))
        
        # Stream data to client
        while True:
            message = producer.generate_message()
            await websocket.send(json.dumps(message))
            await asyncio.sleep(1.0 / rate)
            
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Error handling client {client_id}: {e}")
    finally:
        logger.info(f"Closing connection for: {client_id}")

async def main(host="localhost", port=8765):
    """Start the WebSocket server"""
    logger.info(f"Starting WebSocket server on ws://{host}:{port}")
    
    async with websockets.serve(handle_client, host, port):
        logger.info("Server is running. Press Ctrl+C to stop.")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JSON Stream WebSocket Server")
    parser.add_argument("--host", default="localhost", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind to")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        logger.info("Server stopped by user")