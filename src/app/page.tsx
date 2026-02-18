"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart } from "lucide-react";
import Header from "@/components/Navbar";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  categories?: { name: string } | null;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const fetchCart = useCartStore((state) => state.fetchCart);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.name || "",
        });
        await fetchCart(data.user.id);
      }
    };
    fetchUser();
  }, [fetchCart]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProducts(data as Product[]);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    // LOGIKA REALTIME: Dengarkan perubahan stok produk
    const channel = supabase
      .channel("homepage-stock-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          setProducts((current) =>
            current.map((p) =>
              p.id === payload.new.id ? { ...p, stock: payload.new.stock } : p,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  const bestSellerProducts = products
    .filter((product) => product.stock > 0)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4);

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      setAddingToCart(product.id);
      await addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        },
        user.id,
      );
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Beli Handphone <span className="text-green-600">Murah</span> &{" "}
            <span className="text-green-600">Berkualitas</span>
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            PhoneStore menyediakan smartphone terbaru dengan harga terbaik dan
            garansi resmi.
          </p>

          <Link
            href="/products"
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-500 transition"
          >
            Lihat Semua Produk
          </Link>
        </div>

        <div className="flex justify-center">
          <Image
            src="/logo-store.png"
            alt="Hero Phone"
            width={420}
            height={420}
            className="object-contain"
          />
        </div>
      </section>

      <section className="bg-white py-20 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Produk Best Seller
          </h2>

          {loading ? (
            <div className="text-center py-10 text-gray-500">
              Memuat produk...
            </div>
          ) : bestSellerProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Tidak ada produk ditemukan
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {bestSellerProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg transition flex flex-col"
                >
                  {/* Link ke detail */}
                  <Link
                    href={`/products/${product.id}`}
                    className="relative w-full h-48 mb-4 overflow-hidden rounded-xl group hover:scale-105 transition-transform"
                  >
                    <Image
                      src={product.image_url || "/logo-store.png"}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </Link>

                  <Link
                    href={`/products/${product.id}`}
                    className="font-semibold text-sm md:text-lg hover:text-green-600 transition"
                  >
                    {product.name}
                  </Link>

                  <p className="text-green-600 font-bold mt-1 text-sm md:text-base">
                    Rp {product.price.toLocaleString("id-ID")}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Stock: {product.stock}
                  </p>

                  <button
                    className={`mt-auto w-full py-3 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 ${
                      product.stock > 0
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={
                      product.stock === 0 || addingToCart === product.id
                    }
                    onClick={() => handleAddToCart(product)}
                  >
                    {addingToCart === product.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Menambahkan...</span>
                      </>
                    ) : product.stock === 0 ? (
                      "Stok Habis"
                    ) : (
                      <>
                        <ShoppingCart size={18} />
                        <span>Tambah ke Keranjang</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
