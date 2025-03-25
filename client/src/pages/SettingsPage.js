import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Box, Flex, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { FaUser, FaPalette } from 'react-icons/fa';
import ProfileSettings from './Settings/ProfileSettings';
import ThemeSettings from './Settings/ThemeSettings';

const SettingsPage = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Set active tab based on URL
    const path = location.pathname;
    if (path.includes('/settings/theme')) {
      setTabIndex(1);
    } else {
      setTabIndex(0);
    }
  }, [isAuthenticated, navigate, location]);

  const handleTabChange = (index) => {
    setTabIndex(index);
    navigate(index === 0 ? '/settings/profile' : '/settings/theme');
  };

  return (
    <Box bg="#706C61" minH="100vh" py={6}>
      <Box 
        maxW="1200px" 
        mx="auto"
        bg="white"
        borderRadius="md"
        overflow="hidden"
        boxShadow="sm"
      >
        <Tabs 
          index={tabIndex} 
          onChange={handleTabChange}
          colorScheme="blue"
          variant="enclosed"
        >
          <TabList 
            bg="#76ABAE" 
            p="10px" 
            borderBottomWidth="2px"
            borderBottomColor="#899E8B"
          >
            <Tab 
              color="white"
              fontWeight="medium"
              _selected={{ bg: 'white', color: '#706C61', borderBottomColor: 'white' }}
              px={6}
              py={3}
              display="flex"
              alignItems="center"
            >
              <FaUser style={{ marginRight: '8px' }} />
              Profile Settings
            </Tab>
            <Tab 
              color="white"
              fontWeight="medium"
              _selected={{ bg: 'white', color: '#706C61', borderBottomColor: 'white' }}
              px={6}
              py={3}
              display="flex"
              alignItems="center"
            >
              <FaPalette style={{ marginRight: '8px' }} />
              Theme Settings
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>
              <ProfileSettings />
            </TabPanel>
            <TabPanel p={0}>
              <ThemeSettings />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default SettingsPage;
