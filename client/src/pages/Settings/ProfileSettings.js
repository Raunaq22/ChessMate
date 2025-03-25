import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Avatar,
  Center,
  useToast,
  IconButton,
  FormHelperText
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

// Helper function to format image URLs - simplified
const formatImageUrl = (url) => {
  if (!url) return '/assets/default-avatar.png';
  if (url.startsWith('http')) return url;
  
  // Return the URL as-is
  return url;
};

const ProfileSettings = () => {
  const { currentUser, updateUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    profile_image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardHeaderBg = useColorModeValue('blue.50', 'blue.900');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const labelColor = useColorModeValue('gray.700', 'white');
  const inputBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (currentUser) {
      setFormData(prevState => ({
        ...prevState,
        username: currentUser.username || '',
        email: currentUser.email || '',
        profile_image_url: currentUser.profile_image_url || ''
      }));

      // Set image preview with proper URL formatting
      if (currentUser.profile_image_url) {
        setImagePreview(formatImageUrl(currentUser.profile_image_url));
      } else {
        setImagePreview('/assets/default-avatar.png');
      }
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the selected file for later upload
      setSelectedFile(file);
      
      // Preview image locally without uploading
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous message
      setMessage({ type: '', text: '' });
    }
  };

  // Upload image function - will be called during profile update
  const uploadImage = async () => {
    if (!selectedFile) return null;
    
    setUploadingImage(true);
    
    try {
      const imageData = new FormData();
      imageData.append('profileImage', selectedFile);
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/users/upload-image`, 
        imageData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('Image upload response:', response.data);
      // Return the new image URL
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate data
      if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
        toast({
          title: 'Password Error',
          description: 'New passwords do not match',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        
        setMessage({ type: 'error', text: 'New passwords do not match' });
        setLoading(false);
        return;
      }

      // If there's a file selected, upload it first
      let profileImageUrl = formData.profile_image_url;
      if (selectedFile) {
        try {
          profileImageUrl = await uploadImage();
          console.log("New profile image URL:", profileImageUrl);
        } catch (error) {
          toast({
            title: 'Image Upload Failed',
            description: 'Could not upload your profile image.',
            status: 'error',
            duration: 4000,
            isClosable: true,
          });
          
          setMessage({ 
            type: 'error', 
            text: 'Failed to upload profile image. Profile update canceled.' 
          });
          setLoading(false);
          return;
        }
      }

      // Create update payload with potentially new image URL
      const updatePayload = {
        username: formData.username,
        email: formData.email,
        profile_image_url: profileImageUrl
      };

      // Add password update if provided
      if (formData.currentPassword && formData.newPassword) {
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.newPassword = formData.newPassword;
      }

      // Send update request
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/users/update`, updatePayload);
      
      // Update context with new user data
      if (updateUser) {
        updateUser(response.data.user);
      }

      // Make sure we update the image preview with the proper URL
      if (profileImageUrl) {
        setImagePreview(formatImageUrl(profileImageUrl));
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear password fields and selected file
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        profile_image_url: profileImageUrl
      });
      
      // Clear the selected file since it's been uploaded
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      toast({
        title: 'Update Failed',
        description: error.response?.data?.message || 'Could not update your profile.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    }

    setLoading(false);
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>Profile Settings</Heading>

      {message.text && (
        <Alert status={message.type} mb={4} borderRadius="md">
          <AlertIcon />
          {message.text}
        </Alert>
      )}

      <Card bg={bgColor} boxShadow="md" mb={6} variant="outline">
        <CardHeader bg={cardHeaderBg} py={4}>
          <Heading size="md">Your Profile</Heading>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleProfileUpdate}>
            <VStack spacing={6} align="stretch">
              {/* Profile Image */}
              <Center>
                <VStack spacing={4}>
                  <Box position="relative" w="32" h="32">
                    <Avatar 
                      size="2xl"
                      src={imagePreview} 
                      name={formData.username}
                      borderWidth={2}
                      borderColor={borderColor}
                    />
                    {uploadingImage && (
                      <Box 
                        position="absolute" 
                        top={0} 
                        left={0} 
                        right={0} 
                        bottom={0} 
                        bg="blackAlpha.50" 
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Spinner thickness="3px" color="blue.500" />
                      </Box>
                    )}
                  </Box>
                  <Button
                    as="label"
                    htmlFor="profile-image"
                    colorScheme="blue"
                    size="md"
                    cursor="pointer"
                    isDisabled={uploadingImage}
                  >
                    Change Photo
                    <input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                      disabled={uploadingImage}
                    />
                  </Button>
                  {selectedFile && (
                    <Text fontSize="sm" color={textColor}>
                      New photo selected. Click "Save Changes" to apply.
                    </Text>
                  )}
                </VStack>
              </Center>

              <Divider />

              {/* Username */}
              <FormControl>
                <FormLabel color={labelColor}>Username</FormLabel>
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  bg={inputBg}
                  borderColor={borderColor}
                  required
                />
              </FormControl>

              {/* Email */}
              <FormControl>
                <FormLabel color={labelColor}>Email Address</FormLabel>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  bg={inputBg}
                  borderColor={borderColor}
                  required
                />
              </FormControl>

              <Divider />
              
              <Heading size="sm" color={labelColor}>Change Password</Heading>

              {/* Current Password */}
              <FormControl>
                <FormLabel color={labelColor}>Current Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword.current ? "text" : "password"}
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    bg={inputBg}
                    borderColor={borderColor}
                  />
                  <InputRightElement width="4.5rem">
                    <IconButton
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                      icon={showPassword.current ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      aria-label={showPassword.current ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormHelperText>Required only if changing password</FormHelperText>
              </FormControl>

              {/* New Password */}
              <FormControl>
                <FormLabel color={labelColor}>New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword.new ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    bg={inputBg}
                    borderColor={borderColor}
                  />
                  <InputRightElement width="4.5rem">
                    <IconButton
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                      icon={showPassword.new ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      aria-label={showPassword.new ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {/* Confirm New Password */}
              <FormControl>
                <FormLabel color={labelColor}>Confirm New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword.confirm ? "text" : "password"}
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    bg={inputBg}
                    borderColor={borderColor}
                  />
                  <InputRightElement width="4.5rem">
                    <IconButton
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                      icon={showPassword.confirm ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      aria-label={showPassword.confirm ? "Hide password" : "Show password"}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Divider />

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                w="full"
                isLoading={loading}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ProfileSettings;
