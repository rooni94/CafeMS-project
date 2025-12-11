import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { motion } from "framer-motion";

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("products/items/")
      .then((res) => {
        console.log("API response:", res.data); // عشان نتأكد من البيانات
        setProducts(res.data);
      })
      .catch((err) => {
        console.error("API error:", err);
        setError("حدث خطأ في الاتصال بالـ API");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4">جاري تحميل المنتجات...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!products.length) {
    return <div className="p-4">لا توجد منتجات متاحة حالياً.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {products.map((p) => (
        <motion.div
          key={p.id}
          whileHover={{ scale: 1.05 }}
          className="p-4 shadow-lg rounded bg-white"
        >
          {p.image && (
            <img
              src={p.image}
              alt={p.name}
              className="rounded mb-2 h-40 w-full object-cover"
            />
          )}
          <h3 className="text-lg font-bold">{p.name}</h3>
          <p>{p.price} ريال</p>
        </motion.div>
      ))}
    </div>
  );
}
