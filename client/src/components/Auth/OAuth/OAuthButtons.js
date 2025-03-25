import React from 'react';
import GoogleLogin from './GoogleLogin';

const OAuthButtons = () => {
  return (
    <div className="grid grid-cols-1 gap-3">
      <GoogleLogin />
    </div>
  );
};

export default OAuthButtons;