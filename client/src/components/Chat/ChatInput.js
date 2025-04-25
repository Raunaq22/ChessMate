import React, { useState } from 'react';
import { Input, Button, Flex, Box } from '@chakra-ui/react';

const ChatInput = ({ onSendMessage, disabled, size = "md" }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  return (
    <Box mt={2}>
      <Flex>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Chat disabled" : "Type a message..."}
          isDisabled={disabled}
          borderRightRadius={0}
          bg="white"
          size={size}
          fontSize={size === "sm" ? "xs" : "md"}
          height={size === "sm" ? "32px" : "40px"}
          _focus={{
            borderColor: 'primary',
            boxShadow: '0 0 0 1px var(--chakra-colors-primary)'
          }}
        />
        <Button
          onClick={handleSubmit}
          isDisabled={!inputText.trim() || disabled}
          bg={!inputText.trim() || disabled ? 'gray.300' : 'primary'}
          color={!inputText.trim() || disabled ? 'gray.500' : 'white'}
          _hover={{
            bg: !inputText.trim() || disabled ? 'gray.300' : 'blue.600'
          }}
          borderLeftRadius={0}
          size={size}
          fontSize={size === "sm" ? "xs" : "md"}
          height={size === "sm" ? "32px" : "40px"}
        >
          Send
        </Button>
      </Flex>
    </Box>
  );
};

export default ChatInput;