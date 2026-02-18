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
      // Ambil user_id dari order
      const { data: orderData } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", orderId)
        .single();

      if (orderData?.user_id) {
        // Ambil email user dari tabel users
        const { data: userData } = await supabase
          .from("users")
          .select("email, name")
          .eq("id", orderData.user_id)
          .single();

        if (userData?.email) {
          await sendOrderEmail(
            userData.email,
            "Pembayaran Berhasil ",
            `
        <h2>Terima kasih ${userData.name ?? ""}!</h2>
        <p>Order #${orderId} telah berhasil dibayar.</p>
        <p>Kami akan segera memproses pesanan Anda.</p>
      `,
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
