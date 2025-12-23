import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avkhnanzljzfhdymsxwa.supabase.co';
const supabaseAnonKey = 'sb_publishable_mODMOQ1HYxqLHvKuCwv3iw_OCSXKtFt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
