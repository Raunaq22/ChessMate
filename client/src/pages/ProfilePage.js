import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import UserAvatar, { formatImageUrl } from '../components/common/UserAvatar';
import {
  Box,
  Container,
  Flex,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Grid,
  GridItem,
  useColorModeValue,
  Spinner,
  Avatar,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Icon
} from '@chakra-ui/react';
import { FaTrophy, FaGamepad, FaCalendarAlt, FaChessKing } from 'react-icons/fa';

// Helper function to get proper image URL with backend origin
const getFormattedImageUrl = (url) => {
  if (!url) return '/assets/default-avatar.png';
  
  if (url.startsWith('/uploads/profile/')) {
    // Extract the filename from the path
    const filename = url.split('/').pop();
    
    // Use the dedicated API endpoint for profile images
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const apiPath = `/api/users/profile-image/${filename}`;
    
    // Add cache busting
    const timestamp = new Date().getTime();
    const fullUrl = `${backendUrl}${apiPath}?t=${timestamp}`;
    
    console.log("ProfilePage: Using profile image API endpoint:", fullUrl);
    return fullUrl;
  }
  
  return url;
};

const ProfilePage = () => {
  const { currentUser, isAuthenticated, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [gameHistory, setGameHistory] = useState([]);
  const [userStats, setUserStats] = useState({
    activeGames: 0,
    gamesPlayed: 0,
    winRate: '0%',
    joined: 'Loading...'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

  const bgCard = useColorModeValue('white', 'gray.800');
  const bgHeader = useColorModeValue('primary', 'primary');
  const bgHover = useColorModeValue('gray.50', 'gray.700');
  const bgStatCard = useColorModeValue('gray.50', 'gray.700');

  // Sorting function for the table
  const sortedGameHistory = React.useMemo(() => {
    let sortableGames = [...gameHistory];
    
    if (sortConfig.key) {
      sortableGames.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortConfig.key) {
          case 'date':
            aValue = new Date(a.end_time || a.updated_at);
            bValue = new Date(b.end_time || b.updated_at);
            break;
          case 'opponent':
            aValue = (a.opponent_name || "Unknown").toLowerCase();
            bValue = (b.opponent_name || "Unknown").toLowerCase();
            break;
          case 'result':
            aValue = a.result || 'draw';
            bValue = b.result || 'draw';
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableGames;
  }, [gameHistory, sortConfig]);

  // Request sort handler
  const requestSort = (key) => {
    let direction = 'ascending';
    
    // If already sorting by this key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // Get sort direction indicator for table headers
  const getSortDirectionIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics and game history in parallel
        const [statsRes, historyRes] = await Promise.all([
          api.get('/api/users/stats'),
          api.get('/api/games/history')
        ]);

        console.log('Stats response:', statsRes.data);

        // Format the join date with proper error handling
        let joinDate = 'Not available';
        const createdAt = statsRes.data?.created_at;
        
        console.log('Created at date from stats:', createdAt);
        
        if (createdAt) {
          try {
            const date = new Date(createdAt);
            if (!isNaN(date.getTime())) {
              joinDate = date.toLocaleDateString();
            } else {
              console.error('Invalid date value:', createdAt);
            }
          } catch (dateError) {
            console.error('Error formatting date:', dateError);
          }
        }
        
        // Set user statistics
        setUserStats({
          activeGames: statsRes.data.activeGames || 0,
          gamesPlayed: statsRes.data.gamesPlayed || 0,
          winRate: statsRes.data.winRate ? `${statsRes.data.winRate}%` : '0%',
          joined: joinDate
        }); 
        
        // Set game history
        setGameHistory(historyRes.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated || !currentUser) return null;
  
  return (
    <Container maxW="container.xl" py={8}>
      <Card bg={bgCard} boxShadow="md" mb={8} borderRadius="lg" overflow="hidden">
        <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }}>
          {/* Profile sidebar */}
          <GridItem bg="primary" p={8} color="white">
            <VStack spacing={4} align="center">
              <Avatar 
                key={`profile-avatar-${currentUser.profile_image_url || ''}-${Date.now()}`}
                size="2xl"
                name={currentUser.username}
                src={getFormattedImageUrl(currentUser.profile_image_url)}
                bg="white"
                color="gray.600"
                border="4px solid"
                borderColor="white"
                onError={(e) => {
                  console.error("Profile page avatar failed to load");
                  // Fallback is automatic with name prop
                }}
                crossOrigin="anonymous"
              />
              <Heading size="lg">{currentUser.username}</Heading>
              <Text opacity={0.8}>{currentUser.email}</Text>
            </VStack>
          </GridItem>
          
          {/* Stats section */}
          <GridItem p={8}>
            <Heading size="lg" mb={6} color="chess-dark" display="flex" alignItems="center">
              <Icon as={FaTrophy} mr={2} color="primary" />
              Player Stats
            </Heading>
            
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
              <Card bg={bgStatCard} p={4} borderRadius="md">
                <VStack align="start">
                  <Flex align="center">
                    <Icon as={FaGamepad} color="primary" mr={2} />
                    <Text fontSize="sm" color="gray.500">Active Games</Text>
                  </Flex>
                  <Heading size="md" color="chess-dark">{userStats.activeGames}</Heading>
                </VStack>
              </Card>
              
              <Card bg={bgStatCard} p={4} borderRadius="md">
                <VStack align="start">
                  <Flex align="center">
                    <Icon as={FaChessKing} color="primary" mr={2} />
                    <Text fontSize="sm" color="gray.500">Games Played</Text>
                  </Flex>
                  <Heading size="md" color="chess-dark">{userStats.gamesPlayed}</Heading>
                </VStack>
              </Card>
              
              <Card bg={bgStatCard} p={4} borderRadius="md">
                <VStack align="start">
                  <Flex align="center">
                    <Icon as={FaTrophy} color="primary" mr={2} />
                    <Text fontSize="sm" color="gray.500">Win Rate</Text>
                  </Flex>
                  <Heading size="md" color="chess-dark">{userStats.winRate}</Heading>
                </VStack>
              </Card>
              
              <Card bg={bgStatCard} p={4} borderRadius="md">
                <VStack align="start">
                  <Flex align="center">
                    <Icon as={FaCalendarAlt} color="primary" mr={2} />
                    <Text fontSize="sm" color="gray.500">Joined</Text>
                  </Flex>
                  <Heading size="md" color="chess-dark">{userStats.joined}</Heading>
                </VStack>
              </Card>
            </SimpleGrid>
            
            <Flex justify="center">
              <Button 
                onClick={() => navigate('/lobby')} 
                bg="primary"
                color="white"
                _hover={{ bg: "chess-hover" }}
                size="lg"
                leftIcon={<Icon as={FaGamepad} />}
              >
                Play New Game
              </Button>
            </Flex>
          </GridItem>
        </Grid>
      </Card>
      
      <Card bg={bgCard} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg="chess-hover" p={6}>
          <Heading size="lg" color="white">Recent Games</Heading>
        </CardHeader>
        
        <CardBody p={0}>
          {loading ? (
            <Flex justify="center" align="center" py={10}>
              <Spinner size="xl" color="primary" thickness="4px" />
            </Flex>
          ) : error ? (
            <Box textAlign="center" py={8} color="red.500">
              {error}
            </Box>
          ) : gameHistory.length > 0 ? (
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th 
                    cursor="pointer" 
                    onClick={() => requestSort('date')}
                    _hover={{ bg: bgHover }}
                    transition="background 0.2s"
                  >
                    Date {getSortDirectionIndicator('date')}
                  </Th>
                  <Th 
                    cursor="pointer" 
                    onClick={() => requestSort('opponent')}
                    _hover={{ bg: bgHover }}
                    transition="background 0.2s"
                  >
                    Opponent {getSortDirectionIndicator('opponent')}
                  </Th>
                  <Th 
                    cursor="pointer" 
                    onClick={() => requestSort('result')}
                    _hover={{ bg: bgHover }}
                    transition="background 0.2s"
                  >
                    Result {getSortDirectionIndicator('result')}
                  </Th>
                  <Th>Replay</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedGameHistory.map((game, index) => (
                  <Tr key={game.game_id} bg={index % 2 === 0 ? 'white' : 'gray.50'}>
                    <Td>
                      {new Date(game.end_time || game.updated_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      {game.opponent_name || "Unknown"}
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={
                          game.result === 'win' ? 'green' : 
                          game.result === 'loss' ? 'red' : 
                          'gray'
                        }
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {game.result || 'Draw'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        onClick={() => navigate(`/game-replay/${game.game_id}`)}
                        colorScheme="blue"
                        variant="link"
                        size="sm"
                      >
                        Replay
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Box textAlign="center" py={8} color="gray.500">
              No games played yet. Start playing to build your history!
            </Box>
          )}
        </CardBody>
      </Card>
    </Container>
  );
};

export default ProfilePage;