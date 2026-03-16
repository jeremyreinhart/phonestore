"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import ProductForm, { Product } from "@/components/ProductForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSubmit = async (data: Product) => {
    const url = editing?.id ? `/api/products/${editing.id}` : "/api/products";
    const method = editing?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setOpen(false);
      setEditing(null);
      fetchProducts();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventaris Produk</h1>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus size={18} /> Tambah Produk
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm uppercase font-semibold border-b">
            <tr>
              <th className="px-6 py-3">Produk</th>
              <th className="px-6 py-3">Kategori</th>
              <th className="px-6 py-3 text-center">Stok</th>
              <th className="px-6 py-3">Harga</th>
              <th className="px-6 py-3 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center">
                  Loading...
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="h-12 w-12 relative rounded border overflow-hidden">
                      <Image
                        src={p.image_url || "/logo-store.png"}
                        alt={p.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="font-semibold">{p.name}</span>
                  </td>

                  <td className="px-6 py-4">
                    {p.categories?.name || "No Cat"}
                  </td>

                  <td className="px-6 py-4 text-center">{p.stock}</td>

                  <td className="px-6 py-4">
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDelete(p.id!)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Produk" : "Tambah Produk"}
            </DialogTitle>
          </DialogHeader>

          <ProductForm
            initialData={editing || undefined}
            onSubmit={handleSubmit}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
