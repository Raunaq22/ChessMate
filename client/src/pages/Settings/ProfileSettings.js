import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

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
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

      {message.text && (
        <div className={`p-4 mb-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 
          message.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleProfileUpdate} className="space-y-6">
        {/* Profile Image */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-2">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log("Image failed to load:", e.target.src); 
                    if (e.target.src !== '/assets/default-avatar.png') {
                      e.target.src = '/assets/default-avatar.png';
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No Image
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <label className="cursor-pointer bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 inline-block mt-2">
              Change Photo
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
            </label>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                New photo selected. Click "Save Changes" to apply.
              </p>
            )}
          </div>
        </div>
        
        {/* Username */}
        <div>
          <label className="block text-gray-700 font-medium mb-2" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Change Password</h3>
          
          {/* Current Password */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="newPassword">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength="6"
            />
          </div>

          {/* Confirm New Password */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="confirmNewPassword">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmNewPassword"
              name="confirmNewPassword"
              value={formData.confirmNewPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength="6"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-primary text-white py-2 px-6 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
