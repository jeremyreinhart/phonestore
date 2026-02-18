"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Header from "@/components/Navbar";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, ArrowLeft } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  description?: string;
  categories?: { id: number; name: string } | null;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const fetchCart = useCartStore((state) => state.fetchCart);

  // Fetch user
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        await fetchCart(data.user.id);
      }
    };
    fetchUser();
  }, [fetchCart]);

  // Fetch product
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, categories(id, name)")
          .eq("id", Number(id))
          .single();
        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    const channel = supabase
      .channel(`detail-produk-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Stok produk berubah!", payload.new.stock);
          setProduct((prev) =>
            prev ? { ...prev, stock: payload.new.stock } : null,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleAddToCart = async () => {
    if (!userId) return router.push("/auth/login");
    if (!product) return;

    setAddingToCart(true);
    try {
      await addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        },
        userId,
      );
      alert("Produk berhasil ditambahkan ke keranjang!");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading)
    return (
      <p className="p-10 text-center text-gray-600 animate-pulse">
        Memuat produk...
      </p>
    );

  if (!product)
    return (
      <p className="p-10 text-center text-red-500">Produk tidak ditemukan</p>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2 w-full relative h-96 rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition">
          <Image
            src={product.image_url || "/logo-store.png"}
            alt={product.name}
            fill
            className="object-contain"
          />
        </div>

        <div className="md:w-1/2 w-full flex flex-col gap-4 bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
          <button
            onClick={() => router.push("/products")}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-semibold mb-2"
          >
            <ArrowLeft size={18} /> Kembali ke Produk
          </button>

          <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>

          {product.categories && (
            <span className="text-sm text-gray-500">
              Kategori: {product.categories.name}
            </span>
          )}

          <p className="text-green-600 font-bold text-2xl">
            Rp {product.price.toLocaleString("id-ID")}
          </p>

          <p className="text-gray-700">
            Stock:{" "}
            <span
              className={`font-semibold ${
                product.stock > 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {product.stock}
            </span>
          </p>

          {product.description && (
            <p className="text-gray-700 mt-2">{product.description}</p>
          )}

          <button
            className={`mt-auto py-3 px-6 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 ${
              product.stock > 0
                ? "bg-green-600 hover:bg-green-500"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={product.stock === 0 || addingToCart}
            onClick={handleAddToCart}
          >
            {addingToCart ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
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
      </section>
    </div>
  );
}
