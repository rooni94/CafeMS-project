export const copyEn = {
  brandFallback: "CafeMS Demo",
  taglineFallback:
    "Enjoy carefully prepared coffee, hot and cold drinks, desserts, and bakery favorites at CafeMS Demo.",
  heroFallback: [
    {
      title: "Welcome to CafeMS Demo",
      description:
        "Discover specialty coffee, hot and cold drinks, desserts, and bakery favorites. Order with ease.",
      image:
        "https://images.unsplash.com/photo-1459257868276-5e65389e2722?auto=format&fit=crop&w=1200&q=80",
      button_text: "Go to the menu",
      button_link: "/menu?category=1",
    },
    {
      title: "Hot & cold drinks",
      description:
        "Daily options to match your taste: coffee, tea, juices, and more. Try the best now.",
      image:
        "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=1200&q=80",
      button_text: "Browse drinks",
      button_link: "/menu?category=2",
    },
    {
      title: "Light & tasty desserts",
      description:
        "Treat yourself with the dessert of the day. Great flavors and options for everyone.",
      image:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
      button_text: "Explore desserts",
      button_link: "/menu?category=3",
    },
  ],
  contactFallback: {
    address: "",
    hours: "Daily from 6 AM to 1 AM",
    phone: "",
    email: "",
    whatsapp: "",
  },
  categoryFallbacks: [
    {
      title: "Hot coffee",
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Drinks",
      image:
        "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Desserts",
      image:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Cold drinks",
      image:
        "https://res.cloudinary.com/dnsx3jzec/image/upload/v1707474032/cafems/cold-drinks.jpg",
    },
  ],
  messages: {
    required: "Please fill in all required fields.",
    passwordMismatch: "Passwords do not match. Please check and try again.",
    genericError: "An unexpected error occurred. Please try again later.",
    loading: "Loading...",
  },
  home: {
    headerTagline:
      "CafeMS Demo — specialty coffee, hot and cold drinks, desserts, and bakery favorites.",
    heroSecondaryCta: "Track order",
    heroExploreCta: "Go to the menu",
    shortcutsTitle: "Shortcuts",
    quickIntro: "Get quick access to the sections you use most and start your order with ease.",
    infoTags: ["Fresh daily", "High quality", "Made with care"],
    quickActions: [
      {
        icon: "grid-outline",
        label: "Menu",
        helper: "Browse items and add to cart",
        route: "Menu",
      },
      {
        icon: "time-outline",
        label: "Track order",
        helper: "Follow your order status easily",
        route: "OrderTracking",
      },
      {
        icon: "document-text-outline",
        label: "My orders",
        helper: "View recent orders and statuses",
        route: "Orders",
      },
      {
        icon: "gift-outline",
        label: "Loyalty points",
        helper: "Track points and redeem offers",
        route: "Rewards",
      },
      {
        icon: "call-outline",
        label: "Contact us",
        helper: "Support and customer service",
        route: "Contact",
      },
    ],
    categoriesTitle: "Categories",
    categoriesCta: "View all",
    featuredTitle: "Top picks",
    featuredCta: "Go to full menu",
    featuredEmpty: "No featured items right now. Try search or browse categories.",
  },
  menu: {
    title: "Menu",
    subtitle:
      "Choose from different categories and order easily. You can search or filter by category.",
    searchPlaceholder: "Search for an item...",
    loading: "Loading menu...",
    emptyTitle: "No products",
    emptyDescription: "Try a different search or choose another category.",
    filterAll: "All",
    cartCtaFilled: "Go to cart",
    cartCtaEmpty: "View cart",
    allCategories: "All",
  },
  orders: {
    prompt: "Enter the order number to track the status.",
    errorEmpty: "Please enter an order number.",
    notFound: "Order not found.",
    fetchError: "Unable to load order data. Try again.",
    guestTitle: "Sign in to access your orders",
    guestDescription: "Sign in to view your orders, save addresses, and loyalty points.",
    login: "Sign in",
    register: "Create account",
  },
  more: {
    guestWelcome: "Welcome!",
    guestBody: "Sign in to access extra features like orders, addresses, and loyalty points.",
    morePagesTitle: "Quick links",
    supportTitle: "Support & customer service",
    supportDescription: "Contact us for inquiries and feedback and we will help as soon as possible.",
  },
};
