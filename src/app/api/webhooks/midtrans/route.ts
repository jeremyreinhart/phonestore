import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/mailer/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) throw new Error("Missing MIDTRANS_SERVER_KEY");

    const expectedSignature = crypto
      .createHash("sha512")
      .update(body.order_id + body.status_code + body.gross_amount + serverKey)
      .digest("hex");

    if (expectedSignature !== body.signature_key) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 403 },
      );
    }

    const match = body.order_id.match(/-(\d+)-/);
    if (!match)
      return NextResponse.json(
        { message: "Invalid order_id" },
        { status: 400 },
      );

    const orderId = parseInt(match[1], 10);

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!existingOrder)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    if (existingOrder.status === "PAID")
      return NextResponse.json({ message: "Already processed" });

    let statusOrder: string = "PENDING";
    let statusPayment: string = "PENDING";
    const tStatus = body.transaction_status;

    if (
      tStatus === "settlement" ||
      (tStatus === "capture" && body.fraud_status === "accept")
    ) {
      statusOrder = "PAID";
      statusPayment = "PAID";
    } else if (tStatus === "expire") {
      statusOrder = "CANCELED";
      statusPayment = "EXPIRED";
    } else if (["deny", "cancel"].includes(tStatus)) {
      statusOrder = "CANCELED";
      statusPayment = "FAILED";
    }

    if (statusOrder === "PAID") {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (items) {
        for (const item of items) {
          await supabase.rpc("reduce_stock", {
            product_id_param: item.product_id,
            quantity_param: item.quantity,
          });
        }
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", orderId)
        .single();

      if (orderData?.user_id) {
        const { data: userData } = await supabase
          .from("users")
          .select("email, name")
          .eq("id", orderData.user_id)
          .single();

        if (userData?.email) {
          // TEMPLATE EMAIL YANG LEBIH DETAIL DAN MENARIK
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #000; padding: 25px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 2px;">PHONE STORE</h1>
              </div>
              <div style="padding: 30px; line-height: 1.6; color: #333;">
                <h2 style="color: #28a745; margin-top: 0;">Pembayaran Berhasil! ✅</h2>
                <p>Halo <strong>${userData.name ?? "Pelanggan"}</strong>,</p>
                <p>Terima kasih telah berbelanja. Kami telah menerima pembayaran Anda untuk pesanan <strong>#${orderId}</strong>.</p>
                
                <div style="margin: 25px 0; padding: 20px; background-color: #f9f9f9; border-left: 5px solid #28a745; border-radius: 4px;">
                  <p style="margin: 0; font-size: 14px; color: #666;">Status Saat Ini:</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #28a745; font-size: 18px;">SIAP DIPROSES</p>
                </div>

                <p>Tim kami akan segera menyiapkan produk Anda. Anda akan mendapatkan notifikasi email selanjutnya saat paket Anda telah dikirim ke kurir.</p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}" 
                     style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                     Lihat Detail Pesanan
                  </a>
                </div>
              </div>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
                <p style="margin: 0;">© 2026 Phone Store. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">Jl. Tech Raya No. 101, Jakarta, Indonesia</p>
              </div>
            </div>
          `;

          await sendOrderEmail(
            userData.email,
            `Konfirmasi Pembayaran: Order #${orderId} Berhasil`,
            emailHtml,
          );
        }
      }
    }

    const now = new Date().toISOString();
    await supabase
      .from("orders")
      .update({ status: statusOrder, updated_at: now })
      .eq("id", orderId);

    await supabase
      .from("payments")
      .update({
        status: statusPayment,
        paid_at: statusPayment === "PAID" ? now : null,
        updated_at: now,
      })
      .eq("order_id", orderId);

    return NextResponse.json({ message: "Webhook processed & Stock updated" });
  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
