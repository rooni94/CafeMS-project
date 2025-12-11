import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type DashboardOrder = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  payment_method: string;
};

const DashboardOrders: React.FC = () => {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api
      .get("orders/")
      .then((res) => setOrders(res.data))
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل الطلبات.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`orders/${id}/`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("تعذر تحديث حالة الطلب.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div>جاري تحميل الطلبات...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!orders.length) return <div>لا توجد طلبات حالياً.</div>;

  const statusOptions = [
    { value: "pending", label: "معلق" },
    { value: "confirmed", label: "مؤكد" },
    { value: "preparing", label: "قيد التحضير" },
    { value: "ready", label: "جاهز" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة الطلبات</h2>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2 text-right">الحالة</th>
              <th className="px-3 py-2 text-right">إجمالي</th>
              <th className="px-3 py-2 text-right">الدفع</th>
              <th className="px-3 py-2 text-right">التاريخ</th>
              <th className="px-3 py-2 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">#{o.id}</td>
                <td className="px-3 py-2">
                  <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-xs">
                    {o.status}
                  </span>
                </td>
                <td className="px-3 py-2">{o.total} ريال</td>
                <td className="px-3 py-2 text-xs">{o.payment_method}</td>
                <td className="px-3 py-2 text-xs">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={o.status}
                    onChange={(e) =>
                      handleStatusChange(o.id, e.target.value)
                    }
                    disabled={updatingId === o.id}
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardOrders;
