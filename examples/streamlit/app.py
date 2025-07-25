import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import time
from datetime import datetime, timedelta
import asyncio
import aiohttp
from collections import deque
import numpy as np
from streamlit_autorefresh import st_autorefresh

# Page config
st.set_page_config(
    page_title="Real-time JSON Stream Analysis",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'data_buffer' not in st.session_state:
    st.session_state.data_buffer = deque(maxlen=1000)
if 'metrics' not in st.session_state:
    st.session_state.metrics = {
        'total_messages': 0,
        'error_count': 0,
        'avg_value': 0,
        'max_value': float('-inf'),
        'min_value': float('inf')
    }
if 'start_time' not in st.session_state:
    st.session_state.start_time = datetime.now()

# Sidebar configuration
st.sidebar.title("⚙️ Configuration")

# Data source selection
data_source = st.sidebar.selectbox(
    "Data Source",
    ["Simulated Stream", "HTTP Endpoint", "WebSocket", "File Upload"]
)

# Refresh settings
refresh_interval = st.sidebar.slider(
    "Refresh Interval (seconds)",
    min_value=0.5,
    max_value=10.0,
    value=1.0,
    step=0.5
)

# Auto-refresh
count = st_autorefresh(interval=int(refresh_interval * 1000), limit=None, key="data_refresh")

# Analysis settings
st.sidebar.subheader("📈 Analysis Settings")
window_size = st.sidebar.slider("Moving Average Window", 5, 50, 20)
show_outliers = st.sidebar.checkbox("Highlight Outliers", True)
outlier_threshold = st.sidebar.slider("Outlier Threshold (σ)", 1.0, 4.0, 2.0, 0.5)

# Main title
st.title("🔄 Real-time JSON Stream Analysis")
st.markdown("---")

# Function to process JSON data
def process_json_data(json_str):
    try:
        data = json.loads(json_str)
        # Add timestamp if not present
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        # Update metrics
        if 'value' in data:
            st.session_state.metrics['total_messages'] += 1
            value = float(data['value'])
            
            # Update min/max
            st.session_state.metrics['max_value'] = max(
                st.session_state.metrics['max_value'], value
            )
            st.session_state.metrics['min_value'] = min(
                st.session_state.metrics['min_value'], value
            )
            
            # Update average
            current_avg = st.session_state.metrics['avg_value']
            count = st.session_state.metrics['total_messages']
            st.session_state.metrics['avg_value'] = (
                (current_avg * (count - 1) + value) / count
            )
        
        st.session_state.data_buffer.append(data)
        return data
    except json.JSONDecodeError:
        st.session_state.metrics['error_count'] += 1
        return None

# Simulated data generator
def generate_simulated_data():
    base_value = 50
    noise = np.random.normal(0, 10)
    trend = np.sin(time.time() / 10) * 20
    value = base_value + trend + noise
    
    # Occasionally add outliers
    if np.random.random() < 0.05:
        value += np.random.choice([-1, 1]) * np.random.uniform(30, 50)
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "value": round(value, 2),
        "category": np.random.choice(["A", "B", "C"]),
        "status": "normal" if abs(value - base_value) < 30 else "anomaly"
    }
    
    return json.dumps(data)

# Data collection based on source
if data_source == "Simulated Stream":
    # Generate new data point
    new_data = generate_simulated_data()
    process_json_data(new_data)

elif data_source == "File Upload":
    uploaded_file = st.sidebar.file_uploader("Upload JSON Lines file", type=['jsonl', 'json'])
    if uploaded_file:
        for line in uploaded_file:
            process_json_data(line.decode('utf-8'))

# Metrics row
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    st.metric(
        "Total Messages",
        f"{st.session_state.metrics['total_messages']:,}",
        delta=f"+{len(st.session_state.data_buffer)} in buffer"
    )

with col2:
    st.metric(
        "Average Value",
        f"{st.session_state.metrics['avg_value']:.2f}",
        delta=f"{st.session_state.metrics['avg_value'] - 50:.2f}"
    )

with col3:
    st.metric(
        "Max Value",
        f"{st.session_state.metrics['max_value']:.2f}"
    )

with col4:
    st.metric(
        "Min Value",
        f"{st.session_state.metrics['min_value']:.2f}"
    )

with col5:
    runtime = datetime.now() - st.session_state.start_time
    st.metric(
        "Runtime",
        f"{runtime.total_seconds():.0f}s",
        delta=f"{st.session_state.metrics['error_count']} errors"
    )

