import React, { useState } from 'react';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex mt-2">
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={disabled ? "Chat disabled" : "Type a message..."}
        disabled={disabled}
        className="flex-grow px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={!inputText.trim() || disabled}
        className={`px-4 py-2 rounded-r font-medium ${
          !inputText.trim() || disabled
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