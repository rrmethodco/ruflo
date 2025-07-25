#!/usr/bin/env python3
"""
Streamlit app for real-time JSON stream analysis.
Connects to WebSocket server or processes Claude Code stream-json output.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import asyncio
import websockets
from datetime import datetime
from collections import deque, defaultdict
import numpy as np
from streamlit_autorefresh import st_autorefresh
import subprocess
import threading
import queue

# Page configuration
st.set_page_config(
    page_title="Claude Code Stream Analysis",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'data_buffer' not in st.session_state:
    st.session_state.data_buffer = deque(maxlen=5000)
if 'swarm_metrics' not in st.session_state:
    st.session_state.swarm_metrics = defaultdict(list)
if 'message_counts' not in st.session_state:
    st.session_state.message_counts = defaultdict(int)
if 'start_time' not in st.session_state:
    st.session_state.start_time = datetime.now()
if 'stream_queue' not in st.session_state:
    st.session_state.stream_queue = queue.Queue()
if 'websocket_connected' not in st.session_state:
    st.session_state.websocket_connected = False

# Custom CSS for better styling
st.markdown("""
<style>
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 5px;
    }
    .status-active { background-color: #00ff00; }
    .status-idle { background-color: #ffff00; }
    .status-error { background-color: #ff0000; }
</style>
""", unsafe_allow_html=True)

# Sidebar configuration
st.sidebar.title("⚙️ Stream Configuration")

# Data source selection
data_source = st.sidebar.selectbox(
    "Data Source",
    ["WebSocket Server", "Claude Code Process", "File Upload", "Demo Mode"]
)

# Connection settings
if data_source == "WebSocket Server":
    ws_host = st.sidebar.text_input("WebSocket Host", "localhost")
    ws_port = st.sidebar.number_input("WebSocket Port", 8765)
    stream_format = st.sidebar.selectbox(
        "Stream Format",
        ["mixed", "claude-code", "swarm", "analysis"]
    )
    stream_rate = st.sidebar.slider("Stream Rate (msg/sec)", 0.5, 10.0, 1.0)

elif data_source == "Claude Code Process":
    command = st.sidebar.text_area(
        "Claude Code Command",
        'claude "test a concurrent agent swarm" -p --output-format stream-json --verbose'
    )

# Display settings
st.sidebar.subheader("📊 Display Settings")
refresh_interval = st.sidebar.slider("Refresh Interval (sec)", 0.5, 5.0, 1.0)
buffer_size = st.sidebar.slider("Buffer Size", 100, 5000, 1000)
show_raw_data = st.sidebar.checkbox("Show Raw JSON", False)

# Auto-refresh
count = st_autorefresh(interval=int(refresh_interval * 1000), limit=None, key="stream_refresh")

# Main title and status
col1, col2 = st.columns([3, 1])
with col1:
    st.title("🔄 Claude Code Stream Analysis")
with col2:
    if st.session_state.websocket_connected:
        st.success("🟢 Connected")
    else:
        st.info("🟡 Disconnected")

st.markdown("---")

# WebSocket connection handler
async def connect_websocket(host, port, format_type, rate):
    """Connect to WebSocket server and stream data"""
    uri = f"ws://{host}:{port}"
    
    try:
        async with websockets.connect(uri) as websocket:
            st.session_state.websocket_connected = True
            
            # Send configuration
            config = {"format": format_type, "rate": rate}
            await websocket.send(json.dumps(config))
            
            # Receive messages
            async for message in websocket:
                data = json.loads(message)
                st.session_state.stream_queue.put(data)
                
    except Exception as e:
        st.error(f"WebSocket connection error: {e}")
        st.session_state.websocket_connected = False

def process_claude_code_stream(command):
    """Process Claude Code command output"""
    try:
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
                # Parse JSON line
                data = json.loads(line.strip())
                st.session_state.stream_queue.put(data)
            except json.JSONDecodeError:
                continue
                
    except Exception as e:
        st.error(f"Error running Claude Code: {e}")

def process_stream_data(data):
    """Process incoming stream data"""
    # Add to buffer
    st.session_state.data_buffer.append(data)
    
    # Update message counts
    msg_type = data.get("type", "unknown")
    st.session_state.message_counts[msg_type] += 1
    
    # Process swarm metrics
    if msg_type == "swarm_metrics":
        metrics = data.get("data", {})
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                st.session_state.swarm_metrics[key].append(value)
    
    # Process agent data
    elif msg_type in ["tool_use", "assistant"]:
        agent_data = {
            "timestamp": data.get("timestamp", datetime.now().isoformat()),
            "type": msg_type,
            "tokens": data.get("message", {}).get("usage", {}).get("output_tokens", 0)
        }
        st.session_state.swarm_metrics["agent_activity"].append(agent_data)

# Start data collection based on source
if data_source == "WebSocket Server":
    if st.sidebar.button("Connect to WebSocket"):
        # Start WebSocket connection in background
        loop = asyncio.new_event_loop()
        threading.Thread(
            target=lambda: loop.run_until_complete(
                connect_websocket(ws_host, ws_port, stream_format, stream_rate)
            )
        ).start()

elif data_source == "Claude Code Process":
    if st.sidebar.button("Start Claude Code Stream"):
        # Start process in background
        threading.Thread(
            target=lambda: process_claude_code_stream(command)
        ).start()

# Process queued messages
while not st.session_state.stream_queue.empty():
    try:
        data = st.session_state.stream_queue.get_nowait()
        process_stream_data(data)
    except queue.Empty:
        break

# Metrics Overview
st.subheader("📊 Stream Metrics")

col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    total_messages = sum(st.session_state.message_counts.values())
    st.metric(
        "Total Messages",
        f"{total_messages:,}",
        delta=f"+{len(st.session_state.data_buffer)} buffered"
    )

with col2:
    runtime = datetime.now() - st.session_state.start_time
    rate = total_messages / max(runtime.total_seconds(), 1)
    st.metric(
        "Message Rate",
        f"{rate:.1f}/sec",
        delta=f"{runtime.total_seconds():.0f}s runtime"
    )

with col3:
    agent_msgs = st.session_state.message_counts.get("assistant", 0)
    tool_msgs = st.session_state.message_counts.get("tool_use", 0)
    st.metric(
        "Agent Activity",
        f"{agent_msgs + tool_msgs:,}",
        delta=f"{tool_msgs} tool uses"
    )

with col4:
    swarm_msgs = st.session_state.message_counts.get("swarm_metrics", 0)
    st.metric(
        "Swarm Updates",
        f"{swarm_msgs:,}",
        delta="Active" if swarm_msgs > 0 else "Inactive"
    )

with col5:
    error_msgs = st.session_state.message_counts.get("error", 0)
    st.metric(
        "Errors",
        f"{error_msgs:,}",
        delta="⚠️" if error_msgs > 0 else "✅"
    )

# Message Type Distribution
st.markdown("---")
col1, col2 = st.columns(2)

with col1:
    st.subheader("📈 Message Type Distribution")
    if st.session_state.message_counts:
        fig_pie = px.pie(
            values=list(st.session_state.message_counts.values()),
            names=list(st.session_state.message_counts.keys()),
            title="Message Types"
        )
        st.plotly_chart(fig_pie, use_container_width=True)

with col2:
    st.subheader("🕐 Message Timeline")
    if st.session_state.data_buffer:
        # Create timeline data
        timeline_data = []
        for msg in list(st.session_state.data_buffer)[-100:]:  # Last 100 messages
            timeline_data.append({
                "timestamp": pd.to_datetime(msg.get("timestamp", datetime.now())),
                "type": msg.get("type", "unknown"),
                "value": 1
            })
        
        if timeline_data:
            df_timeline = pd.DataFrame(timeline_data)
            df_timeline = df_timeline.groupby(
                [pd.Grouper(key='timestamp', freq='1S'), 'type']
            ).sum().reset_index()
            
            fig_timeline = px.area(
                df_timeline,
                x='timestamp',
                y='value',
                color='type',
                title="Messages Over Time"
            )
            st.plotly_chart(fig_timeline, use_container_width=True)

# Swarm Analysis
if st.session_state.swarm_metrics:
    st.markdown("---")
    st.subheader("🐝 Swarm Analysis")
    
    # Create swarm metrics visualization
    if "agents" in st.session_state.swarm_metrics:
        col1, col2, col3 = st.columns(3)
        
        with col1:
            # Agent activity gauge
            latest_agents = st.session_state.swarm_metrics["agents"][-1] if st.session_state.swarm_metrics["agents"] else {}
            if isinstance(latest_agents, dict):
                fig_gauge = go.Figure(go.Indicator(
                    mode="gauge+number",
                    value=latest_agents.get("active", 0),
                    domain={'x': [0, 1], 'y': [0, 1]},
                    title={'text': "Active Agents"},
                    gauge={'axis': {'range': [None, latest_agents.get("total", 10)]},
                           'bar': {'color': "darkblue"},
                           'steps': [
                               {'range': [0, latest_agents.get("total", 10) * 0.3], 'color': "lightgray"},
                               {'range': [latest_agents.get("total", 10) * 0.3, latest_agents.get("total", 10) * 0.7], 'color': "gray"}],
                           'threshold': {'line': {'color': "red", 'width': 4},
                                       'thickness': 0.75,
                                       'value': latest_agents.get("total", 10) * 0.9}}
                ))
                st.plotly_chart(fig_gauge, use_container_width=True)
        
        with col2:
            # Performance metrics
            if "performance" in st.session_state.swarm_metrics:
                perf_data = st.session_state.swarm_metrics["performance"][-1] if st.session_state.swarm_metrics["performance"] else {}
                if isinstance(perf_data, dict):
                    st.metric("Tasks/Second", f"{perf_data.get('tasks_per_second', 0):.2f}")
                    st.metric("Success Rate", f"{perf_data.get('success_rate', 0):.1f}%")
                    st.metric("Avg Response", f"{perf_data.get('avg_response_time', 0):.0f}ms")
        
        with col3:
            # Coordination metrics
            if "coordination" in st.session_state.swarm_metrics:
                coord_data = st.session_state.swarm_metrics["coordination"][-1] if st.session_state.swarm_metrics["coordination"] else {}
                if isinstance(coord_data, dict):
                    st.metric("Sync Score", f"{coord_data.get('sync_score', 0):.2f}")
                    st.metric("Comm Overhead", f"{coord_data.get('communication_overhead', 0):.1f}%")
                    st.metric("Consensus Time", f"{coord_data.get('consensus_time', 0):.0f}ms")

# Raw Data Display
if show_raw_data and st.session_state.data_buffer:
    st.markdown("---")
    st.subheader("📋 Raw JSON Stream")
    
    # Show last N messages
    display_count = st.slider("Number of messages to display", 1, 50, 10)
    recent_messages = list(st.session_state.data_buffer)[-display_count:]
    
    for i, msg in enumerate(reversed(recent_messages)):
        with st.expander(f"Message {len(recent_messages) - i}: {msg.get('type', 'unknown')}"):
            st.json(msg)

# Export functionality
st.markdown("---")
st.subheader("💾 Export Data")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Export as JSON"):
        json_data = json.dumps(list(st.session_state.data_buffer), indent=2)
        st.download_button(
            label="Download JSON",
            data=json_data,
            file_name=f"stream_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )

with col2:
    if st.button("Export Metrics"):
        metrics_data = {
            "message_counts": dict(st.session_state.message_counts),
            "swarm_metrics": {k: v[-10:] for k, v in st.session_state.swarm_metrics.items()},
            "runtime": (datetime.now() - st.session_state.start_time).total_seconds()
        }
        st.download_button(
            label="Download Metrics",
            data=json.dumps(metrics_data, indent=2),
            file_name=f"metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )

with col3:
    if st.button("Clear Buffer"):
        st.session_state.data_buffer.clear()
        st.session_state.message_counts.clear()
        st.session_state.swarm_metrics.clear()
        st.rerun()

# Footer
st.markdown("---")
st.caption(f"Claude Code Stream Analysis | Last update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")