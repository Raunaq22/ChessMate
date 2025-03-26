require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('Environment variables loaded:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Present' : 'Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Present' : 'Missing'
});

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY environment variable is not set');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test the connection
supabase.from('users').select('count').limit(1)
  .then(() => {
    console.log('Supabase connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to Supabase:', err);
  });

module.exports = supabase;