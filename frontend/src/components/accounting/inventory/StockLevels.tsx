import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { accountingApi } from "../../../services/accounting";
import { InventoryItem } from "../../../types/accounting";

const StockLevels: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    accountingApi
      .listInventory()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">مستويات المخزون</div>
        <button className="text-xs text-amber-700" onClick={load}>
          تحديث
        </button>
      </div>
      {loading ? (
        <div className="text-sm">جارٍ التحميل...</div>
      ) : (
        <div className="overflow-auto max-h-72">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">الصنف</th>
                <th className="py-2">الكمية</th>
                <th className="py-2">حد إعادة الطلب</th>
                <th className="py-2">تنبيه</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-gray-100">
                  <td className="py-2">{it.name_ar}</td>
                  <td className="py-2">{it.quantity_on_hand}</td>
                  <td className="py-2">{it.reorder_level}</td>
                  <td className="py-2">
                    {it.below_reorder ? (
                      <span className="text-red-600">حرج</span>
                    ) : (
                      <span className="text-green-600">مستقر</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default StockLevels;
