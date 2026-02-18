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

    switch (newStatus) {
      case "PAID":
        subject = "Pembayaran Berhasil";
        html = `<h2>Halo ${user.name}</h2>
                <p>Pesanan anda dengan nomor Order #${orderId} telah dibayar.</p>`;
        break;

      case "SHIPPED":
        subject = "Pesanan Dikirim";
        html = `<h2>Halo ${user.name}</h2>
                <p>Pesanan anda dengan nomor Order #${orderId} sedang dalam proses Pengantaran.</p>`;
        break;

      case "COMPLETED":
        subject = "Pesanan Selesai";
        html = `<h2>Halo ${user.name}</h2>
                <p>Pesanan anda dengan nomor Order #${orderId} telah selesai.</p>`;
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
