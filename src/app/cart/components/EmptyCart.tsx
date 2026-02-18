"use client";

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4 text-center">
      <ShoppingBasket className="w-24 h-24 text-gray-400" />
      <h2 className="text-2xl font-bold text-gray-800">
        Keranjang Belanja Anda Kosong
      </h2>
      <Link
        href="/products"
        className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
      >
        Belanja Sekarang
      </Link>
    </div>
  );
}
