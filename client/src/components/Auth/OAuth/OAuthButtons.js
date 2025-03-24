import React from 'react';
import GoogleLogin from './GoogleLogin';

const OAuthButtons = () => {
  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <GoogleLogin />
      </div>
    </div>
  );
};

export default OAuthButtons;