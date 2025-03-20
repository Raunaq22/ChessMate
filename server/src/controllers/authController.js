// Add this function to the auth controller
const updateLastActive = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.user_id;
    await User.update(
      { last_active: new Date() },
      { where: { user_id: userId } }
    );
    
    res.status(200).json({ message: 'Activity updated' });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ message: 'Failed to update activity' });
  }
};

// Remember to export this function and add it to your routes
