import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELED";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CheckoutRequest {
  cart: CartItem[];
}

interface MidtransResponse {
  token: string;
  redirect_url: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CheckoutRequest = await req.json();

    if (!body.cart || body.cart.length === 0) {
      return NextResponse.json({ error: "Cart kosong" }, { status: 400 });
    }

    const shippingCost = 2500;

    const totalPrice = body.cart.reduce(
      (acc: number, item: CartItem) => acc + item.price * item.quantity,
      0,
    );

    const grossAmount = totalPrice + shippingCost;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_price: totalPrice,
        shipping_cost: shippingCost,
        status: "PENDING" as OrderStatus,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Gagal membuat order" },
        { status: 500 },
      );
    }

    const midtransOrderId = `ORDER-${order.id}-${Date.now()}`;

    const orderItems = body.cart.map((item: CartItem) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemError) {
      return NextResponse.json(
        { error: "Gagal menyimpan order items" },
        { status: 500 },
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      throw new Error("Missing MIDTRANS_SERVER_KEY");
    }

    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

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
            order_id: midtransOrderId,
            gross_amount: grossAmount,
          },
          expiry: {
            unit: "hours",
            duration: 24,
          },
          customer_details: {
            email: user.email,
            first_name: user.user_metadata?.name ?? "USER",
          },
          item_details: [
            ...body.cart.map((item: CartItem) => ({
              id: item.id.toString(),
              price: item.price,
              quantity: item.quantity,
              name: item.name,
            })),
            {
              id: "SHIPPING",
              price: shippingCost,
              quantity: 1,
              name: "Ongkir",
            },
          ],
        }),
      },
    );

    const snapData: MidtransResponse = await midtransRes.json();

    if (!midtransRes.ok) {
      throw new Error("Midtrans API Error");
    }

    await supabase.from("payments").insert({
      order_id: order.id,
      external_id: midtransOrderId,
      amount: grossAmount,
      snap_token: snapData.token,
      redirect_url: snapData.redirect_url,
      status: "PENDING",
    });

    return NextResponse.json({
      snapToken: snapData.token,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
