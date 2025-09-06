import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Search, MessageCircle, Send, MoreVertical, User, LogOut, X, Users, Upload, Download } from 'lucide-react';
import ContactsSync from './ContactsSync';

const API = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showContactsSync, setShowContactsSync] = useState(false);
  const [contacts, setContacts] = useState({});
  
  const messagesEndRef = useRef(null);
  const contactsSync = useRef(null);

  // تهيئة جهات الاتصال
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem('contacts');
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error('خطأ في تحميل جهات الاتصال:', error);
    }
  }, []);

  // حفظ جهات الاتصال
  const saveContacts = (newContacts) => {
    const updatedContacts = { ...contacts, ...newContacts };
    setContacts(updatedContacts);
    localStorage.setItem('contacts', JSON.stringify(updatedContacts));
  };

  // الحصول على الاسم المعروض
  const getDisplayName = (user) => {
    if (!user) return '';
    const contactName = contacts[user.email?.toLowerCase()];
    return contactName || user.username || user.email || 'مستخدم';
  };

  // رفع ملف جهات الاتصال
  const handleContactsUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const contactMap = {};
        
        for (let i = 1; i < lines.length; i++) { // تخطي العنوان
          const line = lines[i].trim();
          if (line) {
            const parts = line.split(',').map(part => part.trim().replace(/['"]/g, ''));
            
            if (parts.length >= 2) {
              let name = '';
              let email = '';
              
              if (parts[0].includes('@')) {
                email = parts[0];
                name = parts[1];
              } else if (parts[1].includes('@')) {
                name = parts[0];
                email = parts[1];
              }
              
              if (email && name) {
                contactMap[email.toLowerCase()] = name;
              }
            }
          }
        }
        
        saveContacts(contactMap);
        alert(`تم رفع ${Object.keys(contactMap).length} جهة اتصال بنجاح!`);
      } catch (error) {
        alert('خطأ في قراءة الملف. تأكد من التنسيق الصحيح.');
      }
    };
    reader.readAsText(file);
  };



  // Set axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // تزامن جهات الاتصال
  const syncContacts = async () => {
    try {
      // محاولة استخدام Contacts API إذا كان متاحاً
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const contactPermission = await navigator.permissions.query({name: 'contacts'});
        
        if (contactPermission.state === 'granted') {
          const props = ['name', 'email'];
          const opts = {multiple: true};
          
          const contactList = await navigator.contacts.select(props, opts);
          const contactMap = {};
          
          contactList.forEach(contact => {
            if (contact.email && contact.email.length > 0) {
              contact.email.forEach(email => {
                contactMap[email.toLowerCase()] = contact.name && contact.name.length > 0 ? contact.name[0] : null;
              });
            }
          });
          
          setContacts(contactMap);
          localStorage.setItem('contacts', JSON.stringify(contactMap));
          console.log('تم تزامن جهات الاتصال:', contactMap);
          return true;
        }
      }
      
      // إذا لم يكن Contacts API متاحاً، استخدم طريقة بديلة
      console.log('Contacts API غير متاح، استخدم الرفع اليدوي');
      return false;
    } catch (error) {
      console.error('خطأ في تزامن جهات الاتصال:', error);
      return false;
    }
  };

  // رفع ملف جهات الاتصال CSV
  const uploadContactsFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const contactMap = {};
        
        // تخطي العنوان إذا وجد
        const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // توقع تنسيق: Name,Email أو Email,Name
            const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
            
            if (parts.length >= 2) {
              let name = '';
              let email = '';
              
              // تحديد أيهما الاسم وأيهما الإيميل
              if (parts[0].includes('@')) {
                email = parts[0];
                name = parts[1];
              } else if (parts[1].includes('@')) {
                name = parts[0];
                email = parts[1];
              }
              
              if (email && name) {
                contactMap[email.toLowerCase()] = name;
              }
            }
          }
        }
        
        setContacts({...contacts, ...contactMap});
        localStorage.setItem('contacts', JSON.stringify({...contacts, ...contactMap}));
        console.log('تم رفع جهات الاتصال:', contactMap);
        alert(`تم رفع ${Object.keys(contactMap).length} جهة اتصال بنجاح!`);
      } catch (error) {
        console.error('خطأ في قراءة ملف جهات الاتصال:', error);
        alert('خطأ في قراءة الملف. تأكد من أن الملف بتنسيق CSV صحيح.');
      }
    };
    
    reader.readAsText(file);
  };



  // تحميل جهات الاتصال المحفوظة عند بدء التطبيق
  useEffect(() => {
    const savedContacts = localStorage.getItem('contacts');
    if (savedContacts) {
      try {
        setContacts(JSON.parse(savedContacts));
      } catch (error) {
        console.error('خطأ في تحميل جهات الاتصال المحفوظة:', error);
      }
    }
  }, []);

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
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSelectedChat(null);
    setMessages([]);
    setChats([]);
    localStorage.removeItem('token');
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await axios.post(`${API}/messages`, {
        chat_id: selectedChat.id,
        content: newMessage.trim()
      });
      
      setNewMessage('');
      loadMessages(selectedChat.id);
      loadChats();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const searchUsers = async (query = null) => {
    const searchTerm = (query || searchQuery).trim();
    
    // إذا كان النص فارغاً، امسح النتائج
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    // إذا كان النص قصير جداً، لا تبحث
    if (searchTerm.length < 2) {
      return;
    }
    
    try {
      console.log('البحث عن:', searchTerm);
      
      // ترميز النص للـ URL
      const encodedQuery = encodeURIComponent(searchTerm);
      const response = await axios.get(`${API}/users/search?q=${encodedQuery}&limit=10`);
      
      console.log('نتائج البحث من API:', response.data);
      
      // فلترة النتائج لإزالة المستخدم الحالي
      const filteredResults = response.data.filter(searchUser => searchUser.id !== user?.id);
      
      console.log('النتائج بعد الفلترة:', filteredResults);
      
      setSearchResults(filteredResults);
      
      // إذا لم توجد نتائج، اعرض رسالة
      if (filteredResults.length === 0) {
        console.log('لا توجد نتائج للبحث:', searchTerm);
      }
    } catch (error) {
      console.error('فشل البحث:', error);
      setSearchResults([]);
    }
  };

  // بحث فوري أثناء الكتابة
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    
    // إذا كان النص فارغاً، امسح النتائج فوراً
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    
    // إذا كان النص أقل من حرفين، لا تبحث
    if (value.trim().length < 2) {
      return;
    }
    
    // إلغاء البحث السابق
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    // بحث بعد 300ms من توقف الكتابة
    window.searchTimeout = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const startChat = async (userId) => {
    try {
      console.log('محاولة بدء محادثة مع المستخدم:', userId);
      
      const response = await axios.post(`${API}/chats?other_user_id=${userId}`);
      
      console.log('استجابة إنشاء المحادثة:', response.data);
      
      // إعادة تحميل قائمة المحادثات
      await loadChats();
      
      // البحث عن المحادثة في القائمة المحدثة
      const updatedChats = await axios.get(`${API}/chats`);
      const newChat = updatedChats.data.find(chat => 
        chat.id === response.data.id || 
        (chat.other_user && chat.other_user.id === userId)
      );
      
      if (newChat) {
        console.log('تم العثور على المحادثة:', newChat);
        setSelectedChat(newChat);
        await loadMessages(newChat.id);
        setChats(updatedChats.data);
      } else {
        console.log('لم يتم العثور على المحادثة، استخدام البيانات المُرجعة');
        setSelectedChat(response.data);
        await loadMessages(response.data.id);
      }
      
      // مسح البحث
      setSearchQuery('');
      setSearchResults([]);
      
      console.log('تم فتح المحادثة بنجاح');
      
    } catch (error) {
      console.error('فشل في بدء المحادثة:', error);
      console.error('تفاصيل الخطأ:', error.response?.data);
      
      // محاولة بديلة - البحث عن محادثة موجودة
      try {
        const chatsResponse = await axios.get(`${API}/chats`);
        const existingChat = chatsResponse.data.find(chat => 
          chat.other_user && chat.other_user.id === userId
        );
        
        if (existingChat) {
          console.log('تم العثور على محادثة موجودة:', existingChat);
          setSelectedChat(existingChat);
          await loadMessages(existingChat.id);
          setChats(chatsResponse.data);
          setSearchQuery('');
          setSearchResults([]);
        } else {
          alert('فشل في فتح المحادثة. يرجى المحاولة مرة أخرى.');
        }
      } catch (fallbackError) {
        console.error('فشل في المحاولة البديلة:', fallbackError);
        alert('فشل في فتح المحادثة. يرجى المحاولة مرة أخرى.');
      }
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Load user and chats on token change
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

  // نظام الإشعارات الفورية مع الصوت
  useEffect(() => {
    let intervalId = null;
    
    if (selectedChat && user) {
      const checkForNewMessages = async () => {
        try {
          const response = await axios.get(`${API}/chats/${selectedChat.id}/messages`);
          const newMessages = response.data;
          
          // التحقق من وجود رسائل جديدة
          if (newMessages.length > messages.length) {
            const latestMessage = newMessages[newMessages.length - 1];
            
            // تشغيل الصوت فقط إذا كانت الرسالة من مستخدم آخر
            if (latestMessage.sender_id !== user.id) {
              // تشغيل صوت الإشعار
              try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
              } catch (error) {
                console.log('تعذر تشغيل الصوت:', error);
              }
              
              // إشعار المتصفح
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('رسالة جديدة في BasemApp', {
                  body: `${selectedChat.other_user?.username}: ${latestMessage.content}`,
                  icon: '/favicon.ico',
                  tag: 'new-message'
                });
              }
            }
            
            setMessages(newMessages);
          }
        } catch (error) {
          console.error('خطأ في تحديث الرسائل:', error);
        }
      };

      // بدء polling كل 3 ثوان
      intervalId = setInterval(checkForNewMessages, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedChat, user, messages.length]);

  // طلب إذن الإشعارات عند تحميل التطبيق
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
                    <button
                      onClick={() => {
                        setShowContactsSync(true);
                        setShowSettings(false);
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-right hover:bg-gray-50 flex items-center space-x-2 sm:space-x-3 space-x-reverse settings-item"
                    >
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-sm sm:text-base">تزامن جهات الاتصال</span>
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
              placeholder="ابحث عن مستخدم بالاسم أو البريد..."
              className="pr-8 sm:pr-10 bg-gray-100 border-0 rounded-lg text-right search-input h-8 sm:h-9 text-xs sm:text-sm"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                // إظهار النتائج عند التركيز إذا كان هناك نص
                if (searchQuery.trim().length >= 2) {
                  searchUsers();
                }
              }}
            />
            {/* مؤشر التحميل */}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
              </div>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery && searchQuery.length >= 2 ? (
            <div className="p-2">
              <div className="flex items-center justify-between p-2 mb-2">
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                  نتائج البحث عن "{searchQuery}"
                </h3>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  مسح
                </button>
              </div>
              
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 sm:p-4 border border-gray-100 rounded-lg mb-2 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-all duration-200 user-item"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                      <div className="relative">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 chat-avatar border-2 border-emerald-100">
                          <AvatarFallback className="w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-lg bg-emerald-100 text-emerald-700 font-semibold">
                            {user.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => startChat(user.id)}
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {getDisplayName(user)}
                          </h3>
                          <span className="text-xs text-gray-500">(@{user.username})</span>
                          {user.is_online && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                              متصل
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm truncate mt-0.5">
                          {user.email}
                        </p>
                        {!user.is_online && user.last_seen && (
                          <p className="text-gray-400 text-xs mt-0.5">
                            آخر ظهور: {formatLastSeen(user.last_seen)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startChat(user.id);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 text-xs"
                        >
                          محادثة
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">لا توجد نتائج للبحث عن "{searchQuery}"</p>
                  <p className="text-xs text-gray-400 mt-1">جرب كتابة اسم مختلف أو بريد إلكتروني</p>
                </div>
              )}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-gray-500 p-4 sm:p-8">
              <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-gray-300" />
              <h3 className="text-base sm:text-lg font-medium mb-2">لا توجد محادثات</h3>
              <p className="text-xs sm:text-sm text-center">ابحث عن مستخدم لبدء محادثة جديدة</p>
              <p className="text-xs text-gray-400 mt-2">اكتب أكثر من حرفين للبحث</p>
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
                          {getDisplayName(chat.other_user)}
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
            <div className="p-3 sm:p-4 bg-white border-b border-gray-200 flex items-center chat-header shadow-sm">
              <div className="relative mr-3 sm:mr-4 avatar-enhanced">
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-gray-200 avatar-gradient">
                  <AvatarFallback className="text-lg sm:text-xl font-semibold bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    {selectedChat.other_user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* مؤشر الحالة */}
                {selectedChat.other_user?.is_online && (
                  <div className="status-indicator online-indicator"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <h2 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                    {selectedChat.other_user?.username}
                  </h2>
                  {selectedChat.other_user?.is_online && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 online-indicator"></div>
                      <span className="text-xs text-green-600 font-medium">نشط الآن</span>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                  {selectedChat.other_user?.is_online ? 
                    'متصل الآن' : 
                    `آخر ظهور: ${formatLastSeen(selectedChat.other_user?.last_seen)}`
                  }
                </p>
              </div>
              
              {/* معلومات إضافية */}
              <div className="flex items-center space-x-1 space-x-reverse ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
                  title="البحث في المحادثة"
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
                  title="المزيد من الخيارات"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
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
              {/* Made with Emergent */}
              <div className="text-center mt-4">
                <p className="text-[10px] text-gray-300 opacity-75">Made with Emergent</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contacts Sync Modal */}
      {showContactsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">تزامن جهات الاتصال</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContactsSync(false)}
                className="text-gray-500 touch-target"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 mb-4">
                  قم بتزامن جهات اتصالك لعرض الأسماء الحقيقية بدلاً من أسماء المستخدمين
                </p>
                
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-blue-800">
                    📊 عدد جهات الاتصال المحفوظة: {Object.keys(contacts).length}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">رفع ملف CSV لجهات الاتصال</p>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleContactsUpload}
                    className="hidden"
                    id="contacts-upload"
                  />
                  <label
                    htmlFor="contacts-upload"
                    className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-sm"
                  >
                    اختر ملف CSV
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    تنسيق: الاسم,البريد الإلكتروني
                  </p>
                </div>

                {Object.keys(contacts).length > 0 && (
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2 text-sm">جهات الاتصال المزامنة:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {Object.entries(contacts).slice(0, 5).map(([email, name]) => (
                        <div key={email} className="flex justify-between text-xs">
                          <span className="font-medium">{name}</span>
                          <span className="text-gray-500">{email}</span>
                        </div>
                      ))}
                      {Object.keys(contacts).length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-1">
                          و {Object.keys(contacts).length - 5} جهة اتصال أخرى...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 space-x-reverse pt-4">
                <Button
                  onClick={() => setShowContactsSync(false)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-12"
                >
                  تم
                </Button>
                {Object.keys(contacts).length > 0 && (
                  <Button
                    onClick={() => {
                      setContacts({});
                      localStorage.removeItem('contacts');
                      alert('تم مسح جميع جهات الاتصال');
                    }}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    مسح الكل
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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