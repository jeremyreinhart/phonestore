import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
};

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) console.error(error);
      else setCategories(data);
      setLoading(false);
    };

    fetchCategories();
  }, []);

  return { categories, loading };
}
