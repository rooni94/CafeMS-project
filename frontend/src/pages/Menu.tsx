import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/outline";
import { api } from "../services/api";
import { useCart } from "../context/CartContext";
import ProductAddonModal, { ProductAddon } from "../components/product/ProductAddonModal";
import CurrencyAmount from "../components/common/CurrencyAmount";

type Category = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
};

type Product = {
  id: number;
  name: string;
  price: number | string;
  image?: string | null;
  description?: string;
  category?: number | { id: number };
  addons?: ProductAddon[];
};

const CATEGORY_FALLBACKS = ["/Hero1.jpg", "/Hero2.jpg", "/Hero3.jpg"];

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);

  const [activeCategory, setActiveCategory] = useState<number | null>(() => {
    const param = searchParams.get("category");
    if (!param) return null;
    const numeric = Number(param);
    return Number.isFinite(numeric) ? numeric : null;
  });

  const productsSectionRef = useRef<HTMLDivElement | null>(null);
  const [pendingScroll, setPendingScroll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get("products/items/"),
          api.get("products/categories/"),
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        console.error(err);
        setError("تعذّر تحميل القائمة، حاول مجددًا.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    const nextValue = categoryFromUrl ? Number(categoryFromUrl) : null;
    setActiveCategory(
      Number.isFinite(nextValue as number) ? (nextValue as number) : null
    );
    if (categoryFromUrl) {
      setPendingScroll(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pendingScroll) return;
    const frame = requestAnimationFrame(() => {
      if (productsSectionRef.current) {
        productsSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      setPendingScroll(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingScroll]);

  const handleCategoryClick = (categoryId: number | null) => {
    if (categoryId) {
      setSearchParams({ category: String(categoryId) });
      setActiveCategory(categoryId);
    } else {
      setSearchParams({});
      setActiveCategory(null);
    }
    setPendingScroll(true);
  };

  const getCategoryId = (product: Product): number | null => {
    if (product.category == null) return null;
    if (typeof product.category === "number") return product.category;
    if (typeof product.category === "object" && "id" in product.category) {
      return product.category.id;
    }
    return null;
  };

  const visibleProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((item) => getCategoryId(item) === activeCategory);
  }, [products, activeCategory]);

  const selectedCategory =
    activeCategory != null
      ? categories.find((cat) => cat.id === activeCategory)
      : null;

  const formatPrice = (value: number | string) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? <CurrencyAmount value={numeric} /> : "—";
  };

  const handleAddRequest = (product: Product) => {
    if (product.addons && product.addons.length > 0) {
      setAddonProduct(product);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price:
        typeof product.price === "number"
          ? product.price
          : Number(product.price) || 0,
      image: product.image || undefined,
    });
  };

  const handleConfirmAddons = (addons: ProductAddon[]) => {
    if (!addonProduct) return;
    const basePrice =
      typeof addonProduct.price === "number"
        ? addonProduct.price
        : Number(addonProduct.price) || 0;
    const addonsTotal = addons.reduce(
      (sum, addon) => sum + (Number(addon.price_delta) || 0),
      0
    );
    addItem({
      id: addonProduct.id,
      name: addonProduct.name,
      price: basePrice + addonsTotal,
      image: addonProduct.image || undefined,
      addons,
    });
    setAddonProduct(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-2">
          <p className="text-xs text-amber-600">قائمة الأصناف</p>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            اختر الصنف الذي ترغب به
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            نوفر لك أصنافًا منوعة من القهوة والمشروبات والطعام الجاهز. اضغط على
            أي تصنيف للاطلاع على الأصناف المرتبطة به أو استعرض جميع الأطباق
            دفعة واحدة.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, idx) => {
            const image =
              cat.image || CATEGORY_FALLBACKS[idx % CATEGORY_FALLBACKS.length];
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => handleCategoryClick(cat.id)}
                className={`rounded-3xl border overflow-hidden text-right transition ${
                  isActive
                    ? "border-amber-400 shadow-lg"
                    : "border-amber-100 shadow-sm"
                }`}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-1 bg-white">
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {cat.description || "تعرّف على نكهة هذا التصنيف."}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`px-4 py-1.5 rounded-full text-xs border transition ${
              activeCategory === null
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-white border-gray-200 hover:bg-amber-50"
            }`}
          >
            عرض جميع الأصناف
          </button>
          {selectedCategory && (
            <span className="text-xs text-gray-600">
              التصنيف الحالي: {selectedCategory.name}
            </span>
          )}
        </div>

        <section ref={productsSectionRef} className="space-y-2 text-right">
          <h2 className="text-xl font-semibold">
            {selectedCategory
              ? `منتجات ${selectedCategory.name}`
              : "كل منتجاتنا"}
          </h2>
          <p className="text-xs text-gray-500">
            {selectedCategory
              ? selectedCategory.description ||
                "اكتشف تفاصيل هذا التصنيف واضف ما يعجبك إلى السلة."
              : "ابدأ من هنا لاختيار مشروبك أو حلاك المفضل."}
          </p>

          {error && (
            <div className="text-sm text-red-500 bg-white/80 border border-red-100 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-500 text-center">
              جارٍ تحميل المنتجات...
            </p>
          ) : visibleProducts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">
              لا توجد منتجات في هذا التصنيف حاليًا.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${product.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/product/${product.id}`);
                    }
                  }}
                  className="bg-white rounded-2xl border border-amber-100 shadow-sm flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <div className="h-36 overflow-hidden rounded-t-2xl bg-amber-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-amber-700">
                        لا تتوفر صورة
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-sm font-semibold mb-1">{product.name}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                      {product.description ||
                        "اختيار مميز من قائمتنا اليومية."}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-amber-700">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRequest(product);
                          }}
                          aria-label="إضافة إلى السلة"
                          title="إضافة إلى السلة"
                          className="w-8 h-8 rounded-full bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
      {addonProduct && (
        <ProductAddonModal
          product={addonProduct}
          onClose={() => setAddonProduct(null)}
          onConfirm={handleConfirmAddons}
        />
      )}
    </div>
  );
};

export default Menu;
