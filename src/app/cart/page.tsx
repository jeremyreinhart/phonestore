"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Header from "@/components/Navbar";
import { useCartStore } from "@/store/cartStore";
import { supabase } from "@/lib/supabase/client";
import CartItem from "./components/CartItem";
import CartSummary from "./components/CartSummary";
import EmptyCart from "./components/EmptyCart";
import ConfirmModal from "./components/ConfirmModal";

export default function CartPage() {
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const isLoading = useCartStore((state) => state.isLoading);

  const [userId, setUserId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    const initCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchCart(user.id);
      }
    };
    initCart();
  }, [fetchCart]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleUpdateQuantity = async (
    productId: number,
    newQuantity: number,
  ) => {
    if (!userId || newQuantity < 1) return;
    await updateQuantity(productId, newQuantity, userId);
  };

  const handleRemove = (id: number, name: string) => {
    setItemToDelete({ id, name });
    setConfirmOpen(true);
  };

  const handleRemoveConfirmed = async () => {
    if (!userId || !itemToDelete) return;
    await removeFromCart(itemToDelete.id, userId);
    setConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleCheckout = async () => {
    if (!userId) return alert("Silakan login terlebih dahulu");
    if (cart.length === 0) return alert("Keranjang kosong");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, userId }),
      });
      const data = await res.json();

      if (data.snapToken) {
        // @ts-expect-error snap not in window types
        window.snap.pay(data.snapToken, {
          onSuccess: async () => {
            await clearCart();
            router.push(`/orders/${data.orderId}`);
          },
          onPending: () => router.push(`/orders/${data.orderId}`),
          onError: () => alert("Pembayaran gagal!"),
          onClose: () => router.push("/"),
        });
      } else {
        alert(data.error || "Gagal membuat transaksi");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat checkout");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <Script
        src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Memuat keranjang...</p>
          </div>
        ) : cart.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
              Keranjang Belanja
            </h1>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-200">
              {cart.map((item) => (
                <CartItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  quantity={item.quantity}
                  image_url={item.image_url}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <CartSummary
              total={total}
              totalItems={totalItems}
              onCheckout={handleCheckout}
              disabled={!userId || cart.length === 0}
            />
          </>
        )}
      </div>

      {confirmOpen && itemToDelete && (
        <ConfirmModal
          itemName={itemToDelete.name}
          onConfirm={handleRemoveConfirmed}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
