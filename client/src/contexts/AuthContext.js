// Note: This is a partial update. You need to add the updateUser function to your existing AuthContext.

// Add the updateUser function to your existing AuthProvider component:

const updateUser = (userData) => {
  // Update the current user in state
  setCurrentUser(userData);
  
  // Update user data in localStorage if needed
  const token = localStorage.getItem('token');
  if (token) {
    const updatedUserData = { ...userData, token };
    localStorage.setItem('user', JSON.stringify(updatedUserData));
  }
};

// Include it in your context value
const value = {
  currentUser,
  isAuthenticated: !!currentUser,
  register,
  login,
  logout,
  updateUser // Add this line
};
