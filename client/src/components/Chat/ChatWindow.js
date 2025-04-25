import React, { useRef, useEffect } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';

const ChatWindow = ({ messages = [], currentUser, isMobile = false }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && containerRef.current) {
      // Use a more controlled scroll that only affects the container
      // instead of scrollIntoView which can affect the whole page
      const container = containerRef.current;
      const scrollElement = messagesEndRef.current;
      
      container.scrollTop = scrollElement.offsetTop;
    }
  }, [messages]);

  return (
    <Box 
      ref={containerRef}
      h={isMobile ? "120px" : "250px"} 
      overflowY="auto" 
      p={isMobile ? 1 : 2} 
      bg="white" 
      borderRadius="md" 
      borderWidth="1px" 
      borderColor="gray.200"
      css={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          width: '8px',
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
          <Text color="gray.500" fontSize={isMobile ? "xs" : "sm"}>No messages yet. Start chatting!</Text>
        </Flex>
      ) : (
        <VStack spacing={isMobile ? 2 : 3} align="stretch">
          {messages.map((message, index) => (
            <Flex
              key={index}
              justify={message.userId === currentUser?.user_id ? 'flex-end' : 'flex-start'}
            >
              <Box
                maxW="80%"
                borderRadius="lg"
                px={isMobile ? 2 : 4}
                py={isMobile ? 1 : 2}
                shadow="sm"
                bg={message.userId === currentUser?.user_id ? 'primary' : 'gray.100'}
                color={message.userId === currentUser?.user_id ? 'white' : 'gray.800'}
                borderWidth={message.userId === currentUser?.user_id ? '0' : '1px'}
                borderColor="gray.200"
              >
                <Text fontSize={isMobile ? "2xs" : "xs"} opacity={0.75} mb={isMobile ? 0.5 : 1} fontWeight="medium">
                  {message.userId === currentUser?.user_id ? 'You' : message.username || 'Opponent'}
                </Text>
                <Text wordBreak="break-word" fontSize={isMobile ? "xs" : "md"}>{message.text}</Text>
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