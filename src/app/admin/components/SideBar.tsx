"use client";

import { Package, ClipboardList } from "lucide-react";

type Props = {
  active: "products" | "orders";
  setActive: (menu: "products" | "orders") => void;
};

export default function Sidebar({ active, setActive }: Props) {
  return (
    <aside className="w-64 bg-white h-screen shadow-md p-6">
      <h2 className="text-xl font-bold mb-8">Admin Panel</h2>

      <nav className="space-y-3">
        <button
          onClick={() => setActive("products")}
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition 
          ${
            active === "products"
              ? "bg-green-500 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <Package size={18} />
          Products
        </button>

        <button
          onClick={() => setActive("orders")}
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition 
          ${
            active === "orders"
              ? "bg-green-500 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <ClipboardList size={18} />
          Orders
        </button>
      </nav>
    </aside>
  );
}
