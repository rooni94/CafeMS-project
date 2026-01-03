import React from "react";

const TermsAndConditions: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold mb-2">الشروط والأحكام</h1>
      <p>
        باستخدامك لموقع CafeMS Demo أو إنشاءك لحساب، فإنك توافق على الشروط
        والأحكام التالية. يرجى قراءتها بعناية.
      </p>

      <h2 className="font-semibold mt-3">١. إنشاء الحساب</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>يجب أن تكون جميع البيانات المقدّمة صحيحة ومحدّثة.</li>
        <li>أنت مسؤول عن سرية بيانات الدخول لحسابك.</li>
      </ul>

      <h2 className="font-semibold mt-3">٢. الطلبات والدفع</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>عند تأكيد الطلب، يلتزم العميل باستلامه ودفع المبلغ المستحق.</li>
        <li>قد يتم إلغاء الطلب في حالات خاصة (عدم توفر منتج، خطأ سعري، إلخ).</li>
      </ul>

      <h2 className="font-semibold mt-3">٣. التوصيل والاستلام</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>يجب التأكد من صحة عنوان التوصيل ورقم الجوال.</li>
        <li>في حال تعذّر التواصل معك قد يتم إلغاء الطلب.</li>
      </ul>

      <h2 className="font-semibold mt-3">٤. الاستخدام المسموح</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>يُمنع إساءة استخدام المنصة أو محاولة اختراقها.</li>
        <li>
          يحق لإدارة الكافيه إيقاف أي حساب مخالف أو مسيء دون إشعار مسبق.
        </li>
      </ul>

      <h2 className="font-semibold mt-3">٥. التعديلات على الشروط</h2>
      <p>
        يحق لنا تحديث هذه الشروط والأحكام في أي وقت، وسيتم نشر النسخة المحدثة
        على هذه الصفحة، ويُعتبر استمرار استخدامك للمنصة موافقة على التعديلات.
      </p>

      <p className="text-xs text-gray-500 mt-4">
        في حال عدم موافقتك على أي من هذه الشروط، يرجى التوقف عن استخدام الموقع.
      </p>
    </div>
  );
};

export default TermsAndConditions;

