import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Search, Send, MessageCircle, Users, Settings, Check, CheckCheck } from 'lucide-react';
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

  // Play notification sound
  const playNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
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
          playNotificationSound();
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ar', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
                <AvatarFallback className="bg-white text-emerald-600">
                  {user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-white">{user?.username}</h2>
                <p className="text-emerald-100 text-sm">متصل</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-emerald-700"
            >
              خروج
            </Button>
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
                        <AvatarFallback>
                          {chat.other_user?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">
                            {chat.other_user?.username}
                          </h3>
                          {chat.other_user?.is_online && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              متصل
                            </Badge>
                          )}
                        </div>
                        {chat.last_message && (
                          <p className="text-sm text-gray-500 truncate">
                            {chat.last_message.content}
                          </p>
                        )}
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
                        <AvatarFallback>
                          {user.username[0].toUpperCase()}
                        </AvatarFallback>
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
                    <AvatarFallback>
                      {selectedChat.other_user?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{selectedChat.other_user?.username}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedChat.other_user?.is_online ? 'متصل' : 'غير متصل'}
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
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === user.id
                            ? 'text-emerald-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
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
    </div>
  );
}

export default App;