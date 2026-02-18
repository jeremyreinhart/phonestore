export type Product = {
  id?: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image_url?: string;
  category_id?: number;
  categories?: { name: string };
};
