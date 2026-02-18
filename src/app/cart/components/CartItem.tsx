"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";

type CartItemProps = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onRemove: (id: number, name: string) => void;
};

export default function CartItem({
  id,
  name,
  price,
  quantity,
  image_url,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  return (
    <div className="p-6 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50 transition">
      <div className="shrink-0 w-24 h-24 relative rounded-lg overflow-hidden">
        <Image
          src={image_url || "/logo-store.png"}
          alt={name}
          fill
          className="object-contain"
        />
      </div>

      <div className="grow text-center sm:text-left">
        <h2 className="font-semibold text-lg text-gray-800">{name}</h2>
        <p className="text-green-600 font-bold text-xl mt-1">
          Rp {price.toLocaleString("id-ID")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateQuantity(id, quantity - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition"
        >
          <Minus size={16} />
        </button>
        <span className="w-12 text-center font-semibold text-lg">
          {quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(id, quantity + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="text-right min-w-25">
        <p className="text-gray-500 text-sm">Subtotal</p>
        <p className="font-bold text-lg text-gray-800">
          Rp {(price * quantity).toLocaleString("id-ID")}
        </p>
      </div>

      <button
        onClick={() => onRemove(id, name)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
