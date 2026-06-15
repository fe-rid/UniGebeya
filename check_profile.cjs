const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://yjvvjaktdaxlclqcdwwx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WVEPjue3HpvZXxZrn6_sWA_3yfvscHN";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').limit(1);
  const { data: role, error: roleErr } = await supabase.from('user_roles').select('*').limit(1);
  console.log("Profiles:", profile, "Err:", profileErr);
  console.log("Roles:", role, "Err:", roleErr);
}

check();
