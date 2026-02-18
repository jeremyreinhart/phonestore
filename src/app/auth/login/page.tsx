"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/validation/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loginUser, loginWithGoogle } from "@/services/auth";
import { supabase } from "@/lib/supabase/client";

type LoginFormInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role;

        if (role === "ADMIN") {
          router.replace("/admin");
        } else {
          router.replace("/");
        }

        return;
      }

      setChecking(false);
    };

    checkUser();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInput) => {
    try {
      setAuthError(null);

      const response = await loginUser(data.email, data.password);
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", response.user.id);
      console.log(userData);
      const role = response.user.user_metadata?.role;
      console.log(response);
      if (role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (error: unknown) {
      setAuthError("Email atau Password salah");
      console.error(error);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Masuk Ke Home
        </h1>
        {authError && (
          <div className="mb-1   p-3 text-sm text-red-600">{authError}</div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <input
              {...register("email")}
              type="email"
              placeholder="Email"
              className="w-full text-black p-3 border border-gray-400 rounded-lg"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <input
              {...register("password")}
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-400 rounded-lg text-black"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <hr className="flex-1 border-gray-300" />
          <span className="mx-2 text-black">atau</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <button
          onClick={loginWithGoogle}
          className="flex gap-1 cursor-pointer justify-center border border-gray-500 bg-white text-white font-semibold py-3 rounded-lg w-full transition"
        >
          <Image
            src="/google.png"
            alt="google"
            width={25}
            height={25}
            className="object-contain"
            priority
          />{" "}
          <span className="text-gray-500 text-xl">Google</span>
        </button>

        <p className="mt-4 text-center text-gray-600">
          Dont have an account?{" "}
          <Link
            href="/auth/register"
            className="text-blue-500 font-semibold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
