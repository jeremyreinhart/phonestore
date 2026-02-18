"use client";

import Link from "next/link";

type CartSummaryProps = {
  total: number;
  totalItems: number;
  onCheckout: () => void;
  disabled: boolean;
};

export default function CartSummary({
  total,
  totalItems,
  onCheckout,
  disabled,
}: CartSummaryProps) {
  return (
    <div className="bg-gray-50 p-6 border-t border-gray-200 rounded-b-2xl mt-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
      <div className="flex flex-col gap-2">
        <span className="text-gray-600 text-lg">Total Item:</span>
        <span className="font-semibold text-lg">{totalItems} item</span>
      </div>
      <div className="flex flex-col gap-2 text-right">
        <span className="text-gray-800 text-xl font-bold">Total Belanja:</span>
        <span className="text-green-600 text-2xl font-bold">
          Rp {total.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link
          href="/products"
          className="flex-1 text-center py-3 px-6 border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition"
        >
          Lanjut Belanja
        </Link>
        <button
          onClick={onCheckout}
          disabled={disabled}
          className="flex-1 py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
