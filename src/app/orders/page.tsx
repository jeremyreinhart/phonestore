"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Navbar";

interface Order {
  id: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";
  total_price: number;
  shipping_cost: number;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // 🔹 Fetch awal
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_price, shipping_cost, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error.message);
      } else {
        setOrders(data || []);
      }

      setLoading(false);

      // 🔹 Realtime subscription
      channel = supabase
        .channel("orders-user-realtime")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedOrder = payload.new as Order;

            setOrders((prev) =>
              prev.map((order) =>
                order.id === updatedOrder.id
                  ? { ...order, status: updatedOrder.status }
                  : order,
              ),
            );
          },
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500";
      case "PENDING":
        return "bg-yellow-500";
      case "SHIPPED":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-purple-500";
      case "CANCELED":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Memuat riwayat pesanan...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-semibold">Belum ada pesanan</h2>
        <Link
          href="/products"
          className="mt-4 inline-block px-6 py-2 bg-green-600 text-white rounded-lg"
        >
          Belanja Sekarang
        </Link>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Riwayat Pesanan</h1>

          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm border p-6 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">Order #{order.id}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                <p className="mt-2 font-medium">
                  Total: Rp{" "}
                  {(order.total_price + order.shipping_cost).toLocaleString()}
                </p>
              </div>

              <div className="text-right space-y-3">
                <span
                  className={`px-3 py-1 text-white text-xs rounded-full ${getStatusColor(
                    order.status,
                  )}`}
                >
                  {order.status}
                </span>

                <div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
