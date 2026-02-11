export const copy = {
  brandFallback: "لاڤـا كافيـه",
  taglineFallback:
    "قهوة ومشروبات ساخنة وباردة وحلويات ومخبوزات… اطلب الآن واستمتع بتجربة لطيفة وجودة عالية.",
  heroFallback: [
    {
      title: "مرحباً بك في لاڤـا كافيـه",
      description:
        "اكتشف قائمة متنوعة من القهوة والمشروبات الساخنة والباردة المنعشة، مع الحلويات والمخبوزات. اطلب بسهولة واستلم بسرعة.",
      image:
        "https://images.unsplash.com/photo-1459257868276-5e65389e2722?auto=format&fit=crop&w=1200&q=80",
      button_text: "اذهب إلى القائمة",
      button_link: "/menu?category=1",
    },
    {
      title: "مشروبات ساخنة وباردة",
      description:
        "خيارات يومية تناسب ذوقك: قهوة، شاي، فرابيه، آيس لاتيه، عصائر وأكثر. جرّب الأفضل الآن.",
      image:
        "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=1200&q=80",
      button_text: "تصفّح المشروبات",
      button_link: "/menu?category=2",
    },
    {
      title: "حلويات ومخبوزات طازجة",
      description:
        "دلّع نفسك بحلوى اليوم أو مخبوزات طازجة ترافق قهوتك. نكهة رائعة وخيارات متعددة تناسب الجميع.",
      image:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
      button_text: "استكشف الحلويات",
      button_link: "/menu?category=3",
    },
  ],
  contactFallback: {
    address: "المملكة العربية السعودية - لاڤـا كافيـه",
    hours: "يومياً من 6 صباحاً إلى 1 صباحاً",
    phone: "+10000000000",
    email: "contact@example.invalid",
    whatsapp: "+10000000000",
  },
  categoryFallbacks: [
    {
      title: "ساندوتشات",
      image:
        "https://res.cloudinary.com/dnsx3jzec/image/upload/v1707474032/cafems/sandwiches.jpg",
    },
    {
      title: "مشروبات",
      image:
        "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "حلويات",
      image:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "مشروبات باردة",
      image:
        "https://res.cloudinary.com/dnsx3jzec/image/upload/v1707474032/cafems/cold-drinks.jpg",
    },
  ],
  messages: {
    required: "يرجى تعبئة جميع الحقول المطلوبة.",
    passwordMismatch:
      "كلمتا المرور غير متطابقتين. يرجى التأكد ثم المحاولة مرة أخرى.",
    genericError: "حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.",
    loading: "جارٍ التحميل...",
  },
  home: {
    headerTagline:
      "لاڤـا كافيـه — قهوة ومشروبات ساخنة وباردة وحلويات ومخبوزات بجودة عالية وخدمة سريعة.",
    heroSecondaryCta: "تتبّع الطلب",
    heroExploreCta: "اذهب إلى القائمة",
    shortcutsTitle: "الاختصارات",
    quickIntro: "اختصر الطريق إلى الأقسام الأكثر استخداماً، وابدأ طلبك بسرعة.",
    infoTags: ["طازج يومياً", "جودة عالية", "خدمة سريعة"],
    quickActions: [
      {
        icon: "grid-outline",
        label: "القائمة",
        helper: "تصفّح الأصناف وإضافة للسلة",
        route: "Menu",
      },
      {
        icon: "time-outline",
        label: "تتبّع الطلب",
        helper: "تابع حالة طلبك بسهولة",
        route: "OrderTracking",
      },
      {
        icon: "document-text-outline",
        label: "طلباتي",
        helper: "عرض آخر الطلبات وحالاتها",
        route: "Orders",
      },
      {
        icon: "gift-outline",
        label: "نقاط الولاء",
        helper: "تابع نقاطك واستفد من العروض",
        route: "Rewards",
      },
      {
        icon: "call-outline",
        label: "تواصل معنا",
        helper: "الدعم وخدمة العملاء",
        route: "Contact",
      },
    ],
    categoriesTitle: "الأقسام",
    categoriesCta: "عرض الكل",
    featuredTitle: "الأكثر طلباً",
    featuredCta: "اذهب إلى القائمة الكاملة",
    featuredEmpty: "لا توجد منتجات مميزة حالياً. جرّب البحث أو تصفّح الأقسام.",
  },
  menu: {
    title: "القائمة",
    subtitle:
      "اختر من الأقسام المختلفة واطلب بسهولة. يمكنك البحث أو تصفية المنتجات حسب القسم.",
    searchPlaceholder: "ابحث عن منتج...",
    loading: "جارٍ تحميل القائمة...",
    emptyTitle: "لا توجد منتجات",
    emptyDescription: "جرّب تغيير البحث أو اختر قسماً مختلفاً.",
    filterAll: "الكل",
    cartCtaFilled: "الذهاب إلى السلة",
    cartCtaEmpty: "استعرض السلة",
    allCategories: "الكل",
  },
  orders: {
    prompt: "أدخل رقم الطلب لتتبّع الحالة.",
    errorEmpty: "يرجى إدخال رقم الطلب.",
    notFound: "لم يتم العثور على الطلب.",
    fetchError: "تعذر تحميل بيانات الطلب. حاول مرة أخرى.",
    guestTitle: "سجّل دخولك للوصول إلى طلباتك",
    guestDescription: "سجّل الدخول لعرض طلباتك، حفظ عناوينك، ونقاط الولاء.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
  },
  more: {
    guestWelcome: "مرحباً بك!",
    guestBody:
      "سجّل الدخول للوصول إلى مزايا إضافية مثل الطلبات والعناوين ونقاط الولاء.",
    morePagesTitle: "روابط سريعة",
    supportTitle: "الدعم وخدمة العملاء",
    supportDescription:
      "راسلنا للاستفسارات والملاحظات وسنساعدك بأسرع وقت.",
  },
};


