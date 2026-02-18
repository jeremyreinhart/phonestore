"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/lib/validation/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/auth";

type RegisterFormInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInput) => {
    try {
      await registerUser(data.email, data.password, data.name);
      router.push("/auth/login");
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Something went wrong");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
          <Image
            src="/logo-store.png"
            alt="MiniStore Logo"
            width={360}
            height={360}
            className="object-contain"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            PhoneStore
          </h1>
          <p className="text-gray-600 max-w-sm text-lg">
            Beli handphone berkualitas dengan harga terbaik dan proses cepat.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Daftar Akun
          </h2>
          <p className="text-gray-500 text-sm text-center mt-2">
            Sudah punya akun?{" "}
            <Link
              href="/auth/login"
              className="text-green-600 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 mt-6"
          >
            <div>
              <input
                {...register("name")}
                placeholder="Nama Lengkap"
                className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("email")}
                type="email"
                placeholder="Email"
                className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <input
                {...register("password")}
                type="password"
                placeholder="Password"
                className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
            >
              {isSubmitting ? "Registering..." : "Daftar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
