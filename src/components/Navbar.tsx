"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, ChevronDown } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  avatar_url?: string | null;
}

export default function Header() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("id, name, role, image_url")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        return;
      }

      if (profile) {
        setUser({
          id: profile.id,
          name: profile.name,
          role: profile.role,
          email: authUser.email || "",
          avatar_url: profile.image_url,
        });

        await fetchCart(profile.id);
      }
    };

    fetchUser();
  }, [fetchCart]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const handleCartClick = () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    router.push("/cart");
  };

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-store.png" alt="Logo" width={40} height={40} />
          <span className="font-bold text-xl text-green-600">PhoneStore</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={handleCartClick}
              className="hover:opacity-80 transition"
            >
              <ShoppingCart size={24} />
              {user && cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt="avatar"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    user.name?.charAt(0).toUpperCase()
                  )}
                </div>

                <ChevronDown size={16} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white border rounded-2xl shadow-lg py-3">
                  <div className="px-4 pb-3 border-b">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>

                  {user.role === "USER" && (
                    <Link
                      href="/orders"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      History Order
                    </Link>
                  )}

                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm"
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/auth/login"
                className="px-4 py-2 border border-green-600 text-green-600 rounded-lg"
              >
                Masuk
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
