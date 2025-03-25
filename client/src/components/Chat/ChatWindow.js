import React, { useRef, useEffect } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';

const ChatWindow = ({ messages = [], currentUser }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box 
      h="250px" 
      overflowY="auto" 
      p={2} 
      bg="white" 
      borderRadius="md" 
      borderWidth="1px" 
      borderColor="gray.200"
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          width: '10px',
          background: 'rgba(0,0,0,0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '24px',
        },
      }}
    >
      {!messages || messages.length === 0 ? (
        <Flex h="full" align="center" justify="center">
          <Text color="gray.500">No messages yet. Start chatting!</Text>
        </Flex>
      ) : (
        <VStack spacing={3} align="stretch">
          {messages.map((message, index) => (
            <Flex
              key={index}
              justify={message.userId === currentUser?.user_id ? 'flex-end' : 'flex-start'}
            >
              <Box
                maxW="80%"
                borderRadius="lg"
                px={4}
                py={2}
                shadow="sm"
                bg={message.userId === currentUser?.user_id ? 'primary' : 'gray.100'}
                color={message.userId === currentUser?.user_id ? 'white' : 'gray.800'}
                borderWidth={message.userId === currentUser?.user_id ? '0' : '1px'}
                borderColor="gray.200"
              >
                <Text fontSize="xs" opacity={0.75} mb={1} fontWeight="medium">
                  {message.userId === currentUser?.user_id ? 'You' : message.username || 'Opponent'}
                </Text>
                <Text wordBreak="break-word">{message.text}</Text>
              </Box>
            </Flex>
          ))}
        </VStack>
      )}
      <Box ref={messagesEndRef} />
    </Box>
  );
};

export default ChatWindow;