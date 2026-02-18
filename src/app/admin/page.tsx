"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Header from "@/components/Navbar";
import Sidebar from "@/app/admin/components/SideBar";
import Products from "@/app/admin/components/Products";
import AdminOrders from "./components/AdminOrders";

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<"products" | "orders">(
    "products",
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="flex relative">
        {/* Overlay (mobile only) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed md:static z-40 top-0 left-0 h-full transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
        >
          <Sidebar
            active={activeMenu}
            setActive={(menu) => {
              setActiveMenu(menu);
              setIsSidebarOpen(false); // auto close on mobile
            }}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full">
          {/* Mobile Toggle Button */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow"
            >
              <Menu size={20} />
              Menu
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
            {activeMenu === "products" && <Products />}
            {activeMenu === "orders" && <AdminOrders />}
          </div>
        </main>
      </div>
    </div>
  );
}
