import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

interface CartStore {
  cart: CartItem[];
  cartId: number | null;
  isLoading: boolean;
  fetchCart: (userId: string) => Promise<void>;
  addToCart: (
    item: Omit<CartItem, "quantity">,
    userId: string,
  ) => Promise<void>;
  removeFromCart: (productId: number, userId: string) => Promise<void>;
  updateQuantity: (
    productId: number,
    quantity: number,
    userId: string,
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  setCart: (cart: CartItem[]) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  cartId: null,
  isLoading: false,

  // Fetch cart from database
  fetchCart: async (userId: string) => {
    try {
      set({ isLoading: true });

      if (!userId) {
        console.error("fetchCart called without userId");
        set({ isLoading: false });
        return;
      }

      // Get or create cart for user
      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .single();

      let finalCart = cart;

      if (cartError) {
        if (cartError.code === "PGRST116") {
          console.log("Cart not found, creating new cart for user:", userId);
          const { data: newCart, error: createError } = await supabase
            .from("carts")
            .insert({ user_id: userId })
            .select("id")
            .single();

          if (createError) {
            console.error("Error creating cart:", createError);
            throw createError;
          }
          finalCart = newCart;
          console.log("New cart created:", finalCart);
        } else {
          console.error("Error fetching cart:", cartError);
          throw cartError;
        }
      }

      if (!finalCart) {
        console.error("Cart is null after fetch/create");
        set({ isLoading: false });
        return;
      }

      set({ cartId: finalCart.id });
      interface CartItemFromDB {
        quantity: number;
        products: {
          id: number;
          name: string;
          price: number;
          image_url: string;
        } | null;
      }

      // Fetch cart items with product details
      const { data: cartItems, error: itemsError } = await supabase
        .from("cart_items")
        .select(
          `
          quantity,
          products (
            id,
            name,
            price,
            image_url
          )
        `,
        )
        .eq("cart_id", finalCart.id);

      if (itemsError) {
        console.error("Error fetching cart items:", itemsError);
        throw itemsError;
      }

      const typedCartItems = (cartItems as unknown as CartItemFromDB[]) || [];

      const transformedCart: CartItem[] = typedCartItems
        .filter((item) => {
          if (!item.products) {
            console.warn("Cart item has null product, skipping:", item);
            return false;
          }
          return true;
        })
        .map((item) => ({
          id: item.products!.id,
          name: item.products!.name,
          price: item.products!.price,
          image_url: item.products!.image_url,
          quantity: item.quantity,
        }));

      console.log(
        "Cart fetched successfully:",
        transformedCart.length,
        "items",
      );
      set({ cart: transformedCart, isLoading: false });
    } catch (error) {
      console.error("Error in fetchCart:", error);
      // Log more details about the error
      if (error && typeof error === "object") {
        console.error("Error details:", JSON.stringify(error, null, 2));
      }
      set({ isLoading: false, cart: [] });
    }
  },

  // Add item to cart
  addToCart: async (item, userId) => {
    try {
      const { cartId } = get();

      // Ensure cart exists
      if (!cartId) {
        await get().fetchCart(userId);
      }

      const currentCartId = get().cartId;
      if (!currentCartId) throw new Error("Cart not found");

      const { data: existingItem, error: fetchError } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("cart_id", currentCartId)
        .eq("product_id", item.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking existing item:", fetchError);
        throw fetchError;
      }

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("cart_id", currentCartId)
          .eq("product_id", item.id);

        if (error) throw error;

        // Update local state
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        }));
      } else {
        // Insert new item
        const { error } = await supabase.from("cart_items").insert({
          cart_id: currentCartId,
          product_id: item.id,
          quantity: 1,
        });

        if (error) throw error;

        set((state) => ({
          cart: [...state.cart, { ...item, quantity: 1 }],
        }));
      }

      console.log("Item added to cart successfully");
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  },

  // Remove item from cart
  removeFromCart: async (productId) => {
    try {
      const { cartId } = get();
      if (!cartId) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId)
        .eq("product_id", productId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        cart: state.cart.filter((i) => i.id !== productId),
      }));
    } catch (error) {
      console.error("Error removing from cart:", error);
      throw error;
    }
  },

  // Update item quantity
  updateQuantity: async (productId, quantity, userId) => {
    try {
      const { cartId } = get();
      if (!cartId) return;

      if (quantity <= 0) {
        await get().removeFromCart(productId, userId);
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("cart_id", cartId)
        .eq("product_id", productId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        cart: state.cart.map((i) =>
          i.id === productId ? { ...i, quantity } : i,
        ),
      }));
    } catch (error) {
      console.error("Error updating quantity:", error);
      throw error;
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      const { cartId } = get();
      if (!cartId) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId);

      if (error) throw error;

      set({ cart: [] });
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  },

  // Set cart (for manual updates)
  setCart: (cart) => set({ cart }),
}));
