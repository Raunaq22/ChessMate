const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Game routes
router.post('/', gameController.createGame);
router.post('/:gameId/join', gameController.joinGame);
router.get('/available', gameController.getAvailableGames);
router.get('/history', gameController.getGameHistory);
router.get('/:gameId', gameController.getGameById);

module.exports = router;
