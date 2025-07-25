#!/usr/bin/env python3
"""
Demo script to simulate concurrent agent swarm execution with JSON streaming.
This mimics the output of: claude "test a concurrent agent swarm" -p --output-format stream-json
"""

import json
import time
import random
import sys
from datetime import datetime
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

class SwarmSimulator:
    """Simulates a concurrent agent swarm execution"""
    
    def __init__(self, num_agents=5, session_id=None):
        self.num_agents = num_agents
        self.session_id = session_id or str(uuid.uuid4())
        self.agents = []
        self.tools = [
            "mcp__claude-flow__swarm_init",
            "mcp__claude-flow__agent_spawn",
            "mcp__claude-flow__task_orchestrate",
            "TodoWrite",
            "Task",
            "Read",
            "Write",
            "Bash",
            "MultiEdit"
        ]
        self.start_time = time.time()
        
    def emit_message(self, message):
        """Emit a JSON message to stdout"""
        print(json.dumps(message))
        sys.stdout.flush()
        
    def system_init(self):
        """Emit system initialization message"""
        self.emit_message({
            "type": "system",
            "subtype": "init",
            "cwd": "/workspaces/claude-code-flow",
            "session_id": self.session_id,
            "tools": self.tools,
            "mcp_servers": [
                {"name": "claude-flow", "status": "connected"},
                {"name": "ruv-swarm", "status": "connected"}
            ],
            "model": "claude-opus-4-20250514",
            "timestamp": datetime.now().isoformat()
        })
        
    def swarm_init(self):
        """Initialize the swarm"""
        self.emit_message({
            "type": "assistant",
            "message": {
                "id": f"msg_{int(time.time() * 1000)}",
                "type": "message",
                "role": "assistant",
                "content": [{
                    "type": "text",
                    "text": "Initializing concurrent agent swarm for testing..."
                }]
            },
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # Tool use for swarm init
        self.emit_message({
            "type": "assistant",
            "message": {
                "content": [{
                    "type": "tool_use",
                    "id": f"tool_{int(time.time() * 1000)}",
                    "name": "mcp__claude-flow__swarm_init",
                    "input": {
                        "topology": "hierarchical",
                        "maxAgents": self.num_agents,
                        "strategy": "parallel"
                    }
                }]
            },
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat()
        })
        
    def spawn_agents(self):
        """Spawn concurrent agents"""
        agent_types = ["coordinator", "researcher", "coder", "analyst", "tester"]
        
        for i in range(self.num_agents):
            agent_type = agent_types[i % len(agent_types)]
            agent_id = f"agent_{i+1}"
            
            self.agents.append({
                "id": agent_id,
                "type": agent_type,
                "status": "active"
            })
            
            # Emit agent spawn
            self.emit_message({
                "type": "assistant",
                "message": {
                    "content": [{
                        "type": "tool_use",
                        "id": f"tool_{int(time.time() * 1000)}_{i}",
                        "name": "mcp__claude-flow__agent_spawn",
                        "input": {
                            "type": agent_type,
                            "name": f"{agent_type.capitalize()} Agent {i+1}"
                        }
                    }]
                },
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            })
            
            time.sleep(0.1)  # Small delay between spawns
            
    def simulate_agent_work(self, agent_id, task_id):
        """Simulate an agent performing work"""
        operations = [
            ("Read", {"file_path": f"/project/src/module_{random.randint(1,5)}.py"}),
            ("Write", {"file_path": f"/project/output/result_{task_id}.json", "content": "{}"}),
            ("Bash", {"command": "npm test", "description": "Running tests"}),
            ("TodoWrite", {"todos": [{"id": str(task_id), "status": "in_progress", "content": f"Task {task_id}"}]})
        ]
        
        for op_name, op_input in random.sample(operations, k=2):
            self.emit_message({
                "type": "assistant",
                "message": {
                    "content": [{
                        "type": "tool_use",
                        "id": f"tool_{agent_id}_{task_id}_{int(time.time() * 1000)}",
                        "name": op_name,
                        "input": op_input
                    }]
                },
                "parent_tool_use_id": agent_id,
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # Simulate tool result
            time.sleep(random.uniform(0.1, 0.3))
            
            self.emit_message({
                "type": "user",
                "message": {
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "content": f"Operation {op_name} completed successfully"
                    }]
                },
                "parent_tool_use_id": agent_id,
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat()
            })
            
    def emit_swarm_metrics(self):
        """Emit swarm performance metrics"""
        active_agents = sum(1 for a in self.agents if a["status"] == "active")
        
        self.emit_message({
            "type": "swarm_metrics",
            "data": {
                "swarm_id": f"swarm-{self.session_id}",
                "topology": "hierarchical",
                "agents": {
                    "total": len(self.agents),
                    "active": active_agents,
                    "idle": len(self.agents) - active_agents
                },
                "performance": {
                    "tasks_per_second": random.uniform(2.0, 5.0),
                    "avg_response_time": random.uniform(100, 300),
                    "success_rate": random.uniform(95, 99.9)
                },
                "coordination": {
                    "sync_score": random.uniform(0.85, 0.98),
                    "communication_overhead": random.uniform(10, 20),
                    "consensus_time": random.uniform(50, 150)
                }
            },
            "timestamp": datetime.now().isoformat()
        })
        
    def run_concurrent_tasks(self, num_tasks=10):
        """Run tasks concurrently across agents"""
        with ThreadPoolExecutor(max_workers=self.num_agents) as executor:
            futures = []
            
            for task_id in range(num_tasks):
                agent = self.agents[task_id % len(self.agents)]
                future = executor.submit(self.simulate_agent_work, agent["id"], task_id)
                futures.append(future)
                
                # Emit metrics periodically
                if task_id % 3 == 0:
                    self.emit_swarm_metrics()
                
            # Wait for all tasks to complete
            for future in futures:
                future.result()
                
    def summarize_execution(self):
        """Emit execution summary"""
        runtime = time.time() - self.start_time
        
        self.emit_message({
            "type": "assistant",
            "message": {
                "content": [{
                    "type": "text",
                    "text": f"Swarm execution completed successfully!\n\n"
                           f"Summary:\n"
                           f"- Runtime: {runtime:.2f} seconds\n"
                           f"- Agents deployed: {len(self.agents)}\n"
                           f"- Tasks completed: 10\n"
                           f"- Average performance: 3.5 tasks/second"
                }]
            },
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat()
        })
        
    def run(self):
        """Run the complete swarm simulation"""
        self.system_init()
        time.sleep(0.5)
        
        self.swarm_init()
        time.sleep(0.5)
        
        self.spawn_agents()
        time.sleep(0.5)
        
        self.run_concurrent_tasks()
        
        self.summarize_execution()

def main():
    """Main entry point"""
    simulator = SwarmSimulator(num_agents=5)
    simulator.run()

if __name__ == "__main__":
    main()