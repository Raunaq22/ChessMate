
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      timeout: 30000, // Increase timeout
      params: {
        eventsPerSecond: 5 // Lower to prevent rate limiting
      }
    }
  });

export default supabase;