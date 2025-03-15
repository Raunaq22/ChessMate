import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const { currentUser } = useContext(AuthContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled && currentUser) {
      onSendMessage({
        text: message.trim(),
        sender: currentUser.username || currentUser.user_id,
        timestamp: new Date().toISOString()
      });
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex mt-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={disabled ? "Chat disabled" : "Type a message..."}
        disabled={disabled}
        className="flex-grow px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className={`px-4 py-2 rounded-r font-medium ${
          !message.trim() || disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput;