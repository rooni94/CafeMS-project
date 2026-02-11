import React from "react";

import { useStoreSettings } from "../context/StoreSettingsContext";

const PrivacyPolicy: React.FC = () => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name?.trim() || "لاڤـا كافيـه";
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold mb-2">سياسة الخصوصية</h1>
      <p>
        في {storeName} نحترم خصوصيتك ونعامل بياناتك الشخصية بسرية تامة. تهدف
        هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية معلوماتك عند استخدامك
        لموقعنا أو تطبيقنا.
      </p>
      <h2 className="font-semibold mt-3">١. المعلومات التي نجمعها</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>معلومات الحساب مثل الاسم، البريد الإلكتروني، رقم الجوال.</li>
        <li>عناوين التوصيل التي تقوم بإضافتها.</li>
        <li>بيانات الطلبات مثل الأطباق، المبالغ وطريقة الدفع.</li>
      </ul>
      <h2 className="font-semibold mt-3">٢. استخدام المعلومات</h2>
      <p>نستخدم بياناتك من أجل:</p>
      <ul className="list-disc pr-5 space-y-1">
        <li>إنشاء الطلبات وتنفيذها وتحديث حالتها.</li>
        <li>التواصل معك بخصوص طلباتك أو استفساراتك.</li>
        <li>تحسين تجربة الاستخدام والخدمات المقدّمة.</li>
      </ul>
      <h2 className="font-semibold mt-3">٣. حماية البيانات</h2>
      <p>
        نلتزم باتخاذ الإجراءات التقنية والتنظيمية المناسبة لحماية بياناتك من
        الوصول غير المصرح به أو التعديل أو الحذف.
      </p>
      <h2 className="font-semibold mt-3">٤. مشاركة البيانات</h2>
      <p>
        لا نقوم ببيع بياناتك لأي طرف ثالث. قد نشارك بعض المعلومات مع مزودي
        الخدمات (مثل شركات التوصيل أو مزودي الدفع) فقط بالقدر اللازم لتنفيذ
        الخدمة.
      </p>
      <h2 className="font-semibold mt-3">٥. حقوقك</h2>
      <p>يمكنك في أي وقت:</p>
      <ul className="list-disc pr-5 space-y-1">
        <li>تحديث بيانات حسابك من صفحة البروفايل.</li>
        <li>طلب حذف حسابك وفقاً للأنظمة المعمول بها.</li>
      </ul>
      <p className="text-xs text-gray-500 mt-4">
        في حال وجود أي استفسار بخصوص الخصوصية يمكنك التواصل معنا من خلال صفحة
        "اتصل بنا".
      </p>
    </div>
  );
};

export default PrivacyPolicy;