# Convert buffer to DataFrame for analysis
if st.session_state.data_buffer:
    df = pd.DataFrame(list(st.session_state.data_buffer))
    
    # Ensure timestamp is datetime
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Create visualizations
    st.markdown("---")
    
    # Time series plot
    if 'value' in df.columns and 'timestamp' in df.columns:
        st.subheader("📊 Real-time Value Stream")
        
        # Calculate moving average
        if len(df) >= window_size:
            df['moving_avg'] = df['value'].rolling(window=window_size).mean()
        
        # Detect outliers
        if show_outliers and len(df) > 10:
            mean = df['value'].mean()
            std = df['value'].std()
            df['is_outlier'] = np.abs(df['value'] - mean) > (outlier_threshold * std)
        
        # Create time series plot
        fig = go.Figure()
        
        # Main data line
        fig.add_trace(go.Scatter(
            x=df['timestamp'],
            y=df['value'],
            mode='lines+markers',
            name='Value',
            line=dict(color='#1f77b4', width=2),
            marker=dict(size=4)
        ))
        
        # Moving average
        if 'moving_avg' in df.columns:
            fig.add_trace(go.Scatter(
                x=df['timestamp'],
                y=df['moving_avg'],
                mode='lines',
                name=f'{window_size}-point Moving Avg',
                line=dict(color='#ff7f0e', width=2, dash='dash')
            ))
        
        # Highlight outliers
        if show_outliers and 'is_outlier' in df.columns:
            outliers = df[df['is_outlier']]
            if not outliers.empty:
                fig.add_trace(go.Scatter(
                    x=outliers['timestamp'],
                    y=outliers['value'],
                    mode='markers',
                    name='Outliers',
                    marker=dict(color='red', size=10, symbol='x')
                ))
        
        fig.update_layout(
            height=400,
            showlegend=True,
            hovermode='x unified',
            xaxis_title="Time",
            yaxis_title="Value"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Category distribution
    col1, col2 = st.columns(2)
    
    with col1:
        if 'category' in df.columns:
            st.subheader("📊 Category Distribution")
            category_counts = df['category'].value_counts()
            
            fig_pie = px.pie(
                values=category_counts.values,
                names=category_counts.index,
                title="Message Distribution by Category"
            )
            st.plotly_chart(fig_pie, use_container_width=True)
    
    with col2:
        if 'status' in df.columns:
            st.subheader("🚦 Status Overview")
            status_counts = df['status'].value_counts()
            
            fig_bar = px.bar(
                x=status_counts.index,
                y=status_counts.values,
                title="Status Distribution",
                color=status_counts.index,
                color_discrete_map={'normal': 'green', 'anomaly': 'red'}
            )
            st.plotly_chart(fig_bar, use_container_width=True)
    
    # Recent data table
    st.subheader("📋 Recent Data")
    
    # Show last N records
    display_count = st.slider("Number of recent records to display", 5, 50, 10)
    recent_data = df.tail(display_count).sort_values('timestamp', ascending=False)
    
    # Format the dataframe for display
    display_df = recent_data.copy()
    if 'timestamp' in display_df.columns:
        display_df['timestamp'] = display_df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True
    )
    
    # Statistical summary
    if st.checkbox("Show Statistical Summary"):
        st.subheader("📊 Statistical Summary")
        if 'value' in df.columns:
            summary_stats = df['value'].describe()
            st.dataframe(summary_stats)
    
    # Export data
    st.markdown("---")
    st.subheader("💾 Export Data")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        csv = df.to_csv(index=False)
        st.download_button(
            label="Download as CSV",
            data=csv,
            file_name=f"stream_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    
    with col2:
        json_data = df.to_json(orient='records', date_format='iso')
        st.download_button(
            label="Download as JSON",
            data=json_data,
            file_name=f"stream_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )
    
    with col3:
        if st.button("Clear Buffer"):
            st.session_state.data_buffer.clear()
            st.session_state.metrics = {
                'total_messages': 0,
                'error_count': 0,
                'avg_value': 0,
                'max_value': float('-inf'),
                'min_value': float('inf')
            }
            st.rerun()

else:
    st.info("Waiting for data... The stream will start populating shortly.")

# Footer
st.markdown("---")
st.caption(f"Last refresh: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")