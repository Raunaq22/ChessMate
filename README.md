# ChessMate: Real-time Multiplayer Chess Platform ♟️

ChessMate is a feature-rich, real-time multiplayer chess platform that allows users to play chess against friends, random opponents, or a computer. Built with modern web technologies, it provides a seamless chess experience with features like match-making, time controls, game analysis, and more.

## Technologies Used

### Frontend 🖥️
- React (with functional components and hooks)
- React Context API for state management
- Chakra UI for responsive UI components
- Socket.io client for real-time communication
- Chess.js and React-Chessboard for chess logic and UI
- Axios for API requests

### Backend ⚙️
- Node.js with Express
- PostgreSQL database with Sequelize ORM
- Socket.io for real-time game updates
- JWT for authentication
- Passport.js with Google OAuth integration
- RESTful API for data management

## Features ✨
- User authentication (Email/Password and Google OAuth) 🔐
- Real-time multiplayer chess games 🎮
- Computer opponent with adjustable difficulty 🤖
- Time controls with increment support ⏱️
- Game analysis mode 🔍
- Chat functionality during games 💬
- Friends system and private game invitations 👥
- Match history and statistics 📈

## Project Structure 📁
This project is organized into two main directories:
- **@client**: React frontend application
- **@server**: Node.js backend application

## How to Build and Run Locally 🚀

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- npm or yarn

### Setting up the Backend
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=3001
   DATABASE_URL=postgres://username:password@localhost:5432/chessmate_db
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=24h
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
   CLIENT_URL=http://localhost:3000
   ```

4. Initialize the database:
   ```
   npx sequelize-cli db:create
   npx sequelize-cli db:migrate
   ```

5. Start the server:
   ```
   npm run dev
   ```

### Setting up the Frontend
1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variable:
   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

4. Start the client:
   ```
   npm start
   ```

## Live Demo 🌐

[Visit ChessMate](https://chess-mate-frontend.vercel.app/) 

## Author 👨‍💻

Raunaq Singh Gandhi



