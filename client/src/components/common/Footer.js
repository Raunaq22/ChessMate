import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold">ChessMate</h3>
            <p className="text-sm">Play chess with players around the world</p>
          </div>
          
          <div className="flex space-x-4">
            <a href="#" className="hover:text-chess-hover">About</a>
            <a href="#" className="hover:text-chess-hover">Rules</a>
            <a href="#" className="hover:text-chess-hover">Contact</a>
          </div>
          
          <div className="mt-4 md:mt-0">
            <p className="text-sm">&copy; {new Date().getFullYear()} ChessMate. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;