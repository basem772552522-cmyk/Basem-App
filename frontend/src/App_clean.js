import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Search, Send, MessageCircle, Users, Settings, Check, CheckCheck, MoreVertical, LogOut, User, Camera, Paperclip, Image, Video, File, Reply, Trash2, X } from 'lucide-react';
import ChatList from './components/ChatList';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [ws, setWs] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected'
  const [currentView, setCurrentView] = useState('chats'); // 'chats', 'search'
  const [showSettings, setShowSettings] = useState(false); // Settings dropdown
  const [showProfileEdit, setShowProfileEdit] = useState(false); // Profile editing modal
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false); // Attachment menu
  const [selectedMessage, setSelectedMessage] = useState(null); // Selected message for actions
  const [showMessageActions, setShowMessageActions] = useState(false); // Message actions menu
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Offline mode indicator
  const [pendingMessages, setPendingMessages] = useState([]); // Messages waiting to be sent
  const [allUsers, setAllUsers] = useState([]); // All users in the system
  
  // Auth states
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const messagesEndRef = useRef(null);
  const notificationSound = useRef(null);

  // Initialize notification sound
  useEffect(() => {
    // Create audio for notification sound
    notificationSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAoTXrTp66hVFApGn+DyvmwhBT2P2fTNeSsFJHfH8N2QQAo=');
    notificationSound.current.volume = 0.5; // Set volume to 50%
  }, []);

  // Play notification sound and show browser notification
  const playNotificationSound = (message) => {
    // Play sound
    if (notificationSound.current) {
      notificationSound.current.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    }

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const senderName = selectedChat?.other_user?.username || 'مستخدم';
        const notification = new Notification(`رسالة جديدة من ${senderName}`, {
          body: message.content,
          icon: '/favicon.ico',
          tag: 'basemapp-message',
          requireInteraction: false
        });
        
        // Auto close after 4 seconds
        setTimeout(() => notification.close(), 4000);
        
        // Focus app when notification clicked
        notification.onclick = function() {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.log('Could not show notification:', error);
      }
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read`);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Handle profile image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 5 ميجابايت');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة صحيحة');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        
        // Update profile with new image
        const response = await axios.put(`${API}/users/profile`, {
          avatar_url: base64Image
        });
        
        setUser(response.data);
        alert('تم تحديث الصورة بنجاح');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('فشل في رفع الصورة');
    }
  };

  // Handle file upload (images, videos)
  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB for images, 50MB for videos)
    const maxSize = fileType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`حجم الملف كبير جداً. الحد الأقصى ${fileType === 'image' ? '10' : '50'} ميجابايت`);
      return;
    }

    // Check file type
    const validTypes = fileType === 'image' 
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/ogg'];
    
    if (!validTypes.includes(file.type)) {
      alert(`نوع الملف غير مدعوم. يرجى اختيار ${fileType === 'image' ? 'صورة' : 'فيديو'} صحيح`);
      return;
    }

    try {
      // Show loading indicator
      const tempMessage = {
        id: 'temp-' + Date.now(),
        content: fileType === 'image' ? '📷 جاري رفع الصورة...' : '🎥 جاري رفع الفيديو...',
        sender_id: user.id,
        timestamp: new Date().toISOString(),
        status: 'uploading',
        type: 'temp'
      };
      setMessages(prev => [...prev, tempMessage]);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        try {
          // Send media message
          const mediaMessage = {
            chat_id: selectedChat.id,
            content: base64Data,
            message_type: fileType === 'image' ? 'image' : 'video'
          };

          let response;
          if (ws && ws.readyState === WebSocket.OPEN) {
            // Send via WebSocket
            ws.send(JSON.stringify({
              type: 'send_message',
              ...mediaMessage
            }));
          } else {
            // Send via HTTP API
            response = await axios.post(`${API}/messages`, mediaMessage);
          }

          // Remove temp message and add real message
          setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
          
          if (response?.data) {
            setMessages(prev => [...prev, response.data]);
          }

          setShowAttachmentMenu(false);
          
        } catch (error) {
          console.error('Failed to send media:', error);
          setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
          alert('فشل في إرسال الملف');
        }
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Failed to process file:', error);
      alert('فشل في معالجة الملف');
    }
  };

  // Setup axios interceptor
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  // Initialize app
  useEffect(() => {
    if (token) {
      loadUser();
      loadChats();
      loadAllUsers();
      connectWebSocket();
    }
  }, [token]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && !event.target.closest('.settings-dropdown')) {
        setShowSettings(false);
      }
      if (showAttachmentMenu && !event.target.closest('.attachment-menu')) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showAttachmentMenu]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      // Try to send pending messages
      if (pendingMessages.length > 0) {
        pendingMessages.forEach(async (msg) => {
          try {
            await axios.post(`${API}/messages`, msg);
            setPendingMessages(prev => prev.filter(m => m.id !== msg.id));
          } catch (error) {
            console.error('Failed to send pending message:', error);
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOfflineMode(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingMessages]);

  // Auto-update user online status and last seen
  useEffect(() => {
    if (!user) return;
    
    const updateOnlineStatus = async () => {
      try {
        // Update own online status
        await axios.post(`${API}/users/update-status`, { is_online: true });
        // Refresh chats to get updated user statuses
        loadChats();
      } catch (error) {
        console.error('Failed to update online status:', error);
      }
    };

    // Update status immediately and then every 30 seconds
    updateOnlineStatus();
    const statusInterval = setInterval(updateOnlineStatus, 30000);

    // Update status before page unload
    const handleBeforeUnload = () => {
      navigator.sendBeacon(`${API}/users/update-status`, 
        JSON.stringify({ is_online: false })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    if (!user) return;
    
    setWsStatus('connecting');
    const websocket = new WebSocket(`${WS_URL}/ws/${user.id}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
      setWsStatus('connected');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message]);
        
        // Play notification sound for incoming messages (not from current user)
        if (data.message.sender_id !== user.id) {
          playNotificationSound(data.message);
        }
        
        // Mark message as delivered automatically
        if (data.message.sender_id !== user.id && selectedChat?.id === data.message.chat_id) {
          markMessageAsRead(data.message.id);
        }
        
        // Refresh chats to update last message
        loadChats();
      } else if (data.type === 'message_sent') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'message_read') {
        // Update message status to read
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id 
            ? { ...msg, status: 'read', read_at: data.read_at }
            : msg
        ));
      } else if (data.type === 'message_deleted') {
        // Remove deleted message from UI
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        loadChats(); // Refresh chats to update last message
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
      setWsStatus('disconnected');
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        if (user) connectWebSocket();
      }, 5000);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('disconnected');
    };
  };

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API}/chats`);
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await axios.get(`${API}/chats/${chatId}/messages`);
      setMessages(response.data);
      
      // Mark unread messages as read
      const unreadMessages = response.data.filter(msg => 
        msg.sender_id !== user.id && !msg.is_read
      );
      
      unreadMessages.forEach(msg => {
        markMessageAsRead(msg.id);
      });
      
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      
      const response = await axios.post(`${API}${endpoint}`, payload);
      const newToken = response.data.access_token;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (error) {
      console.error('Auth failed:', error);
      alert('فشل في ' + (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'));
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/users/search?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const startChat = async (otherUserId) => {
    try {
      const response = await axios.post(`${API}/chats`, null, {
        params: { other_user_id: otherUserId }
      });
      
      await loadChats();
      setSelectedChat(response.data);
      setCurrentView('users');
      setSearchQuery('');
      setSearchResults([]);
      await loadMessages(response.data.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const startChatWithUser = async (otherUser) => {
    try {
      const response = await axios.post(`${API}/chats`, null, {
        params: { other_user_id: otherUser.id }
      });
      
      await loadChats();
      setSelectedChat({
        ...response.data,
        other_user: otherUser
      });
      await loadMessages(response.data.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const selectChat = async (chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    const messageData = {
      chat_id: selectedChat.id,
      content: newMessage.trim(),
      message_type: 'text'
    };

    // Create temp message for immediate UI feedback
    const tempMessage = {
      id: 'temp-' + Date.now(),
      ...messageData,
      sender_id: user.id,
      timestamp: new Date().toISOString(),
      status: isOfflineMode ? 'pending' : 'sending'
    };

    // Add to UI immediately
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      if (isOfflineMode || !navigator.onLine) {
        // Add to pending messages if offline
        setPendingMessages(prev => [...prev, { ...messageData, tempId: tempMessage.id }]);
        // Update temp message status
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'pending', content: msg.content + ' ⏳' }
            : msg
        ));
        return;
      }

      // Try WebSocket first (for real-time)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'send_message',
          ...messageData
        }));
        // Remove temp message, real message will come from WebSocket
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      } else {
        // Fallback to HTTP API
        const response = await axios.post(`${API}/messages`, messageData);
        
        // Replace temp message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? response.data : msg
        ));
        
        // Refresh chats to update last message
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (error.response?.status >= 500 || !error.response) {
        // Server error or network issue - add to pending
        setPendingMessages(prev => [...prev, { ...messageData, tempId: tempMessage.id }]);
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'pending', content: msg.content + ' ⏳ سيتم الإرسال عند عودة الاتصال' }
            : msg
        ));
      } else {
        // Other error - remove message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        alert('فشل في إرسال الرسالة');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    localStorage.removeItem('token');
    if (ws) {
      ws.close();
    }
  };

  // Get user's timezone
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'UTC'; // fallback
    }
  };

  // Convert UTC timestamp to local time
  const convertToLocalTime = (utcTimestamp) => {
    try {
      // Ensure we have a proper UTC timestamp
      let utcDate;
      if (typeof utcTimestamp === 'string') {
        // Add Z if not present to indicate UTC
        utcDate = new Date(utcTimestamp.endsWith('Z') ? utcTimestamp : utcTimestamp + 'Z');
      } else {
        utcDate = new Date(utcTimestamp);
      }
      
      // Return local date object
      return utcDate;
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return new Date();
    }
  };

  const formatTime = (timestamp) => {
    // Convert UTC timestamp to local time
    const date = convertToLocalTime(timestamp);
    const now = new Date();
    
    // Check if message is from today (local time)
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      // Show only time for today's messages in local timezone
      return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Show date and time for older messages
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === yesterday.toDateString()) {
        return 'أمس ' + date.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // For older messages, show date and time
        const dateStr = date.toLocaleDateString('ar-SA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `${dateStr} ${timeStr}`;
      }
    }
  };

  // Message status icon component
  const MessageStatusIcon = ({ message }) => {
    if (message.sender_id !== user.id) return null;
    
    const status = message.status || 'sent';
    
    if (status === 'read') {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    } else if (status === 'delivered') {
      return <CheckCheck className="w-3 h-3 text-gray-500" />;
    } else {
      return <Check className="w-3 h-3 text-gray-500" />;
    }
  };

  // Render message content based on type
  const renderMessageContent = (message) => {
    if (message.status === 'uploading') {
      return (
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <p className="text-sm">{message.content}</p>
        </div>
      );
    }

    if (message.message_type === 'image') {
      return (
        <div className="max-w-xs">
          <img 
            src={message.content} 
            alt="صورة" 
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              // Open image in new tab
              window.open(message.content, '_blank');
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEyQTkgOSAwIDEgMSAzIDEyQTkgOSAwIDAgMSAyMSAxMloiIHN0cm9rZT0iI2JkYjNiMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjYmRiM2IzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNOSA5TDE1IDE1IiBzdHJva2U9IiNiZGIzYjMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
            }}
          />
        </div>
      );
    } else if (message.message_type === 'video') {
      return (
        <div className="max-w-xs">
          <video 
            src={message.content} 
            controls
            className="rounded-lg max-w-full h-auto"
            style={{ maxHeight: '200px' }}
          />
        </div>
      );
    } else if (message.message_type === 'file') {
      const fileName = message.file_name || 'ملف';
      return (
        <div 
          className="flex items-center space-x-3 space-x-reverse p-2 bg-gray-100 rounded-lg max-w-xs cursor-pointer hover:bg-gray-200"
          onClick={() => {
            // Download file
            const link = document.createElement('a');
            link.href = message.content;
            link.download = fileName;
            link.click();
          }}
        >
          <File className="w-8 h-8 text-gray-500" />
          <div className="flex-1">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-gray-500">اضغط لتحميل</p>
          </div>
        </div>
      );
    } else {
      // Regular text message
      return <p className="text-sm">{message.content}</p>;
    }
  };

  // Auth screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-emerald-600 mb-2">
              BasemApp
            </CardTitle>
            <p className="text-gray-600">
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <Input
                  type="text"
                  placeholder="اسم المستخدم"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                  className="text-right"
                  required
                />
              )}
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                className="text-right"
                required
              />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                className="text-right"
                required
              />
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                {isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </Button>
