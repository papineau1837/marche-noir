import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://ktgxofvwunpidhiicyns.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PEJpX1L9fWzMwpBsdVGxjw_Fue3lg-k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
