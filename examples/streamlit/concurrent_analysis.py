#!/usr/bin/env python3
"""
Advanced concurrent swarm analysis dashboard for Streamlit.
Specialized for analyzing Claude Code concurrent agent swarm executions.
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict, deque
import networkx as nx
import numpy as np
from streamlit_autorefresh import st_autorefresh
import subprocess
import threading
import queue
import asyncio
import websockets

# Page configuration
st.set_page_config(
    page_title="Concurrent Swarm Analysis",
    page_icon="🐝",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for swarm visualization
st.markdown("""
<style>
    .agent-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        padding: 20px;
        color: white;
        margin: 10px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .metric-highlight {
        background-color: #1f2937;
        border-radius: 10px;
        padding: 15px;
        margin: 5px;
        border: 1px solid #374151;
    }
    .swarm-status {
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'swarm_data' not in st.session_state:
    st.session_state.swarm_data = {
        'agents': {},
        'tasks': deque(maxlen=1000),
        'metrics': defaultdict(list),
        'tool_usage': defaultdict(int),
        'communication_graph': nx.DiGraph(),
        'start_time': datetime.now()
    }

if 'stream_active' not in st.session_state:
    st.session_state.stream_active = False

# Sidebar configuration
st.sidebar.title("🐝 Swarm Configuration")

# Analysis mode
analysis_mode = st.sidebar.selectbox(
    "Analysis Mode",
    ["Real-time Monitoring", "Post-execution Analysis", "Comparative Analysis"]
)

# Stream source
stream_source = st.sidebar.selectbox(
    "Stream Source",
    ["Live Claude Code Process", "WebSocket Stream", "Demo Simulation", "File Upload"]
)

if stream_source == "Live Claude Code Process":
    command = st.sidebar.text_area(
        "Claude Code Command",
        'claude "test a concurrent agent swarm" -p --output-format stream-json --verbose'
    )
    
    if st.sidebar.button("Start Swarm Analysis"):
        st.session_state.stream_active = True
        # Start process in background thread
        def run_process():
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            for line in process.stdout:
                try:
                    data = json.loads(line.strip())
                    process_swarm_message(data)
                except json.JSONDecodeError:
                    continue
                    
        threading.Thread(target=run_process, daemon=True).start()

# Display settings
st.sidebar.subheader("📊 Display Settings")
refresh_rate = st.sidebar.slider("Refresh Rate (sec)", 0.5, 5.0, 1.0)
show_communication = st.sidebar.checkbox("Show Agent Communication", True)
show_performance = st.sidebar.checkbox("Show Performance Metrics", True)
show_tool_usage = st.sidebar.checkbox("Show Tool Usage Analysis", True)

# Auto-refresh
count = st_autorefresh(interval=int(refresh_rate * 1000), limit=None, key="swarm_refresh")

# Main header
st.title("🐝 Concurrent Swarm Analysis Dashboard")
st.markdown("Real-time analysis of Claude Code concurrent agent swarm execution")

# Process swarm messages
def process_swarm_message(data):
    """Process incoming swarm messages"""
    msg_type = data.get("type")
    
    if msg_type == "assistant" and "tool_use" in str(data):
        # Extract tool usage
        content = data.get("message", {}).get("content", [])
        for item in content:
            if item.get("type") == "tool_use":
                tool_name = item.get("name", "unknown")
                st.session_state.swarm_data['tool_usage'][tool_name] += 1
                
                # Track agent spawning
                if "agent_spawn" in tool_name:
                    agent_type = item.get("input", {}).get("type", "unknown")
                    agent_id = f"agent_{len(st.session_state.swarm_data['agents']) + 1}"
                    st.session_state.swarm_data['agents'][agent_id] = {
                        'type': agent_type,
                        'spawn_time': datetime.now(),
                        'tasks_completed': 0,
                        'status': 'active'
                    }
    
    elif msg_type == "swarm_metrics":
        # Store swarm metrics
        metrics = data.get("data", {})
        timestamp = datetime.now()
        
        for key, value in metrics.items():
            if isinstance(value, dict):
                for subkey, subvalue in value.items():
                    if isinstance(subvalue, (int, float)):
                        st.session_state.swarm_data['metrics'][f"{key}.{subkey}"].append({
                            'timestamp': timestamp,
                            'value': subvalue
                        })
            elif isinstance(value, (int, float)):
                st.session_state.swarm_data['metrics'][key].append({
                    'timestamp': timestamp,
                    'value': value
                })

# Swarm Overview Section
col1, col2, col3, col4 = st.columns(4)

with col1:
    total_agents = len(st.session_state.swarm_data['agents'])
    active_agents = sum(1 for a in st.session_state.swarm_data['agents'].values() if a['status'] == 'active')
    st.metric(
        "Total Agents",
        f"{total_agents}",
        delta=f"{active_agents} active"
    )

with col2:
    total_tasks = len(st.session_state.swarm_data['tasks'])
    runtime = datetime.now() - st.session_state.swarm_data['start_time']
    task_rate = total_tasks / max(runtime.total_seconds(), 1)
    st.metric(
        "Task Throughput",
        f"{task_rate:.2f}/sec",
        delta=f"{total_tasks} total"
    )

with col3:
    total_tools = sum(st.session_state.swarm_data['tool_usage'].values())
    st.metric(
        "Tool Operations",
        f"{total_tools:,}",
        delta=f"{len(st.session_state.swarm_data['tool_usage'])} unique"
    )

with col4:
    if st.session_state.swarm_data['metrics'].get('performance.success_rate'):
        latest_success = st.session_state.swarm_data['metrics']['performance.success_rate'][-1]['value']
        st.metric(
            "Success Rate",
            f"{latest_success:.1f}%",
            delta="Optimal" if latest_success > 95 else "Sub-optimal"
        )
    else:
        st.metric("Success Rate", "N/A")

# Agent Network Visualization
if show_communication and st.session_state.swarm_data['agents']:
    st.markdown("---")
    st.subheader("🕸️ Agent Network Topology")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Create network visualization
        fig = go.Figure()
        
        # Add nodes for each agent
        agent_positions = {}
        num_agents = len(st.session_state.swarm_data['agents'])
        
        for i, (agent_id, agent_info) in enumerate(st.session_state.swarm_data['agents'].items()):
            angle = 2 * np.pi * i / num_agents
            x = np.cos(angle)
            y = np.sin(angle)
            agent_positions[agent_id] = (x, y)
            
            # Add node
            fig.add_trace(go.Scatter(
                x=[x],
                y=[y],
                mode='markers+text',
                marker=dict(
                    size=30,
                    color='blue' if agent_info['status'] == 'active' else 'gray'
                ),
                text=[f"{agent_info['type']}\n{agent_id}"],
                textposition="top center",
                showlegend=False
            ))
        
        # Add communication lines (simulated)
        for i in range(num_agents):
            for j in range(i + 1, num_agents):
                if np.random.random() > 0.7:  # 30% chance of communication
                    agent1 = list(st.session_state.swarm_data['agents'].keys())[i]
                    agent2 = list(st.session_state.swarm_data['agents'].keys())[j]
                    x1, y1 = agent_positions[agent1]
                    x2, y2 = agent_positions[agent2]
                    
                    fig.add_trace(go.Scatter(
                        x=[x1, x2],
                        y=[y1, y2],
                        mode='lines',
                        line=dict(color='rgba(100, 100, 100, 0.3)', width=1),
                        showlegend=False
                    ))
        
        fig.update_layout(
            title="Agent Communication Network",
            showlegend=False,
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Agent Status")
        for agent_id, agent_info in st.session_state.swarm_data['agents'].items():
            status_color = "🟢" if agent_info['status'] == 'active' else "🔴"
            st.markdown(f"{status_color} **{agent_id}**: {agent_info['type']}")
            st.caption(f"Tasks: {agent_info['tasks_completed']}")

# Performance Metrics
if show_performance and st.session_state.swarm_data['metrics']:
    st.markdown("---")
    st.subheader("📈 Performance Metrics")
    
    # Create subplots for different metrics
    metrics_to_plot = [
        ('agents.active', 'Active Agents'),
        ('performance.tasks_per_second', 'Tasks/Second'),
        ('coordination.sync_score', 'Sync Score'),
        ('performance.avg_response_time', 'Response Time (ms)')
    ]
    
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=[title for _, title in metrics_to_plot]
    )
    
    for idx, (metric_key, title) in enumerate(metrics_to_plot):
        row = idx // 2 + 1
        col = idx % 2 + 1
        
        if metric_key in st.session_state.swarm_data['metrics']:
            metric_data = st.session_state.swarm_data['metrics'][metric_key]
            timestamps = [m['timestamp'] for m in metric_data]
            values = [m['value'] for m in metric_data]
            
            fig.add_trace(
                go.Scatter(x=timestamps, y=values, mode='lines', name=title),
                row=row, col=col
            )
    
    fig.update_layout(height=600, showlegend=False)
    st.plotly_chart(fig, use_container_width=True)

# Tool Usage Analysis
if show_tool_usage and st.session_state.swarm_data['tool_usage']:
    st.markdown("---")
    st.subheader("🔧 Tool Usage Analysis")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Tool usage pie chart
        tool_names = list(st.session_state.swarm_data['tool_usage'].keys())
        tool_counts = list(st.session_state.swarm_data['tool_usage'].values())
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=tool_names,
            values=tool_counts,
            hole=0.3
        )])
        
        fig_pie.update_layout(
            title="Tool Usage Distribution",
            height=400
        )
        
        st.plotly_chart(fig_pie, use_container_width=True)
    
    with col2:
        # Tool usage over time (simulated)
        st.markdown("### Top Tools by Usage")
        sorted_tools = sorted(
            st.session_state.swarm_data['tool_usage'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for tool, count in sorted_tools[:5]:
            progress = count / max(tool_counts) if tool_counts else 0
            st.markdown(f"**{tool}**")
            st.progress(progress)
            st.caption(f"{count} operations")

# Concurrent Execution Timeline
st.markdown("---")
st.subheader("⏱️ Concurrent Execution Timeline")

# Create Gantt-like chart for agent activities
if st.session_state.swarm_data['agents']:
    fig_timeline = go.Figure()
    
    for i, (agent_id, agent_info) in enumerate(st.session_state.swarm_data['agents'].items()):
        # Simulate task execution periods
        start_time = agent_info['spawn_time']
        current_time = datetime.now()
        
        # Add agent timeline
        fig_timeline.add_trace(go.Scatter(
            x=[start_time, current_time],
            y=[i, i],
            mode='lines',
            line=dict(color='blue', width=20),
            name=f"{agent_id} ({agent_info['type']})",
            hovertemplate=f"{agent_id}<br>Type: {agent_info['type']}<br>Status: {agent_info['status']}"
        ))
    
    fig_timeline.update_layout(
        title="Agent Execution Timeline",
        xaxis_title="Time",
        yaxis_title="Agents",
        height=300,
        showlegend=False
    )
    
    st.plotly_chart(fig_timeline, use_container_width=True)

# Export and Control Section
st.markdown("---")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("📊 Export Analysis"):
        analysis_data = {
            'agents': dict(st.session_state.swarm_data['agents']),
            'tool_usage': dict(st.session_state.swarm_data['tool_usage']),
            'metrics_summary': {
                k: [m['value'] for m in v[-10:]]
                for k, v in st.session_state.swarm_data['metrics'].items()
            },
            'runtime': (datetime.now() - st.session_state.swarm_data['start_time']).total_seconds()
        }
        
        st.download_button(
            "Download Analysis",
            json.dumps(analysis_data, indent=2, default=str),
            f"swarm_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )

with col2:
    if st.button("🔄 Reset Analysis"):
        st.session_state.swarm_data = {
            'agents': {},
            'tasks': deque(maxlen=1000),
            'metrics': defaultdict(list),
            'tool_usage': defaultdict(int),
            'communication_graph': nx.DiGraph(),
            'start_time': datetime.now()
        }
        st.rerun()

with col3:
    status = "🟢 Active" if st.session_state.stream_active else "🔴 Stopped"
    st.markdown(f"### Stream Status: {status}")

# Footer
st.markdown("---")
st.caption(f"Concurrent Swarm Analysis Dashboard | Runtime: {datetime.now() - st.session_state.swarm_data['start_time']}")