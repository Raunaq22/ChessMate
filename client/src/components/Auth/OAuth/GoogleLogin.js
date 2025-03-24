import React from 'react';

const GoogleLogin = () => {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/oauth/google`;
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
    >
      <span className="sr-only">Sign in with Google</span>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.545 12.151c0-.894-.173-1.756-.489-2.568H6.11v4.84h3.604c-.155.76-.619 1.406-1.319 1.84v1.535h2.136c1.251-1.143 1.972-2.825 1.972-4.647z" />
        <path fillRule="evenodd" d="M6.11 14.423c-1.022-1.072-1.278-2.685-.638-4.025l-1.694-1.303c-1.047 2.091-1.047 4.57 0 6.661l1.694-1.333z" clipRule="evenodd" />
        <path d="M12.545 7.583c1.272-.023 2.505.445 3.44 1.292l1.867-1.822c-1.635-1.517-3.79-2.354-6.012-2.354-3.238 0-6.042 1.825-7.435 4.496l1.687 1.318c.544-1.096 1.585-1.86 2.801-2.069 1.217-.209 2.466.106 3.394 1.139z" />
        <path fillRule="evenodd" d="M11.993 2.697c3.224 0 6.151 1.086 8.486 2.923l-2.077 1.773c-1.627-1.112-3.565-1.727-5.602-1.727-3.944 0-7.38 2.345-8.915 5.721L1.444 8.62C3.283 5.06 7.358 2.697 11.993 2.697z" clipRule="evenodd" />
      </svg>
    </button>
  );
};

export default GoogleLogin;