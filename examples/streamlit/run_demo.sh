#!/bin/bash
# Demo script to showcase JSON stream analysis

echo "🚀 Claude Code JSON Stream Analysis Demo"
echo "======================================="
echo ""

# Check if streamlit is installed
if ! command -v streamlit &> /dev/null; then
    echo "❌ Streamlit not found. Installing requirements..."
    pip install -r requirements.txt
fi

# Function to run demo
run_demo() {
    echo "Select demo mode:"
    echo "1) WebSocket Server + Stream Client"
    echo "2) Concurrent Swarm Simulation"
    echo "3) Live Claude Code Analysis"
    echo "4) All demos (multiple terminals)"
    
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            echo "Starting WebSocket server..."
            python websocket_server.py &
            SERVER_PID=$!
            sleep 2
            
            echo "Starting Streamlit client..."
            streamlit run stream_client.py
            
            # Cleanup
            kill $SERVER_PID 2>/dev/null
            ;;
            
        2)
            echo "Starting concurrent swarm analysis..."
            streamlit run concurrent_analysis.py &
            CLIENT_PID=$!
            sleep 3
            
            echo "Running swarm simulation..."
            python demo_concurrent_swarm.py
            
            wait $CLIENT_PID
            ;;
            
        3)
            echo "Starting stream client for Claude Code..."
            echo "Run this command in another terminal:"
            echo 'claude "test a concurrent agent swarm" -p --output-format stream-json --verbose'
            echo ""
            streamlit run stream_client.py
            ;;
            
        4)
            echo "Starting all demos (requires multiple terminals)..."
            echo ""
            echo "Terminal 1: WebSocket Server"
            echo "Command: python websocket_server.py"
            echo ""
            echo "Terminal 2: Stream Client"
            echo "Command: streamlit run stream_client.py"
            echo ""
            echo "Terminal 3: Concurrent Analysis"
            echo "Command: streamlit run concurrent_analysis.py"
            echo ""
            echo "Terminal 4: Demo Swarm"
            echo "Command: python demo_concurrent_swarm.py"
            echo ""
            read -p "Press Enter when ready to start the main dashboard..."
            streamlit run stream_client.py
            ;;
            
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
}

# Run the demo
run_demo