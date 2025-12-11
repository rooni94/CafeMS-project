// src/pages/dashboard/DashboardContactMessages.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

const DashboardContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // للحوار (المودال)
  const [selectedMessage, setSelectedMessage] =
    useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState<string | null>(null);

  const fetchMessages = () => {
    setLoading(true);
    setErr(null);
    api
      .get("contact/messages/")
      .then((res: any) => setMessages(res.data))
      .catch((error: any) => {
        console.error(error);
        setErr("تعذر تحميل رسائل التواصل.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`contact/messages/${id}/`, { is_read: true });
      fetchMessages();
    } catch (error: any) {
      console.error(error);
      alert("تعذر تحديث حالة الرسالة.");
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("هل أنت متأكد من حذف هذه الرسالة؟");
    if (!ok) return;
    try {
      await api.delete(`contact/messages/${id}/`);
      fetchMessages();
    } catch (error: any) {
      console.error(error);
      alert("تعذر حذف الرسالة.");
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setReplySending(true);
    setReplyErr(null);
    setReplyMsg(null);
    try {
      await api.post(`contact/messages/${selectedMessage.id}/reply/`, {
        reply: replyText,
      });
      setReplyMsg("تم إرسال الرد بنجاح.");
      setReplyText("");
    } catch (error: any) {
      console.error(error);
      setReplyErr("تعذر إرسال الرد، تأكد من إعدادات البريد.");
    } finally {
      setReplySending(false);
    }
  };

  if (loading) return <div>جاري تحميل الرسائل...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">رسائل التواصل</h2>
      {messages.length === 0 ? (
        <div>لا توجد رسائل حالياً.</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">الاسم</th>
                <th className="px-3 py-2 text-right">البريد</th>
                <th className="px-3 py-2 text-right">الهاتف</th>
                <th className="px-3 py-2 text-right">الرسالة</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-t align-top">
                  <td className="px-3 py-2">#{m.id}</td>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2 text-xs">{m.email}</td>
                  <td className="px-3 py-2 text-xs">{m.phone || "-"}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <p className="text-xs whitespace-pre-wrap">{m.message}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.is_read ? "مقروءة" : "غير مقروءة"}
                  </td>
                  <td className="px-3 py-2 space-x-2 space-x-reverse">
                    <button
                      onClick={() => {
                        setSelectedMessage(m);
                        setReplyText("");
                        setReplyErr(null);
                        setReplyMsg(null);
                      }}
                      className="px-2 py-1 text-xs rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
                    >
                      عرض / رد
                    </button>
                    {!m.is_read && (
                      <button
                        onClick={() => handleMarkRead(m.id)}
                        className="px-2 py-1 text-xs rounded-full border border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                      >
                        تعليم كمقروءة
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="px-2 py-1 text-xs rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* المودال */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                رسالة من {selectedMessage.name}
              </h4>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-xs text-gray-500 hover:text-red-500"
              >
                إغلاق ✕
              </button>
            </div>
            <div className="text-xs text-gray-500">
              البريد: {selectedMessage.email}{" "}
              {selectedMessage.phone && (
                <> | الجوال: {selectedMessage.phone}</>
              )}
            </div>
            <div className="border rounded-lg p-2 max-h-40 overflow-y-auto text-xs whitespace-pre-wrap">
              {selectedMessage.message}
            </div>

            <div className="pt-2 border-t space-y-2">
              <label className="block text-xs font-semibold">
                رد على الرسالة (سيُرسل كبريد إلكتروني)
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              {replyErr && (
                <div className="text-xs text-red-500">{replyErr}</div>
              )}
              {replyMsg && (
                <div className="text-xs text-emerald-600">{replyMsg}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-3 py-1 rounded-full border text-xs"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={replySending || !replyText.trim()}
                  className="px-4 py-1 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
                >
                  {replySending ? "جاري الإرسال..." : "إرسال الرد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContactMessages;
