import React from 'react';

const AppleLogin = () => {
  const handleAppleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/oauth/apple`;
  };

  return (
    <button
      type="button"
      onClick={handleAppleLogin}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
    >
      <span className="sr-only">Sign in with Apple</span>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.7 7.1c-.87 0-1.57.27-2.1.81-.53.54-.8 1.27-.8 2.19 0 .92.27 1.65.8 2.19.53.54 1.23.81 2.1.81.87 0 1.57-.27 2.1-.81.53-.54.8-1.27.8-2.19 0-.92-.27-1.65-.8-2.19-.53-.54-1.23-.81-2.1-.81zM8.8 13.7c-.93 0-1.67-.29-2.23-.86-.56-.57-.83-1.33-.83-2.27 0-.94.28-1.7.83-2.27.56-.57 1.3-.86 2.23-.86.93 0 1.67.29 2.23.86.56.57.83 1.33.83 2.27 0 .94-.28 1.7-.83 2.27-.56.57-1.3.86-2.23.86z" fillRule="evenodd" clipRule="evenodd" />
        <path d="M12 22c-5.52 0-10-4.48-10-10S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-18c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z" fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </button>
  );
};

export default AppleLogin;