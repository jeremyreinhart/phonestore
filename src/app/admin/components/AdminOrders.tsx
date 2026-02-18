"use client";

import { useEffect, useState, useCallback } from "react";

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";

interface Order {
  id: number;
  status: OrderStatus;
  total_price: number;
  shipping_cost: number;
  created_at: string;
  users: { name: string } | null;
  order_items: {
    id: number;
    quantity: number;
    price: number;
    products: { name: string };
  }[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (
    orderId: number,
    newStatus: OrderStatus,
  ) => {
    try {
      // Pastikan orderId masuk ke dalam template literal URL
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal mengubah status");
        return;
      }

      // Update state lokal
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (err) {
      console.error("Update error:", err);
      alert("Terjadi kesalahan koneksi");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Orders...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">Belum ada order.</p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-xl p-6 bg-white shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-semibold">Order #{order.id}</p>
                <p className="text-sm text-gray-500">
                  User: {order.users?.name ?? "Unknown"}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <select
                value={order.status}
                onChange={(e) =>
                  handleStatusChange(order.id, e.target.value as OrderStatus)
                }
                className="border rounded px-3 py-2"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>

            <div className="space-y-2">
              {order.order_items.length === 0 ? (
                <p className="text-sm text-gray-400">Tidak ada item</p>
              ) : (
                order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm border rounded p-3"
                  >
                    <div>
                      <p className="font-medium">{item.products?.name}</p>
                      <p className="text-gray-500">Qty: {item.quantity}</p>
                    </div>

                    <p>Rp {item.price.toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-right text-sm">
              <p>Ongkir: Rp {order.shipping_cost.toLocaleString()}</p>
              <p className="font-semibold">
                Total: Rp {order.total_price.toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
