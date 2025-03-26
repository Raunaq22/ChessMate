const supabase = require('./supabase');

async function syncDatabase() {
  try {
    // Check Supabase connection
    const { data, error } = await supabase
      .from('Users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      throw error;
    }
    
    console.log('Successfully connected to Supabase');
  } catch (error) {
    console.error('Error checking database connection:', error);
    throw error;
  }
}

module.exports = syncDatabase;