import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories:category_id(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, price, stock, image_url, category_id } = body;

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name,
        description,
        price: parseInt(price),
        stock: parseInt(stock),
        image_url,
        category_id: category_id ? parseInt(category_id) : null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("DATABASE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
