// This is a Web Worker file for running Stockfish
importScripts('https://cdn.jsdelivr.net/npm/stockfish@16/stockfish.js');

// Initialize the Stockfish engine
const stockfish = new Worker('stockfish.js');

// Forward messages from Stockfish to main thread
stockfish.onmessage = function(event) {
  self.postMessage(event.data);
};

// Listen for messages from the main thread
self.onmessage = function(e) {
  stockfish.postMessage(e.data);
};
