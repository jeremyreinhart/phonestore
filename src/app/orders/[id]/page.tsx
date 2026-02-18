"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cartStore";
import { RealtimeChannel } from "@supabase/supabase-js"; // Import tipe data channel
import Image from "next/image";
import Script from "next/script";
import Header from "@/components/Navbar";

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  products: {
    id: number;
    name: string;
    image_url: string | null;
  };
};

type Order = {
  id: string;
  users: {
    name: string;
    email?: string;
  } | null;
  status: string;
  total_price: number;
  shipping_cost: number;
  created_at: string;
  order_items: OrderItem[];
};

export default function OrderSuccessPage() {
  const { id } = useParams();
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const fetchCart = useCartStore((s) => s.fetchCart);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Helper Warna Status (Type-Safe)
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      PAID: "text-green-600",
      SHIPPED: "text-blue-600",
      COMPLETED: "text-purple-600",
      CANCELED: "text-red-600",
      PENDING: "text-yellow-600",
    };
    return colors[status] || "text-gray-600";
  };

  // Helper Label Status
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PAID: "Pembayaran Berhasil",
      PENDING: "Menunggu Pembayaran",
      SHIPPED: "Pesanan Sedang Dikirim",
      COMPLETED: "Pesanan Selesai",
      CANCELED: "Pesanan Dibatalkan",
    };
    return labels[status] || status;
  };

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (!data.error) setOrder(data);
    } catch (err) {
      console.error("Fetch order error:", err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      await fetchOrder();

      // Subscription Realtime dengan filter ID spesifik
      channel = supabase
        .channel(`order-changes-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${id}`,
          },
          async (payload) => {
            const updated = payload.new as Order;
            setOrder((prev) =>
              prev ? { ...prev, status: updated.status } : prev,
            );

            if (updated.status === "PAID") {
              await clearCart(user.id);
              await fetchCart(user.id);
            }
          },
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, router, clearCart, fetchCart, fetchOrder]);

  const handleBayarUlang = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/checkout/again`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();

      if (data.snapToken) {
        // @ts-expect-error snap tidak ada di window
        window.snap.pay(data.snapToken, {
          onSuccess: async () => setPaying(false),
          onPending: () => setPaying(false),
          onError: () => {
            alert("Pembayaran gagal!");
            setPaying(false);
          },
          onClose: () => setPaying(false),
        });
      } else {
        alert(data.error || "Gagal memulai pembayaran");
        setPaying(false);
      }
    } catch (err) {
      console.error(err);
      setPaying(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Memverifikasi pembayaran...
      </div>
    );
  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-red-500">
        Order tidak ditemukan.
      </div>
    );

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <Script
          src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />

        <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-3xl">
          <h1
            className={`text-2xl font-bold mb-6 text-center ${getStatusColor(order.status)}`}
          >
            {getStatusLabel(order.status)}
          </h1>

          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <b>Username:</b> {order.users?.name}
            </p>
            <p>
              <b>Status:</b>{" "}
              <span className={`font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </p>
            <p>
              <b>Tanggal:</b> {new Date(order.created_at).toLocaleString()}
            </p>
            <p>
              <b>Total:</b> Rp {order.total_price.toLocaleString()}
            </p>
            <p>
              <b>Ongkir:</b> Rp {order.shipping_cost.toLocaleString()}
            </p>
          </div>

          <hr className="my-6" />
          <h2 className="font-semibold mb-4 text-lg">Barang yang dipesan</h2>

          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  {item.products.image_url && (
                    <Image
                      src={item.products.image_url}
                      alt={item.products.name}
                      width={64}
                      height={64}
                      className="object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-medium">{item.products.name}</p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-semibold">
                  Rp {item.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {order.status === "PENDING" && (
            <button
              onClick={handleBayarUlang}
              disabled={paying}
              className="mt-6 w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 font-bold"
            >
              {paying ? "Memproses Pembayaran..." : "Bayar Sekarang"}
            </button>
          )}

          <button
            onClick={() => router.push("/products")}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-bold"
          >
            Belanja Lagi
          </button>
        </div>
      </div>
    </>
  );
}
