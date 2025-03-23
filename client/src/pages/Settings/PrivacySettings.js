import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PrivacySettings = () => {
  const [settings, setSettings] = useState({
    profileVisibility: 'public', // public, friends, private
    showOnlineStatus: true,
    allowGameInvites: 'all', // all, friends, none
    showRealName: false,
    dataCollection: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch privacy settings
  useEffect(() => {
    // In a real application, you'd fetch these from your API
    // For now, we'll simulate loading from localStorage
    setLoading(true);
    const savedSettings = localStorage.getItem('chessmate_privacy_settings');
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    }
    
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // In a real app, you would send this to your API
      // For now, we'll just save to localStorage
      localStorage.setItem('chessmate_privacy_settings', JSON.stringify(settings));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setMessage({
        type: 'success',
        text: 'Privacy settings saved successfully!'
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save privacy settings. Please try again.'
      });
    }
    
    setSaving(false);
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Privacy & Security Settings</h2>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 
          message.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Profile Visibility */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Profile Visibility
          </label>
          <select
            name="profileVisibility"
            value={settings.profileVisibility}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">Public - Anyone can view your profile</option>
            <option value="friends">Friends Only - Only friends can view your profile</option>
            <option value="private">Private - Only you can view your profile</option>
          </select>
        </div>

        {/* Online Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Show Online Status</h3>
            <p className="text-sm text-gray-500">Allow others to see when you're online</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="showOnlineStatus"
              checked={settings.showOnlineStatus}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Game Invites */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Game Invites
          </label>
          <select
            name="allowGameInvites"
            value={settings.allowGameInvites}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Allow invites from anyone</option>
            <option value="friends">Allow invites from friends only</option>
            <option value="none">Don't allow game invites</option>
          </select>
        </div>

        {/* Show Real Name */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Show Real Name</h3>
            <p className="text-sm text-gray-500">Display your real name on your profile</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="showRealName"
              checked={settings.showRealName}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Data Collection */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Analytics & Data Collection</h3>
            <p className="text-sm text-gray-500">Allow us to collect usage data to improve your experience</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="dataCollection"
              checked={settings.dataCollection}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Account Security Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-bold mb-4">Account Security</h3>
          
          {/* Two-Factor Authentication */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-1">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Set Up 2FA
            </button>
          </div>
          
          {/* Session Management */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-1">Active Sessions</h3>
            <p className="text-sm text-gray-500 mb-3">Manage devices that are logged into your account</p>
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
              View Active Sessions
            </button>
          </div>

          {/* Delete Account */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-red-600 mb-1">Delete Account</h3>
            <p className="text-sm text-gray-500 mb-3">Permanently delete your account and all data</p>
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
              Delete My Account
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
