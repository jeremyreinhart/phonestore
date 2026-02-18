import { supabase } from "@/lib/supabase/client";

export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "USER",
        image_url: null,
      },
    },
  });
  if (error) throw error;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log("LOGIN RESULT:", data);

  if (error) {
    throw new Error("Email atau password salah");
  }
  return data;
};

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  window.location.href = data.url!;
};
