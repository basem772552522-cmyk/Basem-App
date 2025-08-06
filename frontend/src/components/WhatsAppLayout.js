import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, MoreVertical, Settings, User, LogOut, MessageCircle } from 'lucide-react';

const WhatsAppLayout = ({ 
  user, 
  chats, 
  selectedChat, 
  onSelectChat, 
  onLogout, 
  formatTime,
  searchQuery,
  setSearchQuery,
  showSettings,
  setShowSettings,
  showProfileEdit,
  setShowProfileEdit
}) => {
  return (
    <div className="h-screen bg-gray-100 flex" dir="rtl">
      {/* Chat List Sidebar - WhatsApp Style */}
      <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col">
        
        {/* Header with Search */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">BasemApp</h1>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-600 hover:bg-gray-100 p-2"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
              
              {/* Settings Dropdown */}
              {showSettings && (
                <div className="settings-dropdown absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
                        onLogout();
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
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="ابحث أو ابدأ محادثة جديدة"
              className="pr-10 bg-gray-100 border-0 rounded-lg text-right"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-8">
              <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">لا توجد محادثات</h3>
              <p className="text-sm text-center">ابحث عن مستخدم لبدء محادثة جديدة</p>
            </div>
          ) : (
            <div className="chat-list">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        {chat.other_user?.avatar_url ? (
                          <img 
                            src={chat.other_user.avatar_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover rounded-full" 
                          />
                        ) : (
                          <AvatarFallback className="w-12 h-12 text-lg bg-emerald-100 text-emerald-700">
                            {chat.other_user?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {chat.other_user?.is_online && (
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5"></div>
                      )}
                    </div>

                    {/* Chat content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {chat.other_user?.username}
                        </h3>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          {chat.last_message && (
                            <span className="text-xs text-gray-500">
                              {formatTime(chat.last_message.timestamp)}
                            </span>
                          )}
                          {chat.other_user?.is_online && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                              متصل
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-gray-600 text-sm truncate">
                          {chat.last_message?.content || 'لا توجد رسائل'}
                        </p>
                      </div>
                      
                      {!chat.other_user?.is_online && (
                        <p className="text-xs text-gray-400 mt-1">
                          آخر ظهور: {chat.other_user?.last_seen_text || 'غير معروف'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        {selectedChat ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              محادثة مع {selectedChat.other_user?.username}
            </h2>
            <p className="text-gray-500">
              منطقة الدردشة ستظهر هنا
            </p>
          </div>
        ) : (
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              مرحباً بك في BasemApp
            </h2>
            <p className="text-gray-500">
              اختر مستخدم لبدء الدردشة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppLayout;