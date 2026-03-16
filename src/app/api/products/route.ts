import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from("products")
      .select("*, categories:category_id(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET PRODUCTS ERROR:", error);
      return NextResponse.json(
        { message: "Failed to fetch products" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { name, description, price, stock, image_url, category_id } = body;

    if (!name || !price || !stock) {
      return NextResponse.json(
        { message: "Name, price, and stock are required" },
        { status: 400 },
      );
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    const parsedCategory = category_id ? Number(category_id) : null;

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return NextResponse.json(
        { message: "Price and stock must be valid numbers" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          description,
          price: parsedPrice,
          stock: parsedStock,
          image_url,
          category_id: parsedCategory,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("DATABASE INSERT ERROR:", error);

      return NextResponse.json(
        { message: "Failed to create product" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      data,
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
