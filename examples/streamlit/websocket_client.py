import streamlit as st
import asyncio
import websockets
import json
import pandas as pd
from datetime import datetime
from collections import deque
import threading
import queue

# WebSocket client for Streamlit
class WebSocketClient:
    def __init__(self, url, data_queue):
        self.url = url
        self.data_queue = data_queue
        self.running = False
        self.thread = None
        
    def start(self):
        """Start the WebSocket client in a separate thread"""
        self.running = True
        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self):
        """Stop the WebSocket client"""
        self.running = False
        if self.thread:
            self.thread.join()
    
    def _run(self):
        """Run the async event loop"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self._connect())
        
    async def _connect(self):
        """Connect to WebSocket and receive data"""
        try:
            async with websockets.connect(self.url) as websocket:
                st.success(f"Connected to WebSocket: {self.url}")
                while self.running:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        data = json.loads(message)
                        self.data_queue.put(data)
                    except asyncio.TimeoutError:
                        continue
                    except json.JSONDecodeError:
                        st.error(f"Failed to parse JSON: {message}")
        except Exception as e:
            st.error(f"WebSocket connection error: {e}")

# Streamlit app for WebSocket streaming
def websocket_app():
    st.title("🔌 WebSocket JSON Stream Client")
    
    # Configuration
    col1, col2 = st.columns([3, 1])
    with col1:
        ws_url = st.text_input(
            "WebSocket URL",
            value="ws://localhost:8765",
            help="Enter the WebSocket server URL"
        )
    
    with col2:
        if 'ws_client' not in st.session_state:
            st.session_state.ws_client = None
            st.session_state.data_queue = queue.Queue()
            st.session_state.data_buffer = deque(maxlen=100)
        
        if st.button("Connect" if not st.session_state.ws_client else "Disconnect"):
            if not st.session_state.ws_client:
                # Start WebSocket client
                client = WebSocketClient(ws_url, st.session_state.data_queue)
                client.start()
                st.session_state.ws_client = client
            else:
                # Stop WebSocket client
                st.session_state.ws_client.stop()
                st.session_state.ws_client = None
    
    # Display connection status
    if st.session_state.ws_client:
        st.success("🟢 Connected")
    else:
        st.info("🔴 Disconnected")
    
    # Process incoming data
    if st.session_state.ws_client:
        # Get all available data from queue
        new_data = []
        while not st.session_state.data_queue.empty():
            try:
                data = st.session_state.data_queue.get_nowait()
                new_data.append(data)
                st.session_state.data_buffer.append(data)
            except queue.Empty:
                break
        
        # Display data
        if st.session_state.data_buffer:
            df = pd.DataFrame(list(st.session_state.data_buffer))
            
            # Metrics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Messages Received", len(st.session_state.data_buffer))
            with col2:
                if 'value' in df.columns:
                    st.metric("Latest Value", f"{df['value'].iloc[-1]:.2f}")
            with col3:
                if 'timestamp' in df.columns:
                    st.metric("Last Update", df['timestamp'].iloc[-1][-8:])
            
            # Chart
            if 'value' in df.columns and 'timestamp' in df.columns:
                st.line_chart(df.set_index('timestamp')['value'])
            
            # Recent data
            st.subheader("Recent Data")
            st.dataframe(df.tail(10), use_container_width=True)

if __name__ == "__main__":
    websocket_app()