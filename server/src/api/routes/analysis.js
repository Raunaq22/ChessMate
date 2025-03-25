// Convert synchronous operations to asynchronous with timeouts
export default async function handler(req, res) {
    try {
      // Set response headers to keep connection alive
      res.setHeader('Connection', 'keep-alive');
      
      // Handle chess analysis with timeout
      const result = await Promise.race([
        analyzePosition(req.body.fen),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout')), 9000)
        )
      ]);
      
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }