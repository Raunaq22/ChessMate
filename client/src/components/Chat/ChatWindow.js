import React, { useRef, useEffect } from 'react';

const ChatWindow = ({ messages = [], currentUser }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-[300px] overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
      {!messages || messages.length === 0 ? (
        <div className="text-center text-gray-500 h-full flex items-center justify-center">
          <p>No messages yet. Start chatting!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 flex ${
              message.userId === currentUser?.user_id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                message.userId === currentUser?.user_id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="text-xs opacity-75 mb-1 font-medium">
                {message.userId === currentUser?.user_id ? 'You' : message.username || 'Opponent'}
              </div>
              <div className="break-words">{message.text}</div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;