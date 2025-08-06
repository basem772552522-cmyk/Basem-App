import React from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

const ChatList = ({ chats, selectedChat, onSelectChat, formatTime }) => {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-lg font-medium mb-2">لا توجد محادثات</h3>
        <p className="text-sm text-center">ابحث عن مستخدم لبدء محادثة جديدة</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelectChat(chat)}
          className={`chat-item ${selectedChat?.id === chat.id ? 'bg-gray-100' : ''}`}
        >
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Avatar with online indicator */}
            <div className="relative">
              <Avatar className="w-12 h-12">
                {chat.other_user?.avatar_url ? (
                  <img 
                    src={chat.other_user.avatar_url} 
                    alt="Profile" 
                    className="chat-avatar" 
                  />
                ) : (
                  <AvatarFallback className="w-12 h-12 text-lg">
                    {chat.other_user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              {chat.other_user?.is_online && (
                <div className="online-indicator"></div>
              )}
            </div>

            {/* Chat content */}
            <div className="chat-content">
              <div className="flex items-center justify-between">
                <h3 className="chat-name">
                  {chat.other_user?.username}
                </h3>
                <div className="flex items-center space-x-2 space-x-reverse">
                  {chat.last_message && (
                    <span className="chat-time">
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
              
              <div className="flex items-center justify-between">
                <p className="chat-message">
                  {chat.last_message?.content || 'لا توجد رسائل'}
                </p>
                {/* Unread count could go here */}
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
  );
};

export default ChatList;