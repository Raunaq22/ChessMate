import React, { useEffect, useRef } from 'react';

const ChatWindow = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded p-4 flex items-center justify-center text-gray-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="h-64 bg-gray-50 rounded p-2 overflow-y-auto">
      {messages.map((msg, index) => {
        const isCurrentUser = msg.userId === currentUserId;
        
        return (
          <div 
            key={index} 
            className={`mb-2 ${isCurrentUser ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block px-3 py-2 rounded-lg max-w-xs lg:max-w-md ${
                isCurrentUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {!isCurrentUser && (
                <p className="font-bold text-xs">{msg.sender}</p>
              )}
              <p>{msg.text}</p>
              <span className="text-xs opacity-75">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;