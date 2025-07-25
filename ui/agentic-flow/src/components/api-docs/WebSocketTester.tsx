import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Zap, Send, Trash2, Copy, Check, Save, Square } from 'lucide-react'

interface Message {
  id: string
  type: 'sent' | 'received'
  data: string
  timestamp: Date
}

// Enhanced WebSocket client similar to Claude Flow's approach
class EnhancedWebSocketClient {
  private ws: WebSocket | null = null
  private events: Map<string, Array<(data: any) => void>> = new Map()
  private connected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private url: string
  private fallbackUrl: string | null = null
  private stopped = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private pingTimeout: NodeJS.Timeout | null = null
  private autoReconnect = true

  constructor(url: string) {
    // For Socket.IO compatibility, we need to first do HTTP handshake, then WebSocket
    this.url = url.replace('ws://', 'http://').replace('wss://', 'https://')
    
    // Prepare fallback URL - always use 127.0.0.1 as fallback
    if (this.url.includes('localhost')) {
      this.fallbackUrl = this.url.replace('localhost', '127.0.0.1')
    } else {
      this.fallbackUrl = null // Only fallback from localhost to 127.0.0.1
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.stopped) {
        reject(new Error('Client is stopped'))
        return
      }

      this.attemptConnection(this.url)
        .then(resolve)
        .catch((error) => {
          // Try fallback if available
          if (this.fallbackUrl && !this.stopped) {
            this.emit('message', `❌ Failed to connect to ${this.url}: ${error.message || 'Connection failed'}`)
            this.emit('message', `🔄 Trying fallback: ${this.fallbackUrl}`)
            this.attemptConnection(this.fallbackUrl)
              .then(resolve)
              .catch((fallbackError) => {
                this.emit('message', `❌ Fallback also failed: ${fallbackError.message || 'Connection failed'}`)
                reject(new Error('All connection attempts failed'))
              })
          } else {
            this.emit('message', `❌ Connection failed: ${error.message || 'Unknown error'}`)
            reject(error)
          }
        })
    })
  }

  private async attemptConnection(httpUrl: string): Promise<void> {
    if (this.stopped) {
      throw new Error('Connection stopped')
    }

    try {
      // Step 1: Socket.IO handshake via HTTP
      this.emit('message', `🤝 Starting Socket.IO handshake with ${httpUrl}...`)
      
      const handshakeResponse = await fetch(`${httpUrl}/socket.io/?EIO=4&transport=polling`)
      if (!handshakeResponse.ok) {
        throw new Error(`Handshake failed: ${handshakeResponse.status}`)
      }
      
      const handshakeText = await handshakeResponse.text()
      this.emit('message', `✅ Handshake successful: ${handshakeText.substring(0, 50)}...`)
      
      // Step 2: Extract session ID from handshake
      let sessionId = ''
      try {
        // Socket.IO v4 format: "0{json}"
        const jsonMatch = handshakeText.match(/^0(\{.*\})/)
        if (jsonMatch) {
          const handshakeData = JSON.parse(jsonMatch[1])
          sessionId = handshakeData.sid
          this.emit('message', `🔑 Session ID: ${sessionId}`)
        }
      } catch (error) {
        this.emit('message', `⚠️ Could not parse session ID, continuing anyway...`)
      }
      
      // Step 3: Upgrade to WebSocket
      const wsUrl = httpUrl.replace('http://', 'ws://').replace('https://', 'wss://') + 
                   '/socket.io/?EIO=4&transport=websocket' + 
                   (sessionId ? `&sid=${sessionId}` : '')
      
      this.emit('message', `⬆️ Upgrading to WebSocket: ${wsUrl}`)
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close()
            reject(new Error('WebSocket upgrade timeout'))
          }
        }, 10000)

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          if (this.stopped) {
            this.ws?.close()
            reject(new Error('Connection stopped after open'))
            return
          }
          
          // Don't mark as connected yet - wait for Socket.IO handshake
          this.emit('message', `✅ WebSocket connected, sending upgrade probe...`)
          
          // Send probe message immediately after WebSocket upgrade
          this.ws.send('2probe')
          
          // We'll mark as connected when we receive the probe response
          resolve()
        }

        this.ws.onmessage = (event) => {
          if (!this.stopped) {
            // Debug all incoming messages
            console.log('WS received:', event.data)
            this.handleSocketIOMessage(event.data)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          console.error('WebSocket error:', error)
          this.emit('message', `⚠️ WebSocket error occurred`)
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          const wasConnected = this.connected
          this.connected = false
          this.ws = null
          
          // Stop heartbeat
          this.stopHeartbeat()
          
          if (this.stopped) {
            this.emit('disconnected')
            return
          }

          if (!wasConnected) {
            this.emit('message', `❌ WebSocket upgrade failed (code: ${event.code})`)
            reject(new Error(`WebSocket upgrade failed (code: ${event.code})`))
          } else {
            this.emit('disconnected')
            this.emit('message', `🔌 WebSocket disconnected (code: ${event.code})`)
            
            // Auto-reconnect for established connections
            if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts && !this.stopped) {
              this.reconnectAttempts++
              const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
              
              this.emit('message', `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
              
              setTimeout(() => {
                if (!this.stopped) {
                  this.attemptConnection(httpUrl).catch(() => {})
                }
              }, delay)
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              this.emit('message', '❌ Max reconnection attempts reached')
            }
          }
        }
      })
      
    } catch (error) {
      this.emit('message', `❌ Socket.IO handshake failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  private handleSocketIOMessage(data: string): void {
    try {
      // Socket.IO v4 message format parsing
      if (data === '3probe') {
        // Probe response - upgrade successful
        this.emit('message', `✅ Upgrade confirmed, finalizing connection...`)
        // Send upgrade confirmation
        if (this.ws) {
          this.ws.send('5')
          
          // Some servers are ready immediately after upgrade
          // Mark as connected after a short delay if no explicit confirmation
          setTimeout(() => {
            if (!this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.emit('message', `✅ Connection established (implicit)`)
              this.connected = true
              this.reconnectAttempts = 0
              this.emit('connected')
              this.startHeartbeat()
            }
          }, 100)
        }
      } else if (data === '40' || data === '0') {
        // Namespace connected confirmation or connection acknowledgment
        this.emit('message', `📋 Socket.IO connected (${data === '40' ? 'namespace' : 'default'})`)
        
        // NOW we're truly connected
        this.connected = true
        this.reconnectAttempts = 0
        this.emit('connected')
        this.emit('message', `✅ Ready to send/receive messages`)
        
        // Start heartbeat after Socket.IO is ready
        this.startHeartbeat()
      } else if (data.startsWith('0')) {
        // Initial connection data
        this.emit('message', `📋 Socket.IO data: ${data}`)
      } else if (data === '2') {
        // Ping - respond with pong (don't show in UI to reduce noise)
        if (this.ws) {
          this.ws.send('3') // Send pong response
        }
        // Reset ping timeout
        this.resetPingTimeout()
      } else if (data === '3') {
        // Pong - don't show in UI to reduce noise
        this.resetPingTimeout()
      } else if (data.startsWith('42')) {
        // Event message from server
        try {
          const messageData = data.substring(2)
          const parsed = JSON.parse(messageData)
          if (Array.isArray(parsed) && parsed.length >= 2) {
            const [event, payload] = parsed
            this.emit('message', `📨 Event '${event}': ${JSON.stringify(payload, null, 2)}`)
            
            // Store session ID if this is a terminal:created event
            if (event === 'terminal:created' && payload.sessionId) {
              this.emit('message', `💾 Terminal session created: ${payload.sessionId}`)
              this.emit('message', `💡 You can now send commands using: {"event": "terminal:input", "data": {"sessionId": "${payload.sessionId}", "input": "ls -la\\r"}}`)
            } else if (event === 'terminal:error') {
              this.emit('message', `❌ Terminal error: ${payload.error || 'Unknown error'}`)
            }
          } else {
            this.emit('message', `📨 Message: ${JSON.stringify(parsed, null, 2)}`)
          }
        } catch {
          this.emit('message', `📨 Raw message: ${data}`)
        }
      } else if (data.startsWith('43') || data.startsWith('44')) {
        // Error messages
        try {
          const messageData = data.substring(2)
          const parsed = JSON.parse(messageData)
          this.emit('message', `❌ Server error: ${JSON.stringify(parsed, null, 2)}`)
        } catch {
          this.emit('message', `❌ Server error: ${data}`)
        }
      } else if (data.startsWith('4')) {
        // Legacy message format
        this.emit('message', `📨 Message: ${data}`)
      } else if (data === '6') {
        // Noop message from server - ignore
      } else {
        // Unknown format - show for debugging
        if (data.length > 1 && data !== '1') {
          this.emit('message', `📨 Debug - Raw message: ${data}`)
        }
      }
    } catch (error) {
      this.emit('message', `📨 Raw data: ${data}`)
    }
  }

  private startHeartbeat(): void {
    // Send periodic pings to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.connected && this.ws) {
        this.ws.send('2') // Send ping
        // Don't show ping messages in UI to reduce noise
        // this.emit('message', `💓 Sending ping`)
      }
    }, 25000) // Send ping every 25 seconds

    // Set initial ping timeout
    this.resetPingTimeout()
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }
  }

  private resetPingTimeout(): void {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
    }
    
    // Disconnect if no pong received within 35 seconds
    this.pingTimeout = setTimeout(() => {
      if (this.connected) {
        this.emit('message', `❌ Ping timeout - no pong received`)
        this.disconnect()
      }
    }, 35000)
  }

  send(data: string): void {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Socket.IO v4 message format: "4" + JSON.stringify([event, data])
        let messageToSend: string
        
        // Try to parse JSON to determine event type
        try {
          const parsed = JSON.parse(data)
          
          // Check if it's an event object with event name and data
          if (parsed.event && parsed.data) {
            // Format: {"event": "mcp:tool:execute", "data": {...}}
            messageToSend = '42' + JSON.stringify([parsed.event, parsed.data])
            this.emit('message', `📤 Sending event '${parsed.event}'`)
          } else if (parsed.type) {
            // Legacy format with type field
            messageToSend = '42' + JSON.stringify([parsed.type, parsed])
            this.emit('message', `📤 Sending event '${parsed.type}'`)
          } else {
            // Generic message event
            messageToSend = '42' + JSON.stringify(['message', parsed])
            this.emit('message', `📤 Sending 'message' event`)
          }
        } catch {
          // If not JSON, treat as event name without data
          if (data.includes(':')) {
            // Looks like an event name (e.g., "mcp:tools:discover")
            messageToSend = '42' + JSON.stringify([data, {}])
            this.emit('message', `📤 Sending event '${data}'`)
          } else {
            // Plain text message
            messageToSend = '42' + JSON.stringify(['message', data])
            this.emit('message', `📤 Sending 'message' event`)
          }
        }
        
        // Debug: show exactly what we're sending
        this.emit('message', `🔍 Raw Socket.IO message: ${messageToSend}`)
        this.ws.send(messageToSend)
        this.emit('sent', data) // Trigger sent event
      } catch (error) {
        this.emit('message', `❌ Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      this.emit('message', `❌ Cannot send - not connected (connected: ${this.connected}, ws: ${!!this.ws}, readyState: ${this.ws?.readyState})`)
    }
  }

  disconnect(): void {
    this.stopped = false // Allow reconnection after manual disconnect
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.reconnectAttempts = 0
  }

  stop(): void {
    this.stopped = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.reconnectAttempts = 0
    this.emit('message', '⏹️ All connections stopped')
  }

  reset(): void {
    this.stopped = false
    this.reconnectAttempts = 0
    this.emit('message', '🔄 Client reset - ready to connect')
  }

  isConnected(): boolean {
    return this.connected && !this.stopped
  }

  isStopped(): boolean {
    return this.stopped
  }

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled
  }

  getAutoReconnect(): boolean {
    return this.autoReconnect
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(handler)
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.events.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }
}

const WebSocketTester: React.FC = () => {
  const [url, setUrl] = useState('ws://127.0.0.1:3001')
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'stopped'>('disconnected')
  const clientRef = useRef<EnhancedWebSocketClient | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize client when URL changes
  useEffect(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
    
    clientRef.current = new EnhancedWebSocketClient(url)
    
    // Apply current auto-reconnect setting
    clientRef.current.setAutoReconnect(autoReconnect)
    
    // Set up event handlers
    clientRef.current.on('connected', () => {
      setConnected(true)
      setConnectionStatus('connected')
    })
    
    clientRef.current.on('disconnected', () => {
      setConnected(false)
      setConnectionStatus(clientRef.current?.isStopped() ? 'stopped' : 'disconnected')
    })
    
    clientRef.current.on('message', (data: string) => {
      addMessage(data, 'received')
    })
    
    clientRef.current.on('sent', (data: string) => {
      addMessage(data, 'sent')
    })
    
    clientRef.current.on('error', (error: Error) => {
      addMessage(`❌ Error: ${error?.message || 'Unknown error'}`, 'received')
    })
    
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
      }
    }
  }, [url])

  // Update auto-reconnect setting when it changes
  useEffect(() => {
    if (clientRef.current) {
      clientRef.current.setAutoReconnect(autoReconnect)
    }
  }, [autoReconnect])

  // Show welcome message on mount
  useEffect(() => {
    addMessage('🔌 Socket.IO WebSocket Tester', 'received')
    addMessage('ℹ️ This connects to Socket.IO servers (like Claude Flow). Plain ws:// URLs are automatically converted to Socket.IO format.', 'received')
    addMessage('💡 Tip: Connection includes automatic heartbeat to maintain persistent connections.', 'received')
  }, [])

  const connect = useCallback(async () => {
    if (!clientRef.current) return
    
    try {
      setConnectionStatus('connecting')
      addMessage(`🔌 Attempting to connect to ${url}...`, 'received')
      await clientRef.current.connect()
    } catch (error) {
      setConnectionStatus('disconnected')
      addMessage(`❌ Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`, 'received')
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      addMessage('🔌 Manually disconnected', 'received')
    }
  }, [])

  const stopAllConnections = useCallback(() => {
    if (clientRef.current) {
      if (clientRef.current.isStopped()) {
        // Reset if already stopped
        clientRef.current.reset()
        setConnectionStatus('disconnected')
      } else {
        // Stop if currently running
        clientRef.current.stop()
        setConnectionStatus('stopped')
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
      }
    }
  }, [])

  const addMessage = useCallback((data: string, type: 'sent' | 'received') => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }, [])

  const sendMessage = useCallback(() => {
    if (!clientRef.current) {
      addMessage('❌ WebSocket client not initialized', 'received')
      return
    }
    
    if (!clientRef.current.isConnected()) {
      addMessage('❌ Not connected to WebSocket server', 'received')
      return
    }
    
    if (!messageInput.trim()) {
      addMessage('❌ Please enter a message to send', 'received')
      return
    }
    
    // Send the message
    clientRef.current.send(messageInput.trim())
    
    // Clear input after sending
    setMessageInput('')
  }, [messageInput, addMessage])

  const clearMessages = () => {
    setMessages([])
  }

  const copyMessages = () => {
    const text = messages.map(m => 
      `[${m.timestamp.toISOString()}] ${m.type === 'sent' ? '→' : '←'} ${m.data}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }

  const saveSession = () => {
    const session = {
      url,
      messages,
      timestamp: new Date()
    }
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `websocket-session-${Date.now()}.json`
    a.click()
  }

  const formatMessage = useCallback((data: string) => {
    if (showRaw) {
      return data
    }
    
    try {
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return data
    }
  }, [showRaw])

  return (
    <div className="h-full flex flex-col p-6">
      {/* Connection Controls */}
      <div className="mb-4 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2 bg-black border border-green-900 text-green-400 placeholder-green-600 focus:border-green-400 focus:outline-none font-mono text-sm"
            placeholder="ws://127.0.0.1:3001 (Socket.IO server)"
            disabled={connected}
          />
          {connected ? (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-700 rounded hover:bg-red-900/50 transition-colors"
            >
              Disconnect
            </button>
          ) : connectionStatus === 'connecting' ? (
            <button
              disabled
              className="px-4 py-2 bg-yellow-900/30 text-yellow-400 border border-yellow-700 rounded opacity-50 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 animate-pulse" />
              Connecting...
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connectionStatus === 'stopped'}
              className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-700 rounded hover:bg-green-900/50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Connect
            </button>
          )}
          
          {/* Stop/Reset button - always visible for emergency stop */}
          <button
            onClick={stopAllConnections}
            className={`px-4 py-2 border rounded hover:bg-opacity-50 transition-colors flex items-center gap-2 ${
              connectionStatus === 'stopped'
                ? 'bg-blue-900/30 text-blue-400 border-blue-700 hover:bg-blue-900/50' 
                : 'bg-gray-900/30 text-gray-400 border-gray-700 hover:bg-gray-800/50'
            }`}
            title={connectionStatus === 'stopped' ? "Reset connection state" : "Stop all connection attempts"}
          >
            <Square className="w-4 h-4" />
            {connectionStatus === 'stopped' ? 'Reset' : 'Stop'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-green-600">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-reconnect
            </label>
            <label className="flex items-center gap-2 text-xs text-green-600">
              <input
                type="checkbox"
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
                className="w-3 h-3"
              />
              Show raw
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${
              connectionStatus === 'connected' ? 'text-green-400' : 
              connectionStatus === 'connecting' ? 'text-yellow-400' :
              connectionStatus === 'stopped' ? 'text-gray-400' : 'text-red-400'
            }`}>
              ● {connectionStatus === 'connected' ? 'Connected' : 
                  connectionStatus === 'connecting' ? 'Connecting...' :
                  connectionStatus === 'stopped' ? 'Stopped' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gray-950 border-2 border-green-900 rounded overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-green-900 bg-gray-900">
          <h3 className="text-sm font-bold text-green-400">Messages ({messages.length})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMessages}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-400 transition-colors"
              title="Copy messages"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={saveSession}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-400 transition-colors"
              title="Save session"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              onClick={clearMessages}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-400 transition-colors"
              title="Clear messages"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.type === 'sent' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[70%] ${
                message.type === 'sent' 
                  ? 'bg-blue-900/30 border-blue-700 text-blue-400' 
                  : 'bg-green-900/30 border-green-700 text-green-400'
              } border rounded p-2`}>
                <div className="text-xs opacity-70 mb-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <pre className={`whitespace-pre-wrap break-words ${!showRaw ? 'font-mono' : ''}`}>
                  {showRaw ? message.data : formatMessage(message.data)}
                </pre>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Send Message */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 px-3 py-2 bg-black border border-green-900 text-green-400 placeholder-green-600 focus:border-green-400 focus:outline-none font-mono text-sm"
          placeholder='{"type": "message", "data": "Hello"}'
          disabled={!connected}
        />
        <button
          onClick={() => {
            console.log('Send button clicked', { connected, messageInput, hasClient: !!clientRef.current })
            sendMessage()
          }}
          disabled={!connected || !messageInput}
          className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-700 rounded hover:bg-green-900/50 transition-colors disabled:opacity-50 flex items-center gap-2"
          type="button"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>

      {/* Example Messages */}
      <div className="mt-4 p-4 bg-gray-900 rounded border border-green-900">
        <h4 className="text-xs font-bold text-green-400 mb-2">Example Socket.IO Events</h4>
        <div className="space-y-2">
          <button
            onClick={() => setMessageInput('{"event": "terminal:create", "data": {"cwd": ".", "cols": 80, "rows": 30}}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
            title="Create a new terminal session"
          >
            terminal:create - Create Terminal Session
          </button>
          <button
            onClick={() => setMessageInput('{"event": "terminal:input", "data": {"sessionId": "REPLACE_WITH_SESSION_ID", "input": "ls -la\\r"}}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
            title="Send command to terminal (replace session ID)"
          >
            terminal:input - Send Command
          </button>
          <button
            onClick={() => setMessageInput('{"event": "test-connection", "data": {"timestamp": "' + new Date().toISOString() + '"}}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
            title="Test basic Socket.IO connection"
          >
            test-connection - Basic connection test
          </button>
          <button
            onClick={() => setMessageInput('{"event": "unknown-event", "data": {}}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
            title="Send an unknown event to test error handling"
          >
            unknown-event - Test unknown event
          </button>
          <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-400">
            ⚠️ Note: If terminal events cause disconnection, it may be due to node-pty permissions. The MCP WebSocket events (mcp:*) are not available due to duplicate connection handlers in the server.
          </div>
        </div>
      </div>
    </div>
  )
}

export default WebSocketTester