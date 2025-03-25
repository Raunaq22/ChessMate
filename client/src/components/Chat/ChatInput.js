import React, { useState } from 'react';
import { Input, Button, Flex, FormControl } from '@chakra-ui/react';

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
    <FormControl as="form" onSubmit={handleSubmit} mt={2}>
      <Flex>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={disabled ? "Chat disabled" : "Type a message..."}
          isDisabled={disabled}
          borderRightRadius={0}
          bg="white"
          _focus={{
            borderColor: 'primary',
            boxShadow: '0 0 0 1px var(--chakra-colors-primary)'
          }}
        />
        <Button
          type="submit"
          isDisabled={!inputText.trim() || disabled}
          bg={!inputText.trim() || disabled ? 'gray.300' : 'primary'}
          color={!inputText.trim() || disabled ? 'gray.500' : 'white'}
          _hover={{
            bg: !inputText.trim() || disabled ? 'gray.300' : 'blue.600'
          }}
          borderLeftRadius={0}
        >
          Send
        </Button>
      </Flex>
    </FormControl>
  );
};

export default ChatInput;