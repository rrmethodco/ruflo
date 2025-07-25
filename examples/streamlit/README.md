# JSON Stream Real-time Analysis with Streamlit

This directory contains a comprehensive Streamlit application for real-time JSON stream analysis with multiple components for data ingestion, visualization, and advanced analytics.

## 🚀 Quick Start

### Installation

```bash
pip install -r requirements.txt
```

### Running the Applications

1. **Main Real-time Dashboard**:
   ```bash
   streamlit run app.py
   ```

2. **Advanced Analysis Tool**:
   ```bash
   streamlit run advanced_analysis.py
   ```

3. **WebSocket Client**:
   ```bash
   streamlit run websocket_client.py
   ```

## 📦 Components

### 1. Main Application (`app.py`)
Real-time JSON stream analysis dashboard with:
- Multiple data source support (Simulated, HTTP, WebSocket, File Upload)
- Real-time metrics and KPIs
- Interactive time series visualization
- Anomaly detection
- Category distribution analysis
- Data export capabilities

### 2. JSON Producer (`json_producer.py`)
Flexible JSON stream generator supporting:
- **Console output**: Stream to stdout
- **File output**: Write to JSONL files
- **WebSocket server**: Real-time streaming via WebSocket
- **HTTP server**: SSE and streaming endpoints

Usage examples:
```bash
# Console output
python json_producer.py console --pattern sine --duration 60

# File output
python json_producer.py file --pattern trending --file data.jsonl

# WebSocket server
python json_producer.py websocket --port 8765

# HTTP server with SSE
python json_producer.py http --port 8080
```

### 3. Advanced Analysis (`advanced_analysis.py`)
Sophisticated analysis tool featuring:
- Multiple anomaly detection methods (Z-score, IQR, Isolation Forest)
- Trend analysis and detrending
- Clustering with DBSCAN
- Seasonality detection
- Rolling statistics
- Comprehensive reporting

### 4. WebSocket Client (`websocket_client.py`)
Dedicated WebSocket client for:
- Real-time WebSocket connections
- Live data visualization
- Connection management
- Data buffering

## 🔧 Features

### Real-time Processing
- Auto-refresh with configurable intervals
- Sliding window buffers
- Concurrent data processing
- Memory-efficient streaming

### Visualization
- Interactive Plotly charts
- Real-time line charts
- Distribution plots
- Category breakdowns
- Anomaly highlighting

### Analysis Capabilities
- Statistical metrics (mean, std, min, max)
- Moving averages
- Outlier detection
- Trend analysis
- Pattern recognition
- Clustering

### Data Sources
- Simulated data with various patterns
- HTTP/SSE endpoints
- WebSocket connections
- File uploads (JSONL format)

## 📊 JSON Data Format

Expected JSON format:
```json
{
  "timestamp": "2024-01-20T10:30:00",
  "value": 42.5,
  "category": "A",
  "status": "normal",
  "metadata": {
    "source": "sensor_1",
    "location": "building_a"
  }
}
```

## 🎯 Use Cases

1. **IoT Sensor Monitoring**: Real-time sensor data analysis
2. **Application Metrics**: Live application performance monitoring
3. **Financial Data**: Trading data stream analysis
4. **Log Analysis**: Real-time log processing and anomaly detection
5. **Event Streaming**: Event-driven architecture monitoring

## 🛠️ Configuration Options

### Streamlit App Configuration
- Refresh interval: 0.5 - 10 seconds
- Buffer size: Up to 1000 records
- Moving average windows: 5 - 50 points
- Outlier threshold: 1.0 - 4.0 σ

### Producer Configuration
- Patterns: sine, random, trending, sawtooth
- Base value adjustment
- Noise level control
- Anomaly injection rate

## 📈 Performance Considerations

- Uses efficient data structures (deque) for buffering
- Implements sliding windows for memory efficiency
- Supports async operations for non-blocking I/O
- Configurable refresh rates to balance responsiveness and performance

## 🔍 Troubleshooting

1. **WebSocket Connection Issues**:
   - Ensure the WebSocket server is running
   - Check firewall settings
   - Verify the URL format (ws:// or wss://)

2. **Performance Issues**:
   - Increase refresh interval
   - Reduce buffer size
   - Limit visualization complexity

3. **Data Format Errors**:
   - Validate JSON format
   - Ensure required fields are present
   - Check timestamp formats

## 📝 Example Workflow

1. Start the JSON producer:
   ```bash
   python json_producer.py websocket --pattern sine
   ```

2. Launch the Streamlit app:
   ```bash
   streamlit run app.py
   ```

3. Select "WebSocket" as data source
4. Configure analysis parameters
5. Monitor real-time data and analytics

## 🚦 Next Steps

- Add database integration for historical data
- Implement machine learning models for prediction
- Create custom alert mechanisms
- Add more visualization types
- Implement data transformation pipelines