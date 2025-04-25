import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import {
  Box,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  FormHelperText,
  Flex,
  Spinner,
  useToast,
  useMediaQuery
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

// Helper function to format image URLs
const formatImageUrl = (url) => {
  if (!url) return '/assets/default-avatar.png';
  
  // If it's a base64 data URL from FileReader, use it directly
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's an uploaded profile image, use the dedicated API endpoint
  if (url.startsWith('/uploads/profile/')) {
    // Extract the filename from the path
    const filename = url.split('/').pop();
    
    // Use the dedicated API endpoint for profile images
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const apiPath = `/api/users/profile-image/${filename}`;
    
    // Add cache busting
    const timestamp = new Date().getTime();
    const fullUrl = `${backendUrl}${apiPath}?t=${timestamp}`;
    
    console.log("ProfileSettings: Using profile image API endpoint:", fullUrl);
    return fullUrl;
  }
  
  // Otherwise just return the URL as is
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
  const [isMobile] = useMediaQuery("(max-width: 480px)");

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
      console.log("Selected file:", file.name, "size:", file.size);
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("FileReader completed, setting image preview to Base64 data");
        // Set preview directly from FileReader result (Base64 data)
        setImagePreview(reader.result);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
      };
      reader.readAsDataURL(file);
      
      setMessage({ type: '', text: '' });
    }
  };

  // Upload image function
  const uploadImage = async () => {
    if (!selectedFile) return null;
    
    console.log("Starting image upload for file:", selectedFile.name);
    setUploadingImage(true);
    
    try {
      const imageData = new FormData();
      imageData.append('profileImage', selectedFile);
      
      console.log("Sending image upload request to:", `${process.env.REACT_APP_API_URL}/api/users/upload-image`);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/users/upload-image`, 
        imageData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log("Image upload successful, received URL:", response.data.imageUrl);
      
      // Store the full URL including the origin to avoid path resolution issues
      const fullImageUrl = new URL(
        response.data.imageUrl, 
        window.location.origin
      ).toString();
      
      console.log("Full image URL with origin:", fullImageUrl);
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // After successful profile update, make sure we're using the correct URL format
  const updateSuccessHandler = (profileImageUrl) => {
    // If we received a URL from the server, format it properly
    if (profileImageUrl) {
      const formattedUrl = formatImageUrl(profileImageUrl);
      console.log("Setting preview to formatted URL:", formattedUrl);
      setImagePreview(formattedUrl);
    }
  };

  // Update the handleProfileUpdate function to use our new handler
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
        
        setLoading(false);
        return;
      }

      // If there's a file selected, upload it first
      let profileImageUrl = formData.profile_image_url;
      if (selectedFile) {
        try {
          console.log("Selected file exists, uploading...");
          profileImageUrl = await uploadImage();
          console.log("Image uploaded successfully, new URL:", profileImageUrl);
        } catch (error) {
          toast({
            title: 'Image Upload Failed',
            description: 'Could not upload your profile image.',
            status: 'error',
            duration: 4000,
            isClosable: true,
          });
          
          setLoading(false);
          return;
        }
      }

      // Create update payload
      const updatePayload = {
        username: formData.username,
        email: formData.email,
        profile_image_url: profileImageUrl
      };
      console.log("Update payload:", updatePayload);

      // Add password update if provided
      if (formData.currentPassword && formData.newPassword) {
        updatePayload.currentPassword = formData.currentPassword;
        updatePayload.newPassword = formData.newPassword;
      }

      // Send update request
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/users/update`, updatePayload);
      
      // Update context with new user data
      if (updateUser) {
        console.log("Calling updateUser with:", response.data.user);
        updateUser(response.data.user);
      } else {
        console.error("updateUser function is not available in context");
      }

      // Update image preview with the proper URL format
      if (profileImageUrl) {
        console.log("Setting image preview with formatted URL");
        updateSuccessHandler(profileImageUrl);
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Clear password fields and selected file
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        profile_image_url: profileImageUrl
      });
      
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
    }

    setLoading(false);
  };

  return (
    <Box>
      {/* Page header */}
      <Box p={{ base: "15px", md: "20px" }} fontWeight="bold" fontSize={{ base: "20px", md: "24px" }}>Profile Settings</Box>
      
      <form onSubmit={handleProfileUpdate}>
        {/* Profile section */}
        <Box bg="#EBF8FF" p={{ base: "15px", md: "20px" }} mb="20px">
          <Text fontSize={{ base: "16px", md: "18px" }} fontWeight="medium">Your Profile</Text>
        </Box>
        
        {/* Profile image */}
        <Flex direction="column" align="center" mb={{ base: "20px", md: "30px" }}>
          <Box 
            boxSize={{ base: "100px", md: "120px" }}
            borderRadius="full" 
            bg="gray.100" 
            position="relative"
            mb="15px"
            border="3px solid"
            borderColor="blue.400"
            overflow="hidden"
          >
            <img 
              src={imagePreview}
              alt="Profile Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
              crossOrigin="anonymous"
              onError={(e) => {
                console.error("Image preview failed to load:", e.target.src);
                e.target.onerror = null; // Prevent infinite loops
                e.target.src = '/assets/default-avatar.png';
              }}
            />
            {uploadingImage && (
              <Flex 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                bottom={0} 
                bg="blackAlpha.50" 
                borderRadius="full"
                align="center"
                justify="center"
              >
                <Spinner thickness="3px" color="blue.500" />
              </Flex>
            )}
          </Box>
          
          <Button
            as="label"
            htmlFor="profile-image"
            bg="#3182CE"
            color="white"
            _hover={{ bg: "#2B6CB0" }}
            size={{ base: "sm", md: "md" }}
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
        </Flex>
        
        {/* Form fields */}
        <Box px={{ base: "15px", md: "20px" }} pb={{ base: "15px", md: "20px" }}>
          {/* Username */}
          <FormControl mb={{ base: "15px", md: "20px" }}>
            <FormLabel color="#333" fontWeight="medium">Username</FormLabel>
            <Input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              bg="white"
              borderColor="gray.300"
              borderRadius="4px"
              height={{ base: "36px", md: "40px" }}
              required
            />
          </FormControl>

          {/* Email */}
          <FormControl mb={{ base: "25px", md: "30px" }}>
            <FormLabel color="#333" fontWeight="medium">Email Address</FormLabel>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              bg="white"
              borderColor="gray.300"
              borderRadius="4px"
              height={{ base: "36px", md: "40px" }}
              required
            />
          </FormControl>

          {/* Password section */}
          <Text fontWeight="medium" fontSize={{ base: "16px", md: "18px" }} mb={{ base: "12px", md: "15px" }}>Change Password</Text>

          {/* Current Password */}
          <FormControl mb={{ base: "15px", md: "20px" }}>
            <FormLabel color="#333" fontWeight="medium">Current Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword.current ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                bg="white"
                borderColor="gray.300"
                borderRadius="4px"
                height={{ base: "36px", md: "40px" }}
              />
              <InputRightElement h={{ base: "36px", md: "40px" }}>
                <Button
                  variant="ghost"
                  onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                  size="sm"
                >
                  {showPassword.current ? <ViewOffIcon /> : <ViewIcon />}
                </Button>
              </InputRightElement>
            </InputGroup>
            <FormHelperText fontSize="13px" color="gray.500">Required only if changing password</FormHelperText>
          </FormControl>

          {/* New Password */}
          <FormControl mb={{ base: "15px", md: "20px" }}>
            <FormLabel color="#333" fontWeight="medium">New Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword.new ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                bg="white"
                borderColor="gray.300"
                borderRadius="4px"
                height={{ base: "36px", md: "40px" }}
              />
              <InputRightElement h={{ base: "36px", md: "40px" }}>
                <Button
                  variant="ghost"
                  onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                  size="sm"
                >
                  {showPassword.new ? <ViewOffIcon /> : <ViewIcon />}
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Confirm New Password */}
          <FormControl mb={{ base: "25px", md: "30px" }}>
            <FormLabel color="#333" fontWeight="medium">Confirm New Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword.confirm ? "text" : "password"}
                id="confirmNewPassword"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                bg="white"
                borderColor="gray.300"
                borderRadius="4px"
                height={{ base: "36px", md: "40px" }}
              />
              <InputRightElement h={{ base: "36px", md: "40px" }}>
                <Button
                  variant="ghost"
                  onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                  size="sm"
                >
                  {showPassword.confirm ? <ViewOffIcon /> : <ViewIcon />}
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Submit button */}
          <Button
            type="submit"
            bg="#3182CE"
            color="white"
            _hover={{ bg: "#2B6CB0" }}
            size="lg"
            width="100%"
            height={{ base: "40px", md: "45px" }}
            isLoading={loading}
            loadingText="Saving..."
          >
            Save Changes
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ProfileSettings;
