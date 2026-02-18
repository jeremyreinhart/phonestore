"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";

export type Product = {
  id?: number;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image_url?: string;
  category_id?: number;
  categories?: {
    name: string;
  };
};

type Props = {
  initialData?: Product;
  onSubmit: (data: Product) => void;
  onClose: () => void;
};

export default function ProductForm({ initialData, onSubmit, onClose }: Props) {
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Product>(() => ({
    id: initialData?.id,
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    stock: initialData?.stock || 0,
    image_url: initialData?.image_url || "",
    category_id: initialData?.category_id,
  }));
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (!error && data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-image")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-image")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-semibold">Nama Produk</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Deskripsi</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Harga (Rp)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
            className="w-full border p-2 rounded-md outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Stok</label>
          <input
            type="number"
            value={form.stock}
            onChange={(e) =>
              setForm({ ...form, stock: Number(e.target.value) })
            }
            className="w-full border p-2 rounded-md outline-none"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Kategori</label>
        <select
          name="category"
          id="category"
          value={form.category_id || ""}
          onChange={(e) =>
            setForm({ ...form, category_id: Number(e.target.value) })
          }
          className="w-full border p-2 rounded-md outline-none"
        >
          <option value="">Pilih Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {/* <input
          type="text"
          value={form.category_id || ""}
          onChange={(e) =>
            setForm({ ...form, category_id: Number(e.target.value) })
          }
          className="w-full border p-2 rounded-md outline-none"
        /> */}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Preview Foto</label>
        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center min-h-35">
          {form.image_url ? (
            <div className="relative w-full h-32">
              <Image
                src={form.image_url}
                alt="Preview"
                width={50}
                height={50}
                className="w-full h-full object-contain rounded"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, image_url: "" })}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center cursor-pointer">
              {uploading ? (
                <Loader2 className="animate-spin text-blue-500" />
              ) : (
                <UploadCloud className="text-gray-400" />
              )}
              <span className="text-xs mt-2 text-gray-500 font-medium">
                Klik untuk upload foto
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : initialData?.id ? "Update" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
