import React, { useContext, useState, useEffect, useRef } from 'react';
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
  Spacer,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@chakra-ui/react';
// Import icons individually to avoid dependency issues
import { GoHome, GoGear, GoPerson, GoSignOut, GoSignIn, 
         GoPersonAdd, GoPeople, GoDeviceDesktop, GoTerminal } from "react-icons/go";
// Import hamburger menu icon from Heroicons
import { HiMenu, HiMenuAlt2 } from "react-icons/hi";

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
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Use Chakra UI color mode values (using theme colors)
  const bgColor = 'chess-light';
  const textColor = 'chess-dark';
  const activeBg = 'primary';
  const hoverBg = 'chess-hover';
  
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

  // Toggle sidebar collapse using a direct handler
  const handleToggleSidebar = () => {
    console.log('Toggle button clicked - current state:', isCollapsed);
    setIsCollapsed(!isCollapsed);
  };

  // Determine if sidebar should be expanded (either not collapsed or hovering)
  const shouldExpand = !isCollapsed || isHovering;
  
  // Handle mouse enter - expand the sidebar with delay
  const handleMouseEnter = () => {
    if (isCollapsed) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      // Set timeout to prevent accidental hovering
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(true);
      }, 300); // 300ms delay before opening
    }
  };
  
  // Handle mouse leave - collapse the sidebar with delay
  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set timeout to prevent jitter when mouse briefly leaves
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300); // 300ms delay before closing
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Debug log for collapsed state changes
  useEffect(() => {
    console.log('Sidebar width should now be:', isCollapsed ? '60px' : '220px');
    // Force a layout recalculation to ensure transitions work
    void document.body.offsetHeight; // Using void operator to indicate intentional side effect
  }, [isCollapsed]);

  // Handle logout with confirmation
  const handleLogout = () => {
    // Open the modal and collapse the sidebar
    onOpen();
    setIsCollapsed(true);
    setIsMobileOpen(false); // Also close mobile sidebar if open
  };
  
  const confirmLogout = () => {
    onClose();
    logout();
  };

  // Main navigation items
  const MainNavItems = () => (
    <VStack spacing={3} align="stretch" width="100%" flex="1">
      <Link to="/">
        {!shouldExpand ? (
          <Center 
            as="button"
            w="100%" 
            h="42px"
            bg={isActive('/') ? activeBg : 'transparent'}
            color={isActive('/') ? 'white' : textColor}
            _hover={{ bg: isActive('/') ? activeBg : hoverBg, color: 'white' }}
            transition="all 0.2s"
            borderRadius="md"
          >
            <Icon as={GoHome} boxSize="1.5rem" />
          </Center>
        ) : (
          <Button 
            leftIcon={<Icon as={GoHome} boxSize="1.5rem" />} 
            variant={isActive('/') ? 'solid' : 'ghost'} 
            bg={isActive('/') ? activeBg : 'transparent'}
            color={isActive('/') ? 'white' : '#dedede'}
            _hover={{ bg: hoverBg, color: 'white' }}
            justifyContent="flex-start"
            width="100%"
            px={4}
            size="lg"
            borderRadius="md"
          >
            Home
          </Button>
        )}
      </Link>
      
      {isAuthenticated && (
        <>
          <Link to="/lobby">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/lobby') ? activeBg : 'transparent'}
                color={isActive('/lobby') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/lobby') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoPeople} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoPeople} boxSize="1.5rem" />} 
                variant={isActive('/lobby') ? 'solid' : 'ghost'} 
                bg={isActive('/lobby') ? activeBg : 'transparent'}
                color={isActive('/lobby') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Game Lobby
              </Button>
            )}
          </Link>
          
          <Link to="/play-friend">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/play-friend') ? activeBg : 'transparent'}
                color={isActive('/play-friend') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/play-friend') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoDeviceDesktop} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoDeviceDesktop} boxSize="1.5rem" />} 
                variant={isActive('/play-friend') ? 'solid' : 'ghost'} 
                bg={isActive('/play-friend') ? activeBg : 'transparent'}
                color={isActive('/play-friend') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Play a Friend
              </Button>
            )}
          </Link>
          
          <Link to="/play-computer">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/play-computer') ? activeBg : 'transparent'}
                color={isActive('/play-computer') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/play-computer') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoTerminal} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoTerminal} boxSize="1.5rem" />} 
                variant={isActive('/play-computer') ? 'solid' : 'ghost'} 
                bg={isActive('/play-computer') ? activeBg : 'transparent'}
                color={isActive('/play-computer') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Play Computer
              </Button>
            )}
          </Link>
          
          <Link to="/profile">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/profile') ? activeBg : 'transparent'}
                color={isActive('/profile') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/profile') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoPerson} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoPerson} boxSize="1.5rem" />} 
                variant={isActive('/profile') ? 'solid' : 'ghost'} 
                bg={isActive('/profile') ? activeBg : 'transparent'}
                color={isActive('/profile') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Profile
              </Button>
            )}
          </Link>
        </>
      )}
      
      {!isAuthenticated && (
        <>
          <Link to="/login">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/login') ? activeBg : 'transparent'}
                color={isActive('/login') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/login') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoSignIn} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoSignIn} boxSize="1.5rem" />} 
                variant={isActive('/login') ? 'solid' : 'ghost'} 
                bg={isActive('/login') ? activeBg : 'transparent'}
                color={isActive('/login') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Login
              </Button>
            )}
          </Link>
          
          <Link to="/register">
            {!shouldExpand ? (
              <Center 
                as="button"
                w="100%" 
                h="42px"
                bg={isActive('/register') ? activeBg : 'transparent'}
                color={isActive('/register') ? 'white' : '#dedede'}
                _hover={{ bg: isActive('/register') ? activeBg : hoverBg, color: 'white' }}
                transition="all 0.2s"
                borderRadius="md"
              >
                <Icon as={GoPersonAdd} boxSize="1.5rem" />
              </Center>
            ) : (
              <Button 
                leftIcon={<Icon as={GoPersonAdd} boxSize="1.5rem" />} 
                variant={isActive('/register') ? 'solid' : 'ghost'} 
                bg={isActive('/register') ? activeBg : 'transparent'}
                color={isActive('/register') ? 'white' : '#dedede'}
                _hover={{ bg: hoverBg, color: 'white' }}
                justifyContent="flex-start"
                width="100%"
                px={4}
                size="lg"
                borderRadius="md"
              >
                Register
              </Button>
            )}
          </Link>
        </>
      )}
    </VStack>
  );

  // Bottom icons for settings and logout
  const BottomIcons = () => (
    <Flex width="100%" justify={shouldExpand ? "space-between" : "center"} mt={4}>
      {/* Settings icon - bottom left */}
      <Link to="/settings">
        <Tooltip label={!shouldExpand ? "Settings" : ""} placement="right">
          <Center 
            as="button"
            w={10} 
            h={10}
            borderRadius="md"
            bg={isActive('/settings') ? activeBg : 'transparent'}
            color={isActive('/settings') ? 'white' : '#dedede'}
            _hover={{ bg: isActive('/settings') ? activeBg : hoverBg, color: 'white' }}
            transition="all 0.2s"
          >
            <Icon as={GoGear} boxSize="1.3rem" />
          </Center>
        </Tooltip>
      </Link>
      
      {/* Logout icon - bottom right (only if authenticated and expanded) */}
      {isAuthenticated && shouldExpand && (
        <Tooltip label={!shouldExpand ? "Logout" : ""} placement="right">
          <Center 
            as="button"
            w={10} 
            h={10}
            borderRadius="md"
            color="#dedede"
            _hover={{ bg: hoverBg, color: 'white' }}
            transition="all 0.2s"
            onClick={handleLogout}
          >
            <Icon as={GoSignOut} boxSize="1.3rem" />
          </Center>
        </Tooltip>
      )}
    </Flex>
  );

  // Simple toggle button with direct DOM manipulation
  const ToggleButton = () => {
    return (
      <button
        onClick={handleToggleSidebar}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '4px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#99C5B5'}
        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Icon 
          as={isCollapsed ? HiMenuAlt2 : HiMenu} 
          color="#dedede" 
          boxSize="1.5rem" 
          style={{ transition: 'transform 0.3s ease' }}
        />
      </button>
    );
  };

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
        zIndex={9999}
        bg="primary"
        color="white"
        borderRadius="md"
        boxShadow="md"
      />
      
      {/* Mobile Sidebar */}
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
            zIndex={9998}
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
            zIndex={9999}
            boxShadow="lg"
          >
            <Box p={4}>
              <Flex justify="flex-end" mb={4}>
                <IconButton 
                  size="sm" 
                  icon={<Icon boxSize="1.2rem">✕</Icon>} 
                  onClick={toggleMobileSidebar} 
                  variant="ghost" 
                  color={textColor}
                  _hover={{ bg: hoverBg, color: 'white' }}
                />
              </Flex>
              <MainNavItems />
              <BottomIcons />
            </Box>
          </Box>
        </>
      )}
      
      {/* Desktop Sidebar - with hover functionality */}
      <Box
        as="nav"
        pos="fixed"
        top="0"
        left="0"
        h="100vh"
        w={shouldExpand ? "220px" : "60px"}
        bg={bgColor}
        borderRight="1px"
        borderRightColor={bgColor}
        display={{ base: 'none', md: 'block' }}
        zIndex={100}
        transition="width 0.3s ease-in-out"
        overflow="hidden"
        style={{ width: shouldExpand ? "220px" : "60px" }} // Explicit inline style
        className={isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Flex direction="column" h="100%" p={3} justifyContent="space-between">
          {/* Toggle button at top - with direct DOM implementation */}
          <Flex justify="center" mb={4}>
            <ToggleButton />
          </Flex>
          
          {/* Main navigation */}
          <MainNavItems />
          
          {/* Bottom icons */}
          <BottomIcons />
        </Flex>
      </Box>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent bg="chess-light" borderRadius="md" mx={4}>
          <ModalHeader color="#ffffff" fontSize="lg" fontWeight="bold">
            Confirm Logout
          </ModalHeader>
          <ModalBody pb={6}>
            <Text color="#ffffff">
              Are you sure you want to log out?
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button 
              onClick={onClose} 
              variant="outline" 
              borderColor="chess-dark"
              color="chess-dark"
              _hover={{ bg: "gray.100" }}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmLogout} 
              bg="primary" 
              color="white"
              _hover={{ bg: "chess-hover" }}
            >
              Logout
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Sidebar;