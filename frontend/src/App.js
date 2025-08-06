import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Search, Send, MessageCircle, MoreVertical, LogOut, User, X } from 'lucide-react';
import './App.css';

const API = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Set axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async () => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      setToken(response.data.access_token);
      localStorage.setItem('token', response.data.access_token);
      setEmail('');
      setPassword('');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'فشل في تسجيل الدخول';
      alert(errorMessage);
      console.error('Login error:', error.response?.data || error.message);
    }
  };

  const register = async () => {
    try {
      const response = await axios.post(`${API}/auth/register`, { 
        username, 
        email, 
        password 
      });
      setToken(response.data.access_token);
      localStorage.setItem('token', response.data.access_token);
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'فشل في إنشاء الحساب';
      alert(errorMessage);
      console.error('Registration error:', error.response?.data || error.message);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUser(null);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
  };

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp.endsWith && timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'غير متاح';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen.endsWith && lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'منذ قليل';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    
    return lastSeenDate.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      const response = await axios.post(`${API}/messages`, {
        chat_id: selectedChat.id,
        content: newMessage.trim(),
        message_type: 'text'
      });
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      loadChats();
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

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.get(`${API}/users/search`, {
        params: { q: searchQuery }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const startChat = async (otherUserId) => {
    try {
      const response = await axios.post(`${API}/chats`, null, {
        params: { other_user_id: otherUserId }
      });
      
      await loadChats();
      setSelectedChat(response.data);
      setSearchQuery('');
      setSearchResults([]);
      await loadMessages(response.data.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  // Initialize app
  useEffect(() => {
    if (token) {
      loadUser();
      loadChats();
    }
  }, [token]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Authentication screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8" dir="rtl">
        <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg login-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 mb-2 login-title">
              BasemApp
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-600">
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <Input
                type="text"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-right form-input h-10 sm:h-12"
              />
            )}
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-right form-input h-10 sm:h-12"
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-right form-input h-10 sm:h-12"
            />
            <Button
              onClick={isLogin ? login : register}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-12 text-sm sm:text-base mobile-button"
            >
              {isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm sm:text-base"
            >
              {isLogin ? 'إنشاء حساب جديد' : 'لديك حساب؟ سجل الدخول'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main WhatsApp-style interface
  return (
    <div className="min-h-screen bg-gray-100 main-layout" dir="rtl">
      {/* WhatsApp-Style Sidebar */}
      <div className="sidebar w-full sm:w-80 md:w-96 lg:w-[400px] xl:w-[450px]">
        
        {/* Header with Search */}
        <div className="bg-gray-50 p-3 sm:p-4 border-b border-gray-200 app-header">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800 app-title">BasemApp</h1>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-600 hover:bg-gray-100 p-2 touch-target"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              {showSettings && (
                <div className="absolute left-0 top-full mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 settings-menu">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowProfileEdit(true);
                        setShowSettings(false);
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-right hover:bg-gray-50 flex items-center space-x-2 sm:space-x-3 space-x-reverse settings-item"
                    >
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-sm sm:text-base">الملف الشخصي</span>
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        logout();
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-right hover:bg-red-50 flex items-center space-x-2 sm:space-x-3 space-x-reverse text-red-600 settings-item"
                    >
                      <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-sm sm:text-base">تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
            <Input
              type="text"
              placeholder="ابحث أو ابدأ محادثة جديدة"
              className="pr-8 sm:pr-10 bg-gray-100 border-0 rounded-lg text-right search-input h-9 sm:h-10 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery && searchResults.length > 0 ? (
            <div className="p-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 p-2">نتائج البحث</h3>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => startChat(user.id)}
                  className="p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors user-item"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 chat-avatar">
                      <AvatarFallback className="w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-lg bg-emerald-100 text-emerald-700">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {user.username}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-500 p-4 sm:p-8">
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-gray-300" />
              <h3 className="text-base sm:text-lg font-medium mb-2">لا توجد محادثات</h3>
              <p className="text-xs sm:text-sm text-center">ابحث عن مستخدم لبدء محادثة جديدة</p>
            </div>
          ) : (
            <div>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setSelectedChat(chat);
                    loadMessages(chat.id);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors chat-item ${
                    selectedChat?.id === chat.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <div className="relative">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 chat-avatar">
                        <AvatarFallback className="w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-lg bg-emerald-100 text-emerald-700">
                          {chat.other_user?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {chat.other_user?.is_online && (
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {chat.other_user?.username}
                        </h3>
                        {chat.last_message && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.last_message.timestamp)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-gray-600 text-xs sm:text-sm truncate">
                          {chat.last_message?.content || 'لا توجد رسائل'}
                        </p>
                        {chat.other_user?.is_online ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0.5 sm:px-1.5 sm:py-0.5">
                            متصل
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {formatLastSeen(chat.other_user?.last_seen)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 bg-white border-b border-gray-200 flex items-center chat-header">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3">
                <AvatarFallback className="text-sm sm:text-base">
                  {selectedChat.other_user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-sm sm:text-base">{selectedChat.other_user?.username}</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {selectedChat.other_user?.is_online ? 'متصل' : `آخر ظهور: ${formatLastSeen(selectedChat.other_user?.last_seen)}`}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === user.id ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-2 rounded-lg message-bubble ${
                      message.sender_id === user.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm sm:text-base">{message.content}</p>
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

            {/* Message Input */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-200 message-input-area">
              <div className="flex space-x-2 space-x-reverse">
                <Input
                  type="text"
                  placeholder="اكتب رسالة..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-right message-input h-9 sm:h-10 text-sm sm:text-base"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim()}
                  className={`transition-all h-9 sm:h-10 px-3 sm:px-4 ${
                    newMessage.trim() 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
              
              {/* Made with Emergent */}
              <div className="text-center mt-4 mb-1">
                <p className="text-[10px] text-gray-300 opacity-75">Made with Emergent</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
                مرحباً بك في BasemApp
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                اختر مستخدم لبدء الدردشة
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">الملف الشخصي</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileEdit(false)}
                className="text-gray-500 touch-target"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mb-4">
                  <AvatarFallback className="text-xl sm:text-2xl">
                    {user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                  <Input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="bg-gray-50 text-right h-10 sm:h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50 text-right h-10 sm:h-12"
                  />
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse pt-4">
                <Button
                  onClick={() => setShowProfileEdit(false)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-12"
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