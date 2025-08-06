import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Search, Send, MessageCircle, Users, Settings, Check, CheckCheck, MoreVertical, LogOut, User, Camera, Paperclip, Image, Video, File, Reply, Trash2, X } from 'lucide-react';
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
      connectWebSocket();
    }
  }, [token]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && !event.target.closest('.settings-dropdown')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

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
      setCurrentView('chats');
      setSearchQuery('');
      setSearchResults([]);
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
    
    try {
      // Try WebSocket first (for real-time)
      if (ws && ws.readyState === WebSocket.OPEN) {
        const messageData = {
          type: 'send_message',
          chat_id: selectedChat.id,
          content: newMessage.trim(),
          message_type: 'text'
        };
        
        ws.send(JSON.stringify(messageData));
        setNewMessage('');
      } else {
        // Fallback to HTTP API if WebSocket is not available
        const messageData = {
          chat_id: selectedChat.id,
          content: newMessage.trim(),
          message_type: 'text'
        };
        
        const response = await axios.post(`${API}/messages`, messageData);
        
        // Add message to local state immediately
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        
        // Refresh chats to update last message
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('فشل في إرسال الرسالة');
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

  // Auth screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-emerald-600 mb-2">
              بيس ماب
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
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-600 hover:underline"
              >
                {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-emerald-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <Avatar>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-white text-emerald-600">
                    {user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="font-semibold text-white">{user?.username}</h2>
                <p className="text-emerald-100 text-sm">متصل</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:bg-emerald-700 p-2"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
                
                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="settings-dropdown absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowProfileEdit(true);
                          setShowSettings(false);
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center space-x-3 space-x-reverse"
                      >
                        <User className="w-4 h-4 text-gray-500" />
                        <span>الملف الشخصي</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          // Add settings functionality later
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center space-x-3 space-x-reverse"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span>الإعدادات</span>
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-red-50 flex items-center space-x-3 space-x-reverse text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2 border-b border-gray-200">
          <div className="flex space-x-1 space-x-reverse">
            <Button
              variant={currentView === 'chats' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('chats')}
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 ml-2" />
              المحادثات
            </Button>
            <Button
              variant={currentView === 'search' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('search')}
              className="flex-1"
            >
              <Users className="w-4 h-4 ml-2" />
              بحث
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'chats' ? (
            <ScrollArea className="h-full">
              <div className="p-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => selectChat(chat)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedChat?.id === chat.id
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Avatar>
                        {chat.other_user?.avatar_url ? (
                          <img src={chat.other_user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <AvatarFallback>
                            {chat.other_user?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">
                            {chat.other_user?.username}
                          </h3>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            {chat.other_user?.is_online && (
                              <div className="w-2 h-2 bg-green-500 rounded-full online-indicator"></div>
                            )}
                            {chat.other_user?.is_online && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                متصل
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          {chat.last_message && (
                            <p className="text-sm text-gray-500 truncate">
                              {chat.last_message.content}
                            </p>
                          )}
                          {!chat.other_user?.is_online && (
                            <p className="text-xs text-gray-400">
                              {chat.other_user?.last_seen_text || 'غير متصل'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {chats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد محادثات</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="البحث عن المستخدمين..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="pr-10 text-right"
                />
              </div>
              <ScrollArea className="h-96">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => startChat(user.id)}
                    className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-2"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Avatar>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <AvatarFallback>
                            {user.username[0].toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{user.username}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد نتائج</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Avatar>
                    {selectedChat.other_user?.avatar_url ? (
                      <img src={selectedChat.other_user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <AvatarFallback>
                        {selectedChat.other_user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{selectedChat.other_user?.username}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedChat.other_user?.is_online 
                        ? 'متصل' 
                        : selectedChat.other_user?.last_seen_text || 'غير متصل'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse text-sm">
                  <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {wsStatus === 'connected' ? 'متصل' : wsStatus === 'connecting' ? 'اتصال...' : 'غير متصل'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user.id ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p
                          className={`text-xs ${
                            message.sender_id === user.id
                              ? 'text-emerald-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                        <MessageStatusIcon message={message} />
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2 space-x-reverse">
                <Input
                  type="text"
                  placeholder="اكتب رسالة..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-right"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim()}
                  className={`transition-all ${
                    newMessage.trim() 
                      ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' 
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                مرحباً بك في بيس ماب
              </h2>
              <p className="text-gray-500">
                اختر محادثة لبدء الدردشة
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">الملف الشخصي</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileEdit(false)}
                className="text-gray-500"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {user?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 space-x-reverse"
                  >
                    <Camera className="w-4 h-4" />
                    <span>تغيير الصورة</span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                  <Input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="bg-gray-50 text-right"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50 text-right"
                  />
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse pt-4">
                <Button
                  onClick={() => setShowProfileEdit(false)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  تم
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;