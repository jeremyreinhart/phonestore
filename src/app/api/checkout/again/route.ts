import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId)
    return NextResponse.json({ error: "Order ID dibutuhkan" }, { status: 400 });

  const { data: orderData } = await supabase
    .from("orders")
    .select("id, total_price, shipping_cost")
    .eq("id", orderId)
    .single();

  if (!orderData)
    return NextResponse.json(
      { error: "Order tidak ditemukan" },
      { status: 404 },
    );

  const grossAmount = orderData.total_price + orderData.shipping_cost;
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

  const externalId = `RETRY-${orderId}-${Date.now()}`;

  const midtransRes = await fetch(
    "https://app.sandbox.midtrans.com/snap/v1/transactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: externalId,
          gross_amount: grossAmount,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.name ?? "USER",
        },
      }),
    },
  );

  if (!midtransRes.ok)
    return NextResponse.json(
      { error: "Gagal membuat pembayaran" },
      { status: 500 },
    );

  const snapData = await midtransRes.json();

  // Update payments yang lama
  await supabase.from("payments").upsert({
    order_id: orderId,
    external_id: externalId,
    amount: grossAmount,
    snap_token: snapData.token,
    redirect_url: snapData.redirect_url,
    status: "PENDING",
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ snapToken: snapData.token });
}
