import React, { useState, useRef, useEffect } from 'react';
import ChatInput from './ChatInput';

const ChatWindow = ({ messages, onSendMessage, currentUserId }) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg">Game Chat</h3>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto max-h-96">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center my-4">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-2 ${message.userId === currentUserId ? 'text-right' : ''}`}
            >
              <div 
                className={`inline-block px-3 py-2 rounded-lg ${
                  message.userId === currentUserId 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-xs font-bold">{message.username}</p>
                <p>{message.text}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <ChatInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;