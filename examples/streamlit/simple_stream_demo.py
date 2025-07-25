#!/usr/bin/env python3
"""
Simple demo for JSON stream analysis without external dependencies
"""

import streamlit as st
import json
import time
import pandas as pd
import plotly.express as px
from datetime import datetime
from collections import deque
import subprocess
import threading
import queue

# Page config
st.set_page_config(
    page_title="JSON Stream Demo",
    page_icon="📊",
    layout="wide"
)

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = deque(maxlen=100)
if 'stream_active' not in st.session_state:
    st.session_state.stream_active = False

st.title("🔄 Claude Code JSON Stream Analysis - Simple Demo")

# Demo controls
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("🚀 Start Demo Stream"):
        st.session_state.stream_active = True
        # Generate demo data
        for i in range(20):
            msg = {
                "type": "assistant",
                "message": f"Processing task {i}",
                "timestamp": datetime.now().isoformat(),
                "value": i * 10
            }
            st.session_state.messages.append(msg)

with col2:
    if st.button("🛑 Stop Stream"):
        st.session_state.stream_active = False

with col3:
    if st.button("🗑️ Clear Data"):
        st.session_state.messages.clear()
        st.rerun()

# Display metrics
if st.session_state.messages:
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Messages", len(st.session_state.messages))
    
    with col2:
        values = [m.get('value', 0) for m in st.session_state.messages if 'value' in m]
        if values:
            st.metric("Average Value", f"{sum(values)/len(values):.1f}")
    
    with col3:
        st.metric("Stream Status", "Active" if st.session_state.stream_active else "Stopped")

    # Create DataFrame
    df = pd.DataFrame(list(st.session_state.messages))
    
    # Time series plot
    if 'timestamp' in df.columns and 'value' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        fig = px.line(df, x='timestamp', y='value', title='Value Stream Over Time')
        st.plotly_chart(fig, use_container_width=True)
    
    # Message type distribution
    if 'type' in df.columns:
        type_counts = df['type'].value_counts()
        fig_pie = px.pie(values=type_counts.values, names=type_counts.index, title='Message Types')
        st.plotly_chart(fig_pie, use_container_width=True)
    
    # Recent messages
    st.subheader("Recent Messages")
    st.dataframe(df.tail(10), use_container_width=True)

else:
    st.info("Click 'Start Demo Stream' to begin analyzing JSON data!")

# Manual refresh button
if st.button("🔄 Refresh"):
    st.rerun()