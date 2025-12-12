import React from "react";

const AboutFull: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6 space-y-5 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold text-amber-600 mb-2">
        CafeMS Demo
      </h1>
      <p>
        CafeMS Demo بدأت كفكرة بسيطة: مكان يجتمع فيه الأصدقاء للاستمتاع
        بسندويتشات لذيذة ومشروبات طازجة وخدمة سريعة وودودة. مع الوقت تحولت هذه
        الفكرة إلى علامة موثوقة في الحي، تقدم تجربة مختلفة عن الكافتيريات
        التقليدية.
      </p>
      <h2 className="font-semibold text-lg mt-3">رؤيتنا</h2>
      <p>
        أن نكون الخيار الأول لكل شخص يبحث عن وجبة سريعة، طازجة، وبسعر مناسب،
        سواءً للاستلام من الفرع أو التوصيل للمنزل أو مكان العمل.
      </p>
      <h2 className="font-semibold text-lg mt-3">ماذا يميزنا؟</h2>
      <ul className="list-disc pr-5 space-y-1">
        <li>تحضير الطلبات عند الطلب باستخدام مكونات مختارة بعناية.</li>
        <li>قائمة متنوعة تناسب مختلف الأذواق.</li>
        <li>إمكانية الطلب أونلاين وتتبع حالة الطلب لحظة بلحظة.</li>
        <li>فريق عمل ودود يحرص على رضا العميل في كل مرة.</li>
      </ul>
      <h2 className="font-semibold text-lg mt-3">خدمتنا الإلكترونية</h2>
      <p>
        من خلال هذا الموقع يمكنك:
      </p>
      <ul className="list-disc pr-5 space-y-1">
        <li>استعراض القائمة واختيار الأطباق المفضلة.</li>
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
