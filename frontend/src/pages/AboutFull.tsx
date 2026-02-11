import React from "react";

import { useStoreSettings } from "../context/StoreSettingsContext";

const AboutFull: React.FC = () => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name?.trim() || "لاڤـا كافيـه";
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6 space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-amber-600 mb-2">
        {storeName}
      </h1>
      <p>
        {storeName} بدأت كفكرة بسيطة: مكان يجتمع فيه الأصدقاء للاستمتاع بالقهوة
        والمشروبات الساخنة والباردة المنعشة، مع الحلويات والمخبوزات التي تكمل
        اللحظة. نحرص على تقديم تجربة لطيفة وخدمة ودودة سواء في الزيارة أو عبر
        الطلبات الرقمية.
      </p>
      <h2 className="font-semibold text-lg mt-3">رؤيتنا</h2>
      <p>
        أن نكون الخيار الأول لكل شخص يبحث عن كوب قهوة متقن ومذاق ثابت، مع خيارات
        متنوعة تناسب كل الأوقات، سواءً للاستلام من الفرع أو الطلب بسهولة عبر
        المنصة.
      </p>
      <h2 className="font-semibold text-lg mt-3">ماذا يميزنا؟</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>تحضير متقن للقهوة والمشروبات بمكونات مختارة بعناية.</li>
        <li>قائمة متنوعة من الساخن والبارد والحلويات والمخبوزات.</li>
        <li>إمكانية الطلب أونلاين وتتبع حالة الطلب لحظة بلحظة.</li>
        <li>فريق عمل ودود يحرص على رضا العميل في كل مرة.</li>
      </ul>
      <h2 className="font-semibold text-lg mt-3">خدمتنا الإلكترونية</h2>
      <p>
        من خلال هذا الموقع يمكنك:
      </p>
      <ul className="list-disc pr-5 space-y-1">
        <li>استعراض القائمة واختيار المشروبات والحلى المفضلة.</li>
        <li>إضافة الطلب إلى السلة وتحديد طريقة الاستلام والدفع.</li>
        <li>إنشاء حساب لمتابعة طلباتك السابقة والاحتفاظ بعناوينك.</li>
        <li>تتبع طلبك ومعرفة حالته بدقة حتى لحظة الاستلام.</li>
      </ul>
      <p className="text-xs text-gray-500 mt-4">
        نسعد بخدمتكم دائماً، ويسعدنا سماع اقتراحاتكم عبر صفحة "اتصل بنا".
      </p>
    </div>
  );
};

export default AboutFull;

