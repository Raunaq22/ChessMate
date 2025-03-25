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
  IconButton,
  Tooltip,
  Center,
  useColorModeValue
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use Chakra UI color mode values
  const bgColor = useColorModeValue('chess-light', 'gray.800');
  const borderColor = useColorModeValue('chess-light', 'gray.700');
  const activeBg = useColorModeValue('blue.500', 'blue.400');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
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

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Navigation items
  const NavItems = () => (
    <VStack spacing={3} align="stretch" width="100%" mt={2}>
      {isCollapsed ? (
        // Collapsed version with perfectly centered icons
        <>
          <Link to="/">
            <Box
              position="relative"
              w="100%"
              overflow="hidden"
              borderRadius="md"
              transition="all 0.2s"
            >
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/') ? activeBg : 'transparent'}
                color={isActive('/') ? 'white' : 'inherit'}
                _hover={{ bg: isActive('/') ? 'blue.600' : hoverBg }}
                transition="all 0.2s"
              >
                <Icon as={GoHome} boxSize="1.5rem" />
              </Center>
            </Box>
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/lobby">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/lobby') ? activeBg : 'transparent'}
                    color={isActive('/lobby') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/lobby') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoPeople} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Link to="/play-friend">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/play-friend') ? activeBg : 'transparent'}
                    color={isActive('/play-friend') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/play-friend') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoDeviceDesktop} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Link to="/play-computer">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/play-computer') ? activeBg : 'transparent'}
                    color={isActive('/play-computer') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/play-computer') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoTerminal} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Link to="/profile">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/profile') ? activeBg : 'transparent'}
                    color={isActive('/profile') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/profile') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoPerson} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Link to="/settings">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/settings') ? activeBg : 'transparent'}
                    color={isActive('/settings') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/settings') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoGear} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Box
                position="relative"
                w="100%"
                overflow="hidden"
                borderRadius="md"
                transition="all 0.2s"
              >
                <Center 
                  as="button"
                  w="100%" 
                  h="42px"
                  color="red.500"
                  _hover={{ bg: hoverBg, color: 'red.600' }}
                  transition="all 0.2s"
                  onClick={logout}
                >
                  <Icon as={GoSignOut} boxSize="1.5rem" />
                </Center>
              </Box>
            </>
          ) : (
            <>
              <Link to="/login">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/login') ? activeBg : 'transparent'}
                    color={isActive('/login') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/login') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoSignIn} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
              
              <Link to="/register">
                <Box
                  position="relative"
                  w="100%"
                  overflow="hidden"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Center 
                    as="button"
                    w="100%" 
                    h="42px"
                    bg={isActive('/register') ? activeBg : 'transparent'}
                    color={isActive('/register') ? 'white' : 'inherit'}
                    _hover={{ bg: isActive('/register') ? 'blue.600' : hoverBg }}
                    transition="all 0.2s"
                  >
                    <Icon as={GoPersonAdd} boxSize="1.5rem" />
                  </Center>
                </Box>
              </Link>
            </>
          )}
        </>
      ) : (
        // Expanded version with text and icons
        <>
          <Link to="/">
            <Button 
              leftIcon={<Icon as={GoHome} boxSize="1.5rem" />} 
              variant={isActive('/') ? 'solid' : 'ghost'} 
              colorScheme={isActive('/') ? 'blue' : 'gray'}
              justifyContent="flex-start"
              width="100%"
              px={4}
              size="lg"
              borderRadius="md"
              transition="all 0.2s"
            >
              Home
            </Button>
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/lobby">
                <Button 
                  leftIcon={<Icon as={GoPeople} boxSize="1.5rem" />} 
                  variant={isActive('/lobby') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/lobby') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Game Lobby
                </Button>
              </Link>
              
              <Link to="/play-friend">
                <Button 
                  leftIcon={<Icon as={GoDeviceDesktop} boxSize="1.5rem" />} 
                  variant={isActive('/play-friend') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/play-friend') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Play a Friend
                </Button>
              </Link>
              
              <Link to="/play-computer">
                <Button 
                  leftIcon={<Icon as={GoTerminal} boxSize="1.5rem" />} 
                  variant={isActive('/play-computer') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/play-computer') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Play Computer
                </Button>
              </Link>
              
              <Link to="/profile">
                <Button 
                  leftIcon={<Icon as={GoPerson} boxSize="1.5rem" />} 
                  variant={isActive('/profile') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/profile') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Profile
                </Button>
              </Link>
              
              <Link to="/settings">
                <Button 
                  leftIcon={<Icon as={GoGear} boxSize="1.5rem" />} 
                  variant={isActive('/settings') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/settings') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Settings
                </Button>
              </Link>
              
              <Button 
                leftIcon={<Icon as={GoSignOut} boxSize="1.5rem" />} 
                variant="ghost" 
                colorScheme="red"
                justifyContent="flex-start"
                width="100%"
                onClick={logout}
                px={4}
                size="lg"
                borderRadius="md"
                transition="all 0.2s"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button 
                  leftIcon={<Icon as={GoSignIn} boxSize="1.5rem" />} 
                  variant={isActive('/login') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/login') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Login
                </Button>
              </Link>
              
              <Link to="/register">
                <Button 
                  leftIcon={<Icon as={GoPersonAdd} boxSize="1.5rem" />} 
                  variant={isActive('/register') ? 'solid' : 'ghost'} 
                  colorScheme={isActive('/register') ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  width="100%"
                  px={4}
                  size="lg"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  Register
                </Button>
              </Link>
            </>
          )}
        </>
      )}
    </VStack>
  );

  // Sidebar Content Component - reused in both mobile and desktop
  const SidebarContent = () => (
    <Flex direction="column" h="100%" p={isCollapsed ? 2 : 5}>
      <Flex justify={isCollapsed ? "center" : "space-between"} align="center" mb={6}>
        {!isCollapsed && <Text fontSize="xl" fontWeight="bold">ChessMate</Text>}
        <Center
          onClick={toggleSidebar}
          cursor="pointer"
          borderRadius="md"
          p={2}
          transition="all 0.2s"
          _hover={{ bg: hoverBg }}
        >
          <Icon as={HiMenu} boxSize="1.5rem" />
        </Center>
      </Flex>
      
      {showProfileImage && !isCollapsed && (
        <Flex direction="column" align="center" my="6">
          <Avatar size="xl" src={avatarSrc} name={currentUser.username || "User"} />
          <Text mt="2" fontWeight="medium">
            {currentUser.username}
          </Text>
          <Box h="1px" bg={borderColor} w="100%" my={4} />
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
        icon={<Icon as={HiMenu} boxSize="1.5rem" />}
        display={{ base: "flex", md: "none" }}
        onClick={toggleMobileSidebar}
        position="fixed"
        top="4"
        left="4"
        zIndex={999}
        colorScheme="blue"
        borderRadius="md"
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
            <Flex justify="space-between" align="center" p={4} borderBottomWidth="1px" borderBottomColor={borderColor}>
              <Text fontSize="xl" fontWeight="bold">ChessMate</Text>
              <IconButton size="sm" icon={<Icon boxSize="1.2rem">✕</Icon>} onClick={toggleMobileSidebar} variant="ghost" />
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
        w={isCollapsed ? "70px" : "250px"}
        bg={bgColor}
        borderRight="1px"
        borderRightColor={borderColor}
        display={{ base: 'none', md: 'block' }}
        zIndex={1}
        transition="width 0.2s"
        shadow="md"
      >
        <SidebarContent />
      </Box>
      
      {/* Content padding for desktop view */}
      <Box 
        display={{ base: 'none', md: 'block' }} 
        w={isCollapsed ? "70px" : "250px"}
        transition="width 0.2s"
      />
    </>
  );
};

export default Sidebar;