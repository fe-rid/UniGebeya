const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://yjvvjaktdaxlclqcdwwx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WVEPjue3HpvZXxZrn6_sWA_3yfvscHN";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testSignup() {
  console.log("Attempting signup...");
  const { data, error } = await supabase.auth.signUp({
    email: 'test_student_hello@example.com',
    password: 'password123!',
    options: {
      data: {
        name: 'Test Student Hello',
        phone: '1234567890',
        university: 'Test Uni',
        role: 'student'
      }
    }
  });

  if (error) {
    console.error("Signup error:", error);
  } else {
    console.log("Signup success:", data);
  }
}

testSignup();
