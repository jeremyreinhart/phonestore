"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart } from "lucide-react";
import Header from "@/components/Navbar";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  categories?: { id: number; name: string } | null;
  created_at?: string;
}

interface Category {
  id: number;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [sortOption, setSortOption] = useState<
    "newest" | "priceAsc" | "priceDesc"
  >("newest");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const fetchCart = useCartStore((state) => state.fetchCart);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: prodData } = await supabase
          .from("products")
          .select("*, categories(id,name)");
        const { data: catData } = await supabase.from("categories").select("*");

        if (prodData) setProducts(prodData as Product[]);
        if (catData) setCategories(catData as Category[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("produk-list-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          console.log("Update stok diterima di list:", payload.new);
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === payload.new.id ? { ...p, stock: payload.new.stock } : p,
            ),
          );
        },
      )
      .subscribe((status) => {
        console.log("Status Realtime List:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!user) return (window.location.href = "/auth/login");
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
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCart(null);
    }
  };

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) =>
      selectedCategory === "" ? true : p.categories?.id === selectedCategory,
    )
    .filter(
      (p) =>
        (minPrice === "" || p.price >= Number(minPrice)) &&
        (maxPrice === "" || p.price <= Number(maxPrice)),
    )
    .sort((a, b) => {
      if (sortOption === "priceAsc") return a.price - b.price;
      if (sortOption === "priceDesc") return b.price - a.price;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <input
            type="text"
            placeholder="Cari produk..."
            className="flex-1 h-12 px-4 rounded-xl border border-gray-300 "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex gap-2 flex-wrap">
            <select
              className="h-12 px-3 rounded-xl border border-gray-300 "
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(Number(e.target.value) || "")
              }
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min"
              className="w-20 h-12 px-3 rounded-xl border border-gray-300"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value) || "")}
            />
            <input
              type="number"
              placeholder="Max"
              className="w-20 h-12 px-3 rounded-xl border border-gray-300 "
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value) || "")}
            />

            <select
              className="h-12 px-3 rounded-xl border border-gray-300"
              value={sortOption}
              onChange={(e) =>
                setSortOption(
                  e.target.value as "newest" | "priceAsc" | "priceDesc",
                )
              }
            >
              <option value="newest">Terbaru</option>
              <option value="priceAsc">Harga: Rendah ke Tinggi</option>
              <option value="priceDesc">Harga: Tinggi ke Rendah</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl h-72"
              />
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500">
              Tidak ada produk ditemukan
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow hover:shadow-lg transition p-4 flex flex-col"
                onClick={() =>
                  (window.location.href = `/products/${product.id}`)
                }
              >
                <div className="relative w-full h-44 mb-3 overflow-hidden rounded-xl">
                  <Image
                    src={product.image_url || "/logo-store.png"}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                </div>

                <h3 className="font-semibold text-base sm:text-lg text-gray-800">
                  {product.name}
                </h3>
                <p className="text-green-600 font-bold mt-1 text-base sm:text-lg">
                  Rp {product.price.toLocaleString("id-ID")}
                </p>
                <p className="text-gray-500 text-sm mt-1 mb-2">
                  Stock:{" "}
                  <span
                    className={
                      product.stock === 0 ? "text-red-500" : "text-gray-700"
                    }
                  >
                    {product.stock}
                  </span>
                </p>

                <button
                  className={`mt-auto w-full py-3 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 ${
                    product.stock > 0
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={product.stock === 0 || addingToCart === product.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
