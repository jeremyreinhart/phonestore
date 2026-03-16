import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { message: "Invalid product ID" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 },
      );
    }

    if (user.user_metadata?.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden access" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description, price, stock, image_url, category_id } = body;

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return NextResponse.json(
        { message: "Price and stock must be valid numbers" },
        { status: 400 },
      );
    }

    const payload = {
      name,
      description,
      price: parsedPrice,
      stock: parsedStock,
      image_url,
      category_id: category_id ? Number(category_id) : null,
    };

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", parsedId)
      .select()
      .single();

    if (error) {
      console.error("UPDATE PRODUCT ERROR:", error);

      return NextResponse.json(
        { message: "Failed to update product" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
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

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { message: "Invalid product ID" },
        { status: 400 },
      );
    }

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

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", parsedId);

    if (error) {
      console.error("DELETE PRODUCT ERROR:", error);

      return NextResponse.json(
        { message: "Failed to delete product" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
