// team-collaboration-client.js
// Add to your HTML: <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>

class TeamCollaboration {
  constructor(config) {
    this.serverUrl = config.serverUrl || 'http://localhost:5000';
    this.socket = null;
    this.currentRoom = null;
    this.currentUser = {
      id: this.generateUserId(),
      username: config.username || `Trader${Math.floor(Math.random() * 9999)}`
    };
    this.messages = [];
    this.annotations = [];
    this.activeUsers = [];
    this.init();
  }

  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    // Connect to Socket.IO
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.setupSocketListeners();
    this.setupUI();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to collaboration server');
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.updateConnectionStatus(false);
    });

    this.socket.on('user_joined', ({ users, newUser }) => {
      this.activeUsers = users;
      this.updateParticipants();
      this.addSystemMessage(`${newUser.username} joined the session`);
    });

    this.socket.on('user_left', ({ users, leftUser }) => {
      this.activeUsers = users;
      this.updateParticipants();
      this.addSystemMessage(`${leftUser.username} left the session`);
    });

    this.socket.on('new_message', (message) => {
      this.displayMessage(message);
    });

    this.socket.on('new_annotation', (annotation) => {
      this.renderAnnotation(annotation);
    });

    this.socket.on('chart_update', (update) => {
      this.handleChartUpdate(update);
    });

    this.socket.on('drawing', (drawData) => {
      this.handleDrawing(drawData);
    });

    this.socket.on('cursor_move', ({ userId, position }) => {
      this.showRemoteCursor(userId, position);
    });
  }

  setupUI() {
    // Resizable divider
    this.setupResizableDivider();

    // Send message button
    const sendBtn = document.getElementById('collab-send');
    const input = document.getElementById('collab-input');
    
    if (sendBtn && input) {
      sendBtn.onclick = () => this.sendMessage();
      input.onkeypress = (e) => {
        if (e.key === 'Enter') this.sendMessage();
      };
    }

    // Drawing tools
    this.setupDrawingTools();

    // Auto-scroll messages
    this.setupAutoScroll();
  }

  setupResizableDivider() {
    const content = document.querySelector('.collab-chart-content');
    const chart = document.querySelector('.collab-main-chart');
    const sidebar = document.querySelector('.collab-chat-sidebar');
    
    if (!content || !chart || !sidebar) return;

    const divider = document.createElement('div');
    divider.className = 'resize-divider';
    divider.style.cssText = `
      width: 4px;
      cursor: col-resize;
      background: rgba(212, 175, 55, 0.3);
      transition: background 0.2s;
      position: relative;
      z-index: 10;
    `;
    
    divider.onmouseenter = () => {
      divider.style.background = 'rgba(212, 175, 55, 0.6)';
    };
    divider.onmouseleave = () => {
      divider.style.background = 'rgba(212, 175, 55, 0.3)';
    };

    content.insertBefore(divider, sidebar);

    let isResizing = false;

    divider.onmousedown = (e) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    };

    document.onmousemove = (e) => {
      if (!isResizing) return;

      const containerRect = content.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const minWidth = 250;
      const maxWidth = containerRect.width - 400;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebar.style.width = newWidth + 'px';
        sidebar.style.flex = 'none';
      }
    };

    document.onmouseup = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    };
  }

  setupDrawingTools() {
    const chartContainer = document.getElementById('collab-tradingview');
    if (!chartContainer) return;

    let isDrawing = false;
    let startPos = null;

    chartContainer.addEventListener('mousedown', (e) => {
      if (e.shiftKey) {
        isDrawing = true;
        startPos = { x: e.clientX, y: e.clientY };
      }
    });

    chartContainer.addEventListener('mousemove', (e) => {
      if (isDrawing && this.currentRoom) {
        const drawData = {
          type: 'line',
          from: startPos,
          to: { x: e.clientX, y: e.clientY },
          color: '#d4af37',
          userId: this.currentUser.id
        };
        this.socket.emit('drawing', { roomId: this.currentRoom, drawData });
      }

      // Share cursor position
      if (this.currentRoom) {
        this.socket.emit('cursor_move', {
          roomId: this.currentRoom,
          position: { x: e.clientX, y: e.clientY }
        });
      }
    });

    chartContainer.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        startPos = null;
      }
    });
  }

  setupAutoScroll() {
    const container = document.getElementById('collab-messages');
    if (!container) return;

    const observer = new MutationObserver(() => {
      container.scrollTop = container.scrollHeight;
    });

    observer.observe(container, { childList: true });
  }

  async joinRoom(roomId) {
    this.currentRoom = roomId;
    
    // Join via Socket.IO
    this.socket.emit('join_room', {
      roomId,
      userId: this.currentUser.id,
      username: this.currentUser.username
    });

    // Load chat history
    await this.loadChatHistory(roomId);
    
    // Load annotations
    await this.loadAnnotations(roomId);
  }

  async loadChatHistory(roomId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/chat/${roomId}`);
      const messages = await response.json();
      
      const container = document.getElementById('collab-messages');
      if (container) {
        container.innerHTML = '';
        messages.forEach(msg => this.displayMessage(msg));
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }

  async loadAnnotations(roomId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/annotations/${roomId}`);
      this.annotations = await response.json();
      this.annotations.forEach(ann => this.renderAnnotation(ann));
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  }

  async sendMessage() {
    const input = document.getElementById('collab-input');
    if (!input || !input.value.trim() || !this.currentRoom) return;

    const message = input.value.trim();
    input.value = '';

    try {
      await fetch(`${this.serverUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: this.currentRoom,
          user_id: this.currentUser.id,
          username: this.currentUser.username,
          message,
          message_type: 'text'
        })
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      this.displayMessage({
        username: 'System',
        message: 'Failed to send message',
        created_at: new Date().toISOString()
      }, true);
    }
  }

  displayMessage(msg, isError = false) {
    const container = document.getElementById('collab-messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `msg ${msg.user_id === this.currentUser.id ? 'me' : ''}`;
    if (isError) msgEl.style.color = '#ff6b6b';
    
    const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    msgEl.innerHTML = `
      <div style="font-size: 10px; opacity: 0.6; margin-bottom: 4px;">
        ${msg.username} • ${time}
      </div>
      <div>${this.escapeHtml(msg.message)}</div>
    `;
    
    container.appendChild(msgEl);
  }

  addSystemMessage(text) {
    const container = document.getElementById('collab-messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.style.cssText = `
      text-align: center;
      color: #888;
      font-size: 12px;
      padding: 8px;
      margin: 8px 0;
    `;
    msgEl.textContent = text;
    container.appendChild(msgEl);
  }

  updateParticipants() {
    const container = document.getElementById('collab-participants');
    if (!container) return;

    container.innerHTML = this.activeUsers.map((user, i) => `
      <div class="participant-indicator" style="
        background: ${this.getUserColor(i)};
        border-color: ${this.getUserColor(i)};
      " title="${user.username}">
        ${user.username.charAt(0).toUpperCase()}
      </div>
    `).join('');
  }

  getUserColor(index) {
    const colors = [
      '#d4af37', '#10b981', '#3b82f6', '#8b5cf6', 
      '#ec4899', '#f59e0b', '#ef4444', '#06b6d4'
    ];
    return colors[index % colors.length];
  }

  updateConnectionStatus(connected) {
    const indicator = document.querySelector('.status-badge');
    if (indicator) {
      indicator.style.background = connected 
        ? 'rgba(16,185,129,0.1)' 
        : 'rgba(239,68,68,0.1)';
      indicator.style.borderColor = connected
        ? 'rgba(16,185,129,0.3)'
        : 'rgba(239,68,68,0.3)';
      indicator.querySelector('.status-dot').style.background = connected
        ? '#10b981'
        : '#ef4444';
    }
  }

  async saveAnnotation(type, data) {
    if (!this.currentRoom) return;

    try {
      await fetch(`${this.serverUrl}/api/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: this.currentRoom,
          user_id: this.currentUser.id,
          username: this.currentUser.username,
          annotation_type: type,
          data
        })
      });
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }
  }

  renderAnnotation(annotation) {
    console.log('Rendering annotation:', annotation);
    // Implement based on your chart library
    // This will draw lines, shapes, text on the shared chart
  }

  handleChartUpdate(update) {
    console.log('Chart update received:', update);
    // Sync chart state (zoom, pan, timeframe changes)
  }

  handleDrawing(drawData) {
    console.log('Drawing received:', drawData);
    // Render real-time drawings on chart
  }

  showRemoteCursor(userId, position) {
    let cursor = document.getElementById(`cursor-${userId}`);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = `cursor-${userId}`;
      cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(212, 175, 55, 0.5);
        border: 2px solid #d4af37;
        pointer-events: none;
        z-index: 10000;
        transition: all 0.1s ease;
      `;
      document.body.appendChild(cursor);
    }

    cursor.style.left = position.x + 'px';
    cursor.style.top = position.y + 'px';

    clearTimeout(cursor._hideTimer);
    cursor._hideTimer = setTimeout(() => cursor.remove(), 2000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  leaveRoom() {
    if (this.socket && this.currentRoom) {
      this.socket.disconnect();
      this.currentRoom = null;
    }
  }
}

// Initialize when modal opens
window.TeamCollab = null;

document.getElementById('collab-chart-fab')?.addEventListener('click', () => {
  if (!window.TeamCollab) {
    window.TeamCollab = new TeamCollaboration({
      serverUrl: 'http://localhost:5000',
      username: prompt('Sproutsking:') || 'Anonymous'
    });
    window.TeamCollab.joinRoom('default-room');
  }
});
