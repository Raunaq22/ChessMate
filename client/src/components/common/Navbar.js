import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, currentUser, logout } = useContext(AuthContext);

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">ChessMate</Link>
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-chess-hover">Home</Link>
            <Link to="/leaderboard" className="hover:text-chess-hover">Leaderboard</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="hover:text-chess-hover">
                  Profile {currentUser?.username && `(${currentUser.username})`}
                </Link>
                <button 
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="bg-chess-dark hover:bg-chess-hover text-white py-1 px-3 rounded"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-chess-dark hover:bg-chess-hover text-white py-1 px-3 rounded"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;