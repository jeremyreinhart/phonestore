import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { sendOrderEmail } from "@/lib/mailer/mailer";
import { supabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer();
    const { id } = await params;

    const orderId = Number(id);

    if (!id || isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID order tidak valid" },
        { status: 400 },
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
    *,
    users:user_id (name, email),
    order_items (
      id,
      quantity,
      price,
      product_id,
      products (
        id,
        name,
        image_url
      )
    )
  `,
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error("GET ORDER ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    if (!id || isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID order tidak valid" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const newStatus = body.status?.toString().trim().toUpperCase();

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status tidak boleh kosong" },
        { status: 400 },
      );
    }

    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", orderId)
      .single();

    if (fetchError || !existingOrder) {
      console.error("ORDER NOT FOUND:", fetchError);
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existingOrder.status === newStatus) {
      return NextResponse.json({
        success: true,
        message: "Status tidak berubah",
      });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", existingOrder.user_id)
      .single();

    if (userError || !user?.email) {
      console.error("USER FETCH ERROR:", userError);
      return NextResponse.json({
        success: true,
        message: "Status updated (email tidak ditemukan)",
      });
    }

    let subject = "";
    let html = "";

    // Template Dasar (Wrapper)
    const emailWrapper = (content: string) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #007bff; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Phone Store</h1>
        </div>
        <div style="padding: 30px; line-height: 1.6; color: #333;">
          ${content}
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777;">
          <p>© 2026 Phone Store. Seluruh hak cipta dilindungi undang-undang.</p>
          <p>Jika ada pertanyaan, hubungi dukungan kami di support@phonestore.com</p>
        </div>
      </div>
    `;

    switch (newStatus) {
      case "PAID":
        subject = `Konfirmasi Pembayaran: Order #${orderId}`;
        html = emailWrapper(`
          <h2 style="color: #28a745;">Pembayaran Berhasil!</h2>
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Terima kasih! Kami telah menerima pembayaran untuk pesanan <strong>#${orderId}</strong>. Saat ini kami sedang menyiapkan produk Anda untuk segera dikirim.</p>
          <div style="margin: 20px 0; padding: 15px; background: #f4f4f4; border-left: 4px solid #28a745;">
            <strong>Status Pesanan:</strong> Sedang Diproses
          </div>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}" 
             style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
             Lihat Detail Pesanan
          </a>
        `);
        break;

      case "SHIPPED":
        subject = `Pesanan Anda Dalam Perjalanan: #${orderId}`;
        html = emailWrapper(`
          <h2 style="color: #007bff;">Pesanan Dikirim!</h2>
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Kabar gembira! Pesanan Anda <strong>#${orderId}</strong> telah diserahkan ke kurir dan sedang dalam perjalanan menuju lokasi Anda.</p>
          <div style="margin: 20px 0; padding: 15px; background: #e7f3ff; border-left: 4px solid #007bff;">
            <strong>Kurir:</strong> Pengiriman Standar<br>
            <strong>Estimasi:</strong> 2-3 Hari Kerja
          </div>
          <p>Pantau terus posisi paket Anda melalui tombol di bawah ini:</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}" 
             style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
             Lacak Pesanan
          </a>
        `);
        break;

      case "COMPLETED":
        subject = `Pesanan Selesai: #${orderId}`;
        html = emailWrapper(`
          <h2 style="color: #6c757d;">Terima Kasih Telah Berbelanja!</h2>
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Pesanan <strong>#${orderId}</strong> telah ditandai sebagai selesai. Kami harap Anda menyukai produk baru Anda!</p>
          <div style="margin: 20px 0; padding: 15px; border: 1px dashed #ccc; text-align: center;">
            <p style="margin: 0;">Bagaimana pengalaman Anda?</p>
            <p style="font-size: 20px;">⭐⭐⭐⭐⭐</p>
          </div>
          <p>Jika Anda memiliki kendala terkait produk, jangan ragu untuk menghubungi tim bantuan kami.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/review/${orderId}" 
             style="display: inline-block; padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
             Beri Ulasan
          </a>
        `);
        break;

      case "CANCELLED":
        subject = `Update Pesanan: #${orderId} Dibatalkan`;
        html = emailWrapper(`
          <h2 style="color: #dc3545;">Pesanan Dibatalkan</h2>
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Kami ingin menginformasikan bahwa pesanan <strong>#${orderId}</strong> telah dibatalkan.</p>
          <p>Jika Anda merasa ini adalah kesalahan atau membutuhkan informasi pengembalian dana, silakan hubungi tim Customer Service kami.</p>
        `);
        break;

      default:
    }

    if (subject) {
      try {
        await sendOrderEmail(user.email, subject, html);
      } catch (emailError) {
        console.error("EMAIL ERROR:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Status updated",
    });
  } catch (err) {
    console.error("PATCH ORDER ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
