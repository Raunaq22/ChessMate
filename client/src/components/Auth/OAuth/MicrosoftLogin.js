import React from 'react';

const MicrosoftLogin = () => {
  const handleMicrosoftLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/oauth/microsoft`;
  };

  return (
    <button
      type="button"
      onClick={handleMicrosoftLogin}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
    >
      <span className="sr-only">Sign in with Microsoft</span>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
      </svg>
    </button>
  );
};

export default MicrosoftLogin;