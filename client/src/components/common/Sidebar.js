import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Box,
  Flex,
  Text,
  Icon,
  Button,
  Avatar,
  VStack,
  IconButton
} from '@chakra-ui/react';
// Import icons individually to avoid dependency issues
import { GoHome, GoGear, GoPerson, GoSignOut, GoSignIn, 
         GoPersonAdd, GoPeople, GoDeviceDesktop, GoTerminal } from "react-icons/go";
// Import hamburger menu icon from Heroicons
import { HiMenu } from "react-icons/hi";

// Format image URL helper function
const formatImageUrl = (url) => {
  if (!url) return `/assets/default-avatar.png`;
  if (url.startsWith('http')) return url;
  return url;
};

const Sidebar = () => {
  const { isAuthenticated, currentUser, logout } = useContext(AuthContext);
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Use theme-neutral colors
  const bgColor = "white";
  const borderColor = "gray.200";
  
  // Check if the current path matches the link
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Only show profile image when authenticated and we have a user
  const showProfileImage = isAuthenticated && !!currentUser;
  
  // Avatar source
  const avatarSrc = showProfileImage && currentUser.profile_image_url 
    ? formatImageUrl(currentUser.profile_image_url)
    : '/assets/default-avatar.png';

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Navigation items
  const NavItems = () => (
    <VStack spacing={3} align="stretch" width="100%">
      <Link to="/">
        <Button 
          leftIcon={<Icon as={GoHome} />} 
          variant={isActive('/') ? 'solid' : 'ghost'} 
          colorScheme={isActive('/') ? 'blue' : 'gray'}
          justifyContent="flex-start"
          width="100%"
        >
          Home
        </Button>
      </Link>
      
      {isAuthenticated ? (
        <>
          <Link to="/lobby">
            <Button 
              leftIcon={<Icon as={GoPeople} />} 
              variant={isActive('/lobby') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/lobby') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Game Lobby
            </Button>
          </Link>
          
          <Link to="/play-friend">
            <Button 
              leftIcon={<Icon as={GoDeviceDesktop} />} 
              variant={isActive('/play-friend') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/play-friend') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Play a Friend
            </Button>
          </Link>
          
          <Link to="/play-computer">
            <Button 
              leftIcon={<Icon as={GoTerminal} />} 
              variant={isActive('/play-computer') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/play-computer') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Play Computer
            </Button>
          </Link>
          
          <Link to="/profile">
            <Button 
              leftIcon={<Icon as={GoPerson} />} 
              variant={isActive('/profile') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/profile') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Profile
            </Button>
          </Link>
          
          <Link to="/settings">
            <Button 
              leftIcon={<Icon as={GoGear} />} 
              variant={isActive('/settings') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/settings') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Settings
            </Button>
          </Link>
          
          <Button 
            leftIcon={<Icon as={GoSignOut} />} 
            variant="ghost" 
            colorScheme="red"
            justifyContent="flex-start"
            width="100%"
            onClick={logout}
          >
            Logout
          </Button>
        </>
      ) : (
        <>
          <Link to="/login">
            <Button 
              leftIcon={<Icon as={GoSignIn} />} 
              variant={isActive('/login') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/login') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Login
            </Button>
          </Link>
          
          <Link to="/register">
            <Button 
              leftIcon={<Icon as={GoPersonAdd} />} 
              variant={isActive('/register') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/register') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
            >
              Register
            </Button>
          </Link>
        </>
      )}
    </VStack>
  );

  // Sidebar Content Component - reused in both mobile and desktop
  const SidebarContent = () => (
    <Flex direction="column" h="100%" p={5}>
      <Text fontSize="xl" fontWeight="bold" mb={6}>ChessMate</Text>
      
      {showProfileImage && (
        <Flex direction="column" align="center" my="6">
          <Avatar size="xl" src={avatarSrc} name={currentUser.username || "User"} />
          <Text mt="2" fontWeight="medium">
            {currentUser.username}
          </Text>
          <Box h="1px" bg="gray.200" w="100%" my={4} />
        </Flex>
      )}
      
      <NavItems />
    </Flex>
  );

  return (
    <>
      {/* Mobile Sidebar Button */}
      <IconButton
        aria-label="Open sidebar"
        icon={<Icon as={HiMenu} />}
        display={{ base: "flex", md: "none" }}
        onClick={toggleMobileSidebar}
        position="fixed"
        top="4"
        left="4"
        zIndex={999}
      />
      
      {/* Mobile Sidebar (simplified replacement for Drawer) */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0" 
            bottom="0"
            bg="blackAlpha.600"
            zIndex={998}
            onClick={toggleMobileSidebar}
          />
          
          {/* Sidebar panel */}
          <Box
            position="fixed"
            top="0"
            left="0"
            h="100vh"
            w="250px"
            bg={bgColor}
            zIndex={999}
            boxShadow="lg"
          >
            <Flex justify="space-between" align="center" p={4} borderBottomWidth="1px">
              <Text fontSize="xl" fontWeight="bold">ChessMate</Text>
              <Button size="sm" onClick={toggleMobileSidebar}>✕</Button>
            </Flex>
            <Box p={4}>
              {showProfileImage && (
                <Flex direction="column" align="center" my="6">
                  <Avatar size="xl" src={avatarSrc} name={currentUser.username || "User"} />
                  <Text mt="2" fontWeight="medium">
                    {currentUser.username}
                  </Text>
                </Flex>
              )}
              <NavItems />
            </Box>
          </Box>
        </>
      )}
      
      {/* Desktop Sidebar */}
      <Box
        as="nav"
        pos="fixed"
        top="0"
        left="0"
        h="100vh"
        w="250px"
        bg={bgColor}
        borderRight="1px"
        borderRightColor={borderColor}
        display={{ base: 'none', md: 'block' }}
        zIndex={1}
      >
        <SidebarContent />
      </Box>
      
      {/* Content padding for desktop view */}
      <Box display={{ base: 'none', md: 'block' }} w="250px" />
    </>
  );
};

export default Sidebar;