import { useCallback, useEffect, useRef, useState } from "react";
import {
  authSubscribeToAuthChanges,
  authSignOut,
  restoreSession,
} from "./authProvider";

import {
  initiatePesapalPayment,
  checkPesapalPaymentStatus,
  isPesapalConfigured,
} from "./pesapalProvider";
import {
  initiateMpesaPayment,
  checkMpesaPaymentStatus,
  isMpesaConfigured,
} from "./mpesaProvider";
import { PageMeta, ProductMeta, BreadcrumbMeta, FAQMeta, LocalBusinessMeta, BlogArticleMeta } from "./seoHelpers";
import { SOCIAL_PLATFORMS, generateShareLinks, SHARE_BUTTON_STYLE } from "./socialConfig";
import { generateKeywords } from "./contentGenerator";
import { PRODUCTS } from "./fallbackProducts";

const ORDERS_KEY = "nafuu-orders";
const CART_KEY = "nafuu-cart";
const WISHLIST_KEY = "nafuu-wishlist";
const CATALOG_KEY = "nafuu-catalog";
const PROFILES_KEY = "nafuu-profiles";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const CATEGORIES = [
  { key: "all", label: "All Products" },
  { key: "laptop", label: "Laptops" },
  { key: "phone", label: "Phones" },
  { key: "audio", label: "Audio" },
  { key: "accessory", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
];

const CATEGORY_MENU = [
  { 
    key: "laptop", 
    label: "Laptops", 
    desc: "Ex-UK refurbished & brand new",
    icon: "LAP",
    color: "#e8f8ed",
    count: () => PRODUCTS.filter(p => p.category === "laptop").length
  },
  { 
    key: "phone", 
    label: "Phones", 
    desc: "Smartphones from trusted brands",
    icon: "PHN",
    color: "#f0f7ff",
    count: () => PRODUCTS.filter(p => p.category === "phone").length
  },
  { 
    key: "audio", 
    label: "Audio", 
    desc: "Earbuds, headphones & speakers",
    icon: "AUD",
    color: "#fef3f2",
    count: () => PRODUCTS.filter(p => p.category === "audio").length
  },
  { 
    key: "accessory", 
    label: "Accessories", 
    desc: "Chargers, cables & protection",
    icon: "ACC",
    color: "#fef9e8",
    count: () => PRODUCTS.filter(p => p.category === "accessory").length
  },
  { 
    key: "electronics", 
    label: "Electronics", 
    desc: "Fans, bulbs & home essentials",
    icon: "ELE",
    color: "#f5f3ff",
    count: () => PRODUCTS.filter(p => p.category === "electronics").length
  },
];

const TESTIMONIALS = [
  {
    name: "Amina R.",
    quote: "I ordered an Elitebook and it looked almost brand new. Tracking updates were clear all the way to delivery.",
    item: "HP Elitebook 840 G8",
  },
  {
    name: "Kelvin M.",
    quote: "Price was way lower than what I was seeing in town. Photo confirmation before dispatch gave me confidence.",
    item: "Lenovo X1 Carbon",
  },
  {
    name: "Fatma A.",
    quote: "Fast delivery and honest grading. Exactly what Nafuu promised.",
    item: "Lenovo Yoga 390",
  },
];

const AS_SEEN_IN = ["Mombasa Tech Weekly", "Coast Business Daily", "Nairobi Gadget Journal", "Smart Shopper KE"];

const GRADE_INFO = {
  New: { label: "Brand New", desc: "Sealed box, never used, full warranty", color: "#2563eb" },
  A: { label: "Grade A", desc: "Looks brand new, zero visible scratches", color: "#22c55e" },
  B: { label: "Grade B", desc: "Minor cosmetic marks, fully functional", color: "#f59e0b" },
};

const fmt = (n) => `KSH ${Number(n).toLocaleString()}`;
const genRef = () => "NFU-" + Math.random().toString(36).substring(2, 7).toUpperCase();

const G = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
:root{--paper:#fafaf9;--card:#ffffff;--ink:#3d3d3d;--ink-soft:#606060;--muted:#8a8a8a;--line:#e6e4e0;--accent:#2ac769;--accent-dark:#0b8f41;--sun:#ffd84d;--cherry:#d94444;--text:var(--ink);--text-mid:var(--ink-soft);--text-dim:var(--muted);--border:var(--line);--ocean:var(--ink);--green:var(--accent-dark)}
html,body,#root{width:100%;min-height:100%;}
body{font-family:'Space Grotesk',sans-serif;background:var(--paper);color:var(--ink)}
input,select,textarea,button{font-family:'Space Grotesk',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseCard{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
`;

const storageApi = {
  async get(key) {
    if (window.storage?.get) return window.storage.get(key, true);
    const value = window.localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key, value) {
    if (window.storage?.set) return window.storage.set(key, value, true);
    window.localStorage.setItem(key, value);
    return true;
  },
};

const getStockMeta = (status = "in_stock") => {
  if (status === "out_of_stock") {
    return { label: "Out of stock", color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" };
  }
  if (status === "low_stock") {
    return { label: "Low stock", color: "#92400e", bg: "#ffedd5", border: "#fed7aa" };
  }
  return { label: "In stock", color: "#166534", bg: "#dcfce7", border: "#bbf7d0" };
};

const isAvailable = (product) => (product?.stockStatus || "in_stock") !== "out_of_stock";

const createDefaultAddress = (user = {}) => ({
  id: `addr-${Date.now()}`,
  label: "Home",
  recipientName: user?.name || "",
  phone: "",
  county: "Mombasa",
  town: "",
  addressLine: "",
  landmark: "",
});

const createProfileTemplate = (user = {}) => {
  const defaultAddress = createDefaultAddress(user);
  return {
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    altPhone: "",
    profilePicture: "",
    bio: "",
    county: defaultAddress.county,
    town: defaultAddress.town,
    addressLine: defaultAddress.addressLine,
    landmark: defaultAddress.landmark,
    preferredContact: "whatsapp",
    notifyEmail: true,
    notifySms: true,
    notifyDeals: false,
    mpesaPhone: "",
    mpesaName: user?.name || "",
    mpesaDefault: true,
    cards: [],
    defaultCardId: "",
    addresses: [defaultAddress],
    defaultAddressId: defaultAddress.id,
  };
};

const DEFAULT_SEO_BENCHMARK_VALUES = {
  wordCount: 1200,
  headingCount: 6,
  internalLinks: 5,
  externalLinks: 2,
  keywordDensityMin: 0.8,
  keywordDensityMax: 2.2,
  metaTitleMin: 45,
  metaTitleMax: 65,
  metaDescriptionMin: 120,
  metaDescriptionMax: 155,
};

const createSeoBenchmarkDraft = (item = null, effectiveBenchmark = null) => {
  const benchmark = { ...DEFAULT_SEO_BENCHMARK_VALUES, ...(effectiveBenchmark || item?.benchmark || {}) };
  return {
    source: item?.source || "manual",
    notes: item?.notes || "",
    wordCount: String(benchmark.wordCount ?? DEFAULT_SEO_BENCHMARK_VALUES.wordCount),
    headingCount: String(benchmark.headingCount ?? DEFAULT_SEO_BENCHMARK_VALUES.headingCount),
    internalLinks: String(benchmark.internalLinks ?? DEFAULT_SEO_BENCHMARK_VALUES.internalLinks),
    externalLinks: String(benchmark.externalLinks ?? DEFAULT_SEO_BENCHMARK_VALUES.externalLinks),
    keywordDensityMin: String(benchmark.keywordDensityMin ?? DEFAULT_SEO_BENCHMARK_VALUES.keywordDensityMin),
    keywordDensityMax: String(benchmark.keywordDensityMax ?? DEFAULT_SEO_BENCHMARK_VALUES.keywordDensityMax),
    metaTitleMin: String(benchmark.metaTitleMin ?? DEFAULT_SEO_BENCHMARK_VALUES.metaTitleMin),
    metaTitleMax: String(benchmark.metaTitleMax ?? DEFAULT_SEO_BENCHMARK_VALUES.metaTitleMax),
    metaDescriptionMin: String(benchmark.metaDescriptionMin ?? DEFAULT_SEO_BENCHMARK_VALUES.metaDescriptionMin),
    metaDescriptionMax: String(benchmark.metaDescriptionMax ?? DEFAULT_SEO_BENCHMARK_VALUES.metaDescriptionMax),
    snapshotsText: Array.isArray(item?.snapshots) && item.snapshots.length > 0 ? JSON.stringify(item.snapshots, null, 2) : "",
  };
};

const normalizeProfileData = (data = {}, user = {}) => {
  const base = createProfileTemplate(user);
  const legacyAddress = {
    ...createDefaultAddress(user),
    label: "Home",
    recipientName: data.fullName || user?.name || "",
    phone: data.phone || "",
    county: data.county || "Mombasa",
    town: data.town || "",
    addressLine: data.addressLine || "",
    landmark: data.landmark || "",
  };

  const addresses = Array.isArray(data.addresses) && data.addresses.length > 0
    ? data.addresses.map((address, index) => ({
        ...createDefaultAddress(user),
        ...address,
        id: address?.id || `addr-${Date.now()}-${index}`,
      }))
    : [legacyAddress];

  const defaultAddressId = addresses.some((address) => address.id === data.defaultAddressId)
    ? data.defaultAddressId
    : addresses[0]?.id || "";
  const defaultAddress = addresses.find((address) => address.id === defaultAddressId) || addresses[0] || legacyAddress;

  return {
    ...base,
    ...data,
    email: user?.email || data.email || "",
    fullName: data.fullName || user?.name || "",
    mpesaName: data.mpesaName || user?.name || "",
    cards: Array.isArray(data.cards) ? data.cards : [],
    addresses,
    defaultAddressId,
    county: defaultAddress.county || "Mombasa",
    town: defaultAddress.town || "",
    addressLine: defaultAddress.addressLine || "",
    landmark: defaultAddress.landmark || "",
  };
};

const detectCardBrand = (rawNumber = "") => {
  const number = String(rawNumber).replace(/\D/g, "");
  if (/^4/.test(number)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(number)) return "Mastercard";
  if (/^(34|37)/.test(number)) return "American Express";
  if (/^(6011|65)/.test(number)) return "Discover";
  return "Card";
};

const sanitizeArray = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : []);

export default function App() {
  const forcedClerkMode = (import.meta.env.VITE_AUTH_MODE || "auto").toLowerCase() === "clerk";
  const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const clerkModeMisconfigured = forcedClerkMode && !clerkConfigured;

  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [navSearch, setNavSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [brandSubdivision, setBrandSubdivision] = useState("all");
  const [modelSubdivision, setModelSubdivision] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [priceBand, setPriceBand] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [selected, setSelected] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", location: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [formErrors, setFormErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [trackRef, setTrackRef] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [heroVisible, setHeroVisible] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [infoPage, setInfoPage] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  
  // Nice to Have Feature States
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [reviews, setReviews] = useState({});
  const [isGuest, setIsGuest] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [seoDashboard, setSeoDashboard] = useState(null);
  const [seoTasks, setSeoTasks] = useState([]);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState("");
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [showBlogAdminPanel, setShowBlogAdminPanel] = useState(false);
  const [blogAdminLoading, setBlogAdminLoading] = useState(false);
  const [blogAdminError, setBlogAdminError] = useState("");
  const [blogAdminItems, setBlogAdminItems] = useState([]);
  const [blogAdminEditingId, setBlogAdminEditingId] = useState("");
  const [blogAdminDraft, setBlogAdminDraft] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    focusKeyword: "",
    metaTitle: "",
    metaDescription: "",
    publishedAt: "",
    status: "draft",
  });
  const [seoTaskDraft, setSeoTaskDraft] = useState({
    title: "",
    actionType: "content_task",
    sourceType: "local",
    sourceRef: "",
    dueAt: "",
    notes: "",
    priority: "medium",
  });
  const [seoBenchmarkDraft, setSeoBenchmarkDraft] = useState(createSeoBenchmarkDraft());
  const [seoBenchmarkInfo, setSeoBenchmarkInfo] = useState(null);
  const [openBlogSeoDiagnosticsId, setOpenBlogSeoDiagnosticsId] = useState("");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState("");
  const [selectedBlogPost, setSelectedBlogPost] = useState(null);
  const [selectedBlogSlug, setSelectedBlogSlug] = useState("");
  const [authErrors, setAuthErrors] = useState({});
  const [authMsg, setAuthMsg] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(createProfileTemplate());
  const [profileMsg, setProfileMsg] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [cardDraft, setCardDraft] = useState({ holder: "", number: "", expMonth: "", expYear: "" });
  const [addressDraft, setAddressDraft] = useState(createDefaultAddress());
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [catalog, setCatalog] = useState(PRODUCTS);
  const [adminEditId, setAdminEditId] = useState(null);
  const [adminMsg, setAdminMsg] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null); // { rows: [], fileName: "" }
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null); // { inserted, updated, failed }
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkImages, setBulkImages] = useState({}); // { filename: base64_string }
  const [adminForm, setAdminForm] = useState({
    brand: "",
    name: "",
    spec: "",
    category: "laptop",
    grade: "A",
    price: "",
    market: "",
    image: "",
    images: [],
    stockStatus: "in_stock",
    stockQuantity: "10",
    tags: "",
  });
  const [openProductFaq, setOpenProductFaq] = useState(0);
  const [backendOrders, setBackendOrders] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [systemStatusError, setSystemStatusError] = useState("");
  const searchRef = useRef();
  const hasHydratedInitialRouteRef = useRef(false);

  const getLiveSessionUser = () => {
    const clerkUser = window.Clerk?.user;
    const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || "";
    if (!clerkEmail) return null;

    const metadata = clerkUser?.publicMetadata || {};
    const role = String(clerkUser?.organizationMemberships?.[0]?.role || "");
    return {
      name: clerkUser?.firstName || clerkUser?.fullName || clerkEmail.split("@")[0] || "Nafuu User",
      email: clerkEmail,
      isAdmin: Boolean(metadata.isAdmin || role === "org:admin" || role === "admin"),
    };
  };

  const liveSessionUser = getLiveSessionUser();
  const activeUser = liveSessionUser || currentUser;

  const getClerkToken = useCallback(async () => {
    try {
      return (await window.Clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchProfileFromBackend = useCallback(async () => {
    const token = await getClerkToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 404) return null;
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Failed to load profile");
    }

    return data.profile || null;
  }, [getClerkToken]);

  function slugifySegment(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function decodePathSegment(value) {
    try {
      return decodeURIComponent(value || "");
    } catch {
      return String(value || "");
    }
  }

  function stripHtml(value) {
    return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function buildExcerpt(post, max = 180) {
    const source = post?.excerpt || stripHtml(post?.content || "");
    if (source.length <= max) return source;
    return `${source.slice(0, max).trim()}...`;
  }

  function toLocalDateTimeInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  useEffect(() => {
    // Prevent stale order lists from persisting across account changes.
    setBackendOrders(null);
  }, [activeUser?.email]);

  useEffect(() => {
    const id = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const type = params.get("type");
    if (type === "recovery") {
      setPage("auth");
      setAuthMode("signin");
      setAuthErrors({});
      setAuthMsg("Create a new password for your account.");
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  // URL path-based routing
  useEffect(() => {
    if (hasHydratedInitialRouteRef.current) return;

    const pathname = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);

    // Map pathname to page name
    const pathToPage = {
      "/": "home",
      "/cart": "cart",
      "/checkout": "checkout",
      "/my-orders": "my-orders",
      "/profile": "profile",
      "/track": "track",
      "/status": "status",
      "/admin": "admin",
      "/about": "about",
      "/auth": "auth",
      "/blog": "blog",
    };

    // Check if it's a product detail page (last segment is a product ID like p01, p08)
    const pathSegsRaw = window.location.pathname.split("/").filter(Boolean);
    const lastSeg = pathSegsRaw[pathSegsRaw.length - 1] || "";
    const isProductDetail = pathname.startsWith("/products") && /^p\d+$/i.test(lastSeg);

    const blogPath = pathname.startsWith("/blog");
    const blogSlugFromPath = blogPath && pathSegsRaw.length > 1 ? decodePathSegment(pathSegsRaw[1]) : "";

    // Find matching page from pathname
    const matchedPage = isProductDetail
      ? "product"
      : blogPath && blogSlugFromPath
        ? "blog-post"
        : blogPath
          ? "blog"
          : pathname.startsWith("/products")
            ? "products"
            : pathToPage[pathname];

    if (matchedPage && matchedPage !== page) {
      setPage(matchedPage);
    }

    if (matchedPage === "product") {
      // Load product from ID in URL
      const productId = lastSeg;
      const found = catalog.find((p) => p.id.toLowerCase() === productId.toLowerCase());
      if (found) setSelected(withStockStatus(found));
    }

    if (matchedPage === "blog-post") {
      setSelectedBlogSlug(slugifySegment(blogSlugFromPath));
      setSelectedBlogPost(null);
    }

    if (matchedPage === "products" || matchedPage === "product") {
      const validCategories = new Set(CATEGORIES.map((c) => c.key));
      const pathSegments = window.location.pathname
        .split("/")
        .filter(Boolean)
        .map((seg) => decodePathSegment(seg));

      const categorySegment = pathSegments[1] || "";
      const brandSegment = pathSegments[2] || "";
      const familySegment = pathSegments[3] || "";

      const categoryFromPath = CATEGORIES.find((c) => slugifySegment(c.key) === slugifySegment(categorySegment))?.key;
      const categoryFromQuery = params.get("category");
      const safeCategory =
        (categoryFromPath && validCategories.has(categoryFromPath) && categoryFromPath) ||
        (categoryFromQuery && validCategories.has(categoryFromQuery) && categoryFromQuery) ||
        "all";
      setCategory(safeCategory);

      const candidateBrand = brandSegment || params.get("brand");
      const validBrands = new Set(
        catalog
          .filter((p) => safeCategory === "all" || p.category === safeCategory)
          .map((p) => p.brand)
      );
      const safeBrand =
        Array.from(validBrands).find((brand) => slugifySegment(brand) === slugifySegment(candidateBrand)) ||
        "all";
      setBrandSubdivision(safeBrand);

      const candidateFamily = familySegment || params.get("family");
      const validFamilies = new Set(
        catalog
          .filter((p) => safeCategory === "all" || p.category === safeCategory)
          .filter((p) => safeBrand === "all" || p.brand === safeBrand)
          .map((p) => getModelFamily(p))
      );
      const safeFamily =
        Array.from(validFamilies).find((family) => slugifySegment(family) === slugifySegment(candidateFamily)) ||
        "all";
      setModelSubdivision(safeFamily);

      const nextQuery = params.get("q");
      if (nextQuery !== null) {
        setSearch(nextQuery);
        setNavSearch(nextQuery);
      }

      const nextSort = params.get("sort");
      if (nextSort) setSortBy(nextSort);

      const nextGrade = params.get("grade");
      if (nextGrade) setGradeFilter(nextGrade);

      const nextPrice = params.get("price");
      if (nextPrice) setPriceBand(nextPrice);
    }

    if (matchedPage === "auth") {
      const mode = (params.get("mode") || "").toLowerCase();
      if (mode === "signin" || mode === "signup") {
        setAuthMode(mode);
      }
    }

    hasHydratedInitialRouteRef.current = true;
  }, [catalog, page]);

  // Update URL when page changes
  useEffect(() => {
    const pageToPath = {
      home: "/",
      cart: "/cart",
      checkout: "/checkout",
      "my-orders": "/my-orders",
      profile: "/profile",
      track: "/track",
      status: "/status",
      admin: "/admin",
      about: "/about",
      auth: "/auth",
      blog: "/blog",
    };

    let newPath = (page === "products" || page === "product") ? "/products" : pageToPath[page];
    if (!newPath) return;

    const params = new URLSearchParams();
    if (page === "auth") {
      params.set("mode", authMode === "signup" ? "signup" : "signin");
    }
    if (page === "product" && selected) {
      const cat = selected.category || "";
      const brand = selected.brand || "";
      if (cat) newPath += `/${slugifySegment(cat)}`;
      if (cat && brand) newPath += `/${slugifySegment(brand)}`;
      newPath += `/${selected.id}`;
    } else if (page === "products") {
      if (category !== "all") {
        newPath += `/${slugifySegment(category)}`;
      }
      if (category !== "all" && brandSubdivision !== "all") {
        newPath += `/${slugifySegment(brandSubdivision)}`;
      }
      if (category !== "all" && brandSubdivision !== "all" && modelSubdivision !== "all") {
        newPath += `/${slugifySegment(modelSubdivision)}`;
      }
      if (search.trim()) params.set("q", search.trim());
      if (sortBy !== "featured") params.set("sort", sortBy);
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (priceBand !== "all") params.set("price", priceBand);
    } else if (page === "blog-post") {
      const slug = slugifySegment(selectedBlogPost?.slug || selectedBlogSlug);
      if (!slug) return;
      newPath = `/blog/${slug}`;
    }

    const nextUrl = params.toString() ? `${newPath}?${params.toString()}` : newPath;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState({ page }, document.title, nextUrl);
    }
  }, [
    page,
    authMode,
    selected,
    selectedBlogPost,
    selectedBlogSlug,
    category,
    brandSubdivision,
    modelSubdivision,
    search,
    sortBy,
    gradeFilter,
    priceBand,
  ]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setNavSearch(search);
  }, [search]);

  useEffect(() => {
    setBrandSubdivision("all");
  }, [category]);

  useEffect(() => {
    setModelSubdivision("all");
  }, [category, brandSubdivision]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setOpenProductFaq(0);
  }, [selected?.id]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (page === "blog") {
      void loadBlogPosts();
      return;
    }

    if (page === "blog-post") {
      const fallbackPathSlug = decodePathSegment(window.location.pathname.split("/").filter(Boolean)[1] || "");
      const slug = slugifySegment(selectedBlogSlug || selectedBlogPost?.slug || fallbackPathSlug);
      if (!slug) {
        setBlogError("Article slug is missing.");
        setSelectedBlogPost(null);
        return;
      }
      setSelectedBlogSlug(slug);
      void loadBlogPostBySlug(slug);
    }
  }, [page, selectedBlogSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMobileFilters = viewportWidth < 980;

  const loadOrders = async () => {
    try {
      const res = await storageApi.get(ORDERS_KEY);
      if (res?.value) setOrders(sanitizeArray(JSON.parse(res.value)));
      else setOrders([]);
    } catch {
      setOrders([]);
    }
  };

  const loadCart = async () => {
    try {
      const res = await storageApi.get(CART_KEY);
      if (res?.value) setCart(sanitizeArray(JSON.parse(res.value)));
      else setCart([]);
    } catch {
      setCart([]);
    }
  };

  const loadWishlist = async () => {
    try {
      const res = await storageApi.get(WISHLIST_KEY);
      if (res?.value) setWishlist(sanitizeArray(JSON.parse(res.value)));
      else setWishlist([]);
    } catch {
      setWishlist([]);
    }
  };

  const saveCart = async (items) => {
    try {
      await storageApi.set(CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  };

  const saveWishlist = async (items) => {
    try {
      await storageApi.set(WISHLIST_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save wishlist:", error);
    }
    if (activeUser) saveWishlistToBackend(items);
  };

  const saveCatalog = async (items) => {
    try {
      await storageApi.set(CATALOG_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save catalog:", error);
    }
  };

  const addToCart = (product) => {
    if (!isAvailable(product)) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const updated = prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
        saveCart(updated);
        return updated;
      }
      const updated = [...prev, { ...product, quantity: 1 }];
      saveCart(updated);
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== productId);
      saveCart(updated);
      return updated;
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => {
      const target = prev.find((item) => item.id === productId);
      if (target && !isAvailable(target)) return prev;
      const updated = prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      saveCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      const updated = exists
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product];
      saveWishlist(updated);
      return updated;
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  const safeCart = sanitizeArray(cart);
  const cartCount = safeCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const cartTotal = safeCart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const checkoutItems = (selected
    ? [selected && typeof selected === "object" ? { ...selected, quantity: selected.quantity || 1 } : null]
    : safeCart)
    .filter((item) => item && isAvailable(item));
  const checkoutItemCount = checkoutItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const checkoutSavings = checkoutItems.reduce((sum, item) => sum + (Number(item.market || 0) - Number(item.price || 0)) * Number(item.quantity || 1), 0);
  const checkoutDiscount = appliedCoupon ? Math.floor(checkoutSubtotal * appliedCoupon.discount) : 0;
  const checkoutTotal = checkoutSubtotal - checkoutDiscount;

  useEffect(() => {
    const hydrateLocalState = async () => {
      const loadCatalog = async () => {
        const fallbackProducts = PRODUCTS.map((p) => ({ ...p, stockStatus: p.stockStatus || "in_stock" }));

        try {
          const apiResponse = await fetch(`${API_BASE_URL}/api/products`, {
            headers: { Accept: "application/json" },
          });
          const apiData = await apiResponse.json().catch(() => ({}));

          if (apiResponse.ok && apiData?.ok && Array.isArray(apiData.items) && apiData.items.length > 0) {
            const normalized = apiData.items.map((p) => ({
              ...p,
              image: p.image || p.imageUrl || "",
              images: Array.isArray(p.images) ? p.images : [],
              tags: Array.isArray(p.tags) ? p.tags : [],
              stockStatus: p.stockStatus || "in_stock",
            }));
            setCatalog(normalized);
            await saveCatalog(normalized);
            return;
          }

          const res = await storageApi.get(CATALOG_KEY);
          if (res?.value) {
            const parsed = JSON.parse(res.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCatalog(parsed.map((p) => ({ ...p, stockStatus: p.stockStatus || "in_stock" })));
              return;
            }
          }
          setCatalog(fallbackProducts);
        } catch {
          setCatalog(fallbackProducts);
        }
      };

      await Promise.all([loadOrders(), loadCart(), loadWishlist(), loadCatalog()]);

      try {
        const savedReviews = await storageApi.get("nafuu-reviews");
        if (savedReviews?.value) {
          setReviews(JSON.parse(savedReviews.value));
        }
      } catch (e) {
        console.error("Error loading reviews:", e);
      }

      try {
        const savedAlerts = await storageApi.get("nafuu-stock-alerts");
        if (savedAlerts?.value) {
          setStockAlerts(JSON.parse(savedAlerts.value));
        }
      } catch (e) {
        console.error("Error loading stock alerts:", e);
      }
    };

    hydrateLocalState();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const clerkEmail = window.Clerk?.user?.primaryEmailAddress?.emailAddress || "";
        if (clerkEmail) {
          const clerkUser = window.Clerk.user;
          const metadata = clerkUser?.publicMetadata || {};
          const role = String(clerkUser?.organizationMemberships?.[0]?.role || "");
          const isAdmin = Boolean(metadata.isAdmin || role === "org:admin" || role === "admin");
          if (mounted) {
            setCurrentUser({
              name: clerkUser?.firstName || clerkUser?.fullName || clerkEmail.split("@")[0] || "Nafuu User",
              email: clerkEmail,
              isAdmin,
            });
          }
          return;
        }

        const session = await restoreSession();
        if (mounted && session?.user?.email) {
          setCurrentUser(session.user);
        }
      } catch {
        if (mounted) setCurrentUser(null);
      }
    };
    loadSession();

    // Subscribe to Supabase auth state changes so OAuth callbacks (e.g. Google
    // redirect) automatically update the user without requiring a page refresh.
    const unsubscribe = authSubscribeToAuthChanges((user) => {
      if (mounted) setCurrentUser(user);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateProfile = async () => {
      if (!activeUser?.email) {
        if (active) {
          setProfileData(createProfileTemplate());
          setAddressDraft(createDefaultAddress());
          setProfileMsg("");
        }
        return;
      }

      const key = activeUser.email.toLowerCase();
      try {
        const backendProfile = await fetchProfileFromBackend();
        if (backendProfile) {
          const normalizedBackendProfile = normalizeProfileData(backendProfile, activeUser);
          if (active) {
            setProfileData(normalizedBackendProfile);
            setAddressDraft(createDefaultAddress(activeUser));
            setProfileMsg("");
          }

          const localProfiles = (await storageApi.get(PROFILES_KEY))?.value;
          const parsedLocalProfiles = localProfiles ? JSON.parse(localProfiles) : {};
          parsedLocalProfiles[key] = normalizedBackendProfile;
          await storageApi.set(PROFILES_KEY, JSON.stringify(parsedLocalProfiles));
          return;
        }

        const stored = await storageApi.get(PROFILES_KEY);
        const allProfiles = stored?.value ? JSON.parse(stored.value) : {};
        const existing = normalizeProfileData(allProfiles[key] || {}, activeUser);
        if (active) {
          setProfileData(existing);
          setAddressDraft(createDefaultAddress(activeUser));
          setProfileMsg("");
        }
      } catch {
        if (active) {
          setProfileData(createProfileTemplate(activeUser));
          setAddressDraft(createDefaultAddress(activeUser));
          setProfileMsg("Could not load saved profile details.");
        }
      }
    };

    hydrateProfile();
    return () => {
      active = false;
    };
  }, [activeUser, fetchProfileFromBackend]);

  useEffect(() => {
    const id = setInterval(() => {
      loadOrders();
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trackedOrder?.id) return;
    const next = orders.find((o) => o.id === trackedOrder.id);
    if (next) setTrackedOrder(next);
  }, [orders, trackedOrder?.id]);

  useEffect(() => {
    if (page !== "status") return;
    void loadSystemStatus();
  }, [page]);

  useEffect(() => {
    if (page !== "admin" || !showSeoPanel) return;
    void loadSeoAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showSeoPanel]);

  useEffect(() => {
    if (page !== "admin" || !showBlogAdminPanel) return;
    void loadAdminBlogArticles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showBlogAdminPanel]);

  // Sync wishlist and stock alerts from backend whenever the user signs in
  useEffect(() => {
    if (!activeUser?.email) return;
    let cancelled = false;
    fetchWishlistFromBackend().then((items) => {
      if (!cancelled && Array.isArray(items) && items.length > 0) {
        setWishlist(items);
        storageApi.set(WISHLIST_KEY, JSON.stringify(items)).catch(() => {});
      }
    }).catch(() => {});
    fetchStockAlertsFromBackend().then((alerts) => {
      if (!cancelled && Array.isArray(alerts) && alerts.length > 0) {
        setStockAlerts(alerts);
        storageApi.set("nafuu-stock-alerts", JSON.stringify(alerts)).catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.email]);

  // Load orders from backend when user navigates to My Orders page
  useEffect(() => {
    if (page !== "my-orders" || !activeUser) return;
    let cancelled = false;
    fetchMyOrdersFromBackend()
      .then((items) => { if (!cancelled && items !== null) setBackendOrders(items); })
      .catch(() => { /* backend unavailable - fall through to local orders */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeUser]);

  useEffect(() => {
    if (page !== "checkout" || !activeUser?.email) return;

    const defaultAddress = (profileData.addresses || []).find((address) => address.id === profileData.defaultAddressId)
      || profileData.addresses?.[0]
      || null;
    const nextName = profileData.fullName || activeUser.name || "";
    const nextPhone = profileData.phone || defaultAddress?.phone || profileData.mpesaPhone || "";
    const nextLocation = [defaultAddress?.town || profileData.town, defaultAddress?.county || profileData.county]
      .filter(Boolean)
      .join(", ") || defaultAddress?.addressLine || profileData.addressLine || "";
    const nextNotes = [defaultAddress?.addressLine, defaultAddress?.landmark || profileData.landmark]
      .filter(Boolean)
      .join(" - ");

    setForm((prev) => ({
      ...prev,
      name: prev.name || nextName,
      phone: prev.phone || nextPhone,
      location: prev.location || nextLocation,
      notes: prev.notes || nextNotes,
    }));
  }, [
    page,
    activeUser?.email,
    activeUser?.name,
    profileData.addressLine,
    profileData.addresses,
    profileData.county,
    profileData.defaultAddressId,
    profileData.fullName,
    profileData.landmark,
    profileData.mpesaPhone,
    profileData.phone,
    profileData.town,
  ]);

  // Handle Pesapal payment callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderTrackingId = urlParams.get("OrderTrackingId");
    
    if (orderTrackingId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check payment status
      checkPesapalPaymentStatus(orderTrackingId)
        .then((statusResponse) => {
          // Find the order with this tracking ID
          const orderToUpdate = orders.find(
            (o) => o.pesapalOrderTrackingId === orderTrackingId
          );
          
          if (orderToUpdate) {
            const statusCode = statusResponse.payment_status_description || statusResponse.statusCode || 0;
            const isPaid = statusCode === 1 || statusCode === "1" || 
                          statusResponse.status === "completed" || 
                          statusResponse.status === "Completed";
            
            // Update order status
            const updatedOrder = {
              ...orderToUpdate,
              status: isPaid ? "confirmed" : "payment_failed",
              paymentStatus: isPaid ? "paid" : "failed",
              pesapalPaymentStatusCode: statusCode,
              pesapalPaymentMethod: statusResponse.payment_method || statusResponse.paymentMethod,
            };
            
            const updatedOrders = orders.map((o) =>
              o.id === orderToUpdate.id ? updatedOrder : o
            );
            
            setOrders(updatedOrders);
            storageApi.set(ORDERS_KEY, JSON.stringify(updatedOrders));
            
            // Send confirmation email if payment successful
            if (isPaid && updatedOrder.customerEmail) {
              sendEmailNotification("orderConfirmation", {
                email: updatedOrder.customerEmail,
                customerName: updatedOrder.customer,
                orderId: updatedOrder.id,
                total: updatedOrder.total,
                itemCount: updatedOrder.itemCount,
                paymentMethod: updatedOrder.paymentMethod
              });
            }
            
            // Reduce stock quantities if payment successful
            if (isPaid) {
              const updatedCatalog = catalog.map(product => {
                const orderItem = updatedOrder.items.find(item => item.id === product.id);
                if (orderItem) {
                  const newQuantity = (product.stockQuantity ?? 10) - (orderItem.quantity || 1);
                  const newStockStatus = newQuantity <= 0 ? "out_of_stock" : newQuantity <= 3 ? "low_stock" : "in_stock";
                  return { ...product, stockQuantity: Math.max(0, newQuantity), stockStatus: newStockStatus };
                }
                return product;
              });
              setCatalog(updatedCatalog);
              saveCatalog(updatedCatalog);
            }
            
            // Show order confirmation or error
            setLastOrder(updatedOrder);
            if (isPaid) {
              setCart([]);
              saveCart([]);
              setPage("confirm");
            } else {
              alert("Payment was not successful. Please try again or use M-Pesa.");
              setPage("checkout");
            }
          }
        })
        .catch((error) => {
          console.error("Error checking Pesapal payment status:", error);
          alert("Failed to verify payment status. Please contact support with your order reference.");
        });
    }
  }, [orders, catalog]);

  const filtered = catalog.filter((raw) => {
    const p = raw && typeof raw === "object" ? raw : {};
    const query = page === "products" ? debouncedSearch : search;
    const q = query.trim().toLowerCase();
    const categoryValue = String(p.category || "");
    const brandValue = String(p.brand || "");
    const nameValue = String(p.name || "");
    const specValue = String(p.spec || "");
    const gradeValue = String(p.grade || "");
    const priceValue = Number(p.price || 0);
    const tagsValue = Array.isArray(p.tags) ? p.tags.map((t) => String(t || "").toLowerCase()) : [];

    const matchCat = category === "all" || categoryValue === category;
    const matchSubdivision = brandSubdivision === "all" || brandValue === brandSubdivision;
    const matchModelSubdivision =
      modelSubdivision === "all" ||
      getModelFamily(p) === modelSubdivision;
    const matchGrade = gradeFilter === "all" || gradeValue === gradeFilter;
    const matchPrice =
      priceBand === "all" ||
      (priceBand === "budget" && priceValue < 25000) ||
      (priceBand === "mid" && priceValue >= 25000 && priceValue <= 50000) ||
      (priceBand === "premium" && priceValue > 50000);
    const matchQ =
      !q ||
      nameValue.toLowerCase().includes(q) ||
      brandValue.toLowerCase().includes(q) ||
      specValue.toLowerCase().includes(q) ||
      tagsValue.some((t) => t.includes(q));
    return matchCat && matchSubdivision && matchModelSubdivision && matchGrade && matchPrice && matchQ;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const aPrice = Number(a?.price || 0);
    const bPrice = Number(b?.price || 0);
    const aMarket = Number(a?.market || 0);
    const bMarket = Number(b?.market || 0);
    const aName = String(a?.name || "");
    const bName = String(b?.name || "");
    const aBrand = String(a?.brand || "");
    const bBrand = String(b?.brand || "");

    if (sortBy === "price-low") return aPrice - bPrice;
    if (sortBy === "price-high") return bPrice - aPrice;
    if (sortBy === "saving") return bMarket - bPrice - (aMarket - aPrice);
    if (sortBy === "name-az") return aName.localeCompare(bName);
    if (sortBy === "name-za") return bName.localeCompare(aName);
    if (sortBy === "brand") return aBrand.localeCompare(bBrand) || aName.localeCompare(bName);
    return 0;
  });

  const withStockStatus = (product) => ({
    ...product,
    stockStatus: product.stockStatus || "in_stock",
  });

  const categoryCount = (categoryKey) => catalog.filter((p) => p.category === categoryKey).length;
  function getModelFamily(product) {
    const brand = String(product?.brand || "").trim().toLowerCase();
    const name = String(product?.name || "").trim();
    if (!name) return "Other";

    const [first, second] = name.split(/\s+/);
    if (brand === "hp") {
      if (/elitebook/i.test(name)) return "EliteBook";
      if (/probook/i.test(name)) return "ProBook";
      if (/zbook/i.test(name)) return "ZBook";
      if (/dragonfly/i.test(name)) return "Dragonfly";
      if (/envy/i.test(name)) return "Envy";
      if (/spectre/i.test(name)) return "Spectre";
      if (/pavilion/i.test(name)) return "Pavilion";
    }

    if (brand === "lenovo") {
      if (/^x1\b|x1\s/i.test(name)) return "X1 Series";
      if (/thinkpad/i.test(name)) return "ThinkPad";
      if (/thinkbook/i.test(name)) return "ThinkBook";
      if (/yoga/i.test(name)) return "Yoga Series";
      if (/^x\d+/i.test(first)) return "X Series";
      if (/^t\d+/i.test(first)) return "T Series";
      if (/^p\d+/i.test(first)) return "P Series";
    }

    if (brand === "samsung") {
      if (/galaxy\s+s/i.test(name)) return "Galaxy S";
      if (/galaxy\s+a/i.test(name)) return "Galaxy A";
      if (/galaxy\s+note/i.test(name)) return "Galaxy Note";
      if (/buds/i.test(name)) return "Galaxy Buds";
      if (/galaxy/i.test(name)) return "Galaxy";
    }

    if (brand === "apple") {
      if (/^iphone/i.test(name)) return "iPhone";
      if (/^airpods/i.test(name)) return "AirPods";
      if (/^macbook/i.test(name)) return "MacBook";
      if (/^ipad/i.test(name)) return "iPad";
      if (/watch/i.test(name)) return "Apple Watch";
    }

    if (brand === "xiaomi") {
      if (/redmi\s+note/i.test(name)) return "Redmi Note";
      if (/redmi/i.test(name)) return "Redmi";
      if (/\bpoco\b/i.test(name)) return "POCO";
      if (/\bmi\b/i.test(name)) return "Mi Series";
    }

    if (/^x\d+/i.test(first)) return first.toUpperCase();
    if (/^t\d+/i.test(first)) return first.toUpperCase();
    if (/^p\d+/i.test(first)) return first.toUpperCase();
    if (/^yoga$/i.test(first) && second) return `Yoga ${second}`;

    return first;
  }
  const activeCategoryLabel = CATEGORIES.find((c) => c.key === category)?.label || "Products";
  const subdivisionOptions =
    category === "all"
      ? []
      : Array.from(
          new Set(
            catalog
              .filter((p) => p.category === category)
              .map((p) => p.brand)
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
  const modelSubdivisionOptions =
    category === "all"
      ? []
      : Array.from(
          new Set(
            catalog
              .filter((p) => p.category === category)
              .filter((p) => brandSubdivision === "all" || p.brand === brandSubdivision)
              .map((p) => getModelFamily(p))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
  const subdivisionCount = (brand) =>
    catalog.filter((p) => p.category === category && p.brand === brand).length;
  const modelSubdivisionCount = (family) =>
    catalog
      .filter((p) => p.category === category)
      .filter((p) => brandSubdivision === "all" || p.brand === brandSubdivision)
      .filter((p) => getModelFamily(p) === family).length;

  const sendEmailNotification = async (type, data) => {
    // Email notification framework - integrate with email service (e.g., SendGrid, Resend, AWS SES)
    console.log(`[email] ${type}`, data);
    
    // Simulated email templates
    const templates = {
      orderConfirmation: {
        to: data.email,
        subject: `Order Confirmed - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nYour order ${data.orderId} has been confirmed!\n\nTotal: KSh ${data.total.toLocaleString()}\nItems: ${data.itemCount}\n\nPayment: ${data.paymentMethod}\n\nWe'll send you photos for approval before dispatch.\n\nTrack your order: https://nafuumart.co.ke/track/${data.orderId}\n\nThank you!\nNafuu Mart Team`
      },
      orderShipped: {
        to: data.email,
        subject: `Order Dispatched - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nYour order ${data.orderId} has been dispatched!\n\nCourier Reference: ${data.courierRef}\n\nExpected delivery: Next business day\n\nTrack: https://nafuumart.co.ke/track/${data.orderId}`
      },
      photoApproval: {
        to: data.email,
        subject: `Photos Ready - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nWe've sent live photos of your device for approval.\n\nPlease review and confirm: https://nafuumart.co.ke/orders/${data.orderId}/photos\n\nYou have 24 hours to approve or request a different unit.`
      }
    };

    const template = templates[type];
    if (!template) {
      console.warn(`Unknown email type: ${type}`);
      return;
    }

    // TODO: Integrate with actual email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to: template.to, from: 'orders@nafuumart.co.ke', subject: template.subject, text: template.body });

    // For now, just log
    console.log(`Would send email to ${template.to}:`, template.subject);
    
    return { success: true, type, timestamp: Date.now() };
  };

  // Nice to Have Feature Functions

  // Coupon/Discount System
  const VALID_COUPONS = {
    "SAVE10": { discount: 0.10, label: "10% off" },
    "SAVE20": { discount: 0.20, label: "20% off" },
    "WELCOME5": { discount: 0.05, label: "5% off" },
    "STUDENT15": { discount: 0.15, label: "15% student discount" },
    "FIRST20": { discount: 0.20, label: "20% first purchase" }
  };

  const applyCoupon = (couponCode) => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code");
      return;
    }
    
    if (VALID_COUPONS[code]) {
      setAppliedCoupon({ code, ...VALID_COUPONS[code] });
      setCouponError("");
      setCouponInput("");
      return true;
    } else {
      setCouponError("Invalid coupon code");
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // Product Reviews & Ratings
  const _submitReview = (productId, rating, reviewText) => {
    if (!rating || rating < 1 || rating > 5) {
      alert("Please select a rating between 1 and 5");
      return;
    }
    
    const newReviews = { ...reviews };
    if (!newReviews[productId]) newReviews[productId] = [];
    
    newReviews[productId].push({
      id: Math.random().toString(36).substring(7),
      rating: parseInt(rating),
      text: reviewText.trim(),
      author: currentUser?.email || "Anonymous",
      timestamp: Date.now()
    });
    
    setReviews(newReviews);
    storageApi.set("nafuu-reviews", JSON.stringify(newReviews));
    return true;
  };

  const getProductReviews = (productId) => {
    return reviews[productId] || [];
  };

  const getProductAverageRating = (productId) => {
    const productReviews = getProductReviews(productId);
    if (productReviews.length === 0) return 0;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / productReviews.length).toFixed(1);
  };

  // Product Comparison
  const toggleComparison = (product) => {
    if (compareList.find(p => p.id === product.id)) {
      setCompareList(compareList.filter(p => p.id !== product.id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare only 3 products at a time");
        return;
      }
      setCompareList([...compareList, product]);
    }
  };

  const isInComparison = (productId) => {
    return compareList.some(p => p.id === productId);
  };

  // Stock Alerts
  const toggleStockAlert = (product) => {
    let updatedAlerts;
    if (stockAlerts.find(p => p.id === product.id)) {
      updatedAlerts = stockAlerts.filter(p => p.id !== product.id);
    } else {
      updatedAlerts = [...stockAlerts, { id: product.id, name: `${product.brand} ${product.name}`, email: activeUser?.email || currentUser?.email || "" }];
    }
    setStockAlerts(updatedAlerts);
    storageApi.set("nafuu-stock-alerts", JSON.stringify(updatedAlerts));
    if (activeUser) saveStockAlertsToBackend(updatedAlerts);
  };

  const hasStockAlert = (productId) => {
    return stockAlerts.some(p => p.id === productId);
  };

  // Admin Analytics
  const calculateAdminStats = () => {
    if (orders.length === 0) {
      setAdminStats(null);
      return;
    }

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalRevenue / totalOrders;
    
    const topProducts = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        topProducts[item.id] = (topProducts[item.id] || 0) + 1;
      });
    });
    
    const topProductsList = Object.entries(topProducts)
      .map(([id, count]) => {
        const product = catalog.find(p => p.id === id);
        return { id, name: product?.name, brand: product?.brand, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const outOfStock = catalog.filter(p => p.stockStatus === "out_of_stock").length;
    const lowStock = catalog.filter(p => p.stockStatus === "low_stock").length;

    setAdminStats({
      totalRevenue,
      totalOrders,
      averageOrderValue: averageOrderValue.toFixed(0),
      topProducts: topProductsList,
      outOfStock,
      lowStock,
      totalProducts: catalog.length
    });
  };

  const handleImageUpload = async (file, isMainImage = false) => {
    if (!file || !file.type.startsWith("image/")) {
      setAdminMsg("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAdminMsg("Image size must be less than 5MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        if (isMainImage) {
          setAdminForm((s) => ({ ...s, image: base64 }));
        } else {
          setAdminForm((s) => ({ ...s, images: [...s.images, base64] }));
        }
        setAdminMsg("");
      };
      reader.onerror = () => {
        setAdminMsg("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    } catch {
      setAdminMsg("Error uploading image.");
    }
  };

  const removeAdditionalImage = (index) => {
    setAdminForm((s) => ({
      ...s,
      images: s.images.filter((_, i) => i !== index),
    }));
  };

  const resetAdminForm = () => {
    setAdminForm({
      brand: "",
      name: "",
      spec: "",
      category: "laptop",
      grade: "A",
      price: "",
      market: "",
      image: "",
      images: [],
      stockStatus: "in_stock",
      stockQuantity: "10",
      tags: "",
    });
    setAdminEditId(null);
  };

  const startEditProduct = (product) => {
    setAdminEditId(product.id);
    setAdminForm({
      brand: product.brand || "",
      name: product.name || "",
      spec: product.spec || "",
      category: product.category || "laptop",
      grade: product.grade || "A",
      price: String(product.price || ""),
      market: String(product.market || ""),
      image: product.image || "",
      images: Array.isArray(product.images) ? product.images : [],
      stockStatus: product.stockStatus || "in_stock",
      stockQuantity: String(product.stockQuantity ?? 10),
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    });
    setAdminMsg("");
    setPage("admin");
  };

  const submitAdminProduct = async () => {
    const brand = adminForm.brand.trim();
    const name = adminForm.name.trim();
    const spec = adminForm.spec.trim();
    const price = Number(adminForm.price);
    const market = Number(adminForm.market);
    if (!brand || !name || !spec || !Number.isFinite(price) || !Number.isFinite(market)) {
      setAdminMsg("Fill brand, name, spec, price, and market price correctly.");
      return;
    }

    const stockQuantity = Number(adminForm.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setAdminMsg("Stock quantity must be a valid number (0 or more).");
      return;
    }

    const payload = {
      id: adminEditId || undefined,
      brand,
      name,
      spec,
      category: adminForm.category,
      grade: adminForm.grade,
      price,
      market,
      image: adminForm.image.trim() || (adminForm.images.length > 0 ? adminForm.images[0] : ""),
      images: adminForm.images.length > 0 ? adminForm.images : undefined,
      stockStatus: adminForm.stockStatus,
      stockQuantity,
      tags: adminForm.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      description: adminEditId ? catalog.find((p) => p.id === adminEditId)?.description || "" : "",
      longDescription: adminEditId ? catalog.find((p) => p.id === adminEditId)?.longDescription || "" : "",
    };

    try {
      const savedItem = await saveProductInBackend(payload);
      if (savedItem) {
        const updated = adminEditId
          ? catalog.map((p) => (p.id === adminEditId ? { ...p, ...savedItem } : p))
          : [savedItem, ...catalog];

        setCatalog(updated);
        await saveCatalog(updated);
        setAdminMsg(adminEditId ? "Product updated in backend." : "Product added to backend.");
        if (!adminEditId) resetAdminForm();
        return;
      }
    } catch (error) {
      console.warn("Admin product API unavailable, keeping local fallback:", error);
    }

    const updated = adminEditId
      ? catalog.map((p) => (p.id === adminEditId ? { ...p, ...payload } : p))
      : [{ id: "p" + Math.random().toString(36).slice(2, 8), ...payload }, ...catalog];

    setCatalog(updated);
    await saveCatalog(updated);
    setAdminMsg(adminEditId ? "Product updated locally." : "Product added locally.");
    if (!adminEditId) resetAdminForm();
  };

  const setProductStockStatus = async (productId, stockStatus) => {
    try {
      const savedItem = await updateProductStockInBackend(productId, { stockStatus });
      if (savedItem) {
        const updated = catalog.map((p) =>
          p.id === productId ? { ...p, ...savedItem } : p
        );
        setCatalog(updated);
        await saveCatalog(updated);
        return;
      }
    } catch (error) {
      console.warn("Admin stock API unavailable, keeping local fallback:", error);
    }

    const updated = catalog.map((p) => (p.id === productId ? { ...p, stockStatus } : p));
    setCatalog(updated);
    await saveCatalog(updated);
  };

  const userOrders = (() => {
    if (!activeUser?.email) return [];
    const localFiltered = orders.filter(
      (o) => (o.customerEmail || "").toLowerCase() === activeUser.email.toLowerCase()
    );
    if (backendOrders === null) return localFiltered;
    const backendIds = new Set(backendOrders.map((o) => o.id));
    const localOnly = localFiltered.filter((o) => !backendIds.has(o.id));
    return [...backendOrders, ...localOnly].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  })();

  const submitSearch = (query = navSearch) => {
    setSearch(query);
    setPage("products");
    setIsFilterOpen(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^0[7][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Enter a valid Kenyan phone number";
    if (!form.location.trim()) e.location = "Delivery location is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveProfileToBackend = async (profile) => {
    const token = await getClerkToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Failed to save profile");
    }

    return data.profile || null;
  };

  const createOrderInBackend = async (payload) => {
    const token = await getClerkToken();
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Order API request failed");
    }

    return data.order || null;
  };

  const fetchTrackedOrderFromBackend = async (reference) => {
    const response = await fetch(`${API_BASE_URL}/api/tracking/${encodeURIComponent(reference)}`, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Tracking API request failed");
    }

    return data.order || null;
  };

  const fetchMyOrdersFromBackend = async () => {
    const token = await getClerkToken();
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/api/orders/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "My orders API request failed");
    }

    return Array.isArray(data.items) ? data.items : [];
  };

  const syncBackendOrders = async () => {
    try {
      const items = await fetchMyOrdersFromBackend();
      if (items !== null) {
        setBackendOrders(items);
      }
    } catch {
      // Keep graceful fallback behavior when backend/auth is unavailable.
    }
  };

  const fetchWishlistFromBackend = async () => {
    const token = await getClerkToken();
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/api/wishlist/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) return null;
    return Array.isArray(data.items) ? data.items : null;
  };

  const saveWishlistToBackend = async (items) => {
    const token = await getClerkToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/wishlist/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
    } catch { /* silent - localStorage already saved */ }
  };

  const fetchStockAlertsFromBackend = async () => {
    const token = await getClerkToken();
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/api/stock-alerts/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) return null;
    return Array.isArray(data.alerts) ? data.alerts : null;
  };

  const saveStockAlertsToBackend = async (alerts) => {
    const token = await getClerkToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/stock-alerts/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alerts }),
      });
    } catch { /* silent */ }
  };

  const fetchBlogPostsFromBackend = async () => {
    const response = await fetch(`${API_BASE_URL}/api/blog?limit=30`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Could not load blog posts");
    }
    return Array.isArray(data.items) ? data.items : [];
  };

  const fetchBlogPostBySlugFromBackend = async (slug) => {
    const response = await fetch(`${API_BASE_URL}/api/blog/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Could not load the requested article");
    }
    return data.item || null;
  };

  const loadBlogPosts = async () => {
    setBlogLoading(true);
    setBlogError("");
    try {
      const items = await fetchBlogPostsFromBackend();
      setBlogPosts(items);
      return items;
    } catch (error) {
      setBlogError(error?.message || "Could not load blog posts.");
      setBlogPosts([]);
      return [];
    } finally {
      setBlogLoading(false);
    }
  };

  const loadBlogPostBySlug = async (slug) => {
    const safeSlug = slugifySegment(slug);
    if (!safeSlug) return null;

    setBlogLoading(true);
    setBlogError("");
    try {
      const post = await fetchBlogPostBySlugFromBackend(safeSlug);
      setSelectedBlogPost(post);
      return post;
    } catch (error) {
      setSelectedBlogPost(null);
      setBlogError(error?.message || "Could not load this article.");
      return null;
    } finally {
      setBlogLoading(false);
    }
  };

  const callAdminSeoApi = async (path, options = {}) => {
    const token = await getClerkToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "SEO admin API request failed");
    }
    return data;
  };

  const loadSeoAdminDashboard = async () => {
    const data = await callAdminSeoApi("/api/admin/seo/dashboard?rangeDays=30");
    setSeoDashboard(data);
    return data;
  };

  const loadSeoAdminTasks = async () => {
    const data = await callAdminSeoApi("/api/admin/seo/tasks");
    setSeoTasks(Array.isArray(data.items) ? data.items : []);
    return data;
  };

  const loadSeoCompetitorBenchmark = async () => {
    const data = await callAdminSeoApi("/api/admin/seo/competitor-benchmark");
    setSeoBenchmarkInfo({
      item: data.item || null,
      effectiveBenchmark: data.effectiveBenchmark || null,
      message: data.message || "",
    });
    setSeoBenchmarkDraft(createSeoBenchmarkDraft(data.item, data.effectiveBenchmark));
    return data;
  };

  const loadSeoAdminData = async () => {
    setSeoLoading(true);
    setSeoError("");
    try {
      await Promise.all([loadSeoAdminDashboard(), loadSeoAdminTasks(), loadSeoCompetitorBenchmark()]);
    } catch (error) {
      setSeoError(error?.message || "Could not load SEO admin data.");
    } finally {
      setSeoLoading(false);
    }
  };

  const loadAdminBlogArticles = async () => {
    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      const data = await callAdminSeoApi("/api/admin/blog/articles?status=all&limit=100");
      setBlogAdminItems(Array.isArray(data.items) ? data.items : []);
      return data;
    } catch (error) {
      setBlogAdminError(error?.message || "Could not load blog articles.");
      setBlogAdminItems([]);
      return null;
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const runBlogSeoRescore = async ({ showSuccessMessage = true } = {}) => {
    setSeoLoading(true);
    setSeoError("");
    try {
      const data = await callAdminSeoApi("/api/admin/seo/blog-rescore", {
        method: "POST",
      });
      await loadAdminBlogArticles();
      const summary = data?.summary || {};
      if (showSuccessMessage) {
        setAdminMsg(
          `SEO re-score complete. Updated ${summary.updatedCount || 0} articles; ${summary.changedCount || 0} changed.`
        );
      }
      return data;
    } catch (error) {
      setSeoError(error?.message || "Could not re-score blog articles.");
      return null;
    } finally {
      setSeoLoading(false);
    }
  };

  const clearBlogAdminDraft = () => {
    setBlogAdminEditingId("");
    setBlogAdminDraft({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      focusKeyword: "",
      metaTitle: "",
      metaDescription: "",
      publishedAt: "",
      status: "draft",
    });
  };

  const previewBlogPost = (item) => {
    // Build a synthetic post object from the item or the current draft (for unsaved drafts).
    const source = item || blogAdminDraft;
    const synth = {
      id: source.id || "preview",
      slug: source.slug || slugifySegment(source.title || "preview"),
      title: source.title || "Untitled",
      excerpt: source.excerpt || "",
      content: source.content || "<p><em>No content yet.</em></p>",
      focusKeyword: source.focusKeyword || "",
      metaTitle: source.metaTitle || source.title || "Preview",
      metaDescription: source.metaDescription || source.excerpt || "",
      publishedAt: source.publishedAt || null,
      status: source.status || "draft",
      _isPreview: true,
    };
    setSelectedBlogPost(synth);
    setSelectedBlogSlug(synth.slug);
    setPage("blog-post");
  };

  const startBlogAdminEdit = (item) => {
    setBlogAdminEditingId(item?.id || "");
    setOpenBlogSeoDiagnosticsId(item?.id || "");
    setBlogAdminDraft({
      title: item?.title || "",
      slug: item?.slug || "",
      excerpt: item?.excerpt || "",
      content: item?.content || "",
      focusKeyword: item?.focusKeyword || "",
      metaTitle: item?.metaTitle || "",
      metaDescription: item?.metaDescription || "",
      publishedAt: toLocalDateTimeInput(item?.publishedAt),
      status: item?.status || "draft",
    });
  };

  const saveBlogAdminDraft = async () => {
    if (!blogAdminDraft.title.trim()) {
      setBlogAdminError("Article title is required.");
      return;
    }

    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      const path = blogAdminEditingId
        ? `/api/admin/blog/articles/${encodeURIComponent(blogAdminEditingId)}`
        : "/api/admin/blog/articles";
      const method = blogAdminEditingId ? "PATCH" : "POST";

      await callAdminSeoApi(path, {
        method,
        body: JSON.stringify({
          ...blogAdminDraft,
          publishedAt: blogAdminDraft.publishedAt || null,
        }),
      });

      await loadAdminBlogArticles();
      clearBlogAdminDraft();
      setAdminMsg(blogAdminEditingId ? "Blog article updated." : "Blog article created.");
    } catch (error) {
      setBlogAdminError(error?.message || "Could not save blog article.");
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const publishBlogAdminItem = async (item) => {
    if (!item?.id) return;
    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      await callAdminSeoApi(`/api/admin/blog/articles/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "published" }),
      });
      await loadAdminBlogArticles();
      setAdminMsg("Blog article published.");
    } catch (error) {
      setBlogAdminError(error?.message || "Could not publish blog article.");
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const unpublishBlogAdminItem = async (item) => {
    if (!item?.id) return;
    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      await callAdminSeoApi(`/api/admin/blog/articles/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "draft" }),
      });
      await loadAdminBlogArticles();
      setAdminMsg("Blog article moved back to draft.");
    } catch (error) {
      setBlogAdminError(error?.message || "Could not unpublish blog article.");
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const deleteBlogAdminItem = async (item) => {
    if (!item?.id) return;
    const confirmed = window.confirm(`Delete article "${item.title || item.id}"? This cannot be undone.`);
    if (!confirmed) return;

    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      await callAdminSeoApi(`/api/admin/blog/articles/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      await loadAdminBlogArticles();
      if (blogAdminEditingId === item.id) {
        clearBlogAdminDraft();
      }
      setAdminMsg("Blog article deleted.");
    } catch (error) {
      setBlogAdminError(error?.message || "Could not delete blog article.");
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const runBlogPublishSweep = async () => {
    setBlogAdminLoading(true);
    setBlogAdminError("");
    try {
      const data = await callAdminSeoApi("/api/admin/seo/blog-publish-sweep", {
        method: "POST",
      });
      await Promise.all([loadAdminBlogArticles(), loadSeoAdminData()]);
      const summary = data?.summary || {};
      setAdminMsg(
        `Publish sweep complete. Processed ${summary.processedArticles || 0} articles, created ${summary.createdTasks || 0} follow-up task(s).`
      );
    } catch (error) {
      setBlogAdminError(error?.message || "Could not run publish sweep.");
    } finally {
      setBlogAdminLoading(false);
    }
  };

  const createSeoFollowUpTask = async (taskPayload) => {
    try {
      await callAdminSeoApi("/api/admin/seo/tasks", {
        method: "POST",
        body: JSON.stringify(taskPayload),
      });
      await loadSeoAdminData();
      setAdminMsg("SEO follow-up task created.");
    } catch (error) {
      setAdminMsg(error?.message || "Failed to create SEO task.");
    }
  };

  const updateSeoTaskStatus = async (taskId, status) => {
    try {
      await callAdminSeoApi(`/api/admin/seo/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadSeoAdminData();
    } catch (error) {
      setSeoError(error?.message || "Could not update SEO task.");
    }
  };

  const remindSeoTask = async (taskId) => {
    try {
      await callAdminSeoApi(`/api/admin/seo/tasks/${encodeURIComponent(taskId)}/remind`, {
        method: "POST",
        body: JSON.stringify({ note: "Reminder sent from admin panel." }),
      });
      setAdminMsg("Reminder logged for SEO task.");
    } catch (error) {
      setSeoError(error?.message || "Could not send reminder.");
    }
  };

  const saveSeoCompetitorBenchmark = async () => {
    setSeoLoading(true);
    setSeoError("");
    try {
      let snapshots = [];
      if (seoBenchmarkDraft.snapshotsText.trim()) {
        const parsed = JSON.parse(seoBenchmarkDraft.snapshotsText);
        if (!Array.isArray(parsed)) {
          throw new Error("Snapshots JSON must be an array of competitor snapshot objects.");
        }
        snapshots = parsed;
      }

      const benchmark = {
        wordCount: Number(seoBenchmarkDraft.wordCount),
        headingCount: Number(seoBenchmarkDraft.headingCount),
        internalLinks: Number(seoBenchmarkDraft.internalLinks),
        externalLinks: Number(seoBenchmarkDraft.externalLinks),
        keywordDensityMin: Number(seoBenchmarkDraft.keywordDensityMin),
        keywordDensityMax: Number(seoBenchmarkDraft.keywordDensityMax),
        metaTitleMin: Number(seoBenchmarkDraft.metaTitleMin),
        metaTitleMax: Number(seoBenchmarkDraft.metaTitleMax),
        metaDescriptionMin: Number(seoBenchmarkDraft.metaDescriptionMin),
        metaDescriptionMax: Number(seoBenchmarkDraft.metaDescriptionMax),
      };

      const data = await callAdminSeoApi("/api/admin/seo/competitor-benchmark", {
        method: "PUT",
        body: JSON.stringify({
          source: seoBenchmarkDraft.source,
          notes: seoBenchmarkDraft.notes,
          benchmark,
          snapshots,
        }),
      });

      setSeoBenchmarkInfo({
        item: data.item || null,
        effectiveBenchmark: data.effectiveBenchmark || null,
        message: data.derivedFromSnapshots ? "Benchmark updated from competitor snapshots." : "Benchmark updated.",
      });
      setSeoBenchmarkDraft(createSeoBenchmarkDraft(data.item, data.effectiveBenchmark));
      await runBlogSeoRescore({ showSuccessMessage: false });
      setAdminMsg(
        data.derivedFromSnapshots
          ? "Competitor benchmark updated from snapshots and all blog articles were re-scored."
          : "Competitor benchmark updated and all blog articles were re-scored."
      );
    } catch (error) {
      setSeoError(error?.message || "Could not save competitor benchmark.");
    } finally {
      setSeoLoading(false);
    }
  };

  const exportSeoCompetitorBenchmark = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        item: seoBenchmarkInfo?.item || null,
        effectiveBenchmark: seoBenchmarkInfo?.effectiveBenchmark || null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nafuu-seo-benchmark-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setAdminMsg("Competitor benchmark exported.");
    } catch {
      setSeoError("Could not export competitor benchmark.");
    }
  };

  const importSeoCompetitorBenchmarkFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const item = parsed?.item && typeof parsed.item === "object" ? parsed.item : null;
      const benchmark = parsed?.benchmark || parsed?.effectiveBenchmark || item?.benchmark || null;
      const snapshots = Array.isArray(parsed?.snapshots)
        ? parsed.snapshots
        : Array.isArray(item?.snapshots)
          ? item.snapshots
          : [];
      setSeoBenchmarkDraft(
        createSeoBenchmarkDraft(
          {
            source: parsed?.source || item?.source || "import",
            notes: parsed?.notes || item?.notes || "Imported from JSON file",
            benchmark,
            snapshots,
          },
          benchmark
        )
      );
      setAdminMsg("Benchmark JSON imported into the form. Save to apply it.");
      setSeoError("");
    } catch (error) {
      setSeoError(error?.message || "Could not import benchmark JSON.");
    }
  };

  const saveProductInBackend = async (payload) => {
    const token = await getClerkToken();
    const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Admin product API request failed");
    }

    return data.item || null;
  };

  const updateProductStockInBackend = async (productId, payload) => {
    const token = await getClerkToken();
    const response = await fetch(`${API_BASE_URL}/api/admin/products/${encodeURIComponent(productId)}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || "Admin stock API request failed");
    }

    return data.item || null;
  };

  const handleBulkImageFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    const imageMap = { ...bulkImages };
    let successCount = 0;
    const maxSize = 5 * 1024 * 1024; // 5 MB

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue; // skip non-images
      }
      if (file.size > maxSize) {
        setAdminMsg(`Image "${file.name}" exceeds 5MB, skipped.`);
        continue;
      }

      try {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            imageMap[file.name] = reader.result; // base64
            successCount++;
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        setAdminMsg(`Failed to read image "${file.name}".`);
      }
    }
    setBulkImages(imageMap);
    if (successCount > 0) {
      setAdminMsg(`${successCount} image${successCount !== 1 ? "s" : ""} uploaded. Reference them by filename in Excel.`);
    }
  };

  const resolveBulkImageReference = (filename) => {
    if (!filename) return "";
    return bulkImages[filename] || filename; // return base64 if found, else keep original URL
  };

  const handleBulkFileSelect = async (file) => {
    if (!file) return;
    setAdminMsg("");
    setBulkResult(null);
    setBulkPreview(null);
    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = read(new Uint8Array(buffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) {
        setAdminMsg("The spreadsheet appears to be empty.");
        return;
      }
      // Resolve image references in preview
      const enrichedRows = rows.map((row) => {
        const enriched = { ...row };
        if (enriched.image) enriched.image = resolveBulkImageReference(enriched.image);
        if (enriched.images && typeof enriched.images === "string") {
          enriched.images = enriched.images.split(",").map((img) => resolveBulkImageReference(img.trim()));
        }
        return enriched;
      });
      setBulkPreview({ rows: enrichedRows, fileName: file.name });
    } catch {
      setAdminMsg("Failed to read file. Make sure it is a valid .xlsx or .csv file.");
    }
  };

  const submitBulkUpload = async () => {
    if (!bulkPreview?.rows?.length) return;
    setBulkUploading(true);
    setAdminMsg("");
    try {
      const token = await getClerkToken();
      // Resolve image references one more time before sending
      const finalRows = bulkPreview.rows.map((row) => {
        const final = { ...row };
        if (final.image) final.image = resolveBulkImageReference(final.image);
        if (final.images && typeof final.images === "string") {
          final.images = final.images.split(",").map((img) => resolveBulkImageReference(img.trim()));
        }
        return final;
      });
      const res = await fetch(`${API_BASE_URL}/api/admin/products/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ products: finalRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setBulkResult(data);
        setBulkPreview(null);
        setBulkImages({}); // Clear images after successful upload
        try {
          const pRes = await fetch(`${API_BASE_URL}/api/products`);
          const pData = await pRes.json().catch(() => ({}));
          if (pData.ok && Array.isArray(pData.items)) {
            setCatalog(pData.items);
            await saveCatalog(pData.items);
          }
        } catch { /* catalog refresh is best-effort */ }
      } else {
        setAdminMsg(`Bulk upload failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      setAdminMsg(`Bulk upload error: ${err.message}`);
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadBulkTemplate = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const template = [
        { id: "", brand: "Samsung", name: "Galaxy S21", spec: "8GB/128GB · 6.2\" · 5G", category: "phone", grade: "A", price: 35000, market: 55000, image: "https://example.com/image.jpg", description: "Excellent condition", stock_status: "in_stock", stock_quantity: 10, tags: "android, 5g" },
        { id: "", brand: "Apple", name: "MacBook Pro 14", spec: "M3 · 16GB · 512GB SSD", category: "laptop", grade: "B", price: 185000, market: 250000, image: "https://example.com/mac.jpg", description: "Minor cosmetic scratches", stock_status: "in_stock", stock_quantity: 5, tags: "apple, m3, laptop" },
      ];
      const ws = utils.json_to_sheet(template);
      ws["!cols"] = [8, 12, 20, 30, 10, 8, 10, 10, 40, 30, 14, 15, 20].map((w) => ({ wch: w }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Products");
      writeFile(wb, "nafuu-mart-products-template.xlsx");
    } catch {
      setAdminMsg("Failed to generate template.");
    }
  };

  const placeOrder = async () => {
    setFormErrors((prev) => ({ ...prev, checkout: undefined }));
    if (!checkoutItems.length || !validate()) return;
    if (!checkoutItems.some(isAvailable)) {
      setFormErrors((prev) => ({
        ...prev,
        checkout: "All items in this checkout are currently out of stock.",
      }));
      return;
    }

    // Check if sufficient stock is available
    const stockCheck = checkoutItems.map(item => {
      const product = catalog.find(p => p.id === item.id);
      const requestedQty = item.quantity || 1;
      const availableQty = product?.stockQuantity ?? 10;
      return { id: item.id, name: `${item.brand} ${item.name}`, requestedQty, availableQty, sufficient: availableQty >= requestedQty };
    });

    const insufficientStock = stockCheck.filter(s => !s.sufficient);
    if (insufficientStock.length > 0) {
      const errorMsg = insufficientStock.length === 1
        ? `Only ${insufficientStock[0].availableQty} unit(s) available for ${insufficientStock[0].name}`
        : `Insufficient stock for ${insufficientStock.length} item(s)`;
      setFormErrors((prev) => ({ ...prev, checkout: errorMsg }));
      return;
    }

    setPaying(true);

    // Handle Pesapal payment flow
    if (paymentMethod === "pesapal") {
      if (!isPesapalConfigured()) {
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "Pesapal payment is not configured. Please contact support.",
        }));
        return;
      }

      const firstItem = checkoutItems[0];
      const normalizedItems = checkoutItems.map((item) => ({
        id: item.id,
        brand: item.brand,
        name: item.name,
        spec: item.spec,
        grade: GRADE_INFO[item.grade]?.label || item.grade,
        quantity: item.quantity || 1,
        price: item.price,
        market: item.market,
        image: item.image || "",
      }));

      const orderData = {
        id: genRef(),
        customer: form.name.trim(),
        customerEmail: activeUser?.email || "",
        phone: form.phone.trim(),
        location: form.location.trim(),
        product:
          checkoutItemCount === 1
            ? `${firstItem.brand} ${firstItem.name} ${firstItem.spec}`
            : `${checkoutItemCount} items`,
        total: checkoutTotal,
        discount: checkoutDiscount,
        couponCode: appliedCoupon?.code || null,
        items: normalizedItems,
        notes: form.notes.trim(),
        paymentMethod: "Pesapal",
        appBaseUrl: window.location.origin,
      };

      try {
        const backendOrder = await createOrderInBackend(orderData);
        void syncBackendOrders();
        const pesapalResponse = await initiatePesapalPayment(orderData);
        
        if (pesapalResponse.redirect_url) {
          // Store pending order with Pesapal tracking ID
          const pendingOrder = {
            ...orderData,
            ...(backendOrder || {}),
            grade:
              checkoutItemCount === 1
                ? GRADE_INFO[firstItem.grade]?.label || firstItem.grade
                : "Mixed",
            price: checkoutSubtotal,
            discount: checkoutDiscount,
            total: checkoutTotal,
            couponCode: appliedCoupon?.code || null,
            itemCount: checkoutItemCount,
            status: "pending_payment",
            paymentStatus: "pending",
            paymentMethod: "Pesapal",
            pesapalOrderTrackingId: pesapalResponse.order_tracking_id,
            pesapalMerchantReference: pesapalResponse.merchant_reference,
            timestamp: Date.now(),
            courierRef: "",
          };

          // Save pending order
          const updated = [pendingOrder, ...orders];
          await storageApi.set(ORDERS_KEY, JSON.stringify(updated));
          setOrders(updated);

          // Redirect user to Pesapal checkout
          window.location.href = pesapalResponse.redirect_url;
          return;
        } else {
          throw new Error("Failed to get Pesapal payment URL");
        }
      } catch (error) {
        console.error("Pesapal payment error:", error);
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "Failed to initiate Pesapal payment. Please try again or use M-Pesa.",
        }));
        return;
      }
    }

    const firstItem = checkoutItems[0];
    const normalizedItems = checkoutItems.map((item) => ({
      id: item.id,
      brand: item.brand,
      name: item.name,
      spec: item.spec,
      grade: GRADE_INFO[item.grade]?.label || item.grade,
      quantity: item.quantity || 1,
      price: item.price,
      market: item.market,
      image: item.image || "",
    }));

    // Real M-Pesa STK push flow (Daraja)
    if (paymentMethod === "mpesa") {
      if (!isMpesaConfigured()) {
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "M-Pesa is not configured. Please contact support.",
        }));
        return;
      }

      const orderData = {
        id: genRef(),
        customer: form.name.trim(),
        customerEmail: activeUser?.email || "",
        phone: form.phone.trim(),
        location: form.location.trim(),
        product:
          checkoutItemCount === 1
            ? `${firstItem.brand} ${firstItem.name} ${firstItem.spec}`
            : `${checkoutItemCount} items`,
        grade:
          checkoutItemCount === 1
            ? GRADE_INFO[firstItem.grade]?.label || firstItem.grade
            : "Mixed",
        price: checkoutSubtotal,
        discount: checkoutDiscount,
        total: checkoutTotal,
        itemCount: checkoutItemCount,
        items: normalizedItems,
        couponCode: appliedCoupon?.code || null,
        notes: form.notes.trim(),
        paymentMethod: "M-Pesa",
        paymentStatus: "pending",
        status: "pending_payment",
      };

      try {
        const backendOrder = await createOrderInBackend(orderData);
        void syncBackendOrders();

        const mpesaResponse = await initiateMpesaPayment(orderData);
        if (!mpesaResponse.success || !mpesaResponse.checkoutRequestId) {
          throw new Error(mpesaResponse.error || "Failed to initialize M-Pesa STK push");
        }

        const pendingOrder = {
          ...orderData,
          ...(backendOrder || {}),
          mpesaCheckoutRequestId: mpesaResponse.checkoutRequestId,
          mpesaMerchantRequestId: mpesaResponse.merchantRequestId,
          timestamp: Date.now(),
          courierRef: "",
        };

        const pendingOrders = [pendingOrder, ...orders];
        await storageApi.set(ORDERS_KEY, JSON.stringify(pendingOrders));
        setOrders(pendingOrders);

        let latestOrder = pendingOrder;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const statusResponse = await checkMpesaPaymentStatus({
            checkoutRequestId: mpesaResponse.checkoutRequestId,
            reference: orderData.id,
          });

          if (!statusResponse.success || !statusResponse.order) {
            continue;
          }

          latestOrder = {
            ...latestOrder,
            ...statusResponse.order,
            id: statusResponse.order.reference || latestOrder.id,
          };

          const mergedOrders = pendingOrders.map((o) =>
            o.id === pendingOrder.id ? latestOrder : o
          );
          setOrders(mergedOrders);
          await storageApi.set(ORDERS_KEY, JSON.stringify(mergedOrders));

          if (latestOrder.paymentStatus === "paid") {
            setPaying(false);
            setLastOrder(latestOrder);
            if (!selected) clearCart();
            setForm({ name: "", phone: "", location: "", notes: "" });
            setPage("confirm");
            return;
          }

          if (latestOrder.paymentStatus === "failed") {
            setPaying(false);
            setFormErrors((prev) => ({
              ...prev,
              checkout: "M-Pesa payment failed or was cancelled. Please try again.",
            }));
            return;
          }
        }

        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: `STK prompt sent. Approve payment on your phone, then track status with ${orderData.id}.`,
        }));
        return;
      } catch (error) {
        console.error("M-Pesa payment error:", error);
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "Failed to initiate M-Pesa STK push. Please try again.",
        }));
        return;
      }
    }

    const order = {
      id: genRef(),
      customer: form.name.trim(),
      customerEmail: activeUser?.email || "",
      phone: form.phone.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      product:
        checkoutItemCount === 1
          ? `${firstItem.brand} ${firstItem.name} ${firstItem.spec}`
          : `${checkoutItemCount} items`,
      grade:
        checkoutItemCount === 1
          ? GRADE_INFO[firstItem.grade]?.label || firstItem.grade
          : "Mixed",
      price: checkoutSubtotal,
      discount: checkoutDiscount,
      total: checkoutTotal,
      itemCount: checkoutItemCount,
      items: normalizedItems,
      couponCode: appliedCoupon?.code || null,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "M-Pesa",
      timestamp: Date.now(),
      courierRef: ""
    };

    try {
      await createOrderInBackend(order);
      void syncBackendOrders();
    } catch (error) {
      console.warn("Order API unavailable, keeping local order fallback:", error);
    }

    // Reduce stock quantities
    const updatedCatalog = catalog.map(product => {
      const orderItem = checkoutItems.find(item => item.id === product.id);
      if (orderItem) {
        const newQuantity = (product.stockQuantity ?? 10) - (orderItem.quantity || 1);
        const newStockStatus = newQuantity <= 0 ? "out_of_stock" : newQuantity <= 3 ? "low_stock" : "in_stock";
        return { ...product, stockQuantity: Math.max(0, newQuantity), stockStatus: newStockStatus };
      }
      return product;
    });

    setCatalog(updatedCatalog);
    await saveCatalog(updatedCatalog);

    const updated = [order, ...orders];
    await storageApi.set(ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);

    // Send order confirmation email
    if (order.customerEmail) {
      await sendEmailNotification("orderConfirmation", {
        email: order.customerEmail,
        customerName: order.customer,
        orderId: order.id,
        total: order.total,
        itemCount: order.itemCount,
        paymentMethod: order.paymentMethod
      });
    }

    setPaying(false);
    setLastOrder(order);
    if (!selected) clearCart();
    setForm({ name: "", phone: "", location: "", notes: "" });
    setPage("confirm");
  };

  const STATUS_STEPS = [
    { key: "confirmed", label: "Order Confirmed", detail: "Payment received and order created." },
    { key: "sourced", label: "Sourced in Nairobi", detail: "Device reserved from trusted supplier." },
    { key: "photo_sent", label: "Photos Sent", detail: "Live photos shared for your approval." },
    { key: "approved", label: "Approved", detail: "Customer approved the exact device." },
    { key: "dispatched", label: "Dispatched", detail: "Handed to courier for Mombasa delivery." },
    { key: "delivered", label: "Delivered", detail: "Order successfully delivered." },
  ];

  const LEGACY_STATUS_MAP = {
    new: "confirmed",
    sourcing: "sourced",
    inspected: "sourced",
  };

  const normalizeStatus = (status) => {
    if (!status) return "confirmed";
    return LEGACY_STATUS_MAP[status] || status;
  };

  const stepIdx = (status) => STATUS_STEPS.findIndex((s) => s.key === normalizeStatus(status));

  const computeLiveStatus = (order) => {
    const normalized = normalizeStatus(order?.status);
    if (normalized !== "confirmed") return normalized;

    const elapsed = Date.now() - (order?.timestamp || Date.now());
    if (elapsed > 1000 * 60 * 120) return "dispatched";
    if (elapsed > 1000 * 60 * 45) return "approved";
    if (elapsed > 1000 * 60 * 20) return "photo_sent";
    if (elapsed > 1000 * 60 * 8) return "sourced";
    return "confirmed";
  };

  const trackOrder = async () => {
    const normalizedRef = trackRef.trim().toUpperCase();
    if (!normalizedRef) {
      setTrackedOrder(null);
      setTrackError("Enter an order reference.");
      return;
    }

    try {
      const order = await fetchTrackedOrderFromBackend(normalizedRef);
      if (order) {
        setTrackedOrder(order);
        setTrackError("");
        return;
      }
    } catch (error) {
      console.warn("Tracking API unavailable, checking local orders:", error);
    }

    const found = orders.find((o) => o.id.toLowerCase() === normalizedRef.toLowerCase());
    if (found) {
      setTrackedOrder(found);
      setTrackError("");
    } else {
      setTrackedOrder(null);
      setTrackError("Order not found. Check your reference number.");
    }
  };

  const handleNewsletterSignup = () => {
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMsg("Enter a valid email address.");
      return;
    }
    setNewsletterMsg("Asante! You are now subscribed for hot drops.");
    setNewsletterEmail("");
  };

  const openAuth = async (mode = "signin") => {
    // Ensure users always see auth choices instead of being silently reused.
    try {
      if (window.Clerk?.session && window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } catch {
      // Ignore sign-out errors and continue to auth screen.
    }

    setAuthErrors({});
    setAuthMsg("");
    setAuthMode(mode);
    setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
    setPage("auth");
  };

  const signOut = async () => {
    setCurrentUser(null);
    setBackendOrders(null);
    try {
      if (window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } catch {
      // Continue with local/supabase sign-out cleanup.
    }
    await authSignOut();
    setPage("home");
  };

  const saveProfileData = async (nextData, successMessage = "Profile saved.") => {
    if (!activeUser?.email) {
      setProfileMsg("Sign in to save profile changes.");
      return;
    }

    setProfileSaving(true);
    try {
      const key = activeUser.email.toLowerCase();
      const normalizedProfile = normalizeProfileData(nextData, activeUser);
      const stored = await storageApi.get(PROFILES_KEY);
      const allProfiles = stored?.value ? JSON.parse(stored.value) : {};
      let persistedProfile = normalizedProfile;

      try {
        const backendProfile = await saveProfileToBackend(normalizedProfile);
        if (backendProfile) {
          persistedProfile = normalizeProfileData(backendProfile, activeUser);
        }
      } catch (error) {
        console.warn("Profile API unavailable, saving locally:", error);
      }

      allProfiles[key] = {
        ...persistedProfile,
        email: activeUser.email,
        cards: Array.isArray(persistedProfile.cards) ? persistedProfile.cards : [],
      };
      await storageApi.set(PROFILES_KEY, JSON.stringify(allProfiles));
      setProfileData(allProfiles[key]);
      setCurrentUser((prev) => (prev ? { ...prev, name: allProfiles[key].fullName || prev.name } : prev));
      setProfileMsg(successMessage);
    } catch {
      setProfileMsg("We could not save your profile right now. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfilePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMsg("Please select an image file for your profile picture.");
      return;
    }

    if (file.size > 500 * 1024) {
      setProfileMsg("Image must be under 500 KB. Please resize or choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileData((prev) => ({ ...prev, profilePicture: String(reader.result || "") }));
      setProfileMsg("Profile photo ready. Save profile to keep it.");
    };
    reader.readAsDataURL(file);
  };

  const addProfileCard = () => {
    const digits = cardDraft.number.replace(/\D/g, "");
    if (cardDraft.holder.trim().length < 3) {
      setProfileMsg("Card holder name is required.");
      return;
    }
    if (digits.length < 12) {
      setProfileMsg("Enter a valid card number.");
      return;
    }
    if (!cardDraft.expMonth || !cardDraft.expYear) {
      setProfileMsg("Card expiry month and year are required.");
      return;
    }

    const card = {
      id: `card-${Date.now()}`,
      brand: detectCardBrand(digits),
      holder: cardDraft.holder.trim(),
      last4: digits.slice(-4),
      expMonth: cardDraft.expMonth,
      expYear: cardDraft.expYear,
    };

    setProfileData((prev) => ({
      ...prev,
      cards: [...(prev.cards || []), card],
      defaultCardId: prev.defaultCardId || card.id,
    }));
    setCardDraft({ holder: "", number: "", expMonth: "", expYear: "" });
    setProfileMsg("Card added. Save payment settings to keep it.");
  };

  const removeProfileCard = (cardId) => {
    setProfileData((prev) => {
      const remaining = (prev.cards || []).filter((c) => c.id !== cardId);
      return {
        ...prev,
        cards: remaining,
        defaultCardId: prev.defaultCardId === cardId ? (remaining[0]?.id || "") : prev.defaultCardId,
      };
    });
    setProfileMsg("Card removed. Save payment settings to keep changes.");
  };

  const addProfileAddress = () => {
    if (!addressDraft.label.trim() || !addressDraft.addressLine.trim() || !addressDraft.town.trim()) {
      setProfileMsg("Add a label, town, and address line for the new address.");
      return;
    }

    const nextAddress = {
      ...createDefaultAddress(activeUser),
      ...addressDraft,
      id: `addr-${Date.now()}`,
    };

    setProfileData((prev) => {
      const addresses = [...(prev.addresses || []), nextAddress];
      return {
        ...prev,
        addresses,
        defaultAddressId: prev.defaultAddressId || nextAddress.id,
      };
    });
    setAddressDraft(createDefaultAddress(activeUser));
    setProfileMsg("Address added. Save profile to keep it.");
  };

  const updateProfileAddress = (addressId, field, value) => {
    setProfileData((prev) => {
      const addresses = (prev.addresses || []).map((address) =>
        address.id === addressId ? { ...address, [field]: value } : address
      );
      const defaultAddress = addresses.find((address) => address.id === prev.defaultAddressId) || addresses[0] || createDefaultAddress(activeUser);
      return {
        ...prev,
        addresses,
        county: defaultAddress.county || prev.county,
        town: defaultAddress.town || prev.town,
        addressLine: defaultAddress.addressLine || prev.addressLine,
        landmark: defaultAddress.landmark || prev.landmark,
      };
    });
  };

  const setDefaultProfileAddress = (addressId) => {
    setProfileData((prev) => {
      const defaultAddress = (prev.addresses || []).find((address) => address.id === addressId);
      if (!defaultAddress) return prev;
      return {
        ...prev,
        defaultAddressId: addressId,
        county: defaultAddress.county || prev.county,
        town: defaultAddress.town || prev.town,
        addressLine: defaultAddress.addressLine || prev.addressLine,
        landmark: defaultAddress.landmark || prev.landmark,
      };
    });
    setProfileMsg("Default address updated. Save profile to keep it.");
  };

  const removeProfileAddress = (addressId) => {
    setProfileData((prev) => {
      const remaining = (prev.addresses || []).filter((address) => address.id !== addressId);
      const fallbackAddress = remaining[0] || createDefaultAddress(activeUser);
      return {
        ...prev,
        addresses: remaining.length > 0 ? remaining : [fallbackAddress],
        defaultAddressId: prev.defaultAddressId === addressId ? fallbackAddress.id : prev.defaultAddressId,
        county: fallbackAddress.county || "Mombasa",
        town: fallbackAddress.town || "",
        addressLine: fallbackAddress.addressLine || "",
        landmark: fallbackAddress.landmark || "",
      };
    });
    setProfileMsg("Address removed. Save profile to keep changes.");
  };

  const openSecurityCenter = () => {
    if (window.Clerk?.openUserProfile) {
      window.Clerk.openUserProfile();
      return;
    }
    setProfileMsg("Security settings are handled by Clerk and will open when available.");
  };

  const submitAuth = async () => {
    const nextErrors = {};
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const name = authForm.name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (authMode === "signup" && name.length < 2) nextErrors.name = "Enter your full name.";
    if (authMode === "signup" && password !== authForm.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    if (Object.keys(nextErrors).length > 0) {
      setAuthErrors(nextErrors);
      return;
    }

    if (!window.Clerk?.client) {
      setAuthMsg("Authentication service is not ready. Please refresh the page.");
      return;
    }

    setAuthErrors({});
    setAuthPending(true);
    setAuthMsg("");

    try {
      if (authMode === "signin") {
        const result = await window.Clerk.client.signIn.create({ identifier: email, password });
        if (result.status === "complete") {
          await window.Clerk.setActive({ session: result.createdSessionId });
          const cu = window.Clerk.user;
          if (cu) {
            setCurrentUser({
              name: cu.firstName || cu.fullName || email.split("@")[0],
              email: cu.primaryEmailAddress?.emailAddress || email,
              isAdmin: Boolean(cu.publicMetadata?.isAdmin),
            });
          }
          setPage("home");
        } else {
          setAuthMsg("Additional verification required. Please check your email.");
        }
      } else {
        const [firstName, ...rest] = name.split(" ");
        const result = await window.Clerk.client.signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName: rest.join(" ") || "",
        });
        if (result.status === "complete") {
          await window.Clerk.setActive({ session: result.createdSessionId });
          setCurrentUser({ name, email, isAdmin: false });
          setPage("home");
        } else {
          setAuthMsg("Account created! Check your email to verify it, then sign in.");
          setAuthMode("signin");
          setAuthForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
        }
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Authentication failed. Please try again.";
      setAuthMsg(msg);
    } finally {
      setAuthPending(false);
    }
  };

  const requestPasswordReset = async () => {
    const email = authForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthErrors({ email: "Enter your email address first." });
      return;
    }
    if (!window.Clerk?.client) {
      setAuthMsg("Authentication service is not ready. Please refresh the page.");
      return;
    }
    setAuthPending(true);
    setAuthMsg("");
    try {
      await window.Clerk.client.signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setAuthMsg("Password reset email sent - check your inbox and follow the link.");
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || "Could not send reset email. Please try again.";
      setAuthMsg(msg);
    } finally {
      setAuthPending(false);
    }
  };

  const signInWithSocial = async (strategy) => {
    if (!window.Clerk?.client?.signIn) {
      setAuthMsg("Authentication service is not ready. Please refresh the page.");
      return;
    }

    setAuthPending(true);
    setAuthMsg("");
    setAuthErrors({});

    try {
      await window.Clerk.client.signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: `${window.location.origin}/auth?mode=${authMode}`,
        redirectUrlComplete: `${window.location.origin}/`,
      });
    } catch (err) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Social sign-in failed. Please try again.";
      setAuthMsg(msg);
      setAuthPending(false);
    }
  };

  const loadSystemStatus = async () => {
    setSystemStatusLoading(true);
    setSystemStatusError("");
    try {
      const [healthRes, readyRes, preflightRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/health`, { headers: { Accept: "application/json" } }),
        fetch(`${API_BASE_URL}/api/health/ready`, { headers: { Accept: "application/json" } }),
        fetch(`${API_BASE_URL}/api/preflight`, { headers: { Accept: "application/json" } }),
      ]);

      const [healthData, readyData, preflightData] = await Promise.all([
        healthRes.json().catch(() => ({})),
        readyRes.json().catch(() => ({})),
        preflightRes.json().catch(() => ({})),
      ]);
      const checks = {
        ...(healthData?.checks || {}),
        ...(readyData?.checks || {}),
        ...(preflightData?.checks || {}),
      };

      const preflightRows = Array.isArray(preflightData?.rows) ? preflightData.rows : [];
      const missingKeys = Array.isArray(preflightData?.missingRequired)
        ? preflightData.missingRequired
        : Object.entries(checks)
            .filter(([, ok]) => !ok)
            .map(([key]) => key);

      setSystemStatus({
        apiOk: Boolean(healthRes.ok && healthData?.ok),
        ready: Boolean(readyRes.ok && readyData?.ok && preflightData?.ok),
        checks,
        missingKeys,
        preflightRows,
        envMode: preflightData?.envMode || "auto",
        message: readyData?.message || "",
      });
    } catch (error) {
      setSystemStatus(null);
      setSystemStatusError(error?.message || "Could not load backend status.");
    } finally {
      setSystemStatusLoading(false);
    }
  };

  const openInfoPage = (title, summary, points = []) => {
    setInfoPage({ title, summary, points });
    setPage("info");
  };

  const handleFooterLink = (item) => {
    if (item === "Track order") {
      setTrackedOrder(null);
      setTrackRef("");
      setPage("track");
      return;
    }
    if (item === "Trade-in") {
      setSortBy("saving");
      setCategory("all");
      setPage("products");
      return;
    }
    if (item === "About Nafuu Mart") {
      setPage("about");
      return;
    }
    if (item === "Tech Journal") {
      openInfoPage("Tech Journal", "Weekly guides and market updates from the Nafuu team.", [
        "Best laptop picks by budget",
        "Phone buying guide for Kenya",
        "How to verify genuine accessories",
      ]);
      return;
    }

    const docs = {
      "About Nafuu Mart": ["About Nafuu Mart", "Nafuu delivers authentic Nairobi market prices to Mombasa with full transparency and next-day delivery. We bridge the coast-capital price gap by sourcing direct from trusted Nairobi agents.", ["Buy-to-order ensures zero old stock", "Live photo approval before dispatch shows genuine condition", "Transparent grading: New (unopened), Grade A (original box, minimal use), Grade B (no box, full function)"]],
      "Contact us": ["Contact us", "Reach the Nafuu Mombasa team Monday-Friday 8 AM-8 PM EAT. For urgent orders outside support hours, leave a message.", ["WhatsApp Business: +254 7XX XXX XXX (responds 30 mins)", "Email: support@nafuumart.co.ke", "In-app chat during support hours"]],
      "Help Center": ["Help Center", "Answers to Kenyan customer questions on M-Pesa payment, STK push, tracking, and returns.", ["Step 1: Search products and confirm specs. Step 2: Add to cart and check savings. Step 3: Proceed to checkout.", "Step 4: Enter name, phone (07X format), Mombasa location. Step 5: Approve M-Pesa STK, complete payment.", "Track with reference NFU-XXXXX. Once sourced (1-2h), you receive live photos. Approve, then dispatch same-day."]],
      "Shipping": ["Shipping", "Mombasa-bound orders placed before 12 noon are dispatched same-day via Buscar courier. Doorstep delivery by next morning.", ["Nairobi stock confirmed by 1 PM same-day", "Overnight courier: freezer box + tracking number provided", "Mombasa delivery: 8 AM-2 PM next business day with customer contact"]],
      "Returns and refunds": ["Returns and refunds", "If delivered item doesn't match the approval photos or condition, Nafuu issues a full refund within 2 business days.", ["Condition mismatch: Contact support within 24 hours with photos, full refund issued", "Wrong item (rare): Priority return and replacement at no cost", "Damage in transit: Documented before handover; Nafuu covers via courier insurance"]],
      "Terms of service": ["Nafuu Mart Terms of Service", "These Terms govern your use of Nafuu Mart's platform and purchase of products. By placing an order, you agree to these Terms, our Privacy Policy, and Kenya's Consumer Protection Act, 2012.", [
        "1. WHO WE ARE: Nafuu Mart Ltd operates an e-commerce platform connecting Mombasa buyers with Nairobi-sourced electronics at transparent prices. We are registered in Kenya and operate under Kenyan law.",
        "2. DEFINITIONS: 'Platform' means this website/app. 'Product(s)' means electronics listed for sale. 'Buyer' means any person 18+ ordering for personal use. 'Order' means confirmed purchase after M-Pesa payment.",
        "3. ACCEPTANCE: By using Nafuu, you confirm you are 18+, have legal capacity to contract, accept these Terms, and will provide accurate information (name, phone, delivery address).",
        "4. SERVICES WE OFFER: Product sourcing from Nairobi agents, live photo approval before dispatch, M-Pesa payment processing, overnight courier delivery to Mombasa, order tracking, customer support Mon-Fri 8AM-8PM EAT.",
        "5. HOW TO ORDER: Browse products -> Add to cart -> Enter delivery details -> Pay via M-Pesa STK push. We source within 1-2 hours, send live photos for approval, then dispatch same-day if confirmed before 12 noon.",
        "6. PAYMENT TERMS: Full upfront payment required via M-Pesa. No cash-on-delivery. Payment authorization held until we confirm stock availability. If item unavailable within 24 hours, full refund issued automatically.",
        "7. DELIVERY: Orders confirmed before 12 noon dispatch same-day via Buscar courier. Delivery next business day 8AM-2PM to your Mombasa address. You must be available to receive or designate someone. Risk passes to you upon delivery.",
        "8. PRICING: All prices in KES, inclusive of VAT where applicable. Prices may change without notice but confirmed orders honor the agreed price. We reserve right to cancel orders with obvious pricing errors and provide full refund.",
        "9. RETURNS: 7-day return window from delivery date. Returns accepted if: (a) item doesn't match approval photos, (b) wrong item delivered, or (c) damage in transit. Contact support within 24 hours with photos. Return shipping at our cost for our errors; your cost if you changed your mind.",
        "10. REFUNDS: Full refund within 2 business days to your M-Pesa if: item unavailable, wrong/damaged item, or condition mismatch. Refunds exclude shipping if you changed your mind. No refunds on opened software or accessories where seal is broken.",
        "11. WARRANTIES: All products carry our 12-month quality promise covering manufacturing defects. Grade A/B items inspected and certified functional. New items carry manufacturer warranty where applicable. Warranty doesn't cover misuse, drops, water damage, or unauthorized repairs.",
        "12. PRODUCT GRADING: 'New' = unopened, factory sealed. 'Grade A' = original box, minimal cosmetic wear, full function. 'Grade B' = no box, visible wear, full function. All grades tested and approved before dispatch.",
        "13. PHOTO APPROVAL: Once we source your item, you receive live photos showing actual condition. You have 2 hours to approve or request alternative. Approval is binding and confirms you accept the item as shown.",
        "14. USER OBLIGATIONS: Provide accurate info, use platform lawfully, don't create multiple accounts, keep login credentials secure, don't resell products commercially without written permission, respond promptly to photo approvals.",
        "15. INTELLECTUAL PROPERTY: All content, logos, designs on this platform are owned by Nafuu Mart Ltd and protected under Kenyan IP law. You may not copy, scrape, or reproduce without written consent.",
        "16. LIABILITY: We are not liable for: delays beyond our control (strikes, weather, customs), M-Pesa system downtime, courier delays on public holidays, minor cosmetic differences in Grade A/B items, data loss from your device. Max liability limited to order value.",
        "17. DATA PROTECTION: We comply with Kenya Data Protection Act, 2019. We collect only necessary data (name, phone, address, payment ref) to fulfill orders. We don't sell your data. See Privacy Policy for details. You have right to access, correct, or delete your data.",
        "18. DISPUTE RESOLUTION: Governed by laws of Kenya. Disputes resolved through: (1) Direct contact with support@nafuumart.co.ke, (2) Mediation at our Mombasa office, (3) Kenya Small Claims Court (for claims under KES 1,000,000), (4) High Court of Kenya for larger claims.",
        "19. ACCOUNT CLOSURE: You may close your account anytime via email. We may close accounts for: Terms violations, fraudulent activity, or with 30 days notice. You remain liable for outstanding orders after closure.",
        "20. MODIFICATIONS: We may update these Terms with notice on the platform. Continued use after changes means acceptance. Material changes notified via email/SMS 7 days before taking effect.",
        "21. CONTACT: Questions? Email support@nafuumart.co.ke, WhatsApp +254 7XX XXX XXX (Mon-Fri 8AM-8PM), or visit our Help Center. Physical address: [Mombasa Office Address], Kenya.",
        "22. SEVERABILITY: If any provision is unenforceable, remaining Terms stay valid. No waiver of any Term unless in writing. These Terms constitute entire agreement between you and Nafuu Mart Ltd.",
        "Last updated: March 2026. Nafuu Mart Ltd, registered in Kenya."
      ]],
      "Trade-in terms": ["Nafuu Mart Trade-in Terms", "These Trade-in Terms apply when you exchange your current device for Nafuu credit or a direct discount on a new purchase. By submitting a trade-in request, you agree to the inspection and valuation process below.", [
        "1. ELIGIBILITY: Trade-in is available for phones, tablets, laptops, and select accessories accepted by Nafuu. Device must be legally owned by you, unlocked from iCloud/Google/MDM, and free from finance or carrier lock where applicable.",
        "2. QUOTE VALIDITY: Instant or manual quotes are estimates valid for 48 hours unless otherwise stated. Final value is confirmed only after physical inspection.",
        "3. CONDITION REQUIREMENTS: You must disclose device model, storage, battery health (if known), screen/body condition, and known defects. Missing disclosures may reduce final value.",
        "4. DATA AND RESET: Before handover, back up your data and perform factory reset. Remove all accounts and passcodes. Nafuu is not responsible for data remaining on devices submitted without reset.",
        "5. INSPECTION PROCESS: Device is inspected for power-on status, display quality, battery, ports, cameras, sensors, and tamper indicators. We may open service menus to verify authenticity and component health.",
        "6. FINAL VALUATION: If actual condition differs from submitted details, we issue an updated valuation. You may accept revised value or request return of the device.",
        "7. REJECTED DEVICES: Nafuu may reject devices that are counterfeit, blacklisted, reported stolen, heavily modified, or unsafe (for example swollen battery). Rejected devices are returned or handled per legal requirements.",
        "8. CREDIT APPLICATION: Accepted trade-in value can be applied as checkout discount, wallet credit, or M-Pesa payout where offered. Wallet credit is non-transferable and linked to your Nafuu account.",
        "9. PAYOUT TIMELINE: Where M-Pesa payout is selected and approved, payment is processed within 2 business days after inspection and acceptance.",
        "10. CANCELLATION AND RETURN: If you decline revised valuation, we return the device to your provided address. Return courier costs may apply unless the mismatch is due to our inspection error.",
        "11. OWNERSHIP TRANSFER: On acceptance of final valuation, ownership transfers to Nafuu and submitted devices are non-returnable except where required by Kenyan law.",
        "12. FRAUD AND ILLEGAL PROPERTY: If a device appears stolen, tampered, or linked to unlawful activity, Nafuu may hold the device and report to relevant authorities under applicable law.",
        "13. LIABILITY LIMIT: Nafuu's liability for trade-in processing is limited to the agreed final valuation amount for that device.",
        "14. GOVERNING LAW: These Trade-in Terms are governed by the laws of Kenya and read together with the main Nafuu Terms of Service and Privacy Policy.",
        "Last updated: March 2026."
      ]],
      "Privacy policy": ["Nafuu Mart Privacy Policy", "This Privacy Policy explains what personal data we collect, how we use it, who we share it with, and your rights under the Kenya Data Protection Act, 2019.", [
        "1. DATA CONTROLLER: Nafuu Mart Ltd is the data controller for data collected through our website, mobile channels, and customer support interactions.",
        "2. DATA WE COLLECT: Identity and contact data (name, phone, email), order data (items, amounts, references), delivery data (address and receiver details), and support records.",
        "3. PAYMENT DATA: M-Pesa confirmations and reference metadata are stored for reconciliation and fraud prevention. We do not store your M-Pesa PIN.",
        "4. DEVICE AND USAGE DATA: We collect limited technical data such as IP address, browser type, pages visited, and session timestamps to secure and improve the platform.",
        "5. WHY WE PROCESS DATA: We process data to fulfill orders, provide support, send transactional updates, prevent fraud, comply with legal obligations, and improve service quality.",
        "6. LEGAL BASIS: Processing is based on contract performance, legal compliance, legitimate interest (platform security and quality), and consent where required.",
        "7. DATA SHARING: We share only necessary data with logistics providers, payment processors, and service partners strictly for order fulfillment and platform operations.",
        "8. MARKETING COMMUNICATIONS: Promotional messages are optional. You may opt out anytime via account settings, unsubscribe links, or support channels.",
        "9. RETENTION: Order and accounting records are retained as required by law and internal policy. Non-essential records are deleted or anonymized when no longer needed.",
        "10. YOUR RIGHTS: Subject to law, you may request access, correction, deletion, restriction, objection, and portability of your personal data.",
        "11. CHILDREN'S DATA: Our services are intended for users 18 years and above. We do not knowingly collect children's data for independent use of the platform.",
        "12. SECURITY CONTROLS: We apply technical and organizational safeguards including role-based access, encrypted transport, and controlled retention workflows.",
        "13. CROSS-BORDER PROCESSING: Where service tools process limited data outside Kenya, we apply contractual and operational safeguards consistent with applicable law.",
        "14. CONTACT AND COMPLAINTS: Privacy requests can be sent to support@nafuumart.co.ke. You may also lodge complaints with the Office of the Data Protection Commissioner (Kenya).",
        "15. POLICY UPDATES: Material changes are published on this page with an updated revision date.",
        "Last updated: March 2026."
      ]],
      "Cookie policy": ["Nafuu Mart Cookie Policy", "This Cookie Policy explains how Nafuu uses cookies and similar technologies to keep the site secure, improve performance, and provide a smoother shopping experience.", [
        "1. WHAT COOKIES ARE: Cookies are small text files saved on your browser that help websites remember settings and activity.",
        "2. ESSENTIAL COOKIES: Required for core functions such as cart state, login session continuity, security checks, and order flow integrity.",
        "3. FUNCTIONAL COOKIES: Remember preferences like viewed categories, preferred region, and interface settings for a faster repeat experience.",
        "4. PERFORMANCE COOKIES: Collect aggregated traffic and interaction metrics to help us improve navigation, page speed, and product discovery.",
        "5. FRAUD AND SECURITY TAGS: Used to detect unusual behavior, prevent abuse, and protect customer accounts and payment workflows.",
        "6. THIRD-PARTY TECHNOLOGIES: Some analytics or embedded services may place limited cookies under strict contractual controls.",
        "7. CONSENT CHOICES: Non-essential cookies can be accepted, declined, or changed from your browser settings and future cookie preference tools.",
        "8. COOKIE DURATION: Some cookies expire when your session ends; others persist for defined periods to remember preferences.",
        "9. MANAGING COOKIES: You can clear or block cookies from browser settings, but some features (cart/session) may not work correctly.",
        "10. DO-NOT-TRACK: Browser DNT signals are considered where technically supported, but not all systems interpret DNT identically.",
        "11. POLICY CHANGES: We may update this policy as features evolve and will post changes with a revised date.",
        "Last updated: March 2026."
      ]],
      "Gift Cards": ["Gift Cards", "Send tech gifts to friends, family, and colleagues across Mombasa. Redeemable instantly on any product.", ["Physical card (Nairobi pickup) or digital code (instant email)", "KES 5,000 to KES 100,000 denominations", "Bulk corporate gifting for schools, SMEs, teams: contact support@nafuumart.co.ke"]],
      "Compare devices": ["Compare devices", "Side-by-side specs, prices, and Nafuu savings. Find the best device for your needs before ordering.", ["CPU, RAM, storage, battery, screen size, weight side-by-side", "Nafuu price vs Mombasa retail: see your exact savings", "Grade comparison: New vs Grade A vs Grade B condition and price difference"]],
      "Nafuu for Business": ["Nafuu for Business", "Bulk sourcing for schools, offices, NGOs, and retail shops. Fixed pricing, priority sourcing, dedicated support.", ["Bulk discount on 5+ units of same device", "Invoicing and payment terms (net 30 for registered businesses)", "Priority agent: dedicated WhatsApp line, sourcing within 4 hours"]],
      "Data protection (Kenya DPA)": ["Data Protection (Kenya DPA)", "Nafuu's data handling program is aligned with Kenya's Data Protection Act, 2019. This section summarizes our data governance controls and your rights as a data subject.", [
        "1. FAIR AND LAWFUL PROCESSING: Personal data is processed for clear and lawful purposes communicated at collection.",
        "2. DATA MINIMIZATION: We only collect data required to verify orders, complete delivery, support after-sales service, and comply with statutory duties.",
        "3. PURPOSE LIMITATION: Data collected for order fulfillment is not reused for unrelated purposes without proper legal basis or consent.",
        "4. ACCURACY: Customers can update details through support channels to ensure records remain accurate and current.",
        "5. STORAGE LIMITATION: Personal data is retained only for legitimate business and legal periods, then deleted or anonymized.",
        "6. SECURITY SAFEGUARDS: Access controls, encryption in transit, logging, and internal approvals reduce unauthorized use or disclosure.",
        "7. PROCESSOR MANAGEMENT: Vendors handling personal data are assessed, contractually bound, and monitored for compliance.",
        "8. INCIDENT RESPONSE: Suspected data incidents are investigated promptly with mitigation, documentation, and notifications where required.",
        "9. DATA SUBJECT RIGHTS: You may request access, correction, deletion, objection, or processing restriction by contacting support@nafuumart.co.ke.",
        "10. COMPLAINT ESCALATION: Unresolved privacy concerns may be escalated to the Office of the Data Protection Commissioner in Kenya.",
        "11. ACCOUNTABILITY: Nafuu maintains internal records and governance practices to demonstrate ongoing compliance.",
        "Last updated: March 2026."
      ]],
      "Report illicit content": ["Report Illicit Content", "Nafuu prohibits listings, messages, and activity that involve unlawful, harmful, or prohibited content. This page explains what to report and how we respond.", [
        "1. WHAT TO REPORT: Suspected counterfeit products, stolen devices, fraudulent listings, illegal software, harmful instructions, harassment, impersonation, and rights-infringing content.",
        "2. HOW TO REPORT: Send details to support@nafuumart.co.ke with order/listing reference, screenshots, and a short description of concern.",
        "3. URGENT SAFETY CASES: If there is immediate risk to people or property, contact local authorities first, then share incident reference with Nafuu.",
        "4. REVIEW PROCESS: Reports are triaged by trust and support teams. We may temporarily restrict listings or accounts while investigating.",
        "5. EVIDENCE CHECK: We assess metadata, account history, sourcing records, and communications to verify the report objectively.",
        "6. POSSIBLE ACTIONS: Content removal, listing suppression, account warnings, account suspension, payment hold, or permanent account closure.",
        "7. LAW ENFORCEMENT COOPERATION: Where legally required, Nafuu may preserve evidence and cooperate with competent authorities.",
        "8. FALSE REPORTING: Intentionally false or malicious reports may lead to account restrictions.",
        "9. STATUS UPDATES: We share outcome updates where appropriate, subject to privacy and legal constraints.",
        "10. APPEALS: Affected users may submit additional context for reconsideration within 7 days of enforcement notice.",
        "11. POLICY ALIGNMENT: This process works alongside our Terms of Service, Privacy Policy, and Kenyan legal obligations.",
        "Last updated: March 2026."
      ]],
    };

    if (docs[item]) {
      const [title, summary, points] = docs[item];
      openInfoPage(title, summary, points);
      return;
    }

    openInfoPage(item, `This ${item.toLowerCase()} section is being prepared for launch.`, [
      "Content will be available soon",
      "Core shopping and tracking are already live",
      "Contact support for immediate help",
    ]);
  };

  const Nav = () => {
    const compact = viewportWidth < 900;
    const hasActiveSession = Boolean(activeUser?.email || window.Clerk?.user?.id);
    const rail = [
      { key: "hot", label: "Great Deals", action: () => { setCategory("all"); setSortBy("saving"); setPage("products"); } },
      ...CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
        key: c.key,
        label: c.label,
        action: () => { setCategory(c.key); setPage("products"); },
      })),
      ...(activeUser?.isAdmin ? [{ key: "admin", label: "Admin", action: () => setPage("admin") }] : []),
      ...(activeUser ? [{ key: "my-orders", label: "My Orders", action: () => setPage("my-orders") }] : []),
      ...(activeUser ? [{ key: "profile", label: "Profile", action: () => setPage("profile") }] : []),
      { key: "blog", label: "Tech Journal", action: () => setPage("blog") },
      { key: "support", label: "Customer Care", action: () => { setPage("track"); setTrackedOrder(null); } },
      { key: "track", label: "Track Order", action: () => { setPage("track"); setTrackedOrder(null); } },
    ];

    return (
      <nav style={{ position: "sticky", top: 0, zIndex: 120, background: "rgba(247,247,242,.96)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        {clerkModeMisconfigured && (
          <div style={{ background: "#fff4e5", borderBottom: "1px solid #f5d6a5" }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "8px 20px", color: "#8a5a00", fontSize: 12, fontWeight: 700 }}>
              Clerk mode is enabled but VITE_CLERK_PUBLISHABLE_KEY is missing. Add it to your env to restore sign-in.
            </div>
          </div>
        )}
        {!compact && (
          <div style={{ borderBottom: "1px solid var(--line)", background: "#f5f5f3" }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40, padding: "0 20px" }}>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <button onClick={() => setPage("home")} style={topLink}>The Nafuu Promise</button>
                <button onClick={() => { setPage("products"); setSearch("warranty"); }} style={topLink}>Repair & Care</button>
                <button onClick={() => { setPage("products"); setSortBy("saving"); }} style={topLink}>End Fast Tech</button>
                <button onClick={() => setPage("blog")} style={topLink}>Tech Journal</button>
              </div>
              <button style={{ ...topLink, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>KSH KE</button>
            </div>
          </div>
        )}

        <div style={{ borderBottom: "1px solid var(--line)", background: "#fafaf9" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: compact ? "1fr" : "auto 1fr auto", gap: 16, alignItems: "center", padding: "14px 20px" }}>
            <button onClick={() => { setPage("home"); setSearch(""); setCategory("all"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifySelf: compact ? "start" : "auto" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--ink)", color: "var(--sun)", fontWeight: 800, display: "grid", placeItems: "center", fontSize: 18 }}>N</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>Nafuu Mart</div>
                {!compact && <div style={{ fontSize: 9, letterSpacing: 1.3, color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>BEI NAFUU. MLANGONI MWAKO.</div>}
              </div>
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(navSearch);
              }}
              style={{ width: "100%", display: "grid", gridTemplateColumns: viewportWidth < 520 ? "1fr" : "1fr auto", gap: 8, background: "#fff", borderRadius: 14, border: "1px solid var(--line)", padding: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <div style={{ width: "100%", display: "flex", alignItems: "center", minHeight: 44, padding: "0 10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, marginRight: 10, flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  value={navSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNavSearch(value);
                    if (page === "products") setSearch(value);
                  }}
                  placeholder="Search for a laptop, phone, or audio..."
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }}
                />
              </div>
              <button type="submit" style={{ border: "none", background: "var(--ink)", color: "#fff", borderRadius: 10, minHeight: 44, padding: "0 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .2s ease" }}>
                Search
              </button>
            </form>

            <div style={{ display: "flex", gap: 10, alignItems: "center", justifySelf: compact ? "start" : "end", position: "relative" }}>
              {activeUser?.isAdmin && <button onClick={() => setPage("admin")} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>Admin</button>}
              {hasActiveSession && <button onClick={() => setPage("my-orders")} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>My Orders</button>}
              {hasActiveSession && <button onClick={() => setPage("profile")} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>Profile</button>}
              <button onClick={() => { setPage("products"); setSortBy("saving"); }} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>Deals</button>
              <button onClick={() => { setPage("products"); setSortBy("saving"); }} style={actionBtn}>Trade-in</button>
              <button onClick={() => { setPage("track"); setTrackedOrder(null); }} style={{ ...actionBtn, display: compact ? "none" : "flex", alignItems: "center", gap: 6 }}>Need help?</button>
              <button
                onClick={hasActiveSession ? signOut : () => openAuth("signin")}
                style={{ ...iconBtn, minWidth: 44, minHeight: 44 }}
                title={hasActiveSession ? "Sign out" : "Sign in"}
                aria-label={hasActiveSession ? "Sign out" : "Sign in"}
              >
                {hasActiveSession ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  </svg>
                )}
              </button>
              <button onClick={() => setPage("wishlist")} style={{ ...iconBtn, position: "relative" }} title="Wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {wishlist.length > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--cherry)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>
                    {wishlist.length}
                  </span>
                )}
              </button>
              <button onClick={() => setPage("compare")} style={{ ...iconBtn, position: "relative" }} title="Compare Products">
                <span>CMP</span>
                {compareList.length > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--green)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>
                    {compareList.length}
                  </span>
                )}
              </button>
              <button onClick={() => setPage("cart")} style={{ ...iconBtn, position: "relative" }} title="Shopping Cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent-dark)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: "#fafaf9", borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px", position: "relative" }}>
            <div style={{ display: "flex", gap: 28, alignItems: "center", overflowX: "auto", minHeight: 50, whiteSpace: "nowrap", scrollbarWidth: "none" }}>
              {rail.map((item) => (
                <button
                  key={item.key}
                  onMouseEnter={() => {
                    if (item.key === "all") setCategoryDropdown(true);
                  }}
                  onClick={item.action}
                  style={{
                    ...topNavItem,
                    color: item.key === category ? "var(--cherry)" : "var(--ink)",
                  }}
                >
                  {item.label}
                </button>
              ))}
              <div
                onMouseEnter={() => setCategoryDropdown(true)}
                onMouseLeave={() => setCategoryDropdown(false)}
                style={{ position: "relative", marginLeft: "auto" }}
              >
                <button style={{ ...topNavItem, display: "flex", alignItems: "center", gap: 6 }}>
                  Browse categories
                  <span style={{ fontSize: 10, transform: categoryDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>v</span>
                </button>
                {categoryDropdown && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: 16, width: compact ? 330 : 560, boxShadow: "0 14px 34px rgba(0,0,0,.14)", display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
                    {CATEGORY_MENU.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setCategory(cat.key);
                          setPage("products");
                          setCategoryDropdown(false);
                        }}
                        style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 10, border: "1px solid #e8e8df", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left", overflow: "hidden" }}
                      >
                        <div style={{ background: cat.color, display: "grid", placeItems: "center", fontSize: 30 }}>{cat.icon}</div>
                        <div style={{ padding: "10px 10px 10px 0" }}>
                          <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{cat.label}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 5 }}>{cat.desc}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{categoryCount(cat.key)} products</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  const Footer = () => (
    <footer style={{ background: "#efefef", borderTop: "1px solid #d8d8d8", marginTop: 32 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "38px 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 980 ? "1fr" : "1.1fr 1.3fr", gap: 20, alignItems: "start", marginBottom: 26 }}>
          <div>
            <h3 style={{ fontSize: viewportWidth < 640 ? 24 : 34, lineHeight: 1.08, marginBottom: 10, color: "#3d3d3d", fontFamily: "'Fraunces',serif", fontWeight: 700 }}>Stay in the loop with hot drops</h3>
            <p style={{ color: "#5a5a5a", fontSize: viewportWidth < 640 ? 14 : 15, lineHeight: 1.6, maxWidth: 520 }}>
              Be first to know about Nairobi-price arrivals, Mombasa delivery updates, and weekly tech deals from trusted Kenyan suppliers.
            </p>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr auto", gap: 10 }}>
              <div style={{ border: "1px solid #bdbdbd", borderRadius: 12, background: "#fff", height: 64, display: "flex", alignItems: "center", padding: "0 14px" }}>
                <input
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterMsg) setNewsletterMsg("");
                  }}
                  placeholder="Email"
                  style={{ flex: 1, border: "none", outline: "none", fontSize: viewportWidth < 640 ? 16 : 18, background: "transparent" }}
                />
                <span style={{ fontSize: 20, color: "#6f6f6f" }}>@</span>
              </div>
              <button onClick={handleNewsletterSignup} style={{ background: "#3d3d3d", color: "#fff", border: "none", borderRadius: 12, padding: "0 22px", height: 64, fontWeight: 700, fontSize: viewportWidth < 640 ? 14 : 15, cursor: "pointer" }}>
                Sign up
              </button>
            </div>
            {newsletterMsg && <p style={{ marginTop: 8, color: newsletterMsg.startsWith("Asante") ? "#0b8f41" : "#b91c1c", fontSize: 13 }}>{newsletterMsg}</p>}
            <button onClick={() => handleFooterLink("Help Center")} style={{ marginTop: 16, border: "none", background: "none", textDecoration: "underline", color: "#1f1f1f", fontWeight: 600, cursor: "pointer", padding: 0 }}>Learn more</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 26, paddingTop: 26, borderTop: "1px solid #d4d4d4" }}>
          <div>
            <h4 style={footerHeading}>About</h4>
            {[
              "About Nafuu Mart",
              "Press",
              "Our impact",
              "Mombasa pickup point",
              "Accessibility",
              "We are hiring",
              "Trustpilot",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {Object.entries(SOCIAL_PLATFORMS).map(([key, social]) => (
                <a 
                  key={key} 
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 999, 
                    border: "1px solid #bdbdbd", 
                    background: "#fff", 
                    fontWeight: 700, 
                    color: "#5d5d5d", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: social.icon.length === 1 ? 16 : 18,
                    textDecoration: "none",
                    transition: "all .2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#999";
                    e.currentTarget.style.color = social.color || "#5d5d5d";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#bdbdbd";
                    e.currentTarget.style.color = "#5d5d5d";
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={footerHeading}>Help</h4>
            {["Contact us", "Help Center", "Shipping", "Returns and refunds", "Track order"].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Services</h4>
            {[
              "1-year warranty",
              "Protection plan",
              "Trade-in",
              "Student program",
              "SME bulk supply",
              "Seller portal",
              "Nafuu for Business",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
            <div style={{ marginTop: 8, fontSize: 13, color: "#444", fontWeight: 700 }}>Payments 100% secured</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {["M-PESA", "Airtel Money", "VISA", "Mastercard", "KCB", "Equity"].map((p) => (
                <span key={p} style={{ border: "1px solid #c6c6c6", borderRadius: 8, padding: "5px 8px", background: "#fff", fontSize: 11, fontWeight: 700, color: "#444" }}>{p}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={footerHeading}>Resources</h4>
            {["Gift Cards", "Tech Journal", "Compare devices", "Gift ideas", "Back to School", "Black Friday"].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Law and order</h4>
            {[
              "Terms of service",
              "Trade-in terms",
              "Cookie policy",
              "Privacy policy",
              "Data protection (Kenya DPA)",
              "Report illicit content",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Certified</h4>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>KEBS</div>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>CAK</div>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>BRS</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #d4d4d4", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#5a5a5a", fontSize: 13 }}>
          <span>© 2026 Nafuu Mart - nafuumart.co.ke</span>
          <span>M-Pesa Paybill Name: Nafuu Mart | Delivering Nairobi prices to Mombasa</span>
        </div>
      </div>
    </footer>
  );

  if (page === "home") {
    return (
      <>
        <PageMeta page="home" />
        <LocalBusinessMeta />
        <style>{G}</style>
        {Nav()}
        <section style={{ color: "var(--ink)", minHeight: 420, display: "flex", alignItems: "center", background: "linear-gradient(135deg, #e8f8ed 0%, #f0f7ff 50%, #fff9f5 100%)", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "radial-gradient(circle at 80% 40%, rgba(107,142,113,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px", width: "100%", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(20px)", transition: "all .7s ease", display: "grid", gridTemplateColumns: viewportWidth < 960 ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center", position: "relative", zIndex: 1 }}>
            {/* Left Content */}
            <div>
              <div style={{ display: "inline-flex", marginBottom: 14, borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", padding: "8px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--accent-dark)" }}>Nairobi Prices to Mombasa</div>
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(32px,6vw,56px)", lineHeight: 1.1, marginBottom: 14, color: "#3d3d3d", fontWeight: 900 }}>Big savings,<br/>zero surprises.</h1>
              <p style={{ maxWidth: 540, color: "#5a5a5a", fontSize: 18, lineHeight: 1.7, marginBottom: 22 }}>The Nairobi price gap, closed. We source, inspect, and deliver to your Mombasa door with live photo approval and guaranteed next-day arrival.</p>
              
              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                <button onClick={() => setPage("products")} style={{ background: "var(--ink)", color: "white", border: "none", borderRadius: 12, padding: "16px 28px", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all .25s ease", boxShadow: "0 8px 20px rgba(61,61,61,0.15)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(61,61,61,0.25)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(61,61,61,0.15)"; }}>Shop Now</button>
                <button onClick={() => handleFooterLink("Tech Journal")} style={{ background: "#fff", color: "var(--ink)", border: "2px solid var(--ink)", borderRadius: 12, padding: "14px 28px", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all .25s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--ink)"; }}>Learn How It Works</button>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(search);
                }}
                style={{ display: "grid", gridTemplateColumns: viewportWidth < 520 ? "1fr" : "1fr auto", gap: 8, background: "#fff", borderRadius: 14, padding: 6, border: "1px solid var(--line)", marginBottom: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              >
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a laptop, phone, or audio..." style={{ minHeight: 44, border: "none", outline: "none", padding: "0 12px", background: "transparent", fontSize: 14 }} />
                <button type="submit" style={{ background: "var(--ink)", color: "white", border: "none", borderRadius: 10, minHeight: 44, padding: "0 18px", fontWeight: 700, cursor: "pointer" }}>Search</button>
              </form>

              {/* Quick Chips */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["HP Elitebook", "iPhone 14", "AirPods Pro", "Samsung Galaxy"].map((chip) => (
                  <button key={chip} onClick={() => { setSearch(chip); setPage("products"); }} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "var(--line)"; }}>Trending: {chip}</button>
                ))}
              </div>
            </div>

            {/* Right: Featured Card */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Top Savings Card */}
              <div style={{ background: "linear-gradient(135deg, #6b8e71 0%, #8ba88f 100%)", borderRadius: 20, padding: "28px 24px", color: "white", boxShadow: "0 12px 32px rgba(107,142,113,0.2)", animation: `fadeUp .7s .2s both` }}>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>AVERAGE SAVINGS</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 48, fontWeight: 900, marginBottom: 4 }}>KES 18,400</div>
                <div style={{ fontSize: 14, opacity: 0.95 }}>Per device vs Mombasa retail</div>
                <div style={{ fontSize: 12, marginTop: 16, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>* 5,200+ happy customers<br/>* Average 42% price drop<br/>* Next-day delivery</div>
              </div>

              {/* Trust Badges */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "CHK", label: "100-point checks", text: "Every device", color: "#f0f7ff" },
                  { icon: "RET", label: "30-day returns", text: "No questions", color: "#fef9f0" },
                  { icon: "IMG", label: "Live photos", text: "Before dispatch", color: "#f5f9f0" },
                  { icon: "⏱️", label: "Next-day delivery", text: "To your door", color: "#fffaf5" },
                ].map((badge, i) => (
                  <div key={badge.label} style={{ background: badge.color, borderRadius: 14, padding: "16px 12px", textAlign: "center", animation: `fadeUp .7s ${.3 + i * 0.08}s both` }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{badge.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3d3d3d", marginBottom: 2 }}>{badge.label}</div>
                    <div style={{ fontSize: 11, color: "#5a5a5a" }}>{badge.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "#fafaf8" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2, marginBottom: 26 }}>Shop by Category</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {CATEGORY_MENU.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategory(cat.key);
                    setPage("products");
                  }}
                  style={{
                    background: cat.color,
                    border: "1px solid transparent",
                    borderRadius: 16,
                    padding: "28px 24px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .25s ease",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{cat.icon}</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 12 }}>
                    {cat.desc}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "var(--accent-dark)", 
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    Browse {categoryCount(cat.key)} products
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={h2}>Why Nafuu?</h2>
            <div style={grid4}>
              {[
                ["Nairobi Prices", "Save KSH 5,000 to 15,000 per laptop in Mombasa."],
                ["Photo Approval", "See your exact unit before dispatch."],
                ["Next-Day Delivery", "Order before noon, receive next day."],
                ["Honest Grading", "Clear Grade A/B condition descriptions."],
              ].map((x) => (
                <div key={x[0]} style={featureCard}><h3 style={h3}>{x[0]}</h3><p style={pMuted}>{x[1]}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={h2}>Hot Drops</h2>
              <button onClick={() => setPage("products")} style={outlineBtn}>View All</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18 }}>
                {catalog.slice(0, 6).map((p, i) => (
                <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} toggleComparison={toggleComparison} isInComparison={isInComparison} toggleStockAlert={toggleStockAlert} hasStockAlert={hasStockAlert} getProductReviews={getProductReviews} getProductAverageRating={getProductAverageRating} />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "#121212", color: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2, color: "white" }}>How it works</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {[
                "1. Search and compare",
                "2. Pay by M-Pesa",
                "3. Approve live photo",
                "4. Agent dispatches",
                "5. Track to delivery",
              ].map((step) => (
                <div key={step} style={{ border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.04)", borderRadius: 14, padding: 16, fontWeight: 700 }}>{step}</div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={h2}>What customers say</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
              {TESTIMONIALS.map((t, i) => (
                <article key={t.name} style={{ ...panel, animation: `fadeUp .45s ${i * 0.08}s both` }}>
                  <div style={{ color: "#f1b400", marginBottom: 8 }}>*****</div>
                  <p style={{ ...pMuted, marginBottom: 10 }}>{t.quote}</p>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{t.item}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "36px 24px", background: "var(--paper)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>As seen in</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              {AS_SEEN_IN.map((name) => (
                <div key={name} style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: "var(--ink-soft)" }}>{name}</div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </>
    );
  }

  if (page === "about") {
    return (
      <>
        <PageMeta page="home" additionalMeta={{ keywords: "about nafuu mart, refurbished electronics kenya, trusted seller nairobi mombasa" }} />
        <LocalBusinessMeta />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage("home")} style={linkBtn}>Back</button>
          
          {/* About Hero */}
          <div style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #efefef 100%)", borderRadius: 16, padding: "48px 32px", marginBottom: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: viewportWidth < 640 ? 28 : 40, fontFamily: "'Fraunces',serif", fontWeight: 900, color: "#1f1f1f", marginBottom: 16 }}>About Nafuu Mart</h1>
            <p style={{ fontSize: 16, color: "#5a5a5a", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
              Connecting Mombasa buyers with Nairobi-priced refurbished electronics since 2024. We deliver transparency, quality, and trust.
            </p>
          </div>

          {/* Mission & Values */}
          <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 32 }}>
            <div style={panel}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f", marginBottom: 12 }}>Our Mission</h2>
              <p style={{ color: "#5a5a5a", lineHeight: 1.8, fontSize: 15 }}>
                To bridge the Nairobi-Mombasa price gap by delivering authentic refurbished electronics at transparent, market-driven prices. Every device undergoes rigorous quality testing and comes with warranty assurance.
              </p>
            </div>
            <div style={panel}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f", marginBottom: 12 }}>Core Values</h2>
              <ul style={{ color: "#5a5a5a", lineHeight: 1.8, fontSize: 15, paddingLeft: 20 }}>
                <li><strong>Transparency:</strong> No hidden fees or surprises</li>
                <li><strong>Quality:</strong> Every device professionally graded</li>
                <li><strong>Trust:</strong> Live photo approval before shipment</li>
                <li><strong>Speed:</strong> Next-day delivery within Kenya</li>
              </ul>
            </div>
          </div>

          {/* Team & Certifications */}
          <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 32 }}>
            <div style={panel}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f", marginBottom: 12 }}>Our Team</h2>
              <p style={{ color: "#5a5a5a", lineHeight: 1.8, fontSize: 15, marginBottom: 12 }}>
                Founded by electronics enthusiasts who saw an opportunity to bring fair pricing and quality refurbished tech to coastal Kenya. Our team brings 50+ years of combined experience in tech retail and logistics.
              </p>
              <p style={{ color: "#5a5a5a", lineHeight: 1.8, fontSize: 15 }}>
                Available via WhatsApp, email, and in-app chat during business hours (Mon�?"Fri 8 AM�?"8 PM EAT).
              </p>
            </div>
            <div style={panel}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f", marginBottom: 12 }}>Certifications</h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
                {["KEBS Certified", "CAK Approved", "BRS Registered"].map((cert) => (
                  <div key={cert} style={{ border: "2px solid #1f1f1f", borderRadius: 8, padding: "12px 16px", textAlign: "center", background: "#fff", fontWeight: 700, fontSize: 12, flex: "0 1 calc(33.33% - 11px)" }}>
                    {cert}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Social & Contact */}
          <div style={panel}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f1f1f", marginBottom: 20 }}>Connect With Us</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 24, lineHeight: 1.7 }}>
              Follow Nafuu Mart on social media for weekly deals, tech tips, and Mombasa delivery updates.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              {Object.entries(SOCIAL_PLATFORMS).map(([key, social]) => (
                <a 
                  key={key}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    border: `2px solid ${social.color}`,
                    borderRadius: 8,
                    background: "#fff",
                    textDecoration: "none",
                    color: social.color,
                    fontWeight: 700,
                    fontSize: 14,
                    transition: "all 0.2s ease",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = social.color;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.color = social.color;
                  }}
                >
                  <span style={{ fontSize: 18 }}>{social.icon}</span>
                  <span>{social.name}</span>
                </a>
              ))}
            </div>

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e5e5e5" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1f1f1f", marginBottom: 16 }}>Direct Contact</h3>
              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>WhatsApp</div>
                  <a href="https://wa.me/254712345678" style={{ fontSize: 15, fontWeight: 700, color: "#1f1f1f", textDecoration: "underline" }}>+254 712 345 678</a>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Email</div>
                  <a href="mailto:info@nafuumart.co.ke" style={{ fontSize: 15, fontWeight: 700, color: "#1f1f1f", textDecoration: "underline" }}>info@nafuumart.co.ke</a>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Location</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#1f1f1f" }}>Nairobi HQ, Mombasa Operations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "products") {
    return (
      <>
        <PageMeta page="products" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={h2}>Shop / Products</h1>
          {isMobileFilters && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setIsFilterOpen(true)} style={{ ...outlineBtn, width: "100%" }}>Open Filters & Sort</button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isMobileFilters ? "1fr" : "minmax(220px,260px) 1fr", gap: 16 }}>
            {!isMobileFilters && (
              <aside style={{ ...panel, height: "fit-content", position: "sticky", top: 82 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Filters</div>
                <label style={filterLabel}>Category</label>
                <div style={chipWrap}>
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCategory(c.key)} style={chipBtn(category === c.key)}>{c.label}</button>
                  ))}
                </div>

                {category !== "all" && subdivisionOptions.length > 0 && (
                  <>
                    <label style={filterLabel}>Subdivision</label>
                    <div style={chipWrap}>
                      <button onClick={() => setBrandSubdivision("all")} style={chipBtn(brandSubdivision === "all")}>All Brands</button>
                      {subdivisionOptions.map((brand) => (
                        <button key={brand} onClick={() => setBrandSubdivision(brand)} style={chipBtn(brandSubdivision === brand)}>
                          {brand}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {category !== "all" && modelSubdivisionOptions.length > 0 && (
                  <>
                    <label style={filterLabel}>Model Family</label>
                    <div style={chipWrap}>
                      <button onClick={() => setModelSubdivision("all")} style={chipBtn(modelSubdivision === "all")}>All Models</button>
                      {modelSubdivisionOptions.map((family) => (
                        <button key={family} onClick={() => setModelSubdivision(family)} style={chipBtn(modelSubdivision === family)}>
                          {family}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <label style={filterLabel}>Grade</label>
                <div style={chipWrap}>
                  {["all", "New", "A", "B"].map((g) => (
                    <button key={g} onClick={() => setGradeFilter(g)} style={chipBtn(gradeFilter === g)}>
                      {g === "all" ? "All" : g === "New" ? "Brand New" : `Grade ${g}`}
                    </button>
                  ))}
                </div>

                <label style={filterLabel}>Price Band</label>
                <div style={chipWrap}>
                  <button onClick={() => setPriceBand("all")} style={chipBtn(priceBand === "all")}>All</button>
                  <button onClick={() => setPriceBand("budget")} style={chipBtn(priceBand === "budget")}>Under 25k</button>
                  <button onClick={() => setPriceBand("mid")} style={chipBtn(priceBand === "mid")}>25k - 50k</button>
                  <button onClick={() => setPriceBand("premium")} style={chipBtn(priceBand === "premium")}>50k+</button>
                </div>

                <button
                  onClick={() => {
                    setCategory("all");
                    setBrandSubdivision("all");
                    setModelSubdivision("all");
                    setGradeFilter("all");
                    setPriceBand("all");
                    setSortBy("featured");
                    setSearch("");
                  }}
                  style={{ ...outlineBtn, width: "100%", marginTop: 12 }}
                >
                  Reset Filters
                </button>
              </aside>
            )}

            {isMobileFilters && isFilterOpen && (
              <>
                <div onClick={() => setIsFilterOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 150 }} />
                <aside style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, border: "1px solid var(--line)", maxHeight: "78vh", overflowY: "auto", zIndex: 160, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>Filters & Sort</div>
                    <button onClick={() => setIsFilterOpen(false)} style={{ ...linkBtn, marginBottom: 0 }}>Close</button>
                  </div>

                  <label style={filterLabel}>Category</label>
                  <div style={chipWrap}>
                    {CATEGORIES.map((c) => (
                      <button key={c.key} onClick={() => setCategory(c.key)} style={chipBtn(category === c.key)}>{c.label}</button>
                    ))}
                  </div>

                  {category !== "all" && subdivisionOptions.length > 0 && (
                    <>
                      <label style={filterLabel}>Subdivision</label>
                      <div style={chipWrap}>
                        <button onClick={() => setBrandSubdivision("all")} style={chipBtn(brandSubdivision === "all")}>All Brands</button>
                        {subdivisionOptions.map((brand) => (
                          <button key={brand} onClick={() => setBrandSubdivision(brand)} style={chipBtn(brandSubdivision === brand)}>
                            {brand}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {category !== "all" && modelSubdivisionOptions.length > 0 && (
                    <>
                      <label style={filterLabel}>Model Family</label>
                      <div style={chipWrap}>
                        <button onClick={() => setModelSubdivision("all")} style={chipBtn(modelSubdivision === "all")}>All Models</button>
                        {modelSubdivisionOptions.map((family) => (
                          <button key={family} onClick={() => setModelSubdivision(family)} style={chipBtn(modelSubdivision === family)}>
                            {family}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <label style={filterLabel}>Grade</label>
                  <div style={chipWrap}>
                    {["all", "New", "A", "B"].map((g) => (
                      <button key={g} onClick={() => setGradeFilter(g)} style={chipBtn(gradeFilter === g)}>
                        {g === "all" ? "All" : g === "New" ? "Brand New" : `Grade ${g}`}
                      </button>
                    ))}
                  </div>

                  <label style={filterLabel}>Price Band</label>
                  <div style={chipWrap}>
                    <button onClick={() => setPriceBand("all")} style={chipBtn(priceBand === "all")}>All</button>
                    <button onClick={() => setPriceBand("budget")} style={chipBtn(priceBand === "budget")}>Under 25k</button>
                    <button onClick={() => setPriceBand("mid")} style={chipBtn(priceBand === "mid")}>25k - 50k</button>
                    <button onClick={() => setPriceBand("premium")} style={chipBtn(priceBand === "premium")}>50k+</button>
                  </div>

                  <label style={filterLabel}>Sort</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 10px", background: "white" }}>
                    <option value="featured">Featured</option>
                    <option value="saving">Biggest Saving</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name-az">Name: A to Z</option>
                    <option value="name-za">Name: Z to A</option>
                    <option value="brand">Brand</option>
                  </select>

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      onClick={() => {
                        setCategory("all");
                        setBrandSubdivision("all");
                        setModelSubdivision("all");
                        setGradeFilter("all");
                        setPriceBand("all");
                        setSortBy("featured");
                        setSearch("");
                        setNavSearch("");
                      }}
                      style={{ ...outlineBtn, flex: 1 }}
                    >
                      Reset
                    </button>
                    <button onClick={() => setIsFilterOpen(false)} style={{ ...solidBtn, flex: 1 }}>Apply</button>
                  </div>
                </aside>
              </>
            )}

            <div>
              <div style={{ ...panel, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={search} onChange={(e) => { setSearch(e.target.value); setNavSearch(e.target.value); }} placeholder="Search brand, model, spec, keyword" style={{ flex: 1, minWidth: 260, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }} />
                  {!isMobileFilters && (
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 10px", background: "white" }}>
                      <option value="featured">Featured</option>
                      <option value="saving">Biggest Saving</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name-az">Name: A to Z</option>
                      <option value="name-za">Name: Z to A</option>
                      <option value="brand">Brand</option>
                    </select>
                  )}
                </div>
                {category !== "all" && subdivisionOptions.length > 0 && (
                  <div style={{ marginTop: 12, padding: "12px 10px", border: "1px solid var(--line)", borderRadius: 10, background: "#fbfbfa" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                      {activeCategoryLabel} Subdivision
                    </div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                      <button
                        onClick={() => setBrandSubdivision("all")}
                        style={{
                          border: brandSubdivision === "all" ? "1px solid var(--ink)" : "1px solid var(--line)",
                          background: brandSubdivision === "all" ? "var(--ink)" : "#fff",
                          color: brandSubdivision === "all" ? "#fff" : "var(--ink)",
                          borderRadius: 999,
                          padding: "8px 12px",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        All {activeCategoryLabel}
                      </button>
                      {subdivisionOptions.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => setBrandSubdivision(brand)}
                          style={{
                            border: brandSubdivision === brand ? "1px solid var(--ink)" : "1px solid var(--line)",
                            background: brandSubdivision === brand ? "var(--ink)" : "#fff",
                            color: brandSubdivision === brand ? "#fff" : "var(--ink)",
                            borderRadius: 999,
                            padding: "8px 12px",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {brand} ({subdivisionCount(brand)})
                        </button>
                      ))}
                    </div>
                    {modelSubdivisionOptions.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }}>
                          {brandSubdivision === "all" ? "Model Families" : `${brandSubdivision} Model Families`}
                        </div>
                        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                          <button
                            onClick={() => setModelSubdivision("all")}
                            style={{
                              border: modelSubdivision === "all" ? "1px solid var(--ink)" : "1px solid var(--line)",
                              background: modelSubdivision === "all" ? "var(--ink)" : "#fff",
                              color: modelSubdivision === "all" ? "#fff" : "var(--ink)",
                              borderRadius: 999,
                              padding: "8px 12px",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            All Families
                          </button>
                          {modelSubdivisionOptions.map((family) => (
                            <button
                              key={family}
                              onClick={() => setModelSubdivision(family)}
                              style={{
                                border: modelSubdivision === family ? "1px solid var(--ink)" : "1px solid var(--line)",
                                background: modelSubdivision === family ? "var(--ink)" : "#fff",
                                color: modelSubdivision === family ? "#fff" : "var(--ink)",
                                borderRadius: 999,
                                padding: "8px 12px",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {family} ({modelSubdivisionCount(family)})
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 13 }}>{sortedFiltered.length} matching products</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18 }}>
                {sortedFiltered.map((p, i) => (
                  <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} toggleComparison={toggleComparison} isInComparison={isInComparison} toggleStockAlert={toggleStockAlert} hasStockAlert={hasStockAlert} getProductReviews={getProductReviews} getProductAverageRating={getProductAverageRating} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "product" && selected) {
    const saving = selected.market - selected.price;
    const grade = GRADE_INFO[selected.grade] || GRADE_INFO.A;
    const stockMeta = getStockMeta(selected.stockStatus);
    const available = isAvailable(selected);
    const galleryImages = Array.isArray(selected.images) && selected.images.length > 0
      ? selected.images
      : selected.image
      ? [selected.image]
      : [];
    const activeImage = galleryImages[Math.min(selectedImageIndex, Math.max(galleryImages.length - 1, 0))] || "";
    const relatedProducts = catalog
      .filter((p) => p.id !== selected.id && p.category === selected.category)
      .slice(0, 3)
      .map(withStockStatus);
    const productReviews = [
      { name: "Nadia K.", text: "Device matched the photos exactly. Battery health was great and delivery was next day.", rating: 5 },
      { name: "Brian O.", text: "Clean machine and fair price. Support team called before dispatch to confirm details.", rating: 5 },
      { name: "Aisha M.", text: "Condition was as described and setup was smooth. Would buy again.", rating: 4 },
    ];
    const productFaqs = [
      { q: "How fast is delivery to Mombasa?", a: "Orders confirmed before noon are usually dispatched same day and delivered the next business day." },
      { q: "What does this grade mean?", a: `${grade.label}: ${grade.desc}` },
      { q: "Can I return if it differs from photos?", a: "Yes. If condition does not match approved photos, you can request return and refund under policy." },
    ];
    const avgRating = (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1);
    return (
      <>
        <ProductMeta product={selected} />
        <PageMeta page="products" productName={`${selected.brand} ${selected.name}`} additionalMeta={{ keywords: generateKeywords(selected) }} />
        <FAQMeta productName={`${selected.brand} ${selected.name}`} />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage("products")} style={linkBtn}>Back</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
            <div style={panel}>
              {activeImage && (
                <>
                  <div style={{ width: "100%", height: 300, background: "#f5f5f0", borderRadius: 12, marginBottom: 12, overflow: "hidden", display: "grid", placeItems: "center" }}>
                    <img src={activeImage} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                  </div>
                  {galleryImages.length > 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(70px,1fr))", gap: 8, marginBottom: 20 }}>
                      {galleryImages.map((img, idx) => (
                        <button
                          key={`${selected.id}-img-${idx}`}
                          onClick={() => setSelectedImageIndex(idx)}
                          style={{ width: "100%", height: 70, borderRadius: 8, overflow: "hidden", border: idx === selectedImageIndex ? "2px solid var(--ink)" : "1px solid var(--line)", padding: 0, background: "#fff", cursor: "pointer" }}
                          title={`Image ${idx + 1}`}
                        >
                          <img loading="lazy" src={img} alt={`${selected.name} ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <h1 style={h2}>{selected.brand} {selected.name}</h1>
              <p style={pMuted}>{selected.spec}</p>
              {(selected.longDescription || selected.description) && (
                <p style={{ marginTop: 14, padding: 12, background: "#fafaf9", borderRadius: 10, color: "var(--text-mid)", lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-line" }}>
                  {(selected.longDescription || selected.description).replace(/ (Specs:|Best For:|Condition:|Value:|Purchase Note:)/g, "\n$1")}
                </p>
              )}
              <div style={{ marginTop: 8, display: "inline-block", border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "4px 10px", color: stockMeta.color, background: stockMeta.bg, fontWeight: 700, fontSize: 12 }}>
                {stockMeta.label}
              </div>
              <div style={{ marginTop: 12, display: "inline-block", border: `1px solid ${grade.color}`, borderRadius: 999, padding: "4px 10px", color: grade.color, fontWeight: 700 }}>{grade.label}</div>
              <p style={{ marginTop: 8, color: "var(--text-mid)" }}>{grade.desc}</p>
              <ul style={{ marginTop: 14, paddingLeft: 18, color: "var(--text-mid)", lineHeight: 1.8 }}>
                {selected.spec.split(" · ").map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div style={panel}>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Nafuu Price</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 36, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>{fmt(selected.price)}</div>
              <div style={{ color: "var(--text-dim)", textDecoration: "line-through", marginBottom: 12 }}>Mombasa market: {fmt(selected.market)}</div>
              <div style={{ background: "rgba(26,122,74,.1)", border: "1px solid rgba(26,122,74,.25)", borderRadius: 10, padding: 12, marginBottom: 18, color: "var(--green)", fontWeight: 700 }}>You save {fmt(saving)}</div>
              
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                  onClick={() => addToCart(selected)}
                  disabled={!available}
                  style={{ flex: 1, border: "none", borderRadius: 10, background: available ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", padding: "14px 18px", fontWeight: 700, fontSize: 15, cursor: available ? "pointer" : "not-allowed", transition: "all .2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  {available ? "Add to Cart" : "Out of Stock"}
                </button>
                <button
                  onClick={() => toggleWishlist(selected)}
                  style={{ width: 52, height: 52, borderRadius: 10, background: isInWishlist(selected.id) ? "var(--cherry)" : "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", cursor: "pointer", transition: "all .2s ease" }}
                  title={isInWishlist(selected.id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist(selected.id) ? "#fff" : "none"} stroke={isInWishlist(selected.id) ? "#fff" : "currentColor"} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
              
              <button onClick={() => available && setPage("checkout")} disabled={!available} style={{ width: "100%", ...solidBtn, opacity: available ? 1 : 0.6, cursor: available ? "pointer" : "not-allowed" }}>{available ? "Buy Now" : "Currently Unavailable"}</button>
            </div>
          </div>

          {/* Social Share Section */}
          <div style={{ marginTop: 24, padding: 16, background: "#f9f9f8", borderRadius: 12, border: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#5a5a5a", textTransform: "uppercase", letterSpacing: 0.5 }}>Share this product:</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(() => {
                  const productUrl = `https://nafuu-mart.com/products/${selected.id}`;
                  const shareTitle = `${selected.brand} ${selected.name} - Refurbished Electronics`;
                  const shareLinks = generateShareLinks(shareTitle, productUrl, selected.image);
                  
                  return (
                    <>
                      <a 
                        href={shareLinks.facebook}
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Share on Facebook"
                        style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, textDecoration: "none", color: SOCIAL_PLATFORMS.facebook.color, fontWeight: 700, transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = SOCIAL_PLATFORMS.facebook.color; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = SOCIAL_PLATFORMS.facebook.color; }}
                      >
                        f
                      </a>
                      <a 
                        href={shareLinks.twitter}
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Share on X/Twitter"
                        style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, textDecoration: "none", color: "#000", fontWeight: 700, transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
                      >
                        �.�
                      </a>
                      <a 
                        href={shareLinks.linkedin}
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Share on LinkedIn"
                        style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, textDecoration: "none", color: SOCIAL_PLATFORMS.linkedin.color, fontWeight: 700, transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = SOCIAL_PLATFORMS.linkedin.color; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = SOCIAL_PLATFORMS.linkedin.color; }}
                      >
                        in
                      </a>
                      <a 
                        href={shareLinks.whatsapp}
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Share on WhatsApp"
                        style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, textDecoration: "none", color: SOCIAL_PLATFORMS.whatsapp.color, fontWeight: 700, transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = SOCIAL_PLATFORMS.whatsapp.color; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = SOCIAL_PLATFORMS.whatsapp.color; }}
                      >
                        �Y'�
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(productUrl);
                          alert("Product link copied to clipboard!");
                        }}
                        title="Copy link"
                        style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#666", fontWeight: 700, transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#666"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#666"; }}
                      >
                        �Y"-
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: viewportWidth < 960 ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Customer Reviews</h3>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>�~. {avgRating} ({productReviews.length})</div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {productReviews.map((r) => (
                  <div key={r.name} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong style={{ color: "var(--ink)", fontSize: 13 }}>{r.name}</strong>
                      <span style={{ color: "#f1b400", fontSize: 12 }}>{"�~.".repeat(r.rating)}{"�~?".repeat(5 - r.rating)}</span>
                    </div>
                    <p style={{ color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Frequently Asked Questions</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {productFaqs.map((faq, idx) => (
                  <div key={faq.q} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenProductFaq((prev) => (prev === idx ? -1 : idx))}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "#fff", color: "var(--ink)", padding: "12px 14px", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: 12 }}>{openProductFaq === idx ? "�^'" : "+"}</span>
                    </button>
                    {openProductFaq === idx && (
                      <div style={{ borderTop: "1px solid var(--line)", background: "#fafaf9", padding: "10px 14px", color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div style={{ marginTop: 20, ...panel }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>You might also like</h3>
                <button onClick={() => setPage("products")} style={outlineBtn}>View more</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                {relatedProducts.map((item) => {
                  const itemAvailable = isAvailable(item);
                  return (
                    <div key={item.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "#fff" }}>
                      <button onClick={() => { setSelected(item); setPage("product"); }} style={{ border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
                        {item.image && <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
                        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{item.brand} {item.name}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{item.spec}</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, color: "var(--ink)", fontSize: 20, marginTop: 6 }}>{fmt(item.price)}</div>
                      </button>
                      <button onClick={() => addToCart(item)} disabled={!itemAvailable} style={{ width: "100%", marginTop: 8, border: "none", borderRadius: 8, padding: "10px 12px", background: itemAvailable ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", fontWeight: 700, cursor: itemAvailable ? "pointer" : "not-allowed" }}>
                        {itemAvailable ? "Add to Cart" : "Out of Stock"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "checkout" && (selected || cart.length > 0)) {
    const deliveryFee = 0;
    const total = checkoutSubtotal + deliveryFee;
    
    return (
      <>
        <PageMeta page="checkout" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage(selected ? "product" : "cart")} style={linkBtn}>
            {selected ? "�?� Back to product" : "�?� Back to cart"}
          </button>
          
          <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 380px", gap: 32, marginTop: 24 }}>
            {/* Left: Checkout Form */}
            <div>
              <h1 style={{ ...h2, marginBottom: 6, fontSize: 32 }}>Checkout</h1>
              <p style={pMuted}>Complete your order in 2 minutes for {checkoutItemCount} item{checkoutItemCount !== 1 ? "s" : ""}</p>
              
              {/* Customer Information */}
              <div style={{ ...panel, marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Your Information</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Full name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Njeri"
                    style={{ width: "100%", border: `1px solid ${formErrors.name ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.name && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.name}</div>}
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Phone number *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="0712345678"
                    style={{ width: "100%", border: `1px solid ${formErrors.phone ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.phone && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.phone}</div>}
                </div>
              </div>
              
              {/* Delivery Information */}
              <div style={{ ...panel, marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Delivery Address</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Delivery location *</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g., Mombasa CBD, Tudor, Mvita"
                    style={{ width: "100%", border: `1px solid ${formErrors.location ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.location && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.location}</div>}
                </div>
                
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Special instructions</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Gate code, building name, delivery preferences..."
                    rows="3"
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", fontSize: 15, resize: "vertical" }}
                  />
                </div>
              </div>
              
              {/* Coupon Code Section */}
              <div style={{ ...panel, marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Discount Code</h3>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter coupon code (e.g., SAVE10, WELCOME5)"
                      style={{ width: "100%", border: `1px solid ${couponError ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                    />
                    {couponError && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{couponError}</div>}
                  </div>
                  <button
                    onClick={() => applyCoupon(couponInput)}
                    disabled={!couponInput.trim()}
                    style={{ border: "none", borderRadius: 10, padding: "12px 20px", background: "var(--ink)", color: "white", fontWeight: 600, cursor: couponInput.trim() ? "pointer" : "not-allowed", opacity: couponInput.trim() ? 1 : 0.5 }}
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4", border: "1px solid var(--green)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>�o" {appliedCoupon.code}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{appliedCoupon.label} applied �?� Save KSh {fmt(checkoutDiscount)}</div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}
                    >
                      �-
                    </button>
                  </div>
                )}
              </div>

              {/* Guest Checkout Option */}
              <div style={{ ...panel, marginTop: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isGuest}
                    onChange={(e) => setIsGuest(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                    {isGuest ? "Checking out as guest" : "Continue as guest (no account needed)"}
                  </span>
                </label>
                {isGuest && (
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                    You will receive an order confirmation via email. No account or password required!
                  </p>
                )}
              </div>
              
              {/* Payment Method */}
              <div style={{ ...panel, marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Payment Method</h3>
                
                {/* M-Pesa Option */}
                <button 
                  onClick={() => setPaymentMethod("mpesa")}
                  style={{ width: "100%", border: `2px solid ${paymentMethod === "mpesa" ? "var(--green)" : "var(--line)"}`, borderRadius: 10, padding: 14, background: paymentMethod === "mpesa" ? "#f0fdf4" : "#f9f9f7", display: "flex", alignItems: "center", gap: 12, marginBottom: 10, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ width: 40, height: 40, background: "#0ca856", borderRadius: 8, display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 18 }}>M</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>M-Pesa</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Pay via STK push to your phone</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${paymentMethod === "mpesa" ? "var(--green)" : "var(--line)"}`, background: paymentMethod === "mpesa" ? "var(--green)" : "transparent", display: "grid", placeItems: "center" }}>
                    {paymentMethod === "mpesa" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>

                {/* Pesapal Option (Cards + Mobile Money) */}
                <button 
                  onClick={() => setPaymentMethod("pesapal")}
                  style={{ width: "100%", border: `2px solid ${paymentMethod === "pesapal" ? "var(--green)" : "var(--line)"}`, borderRadius: 10, padding: 14, background: paymentMethod === "pesapal" ? "#f0fdf4" : "#f9f9f7", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ width: 40, height: 40, background: "#1a73e8", borderRadius: 8, display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 18 }}>�Y'�</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>Pesapal (Cards + Airtel)</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Visa, Mastercard, Airtel Money via Pesapal</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${paymentMethod === "pesapal" ? "var(--green)" : "var(--line)"}`, background: paymentMethod === "pesapal" ? "var(--green)" : "transparent", display: "grid", placeItems: "center" }}>
                    {paymentMethod === "pesapal" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>

                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                  {paymentMethod === "mpesa" 
                    ? "M-Pesa STK prompt will be sent to your phone number. Enter your PIN to complete payment." 
                    : "You'll be redirected to Pesapal's secure payment page for card or Airtel Money payment."}
                </p>
              </div>

              {/* Place Order Button */}
              <button 
                onClick={placeOrder} 
                disabled={paying}
                style={{ ...solidBtn, width: "100%", marginTop: 24, padding: "16px 14px", fontSize: 16, fontWeight: 700, opacity: paying ? 0.7 : 1, cursor: paying ? "not-allowed" : "pointer" }}
              >
                {paying ? "Processing Payment..." : `Complete Order - ${fmt(total)}`}
              </button>
              {formErrors.checkout && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{formErrors.checkout}</div>}
              
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>
                By ordering, you agree to our <button onClick={() => { openInfoPage("Terms of Service", "Our commitment to you", ["Fair pricing on all devices", "30-day money-back guarantee", "100-point quality checks", "Next-day delivery in Mombasa"]); }} style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Terms of Service</button>. Next-day delivery to your Mombasa location guaranteed.
              </p>
            </div>
            
            {/* Right: Order Summary (sticky on desktop) */}
            <div style={{ position: viewportWidth < 900 ? "static" : "sticky", top: viewportWidth < 900 ? "auto" : 100 }}>
              <div style={{ ...panel, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)" }}>Order Summary</h3>
                
                {/* Product Card */}
                <div style={{ background: "#fafaf9", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  {checkoutItems.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #ecece7" }}>
                      <div style={{ width: 60, height: 60, background: "#f5f5f0", borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center", fontSize: 24, flexShrink: 0 }}>
                        {item.image ? (
                          <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; e.target.parentElement.textContent = "IMG"; }} />
                        ) : (
                          "IMG"
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{item.brand} {item.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{item.spec}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Qty: {item.quantity || 1}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}>{fmt(item.price * (item.quantity || 1))}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Price Breakdown */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                    <span>Subtotal ({checkoutItemCount} items)</span>
                    <span style={{ fontWeight: 600 }}>{fmt(checkoutSubtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "var(--green)" }}>
                      <span>{appliedCoupon.code} ({Math.round(appliedCoupon.discount * 100)}% off)</span>
                      <span style={{ fontWeight: 600 }}>-{fmt(checkoutDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
                    <span>Delivery Fee</span>
                    <span style={{ fontWeight: 600, color: deliveryFee === 0 ? "var(--green)" : "var(--ink)" }}>
                      {deliveryFee === 0 ? "FREE" : fmt(deliveryFee)}
                    </span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                    <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--ink)" }}>{fmt(checkoutTotal + deliveryFee)}</span>
                  </div>
                </div>
              </div>
              
              {/* Savings Card */}
              <div style={{ background: "linear-gradient(135deg, rgba(26,122,74,.08) 0%, rgba(26,122,74,.05) 100%)", border: "1px solid rgba(26,122,74,.2)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>You Save</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 900, color: "var(--green)", marginBottom: 6 }}>{fmt(checkoutSavings)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>vs Mombasa retail prices</div>
              </div>
              
              {/* Trust Badges */}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {[
                  { icon: "CHK", text: "100-point checks" },
                  { icon: "RET", text: "30-day returns" },
                  { icon: "IMG", text: "Live photos before dispatch" },
                ].map((badge) => (
                  <div key={badge.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                    <span style={{ fontSize: 16 }}>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "cart") {
    return (
      <>
        <PageMeta page="cart" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8, fontSize: 32 }}>Shopping Cart</h1>
          <p style={pMuted}>
            {cartCount === 0 ? "Your cart is empty" : `${cartCount} item${cartCount !== 1 ? "s" : ""} in your cart`}
          </p>

          {cart.length === 0 ? (
            <div style={{ ...panel, marginTop: 32, textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>CART</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>Your cart is empty</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Add some products to get started!</p>
              <button onClick={() => setPage("products")} style={solidBtn}>
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 380px", gap: 32, marginTop: 24 }}>
              {/* Cart Items */}
              <div>
                {cart.map((item) => {
                  const saving = item.market - item.price;
                  const grade = GRADE_INFO[item.grade] || GRADE_INFO.A;
                  return (
                    <div key={item.id} style={{ ...panel, marginBottom: 16, display: "grid", gridTemplateColumns: viewportWidth < 600 ? "1fr" : "120px 1fr auto", gap: 16, alignItems: "start" }}>
                      {item.image && (
                        <div style={{ width: viewportWidth < 600 ? "100%" : 120, height: viewportWidth < 600 ? 200 : 120, background: "#f5f5f0", borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => { setSelected(item); setPage("product"); }}>
                          <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>{item.brand}</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 4, cursor: "pointer" }} onClick={() => { setSelected(item); setPage("product"); }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{item.spec}</div>
                        <div style={{ display: "inline-block", border: `1px solid ${grade.color}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: grade.color, fontWeight: 700, marginBottom: 12 }}>
                          {grade.label}
                        </div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: "var(--ink)", marginBottom: 4 }}>{fmt(item.price)}</div>
                        <div style={{ fontSize: 11, color: "var(--accent-dark)", fontWeight: 700 }}>Save {fmt(saving)} vs market price</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: viewportWidth < 600 ? "row" : "column", gap: 12, alignItems: viewportWidth < 600 ? "center" : "end" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f0", borderRadius: 8, padding: "6px 8px" }}>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16 }}
                          >
                            �^'
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16 }}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--cherry)", fontSize: 13, fontWeight: 600, textDecoration: "underline" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div style={{ position: viewportWidth < 900 ? "static" : "sticky", top: viewportWidth < 900 ? "auto" : 100 }}>
                <div style={panel}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--ink)" }}>Order Summary</h3>
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                      <span>Subtotal ({cartCount} items)</span>
                      <span style={{ fontWeight: 600 }}>{fmt(cartTotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
                      <span>Delivery Fee</span>
                      <span style={{ fontWeight: 600, color: "var(--green)" }}>FREE</span>
                    </div>
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--ink)" }}>{fmt(cartTotal)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelected(null);
                      setPage("checkout");
                    }}
                    style={{ width: "100%", border: "none", borderRadius: 10, background: "var(--accent-dark)", color: "#fff", padding: "14px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 12 }}
                  >
                    Proceed to Checkout
                  </button>
                  
                  <button
                    onClick={() => setPage("products")}
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)", padding: "14px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    Continue Shopping
                  </button>
                </div>
                
                <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(26,122,74,.08) 0%, rgba(26,122,74,.05) 100%)", border: "1px solid rgba(26,122,74,.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>�Y'� Total Savings</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--green)" }}>
                    {fmt(cart.reduce((sum, item) => sum + (item.market - item.price) * item.quantity, 0))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>vs Mombasa retail prices</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "wishlist") {
    return (
      <>
        <PageMeta page="wishlist" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8, fontSize: 32 }}>My Wishlist</h1>
          <p style={pMuted}>
            {wishlist.length === 0 ? "No items saved yet" : `${wishlist.length} product${wishlist.length !== 1 ? "s" : ""} saved`}
          </p>

          {wishlist.length === 0 ? (
            <div style={{ ...panel, marginTop: 32, textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>❤️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>Your wishlist is empty</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Save products you love for later!</p>
              <button onClick={() => setPage("products")} style={solidBtn}>
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 24 }}>
              {wishlist.map((p, i) => (
                <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} toggleComparison={toggleComparison} isInComparison={isInComparison} toggleStockAlert={toggleStockAlert} hasStockAlert={hasStockAlert} getProductReviews={getProductReviews} getProductAverageRating={getProductAverageRating} />
              ))}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "compare") {
    return (
      <>
        <PageMeta page="compare" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8, fontSize: 32 }}>Compare Products</h1>
          <p style={pMuted}>
            {compareList.length === 0 ? "No products selected for comparison" : `Comparing ${compareList.length} product${compareList.length !== 1 ? "s" : ""}`}
          </p>

          {compareList.length === 0 ? (
            <div style={{ ...panel, marginTop: 32, textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>�s-️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>No products to compare</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Click the compare icon on products to add them here!</p>
              <button onClick={() => setPage("products")} style={solidBtn}>
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 24, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "var(--bg-soft)", borderBottom: "2px solid var(--line)" }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700, color: "var(--ink)" }}>Feature</th>
                    {compareList.map((p) => (
                      <th key={p.id} style={{ padding: 12, textAlign: "left", fontWeight: 700, color: "var(--ink)", minWidth: 220 }}>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{p.brand} {p.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.spec}</div>
                        </div>
                        <button
                          onClick={() => toggleComparison(p)}
                          style={{ fontSize: 12, padding: "4px 8px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Price", getter: (p) => fmt(p.price) },
                    { label: "Market Price", getter: (p) => fmt(p.market) },
                    { label: "You Save", getter: (p) => fmt(p.market - p.price) },
                    { label: "Category", getter: (p) => p.category },
                    { label: "Grade", getter: (p) => p.grade },
                    { label: "Stock", getter: (p) => p.stockQuantity ?? 10 },
                    { label: "Rating", getter: (p) => getProductAverageRating(p.id) },
                  ].map((row, idx) => (
                    <tr key={row.label} style={{ borderBottom: "1px solid var(--line)", background: idx % 2 === 0 ? "var(--bg-soft)" : "white" }}>
                      <td style={{ padding: 12, fontWeight: 600, color: "var(--ink)" }}>{row.label}</td>
                      {compareList.map((p) => (
                        <td key={`${p.id}-${row.label}`} style={{ padding: 12, color: "var(--text-mid)" }}>
                          {row.getter(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {compareList.length > 0 && (
            <div style={{ marginTop: 24, padding: 16, background: "var(--bg-soft)", borderRadius: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {compareList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p); setPage("product"); }}
                  style={{ background: "var(--green)", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                >
                  View {p.brand} {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "order" && selected) {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage("product")} style={linkBtn}>Back</button>
          <h1 style={h2}>Order Flow</h1>
          <p style={pMuted}>Fill your details to trigger a real M-Pesa STK push.</p>
          <div style={panel}>
            <div style={{ marginBottom: 14, fontWeight: 700 }}>{selected.brand} {selected.name} - {fmt(selected.price)}</div>
            <Field label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} error={formErrors.name} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} error={formErrors.phone} />
            <Field label="Delivery Location" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} error={formErrors.location} />
            <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} multiline />
            <button onClick={placeOrder} disabled={paying} style={{ ...solidBtn, width: "100%", marginTop: 10, opacity: paying ? 0.75 : 1, cursor: paying ? "not-allowed" : "pointer" }}>
              {paying ? "Sending M-Pesa STK..." : `Pay with M-Pesa - ${fmt(selected.price)}`}
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "confirm" && lastOrder) {
    const confirmItems = Array.isArray(lastOrder.items) && lastOrder.items.length > 0
      ? lastOrder.items
      : lastOrder.product
        ? [{ name: lastOrder.product, price: lastOrder.price, quantity: 1 }]
        : [];
    const copiedRef = () => {
      try {
        navigator.clipboard.writeText(lastOrder.id);
      } catch {
        // Clipboard access can be unavailable in some browser contexts.
      }
    };
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 5);
    const estDateStr = estDate.toLocaleDateString("en-KE", { weekday: "long", month: "long", day: "numeric" });

    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "50px 24px" }}>
          {/* Success banner */}
          <div style={{ background: "linear-gradient(135deg,#2d5a4d 0%,#3a7060 100%)", borderRadius: 18, padding: "32px 28px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>�YZ?</div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 28, margin: "0 0 8px", color: "#fff" }}>Order Confirmed!</h1>
            <p style={{ opacity: 0.85, fontSize: 15, margin: "0 0 16px" }}>
              Thank you{lastOrder.customer ? `, ${lastOrder.customer.split(" ")[0]}` : ""}! Your order is being processed.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px" }}>
              <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>{lastOrder.id}</span>
              <button
                onClick={copiedRef}
                title="Copy reference"
                style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 8, padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Copy
              </button>
            </div>
            <p style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Save this reference for tracking</p>
          </div>

          {/* Delivery estimate */}
          <div style={{ ...panel, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 32 }}>�Yss</div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>Estimated Delivery</div>
              <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 16 }}>{estDateStr}</div>
              <div style={{ ...pMuted, fontSize: 12 }}>3�?"5 business days · Mombasa delivery via Sendy / G4S</div>
            </div>
          </div>

          {/* Order summary */}
          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ ...h3, margin: 0 }}>Order Summary</h3>
              <span style={{
                background: lastOrder.paymentMethod === "M-Pesa" ? "#e8f5e9" : "#e8f0fe",
                color: lastOrder.paymentMethod === "M-Pesa" ? "#1b5e20" : "#1a237e",
                border: `1px solid ${lastOrder.paymentMethod === "M-Pesa" ? "#a5d6a7" : "#9fa8da"}`,
                borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700
              }}>
                {lastOrder.paymentMethod || "Paid"}
              </span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {confirmItems.length > 0
                ? confirmItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: idx < confirmItems.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>{item.brand ? `${item.brand} ${item.name}` : item.name || item.product}</div>
                        {item.spec && <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.spec}</div>}
                        {item.grade && <div style={{ fontSize: 11, color: "var(--muted)" }}>Grade {item.grade}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{fmt(item.price * (item.quantity || 1))}</div>
                        {item.quantity > 1 && <div style={{ fontSize: 11, color: "var(--muted)" }}>�-{item.quantity} @ {fmt(item.price)}</div>}
                      </div>
                    </div>
                  ))
                : (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink)", fontWeight: 600 }}>
                      <span>{lastOrder.itemCount || 1} item(s)</span>
                      <span>{fmt(lastOrder.total || lastOrder.price)}</span>
                    </div>
                  )
              }
            </div>
            {lastOrder.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", color: "#16a34a", fontWeight: 600 }}>
                <span>Discount{lastOrder.couponCode ? ` (${lastOrder.couponCode})` : ""}</span>
                <span>�?"{fmt(lastOrder.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "2px solid var(--line)", fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>
              <span>Total Paid</span>
              <span>{fmt(lastOrder.total || lastOrder.price)}</span>
            </div>
          </div>

          {/* What happens next */}
          <div style={{ ...panel, marginBottom: 16 }}>
            <h3 style={{ ...h3, marginBottom: 12 }}>What happens next</h3>
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, color: "var(--text-mid)", fontSize: 14 }}>
              <li><strong style={{ color: "var(--ink)" }}>Sourcing (Day 1�?"2):</strong> We source your exact device from our Nairobi suppliers.</li>
              <li><strong style={{ color: "var(--ink)" }}>Live Photos (Day 2�?"3):</strong> We send you photos of the actual unit for approval.</li>
              <li><strong style={{ color: "var(--ink)" }}>Dispatch (Day 3�?"4):</strong> Approved device is shipped via Sendy Express / G4S.</li>
              <li><strong style={{ color: "var(--ink)" }}>Delivery (Day 4�?"5):</strong> Delivered to your Mombasa address with receipt.</li>
            </ol>
            {lastOrder.customerEmail && (
              <p style={{ ...pMuted, marginTop: 12, fontSize: 12 }}>
                �Y"� Confirmation sent to <strong>{lastOrder.customerEmail}</strong>
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => { setPage("track"); setTrackRef(lastOrder.id); setTimeout(trackOrder, 50); }} style={solidBtn}>Track Order</button>
            <button onClick={() => setPage("my-orders")} style={outlineBtn}>All My Orders</button>
            <button onClick={() => { setPage("home"); setLastOrder(null); }} style={outlineBtn}>Back Home</button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "admin") {
    return (
      <>
        <PageMeta page="admin" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>Admin Catalog</h1>
          {!currentUser?.isAdmin ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 12 }}>{!currentUser ? "Sign in with an admin account to manage products." : "Access denied. Admin privileges required."}</p>
              {!currentUser && <button onClick={() => openAuth("signin")} style={solidBtn}>Sign in</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 980 ? "1fr" : "380px 1fr", gap: 18, marginTop: 14 }}>
              <aside style={panel}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--ink)", fontWeight: 700 }}>{adminEditId ? "Edit product" : "Add product"}</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <input value={adminForm.brand} onChange={(e) => setAdminForm((s) => ({ ...s, brand: e.target.value }))} placeholder="Brand" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <input value={adminForm.name} onChange={(e) => setAdminForm((s) => ({ ...s, name: e.target.value }))} placeholder="Model name" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <input value={adminForm.spec} onChange={(e) => setAdminForm((s) => ({ ...s, spec: e.target.value }))} placeholder="Spec" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <select value={adminForm.category} onChange={(e) => setAdminForm((s) => ({ ...s, category: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    {CATEGORIES.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select value={adminForm.grade} onChange={(e) => setAdminForm((s) => ({ ...s, grade: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    {Object.keys(GRADE_INFO).map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input value={adminForm.price} onChange={(e) => setAdminForm((s) => ({ ...s, price: e.target.value }))} placeholder="Price" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={adminForm.market} onChange={(e) => setAdminForm((s) => ({ ...s, market: e.target.value }))} placeholder="Market price" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Main Image</label>
                    <input value={adminForm.image} onChange={(e) => setAdminForm((s) => ({ ...s, image: e.target.value }))} placeholder="Image URL (or upload below)" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", width: "100%", marginBottom: 8 }} />
                    <div style={{ position: "relative" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                      />
                      <button type="button" style={{ width: "100%", border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fafaf9", color: "var(--text-mid)", fontSize: 13, cursor: "pointer" }}>
                        �Y"� Upload Main Image
                      </button>
                    </div>
                    {adminForm.image && (
                      <div style={{ marginTop: 8, position: "relative" }}>
                        <img src={adminForm.image} alt="Main preview" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} onError={(e) => { e.target.style.display = "none"; }} />
                        <button onClick={() => setAdminForm((s) => ({ ...s, image: "" }))} style={{ position: "absolute", top: 4, right: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Additional Images</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => handleImageUpload(file, false));
                          e.target.value = "";
                        }}
                        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                      />
                      <button type="button" style={{ width: "100%", border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fafaf9", color: "var(--text-mid)", fontSize: 13, cursor: "pointer" }}>
                        �Y"� Upload Additional Images ({adminForm.images.length})
                      </button>
                    </div>
                    {adminForm.images.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                        {adminForm.images.map((img, idx) => (
                          <div key={idx} style={{ position: "relative" }}>
                            <img src={img} alt={`Additional ${idx + 1}`} style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                            <button onClick={() => removeAdditionalImage(idx)} style={{ position: "absolute", top: 2, right: 2, background: "#fff", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>�-</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input value={adminForm.tags} onChange={(e) => setAdminForm((s) => ({ ...s, tags: e.target.value }))} placeholder="Tags (comma separated)" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select value={adminForm.stockStatus} onChange={(e) => setAdminForm((s) => ({ ...s, stockStatus: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                      <option value="in_stock">In stock</option>
                      <option value="low_stock">Low stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                    <input value={adminForm.stockQuantity} onChange={(e) => setAdminForm((s) => ({ ...s, stockQuantity: e.target.value }))} placeholder="Stock quantity" type="number" min="0" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                </div>
                {adminMsg && <div style={{ fontSize: 12, color: adminMsg.includes("updated") || adminMsg.includes("added") ? "#0b8f41" : "#b91c1c", marginTop: 8 }}>{adminMsg}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={submitAdminProduct} style={{ ...solidBtn, flex: 1 }}>{adminEditId ? "Update" : "Add"}</button>
                  <button onClick={resetAdminForm} style={{ ...outlineBtn, flex: 1 }}>Clear</button>
                </div>
              </aside>

              <section style={{ ...panel, maxHeight: "70vh", overflow: "auto" }}>
                {/* Top toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line)", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 16, marginBottom: 0, color: "var(--ink)", fontWeight: 700 }}>Products ({catalog.length})</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => { setShowBulkUpload((v) => !v); setBulkResult(null); setBulkPreview(null); setAdminMsg(""); }}
                      style={{ background: showBulkUpload ? "#059669" : "#0ea5e9", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      �Y"� {showBulkUpload ? "Hide Bulk Upload" : "Bulk Upload"}
                    </button>
                    <button
                      onClick={() => calculateAdminStats()}
                      style={{ background: "var(--ink)", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      �Y"S Analytics
                    </button>
                    <button
                      onClick={() => {
                        setShowSeoPanel((prev) => {
                          const next = !prev;
                          if (!prev) void loadSeoAdminData();
                          return next;
                        });
                      }}
                      style={{ background: showSeoPanel ? "#065f46" : "#0f766e", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {showSeoPanel ? "Hide SEO Ops" : "SEO Ops"}
                    </button>
                    <button
                      onClick={() => {
                        setShowBlogAdminPanel((prev) => {
                          const next = !prev;
                          if (!prev) void loadAdminBlogArticles();
                          return next;
                        });
                      }}
                      style={{ background: showBlogAdminPanel ? "#1d4ed8" : "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {showBlogAdminPanel ? "Hide Blog Admin" : "Blog Admin"}
                    </button>
                  </div>
                </div>

                {/* Bulk upload panel */}
                {showBulkUpload && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#14532d", margin: 0 }}>Bulk Upload from Excel / CSV</h4>
                      <button onClick={downloadBulkTemplate} style={{ background: "none", border: "1px solid #16a34a", borderRadius: 7, padding: "5px 10px", fontSize: 12, color: "#16a34a", cursor: "pointer", fontWeight: 600 }}>
                        �? Download Template
                      </button>
                    </div>

                    <p style={{ fontSize: 12, color: "#166534", marginBottom: 10, lineHeight: 1.5 }}>
                      Required columns: <strong>brand, name, spec, price, market</strong>. Optional: id, category, grade, image, description, stock_status, stock_quantity, tags. Reference images by filename in the Excel.
                    </p>

                    {/* File upload area - two columns: Excel and Images */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                      {/* Excel file drop zone */}
                      <div style={{ position: "relative" }}>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => e.target.files?.[0] && handleBulkFileSelect(e.target.files[0])}
                          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0 }}
                        />
                        <div style={{ border: "2px dashed #4ade80", borderRadius: 8, padding: "12px 10px", textAlign: "center", background: "white", color: "#15803d", fontSize: 12, cursor: "pointer" }}>
                          {bulkPreview ? `Loaded: ${bulkPreview.fileName}` : "Upload Excel/CSV"}<br /><span style={{ fontSize: 11, color: "#16a34a" }}>{bulkPreview ? `${bulkPreview.rows.length} rows` : "Click to select"}</span>
                        </div>
                      </div>

                      {/* Images file drop zone */}
                      <div style={{ position: "relative" }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => e.target.files && handleBulkImageFileSelect(e.target.files)}
                          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0 }}
                        />
                        <div style={{ border: "2px dashed #60a5fa", borderRadius: 8, padding: "12px 10px", textAlign: "center", background: "white", color: "#1e40af", fontSize: 12, cursor: "pointer" }}>
                          �Y-�️ Upload Images<br /><span style={{ fontSize: 11, color: "#2563eb" }}>{Object.keys(bulkImages).length > 0 ? `${Object.keys(bulkImages).length} images ready` : "Click to add"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded images gallery */}
                    {Object.keys(bulkImages).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#14532d", marginBottom: 6 }}>Uploaded Images ({Object.keys(bulkImages).length}):</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 8 }}>
                          {Object.entries(bulkImages).map(([name, base64]) => (
                            <div key={name} style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid #bbf7d0", background: "#f3faf5" }}>
                              <img src={base64} alt={name} style={{ width: "100%", height: 60, objectFit: "cover" }} />
                              <div style={{ fontSize: 9, color: "#166534", padding: "2px 4px", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "rgba(255,255,255,0.8)" }}>{name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview table */}
                    {bulkPreview && bulkPreview.rows.length > 0 && (
                      <div style={{ overflowX: "auto", marginBottom: 10, border: "1px solid #bbf7d0", borderRadius: 8 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ background: "#dcfce7" }}>
                              {Object.keys(bulkPreview.rows[0]).slice(0, 7).map((col) => (
                                <th key={col} style={{ padding: "6px 8px", textAlign: "left", color: "#14532d", fontWeight: 700, borderBottom: "1px solid #bbf7d0", whiteSpace: "nowrap" }}>{col}</th>
                              ))}
                              {Object.keys(bulkPreview.rows[0]).length > 7 && <th style={{ padding: "6px 8px", color: "#14532d", borderBottom: "1px solid #bbf7d0" }}>�?�</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.rows.slice(0, 5).map((row, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #dcfce7" }}>
                                {Object.values(row).slice(0, 7).map((val, j) => (
                                  <td key={j} style={{ padding: "5px 8px", color: "#166534", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(val)}</td>
                                ))}
                                {Object.keys(row).length > 7 && <td style={{ padding: "5px 8px", color: "#4ade80" }}>�?�</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {bulkPreview.rows.length > 5 && <div style={{ padding: "6px 10px", fontSize: 11, color: "#166534", borderTop: "1px solid #bbf7d0" }}>+ {bulkPreview.rows.length - 5} more row{bulkPreview.rows.length - 5 !== 1 ? "s" : ""} not shown</div>}
                      </div>
                    )}

                    {/* Result summary */}
                    {bulkResult && (
                      <div style={{ background: "white", border: "1px solid #86efac", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: "#14532d", marginBottom: 4 }}>�o. Upload complete �?" {bulkResult.total} rows processed</div>
                        <div style={{ color: "#166534" }}>�z. Inserted: <strong>{bulkResult.inserted}</strong> · �Y"" Updated: <strong>{bulkResult.updated}</strong>{bulkResult.failed.length > 0 ? ` · �O Failed: ${bulkResult.failed.length}` : ""}</div>
                        {bulkResult.failed.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {bulkResult.failed.slice(0, 5).map((f) => (
                              <div key={f.row} style={{ fontSize: 11, color: "#b91c1c" }}>Row {f.row}: {f.reason}</div>
                            ))}
                            {bulkResult.failed.length > 5 && <div style={{ fontSize: 11, color: "#b91c1c" }}>�?�and {bulkResult.failed.length - 5} more</div>}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={submitBulkUpload}
                        disabled={!bulkPreview || bulkUploading}
                        style={{ background: !bulkPreview || bulkUploading ? "#bbf7d0" : "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: !bulkPreview || bulkUploading ? "not-allowed" : "pointer" }}
                      >
                        {bulkUploading ? "Uploading�?�" : `Upload ${bulkPreview ? bulkPreview.rows.length + " products" : ""}`}
                      </button>
                      {(bulkPreview || Object.keys(bulkImages).length > 0) && (
                        <button onClick={() => { setBulkPreview(null); setBulkResult(null); setBulkImages({}); }} style={{ background: "none", border: "1px solid #86efac", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#166534", cursor: "pointer" }}>
                          �Y-'️ Clear All
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Analytics Display */}
                {adminStats && (
                  <div style={{ background: "#f0f9ff", border: "1px solid #0284c7", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0c4a6e", marginBottom: 10 }}>Business Analytics</h4>
                    <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid #e0f2fe" }}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Revenue</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>KSh {fmt(adminStats.totalRevenue)}</div>
                      </div>
                      <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid #e0f2fe" }}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Orders</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>{adminStats.totalOrders}</div>
                      </div>
                      <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid #e0f2fe" }}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Avg Order Value</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>KSh {fmt(parseInt(adminStats.averageOrderValue))}</div>
                      </div>
                      <div style={{ background: "white", padding: 10, borderRadius: 8, border: "1px solid #e0f2fe" }}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Inventory Status</div>
                        <div style={{ fontSize: 13, color: "#0c4a6e", fontWeight: 600 }}>
                          <span style={{ color: "#ea580c" }}>{adminStats.outOfStock} out</span> | <span style={{ color: "#f59e0b" }}>{adminStats.lowStock} low</span>
                        </div>
                      </div>
                    </div>
                    {adminStats.topProducts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0c4a6e", marginBottom: 6 }}>Top 5 Products (by orders)</div>
                        <div style={{ display: "grid", gap: 4 }}>
                          {adminStats.topProducts.map((p, i) => (
                            <div key={p.id} style={{ fontSize: 12, color: "var(--ink)", display: "flex", justifyContent: "space-between", paddingBottom: 4, borderBottom: i < adminStats.topProducts.length - 1 ? "1px solid #e0f2fe" : "none" }}>
                              <span>{i + 1}. {p.brand} {p.name}</span>
                              <span style={{ fontWeight: 600 }}>{p.count} order{p.count !== 1 ? "s" : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showSeoPanel && (
                  <div style={{ background: "#f0fdfa", border: "1px solid #0d9488", borderRadius: 10, padding: 14, marginBottom: 14, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#134e4a", margin: 0 }}>SEO Stats and Follow-up</h4>
                      <button onClick={() => void loadSeoAdminData()} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Refresh SEO</button>
                    </div>

                    {seoLoading && <div style={{ fontSize: 12, color: "#0f766e" }}>Loading SEO data...</div>}
                    {seoError && <div style={{ fontSize: 12, color: "#b91c1c" }}>{seoError}</div>}

                    {seoDashboard?.kpis && (
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 700 ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>GSC Clicks (30d)</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#134e4a" }}>{Math.round(seoDashboard.kpis.gscClicks || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>GSC CTR</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#134e4a" }}>{((seoDashboard.kpis.gscCtr || 0) * 100).toFixed(2)}%</div>
                        </div>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>GA Sessions (30d)</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#134e4a" }}>{Math.round(seoDashboard.kpis.gaSessions || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>Published Articles</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#134e4a" }}>{seoDashboard.kpis.publishedArticles || 0}</div>
                        </div>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>Open SEO Tasks</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#134e4a" }}>{seoDashboard.kpis.openTasks || 0}</div>
                        </div>
                        <div style={{ background: "white", border: "1px solid #ccfbf1", borderRadius: 8, padding: 10 }}>
                          <div style={{ fontSize: 11, color: "#115e59" }}>Overdue Tasks</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: (seoDashboard.kpis.overdueTasks || 0) > 0 ? "#b91c1c" : "#134e4a" }}>{seoDashboard.kpis.overdueTasks || 0}</div>
                        </div>
                      </div>
                    )}

                    {Array.isArray(seoDashboard?.followUp) && seoDashboard.followUp.length > 0 && (
                      <div style={{ background: "white", border: "1px solid #99f6e4", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#134e4a", marginBottom: 6 }}>Recommended Follow-up</div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {seoDashboard.followUp.map((item) => (
                            <div key={item.id} style={{ display: "grid", gap: 4, borderBottom: "1px solid #ccfbf1", paddingBottom: 6 }}>
                              <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{item.title}</div>
                              {item.notes && <div style={{ fontSize: 11, color: "#334155" }}>{item.notes}</div>}
                              <div>
                                <button
                                  onClick={() => void createSeoFollowUpTask({
                                    title: item.title,
                                    actionType: item.actionType || "content_task",
                                    sourceType: item.sourceType || "local",
                                    sourceRef: item.sourceRef || "",
                                    priority: item.priority || "medium",
                                    notes: item.notes || "",
                                  })}
                                  style={{ ...solidBtn, padding: "6px 10px", fontSize: 12 }}
                                >
                                  Create Task
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ background: "white", border: "1px solid #99f6e4", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#134e4a" }}>Competitor Benchmark</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => void loadSeoCompetitorBenchmark()} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Reload Benchmark</button>
                          <button onClick={exportSeoCompetitorBenchmark} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Export JSON</button>
                          <label style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                            Import JSON
                            <input
                              type="file"
                              accept="application/json,.json"
                              onChange={(e) => void importSeoCompetitorBenchmarkFile(e.target.files?.[0])}
                              style={{ display: "none" }}
                            />
                          </label>
                          <button
                            onClick={() => setSeoBenchmarkDraft(createSeoBenchmarkDraft(seoBenchmarkInfo?.item, seoBenchmarkInfo?.effectiveBenchmark))}
                            style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}
                          >
                            Reset Form
                          </button>
                        </div>
                      </div>

                      {seoBenchmarkInfo?.message && (
                        <div style={{ fontSize: 11, color: "#115e59", marginBottom: 8 }}>{seoBenchmarkInfo.message}</div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 920 ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                        <input value={seoBenchmarkDraft.wordCount} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, wordCount: e.target.value }))} placeholder="Word count" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.headingCount} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, headingCount: e.target.value }))} placeholder="Headings" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.internalLinks} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, internalLinks: e.target.value }))} placeholder="Internal links" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.externalLinks} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, externalLinks: e.target.value }))} placeholder="External links" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.source} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, source: e.target.value }))} placeholder="Source" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 920 ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                        <input value={seoBenchmarkDraft.keywordDensityMin} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, keywordDensityMin: e.target.value }))} placeholder="Keyword density min" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.keywordDensityMax} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, keywordDensityMax: e.target.value }))} placeholder="Keyword density max" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.metaTitleMin} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, metaTitleMin: e.target.value }))} placeholder="Meta title min" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.metaTitleMax} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, metaTitleMax: e.target.value }))} placeholder="Meta title max" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.metaDescriptionMin} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, metaDescriptionMin: e.target.value }))} placeholder="Meta description min" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 920 ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <input value={seoBenchmarkDraft.metaDescriptionMax} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, metaDescriptionMax: e.target.value }))} placeholder="Meta description max" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <input value={seoBenchmarkDraft.notes} onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                      </div>

                      {seoBenchmarkInfo?.effectiveBenchmark && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {Object.entries(seoBenchmarkInfo.effectiveBenchmark).map(([key, value]) => (
                            <span key={key} style={{ border: "1px solid #ccfbf1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#115e59", background: "#f0fdfa" }}>
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={seoBenchmarkDraft.snapshotsText}
                        onChange={(e) => setSeoBenchmarkDraft((prev) => ({ ...prev, snapshotsText: e.target.value }))}
                        placeholder={'Competitor snapshots JSON array, for example: [{"domain":"example.com","keyword":"gaming phone kenya","wordCount":1500,"headingCount":8,"internalLinks":6,"externalLinks":2,"keywordDensity":1.4,"metaTitleLength":58,"metaDescriptionLength":148}]'}
                        rows={6}
                        style={{ width: "100%", marginTop: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                      />

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <button onClick={() => void saveSeoCompetitorBenchmark()} style={{ ...solidBtn, padding: "7px 12px", fontSize: 12 }}>
                          Save Benchmark
                        </button>
                        <button onClick={() => void runBlogSeoRescore()} style={{ ...outlineBtn, padding: "7px 12px", fontSize: 12 }}>
                          Re-score Blog Articles
                        </button>
                        <div style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center" }}>
                          Paste SpyFu-style snapshot metrics here to auto-derive a new baseline.
                        </div>
                      </div>
                    </div>

                    <div style={{ background: "white", border: "1px solid #99f6e4", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#134e4a", marginBottom: 6 }}>Create SEO Follow-up</div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 860 ? "1fr" : "2fr 1fr 1fr", gap: 8 }}>
                        <input
                          value={seoTaskDraft.title}
                          onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Task title"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                        <select value={seoTaskDraft.actionType} onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, actionType: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                          <option value="content_task">Content task</option>
                          <option value="rewrite_task">Rewrite task</option>
                          <option value="publish_queue">Publish queue</option>
                          <option value="send_reminder">Send reminder</option>
                        </select>
                        <input type="date" value={seoTaskDraft.dueAt} onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, dueAt: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 860 ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <input value={seoTaskDraft.sourceRef} onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, sourceRef: e.target.value }))} placeholder="Source reference (optional)" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }} />
                        <select value={seoTaskDraft.priority} onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, priority: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <textarea value={seoTaskDraft.notes} onChange={(e) => setSeoTaskDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" rows={2} style={{ width: "100%", marginTop: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", resize: "vertical" }} />
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => {
                            if (!seoTaskDraft.title.trim()) {
                              setSeoError("Task title is required.");
                              return;
                            }
                            void createSeoFollowUpTask(seoTaskDraft);
                            setSeoTaskDraft({ title: "", actionType: "content_task", sourceType: "local", sourceRef: "", dueAt: "", notes: "", priority: "medium" });
                          }}
                          style={{ ...solidBtn, padding: "7px 12px", fontSize: 12 }}
                        >
                          Save SEO Task
                        </button>
                      </div>
                    </div>

                    {seoTasks.length > 0 && (
                      <div style={{ background: "white", border: "1px solid #99f6e4", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#134e4a", marginBottom: 6 }}>SEO Task Follow-up Queue</div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {seoTasks.slice(0, 12).map((task) => (
                            <div key={task.id} style={{ border: "1px solid #ccfbf1", borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{task.title}</div>
                                <div style={{ fontSize: 11, color: "#334155" }}>{task.priority} · {task.status}</div>
                              </div>
                              <div style={{ fontSize: 11, color: "#475569" }}>{task.actionType} {task.sourceRef ? `· ${task.sourceRef}` : ""}</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {task.status !== "completed" && (
                                  <button onClick={() => void updateSeoTaskStatus(task.id, "completed")} style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}>Mark Complete</button>
                                )}
                                {task.status === "completed" && (
                                  <button onClick={() => void updateSeoTaskStatus(task.id, "open")} style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}>Reopen</button>
                                )}
                                <button onClick={() => void remindSeoTask(task.id)} style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}>Send Reminder</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showBlogAdminPanel && (
                  <div style={{ background: "#eff6ff", border: "1px solid #60a5fa", borderRadius: 10, padding: 14, marginBottom: 14, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>Blog Admin</h4>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => void loadAdminBlogArticles()} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Refresh Articles</button>
                        <button onClick={() => void runBlogPublishSweep()} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Run Publish Sweep</button>
                      </div>
                    </div>

                    {blogAdminError && <div style={{ fontSize: 12, color: "#b91c1c" }}>{blogAdminError}</div>}
                    {blogAdminLoading && <div style={{ fontSize: 12, color: "#1e40af" }}>Loading blog admin data...</div>}

                    <div style={{ background: "white", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
                        {blogAdminEditingId ? "Edit Blog Article" : "Create Blog Article"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "2fr 1fr", gap: 8 }}>
                        <input
                          value={blogAdminDraft.title}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Article title"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                        <input
                          value={blogAdminDraft.slug}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, slug: e.target.value }))}
                          placeholder="Slug (optional)"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <input
                          value={blogAdminDraft.focusKeyword}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                          placeholder="Focus keyword"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                        <select
                          value={blogAdminDraft.status}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, status: e.target.value }))}
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "#fff" }}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <input
                          type="datetime-local"
                          value={blogAdminDraft.publishedAt}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, publishedAt: e.target.value }))}
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                        <div style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center" }}>
                          Optional publish date/time. Future timestamps stay hidden from public blog/sitemap until due.
                        </div>
                      </div>
                      <textarea
                        value={blogAdminDraft.excerpt}
                        onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                        placeholder="Short excerpt"
                        rows={2}
                        style={{ width: "100%", marginTop: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", resize: "vertical" }}
                      />
                      <textarea
                        value={blogAdminDraft.content}
                        onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Article content (HTML supported)"
                        rows={5}
                        style={{ width: "100%", marginTop: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", resize: "vertical" }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <input
                          value={blogAdminDraft.metaTitle}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, metaTitle: e.target.value }))}
                          placeholder="Meta title"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                        <input
                          value={blogAdminDraft.metaDescription}
                          onChange={(e) => setBlogAdminDraft((prev) => ({ ...prev, metaDescription: e.target.value }))}
                          placeholder="Meta description"
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <button onClick={() => void saveBlogAdminDraft()} style={{ ...solidBtn, padding: "7px 12px", fontSize: 12 }}>
                          {blogAdminEditingId ? "Update Article" : "Create Article"}
                        </button>
                        <button onClick={() => previewBlogPost(null)} style={{ ...outlineBtn, padding: "7px 12px", fontSize: 12 }}>
                          Preview Draft
                        </button>
                        <button onClick={clearBlogAdminDraft} style={{ ...outlineBtn, padding: "7px 12px", fontSize: 12 }}>
                          Clear
                        </button>
                      </div>
                    </div>

                    {blogAdminItems.length > 0 && (
                      <div style={{ background: "white", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
                          Existing Blog Articles ({blogAdminItems.length})
                        </div>
                        <div style={{ display: "grid", gap: 6, maxHeight: 320, overflow: "auto" }}>
                          {blogAdminItems.map((item) => (
                            <div key={item.id} style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
                                <div style={{ fontSize: 11, color: "#1e3a8a" }}>
                                  {item.status} · SEO {Math.round(Number((item.seoScoreCurrent ?? item.seoScore) || 0))}
                                  {Number(item.seoScoreDelta || 0) !== 0 && ` (${item.seoScoreDelta > 0 ? "+" : ""}${Math.round(Number(item.seoScoreDelta || 0))})`}
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: "#475569" }}>/blog/{item.slug}</div>
                              <div style={{ fontSize: 11, color: "#475569" }}>
                                Publish time: {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Not set"}
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button onClick={() => startBlogAdminEdit(item)} style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}>Edit</button>
                                <button onClick={() => previewBlogPost(item)} style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}>Preview</button>
                                <button
                                  onClick={() => setOpenBlogSeoDiagnosticsId((prev) => (prev === item.id ? "" : item.id))}
                                  style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}
                                >
                                  {openBlogSeoDiagnosticsId === item.id ? "Hide Diagnostics" : "Diagnostics"}
                                </button>
                                {item.status !== "published" && (
                                  <button
                                    onClick={() => void publishBlogAdminItem(item)}
                                    style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}
                                  >
                                    Publish
                                  </button>
                                )}
                                {item.status === "published" && (
                                  <button
                                    onClick={() => void unpublishBlogAdminItem(item)}
                                    style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}
                                  >
                                    Unpublish
                                  </button>
                                )}
                                <button
                                  onClick={() => void deleteBlogAdminItem(item)}
                                  style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11, borderColor: "#dc2626", color: "#dc2626" }}
                                >
                                  Delete
                                </button>
                              </div>
                              {openBlogSeoDiagnosticsId === item.id && item.seoInsights && (
                                <div style={{ border: "1px solid #dbeafe", borderRadius: 8, background: "#f8fbff", padding: 8, display: "grid", gap: 8 }}>
                                  <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                                    <div style={{ background: "white", border: "1px solid #e0e7ff", borderRadius: 8, padding: 8 }}><div style={{ fontSize: 10, color: "#64748b" }}>Yoast</div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>{item.seoInsights.yoast || 0}</div></div>
                                    <div style={{ background: "white", border: "1px solid #e0e7ff", borderRadius: 8, padding: 8 }}><div style={{ fontSize: 10, color: "#64748b" }}>Rank Math</div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>{item.seoInsights.rankMath || 0}</div></div>
                                    <div style={{ background: "white", border: "1px solid #e0e7ff", borderRadius: 8, padding: 8 }}><div style={{ fontSize: 10, color: "#64748b" }}>Jasper</div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>{item.seoInsights.jasper || 0}</div></div>
                                    <div style={{ background: "white", border: "1px solid #e0e7ff", borderRadius: 8, padding: 8 }}><div style={{ fontSize: 10, color: "#64748b" }}>Competitive</div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>{item.seoInsights.competitive || 0}</div></div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Words: {item.seoInsights.wordCount || 0}</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Headings: {item.seoInsights.headingCount || 0}</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Internal links: {item.seoInsights.internalLinkCount || 0}</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>External links: {item.seoInsights.externalLinkCount || 0}</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Keyword density: {item.seoInsights.keywordDensity || 0}%</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Meta title: {item.seoInsights.metaTitleLength || 0} chars</span>
                                    <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155", background: "white" }}>Meta description: {item.seoInsights.metaDescriptionLength || 0} chars</span>
                                  </div>
                                  {Array.isArray(item.seoRecommendations) && item.seoRecommendations.length > 0 && (
                                    <div style={{ border: "1px solid #dbeafe", borderRadius: 8, background: "white", padding: 8, display: "grid", gap: 6 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a" }}>Recommended Next Actions</div>
                                      {item.seoRecommendations.map((rec, idx) => (
                                        <div key={`${item.id}-rec-${rec.id || idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, display: "grid", gap: 4 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                            <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 700 }}>{rec.title}</div>
                                            <div style={{ fontSize: 10, color: rec.priority === "high" ? "#b91c1c" : rec.priority === "medium" ? "#92400e" : "#334155", textTransform: "uppercase", fontWeight: 700 }}>{rec.priority || "medium"}</div>
                                          </div>
                                          {rec.notes && <div style={{ fontSize: 11, color: "#475569" }}>{rec.notes}</div>}
                                          <div>
                                            <button
                                              onClick={() => void createSeoFollowUpTask({
                                                title: rec.title,
                                                actionType: rec.actionType || "content_task",
                                                sourceType: "blog_article",
                                                sourceRef: item.id,
                                                priority: rec.priority || "medium",
                                                notes: rec.notes || "",
                                              })}
                                              style={{ ...outlineBtn, padding: "5px 8px", fontSize: 11 }}
                                            >
                                              Create Task
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ display: "grid", gap: 8 }}>
                  {catalog.map((p) => {
                    const stockMeta = getStockMeta(p.stockStatus);
                    return (
                      <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{p.brand} {p.name}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.spec}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
                            <span style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "3px 8px", background: "#f9fafb", color: "var(--text-mid)", fontSize: 11, fontWeight: 700 }}>Qty: {p.stockQuantity ?? 10}</span>
                            <span style={{ border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "3px 8px", background: stockMeta.bg, color: stockMeta.color, fontSize: 11, fontWeight: 700 }}>{stockMeta.label}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-mid)" }}>Nafuu: {fmt(p.price)} · Market: {fmt(p.market)} · {p.category}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => startEditProduct(p)} style={outlineBtn}>Edit</button>
                          <button onClick={() => setProductStockStatus(p.id, "in_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>In stock</button>
                          <button onClick={() => setProductStockStatus(p.id, "low_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Low</button>
                          <button onClick={() => setProductStockStatus(p.id, "out_of_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Out</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "profile") {
    return (
      <>
        <PageMeta page="profile" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>My Profile</h1>
          <p style={{ ...pMuted, marginBottom: 16 }}>
            Inspired by major marketplaces, your Nafuu profile keeps delivery details, payment preferences, and account basics in one place.
          </p>

          {!activeUser ? (
            <div style={panel}>
              <p style={{ ...pMuted, marginBottom: 12 }}>Sign in to manage your profile, payment methods, and address book.</p>
              <button onClick={() => openAuth("signin")} style={solidBtn}>Sign in</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {profileMsg && (
                <div style={{ ...panel, border: "1px solid #d8ece0", background: "#f3faf5", color: "var(--green)", fontWeight: 600 }}>
                  {profileMsg}
                </div>
              )}

              <div style={{ ...panel, display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "220px 1fr", gap: 16 }}>
                <div style={{ display: "grid", gap: 10, justifyItems: viewportWidth < 900 ? "start" : "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: 999, background: "#f4f4f2", border: "1px solid var(--line)", overflow: "hidden", display: "grid", placeItems: "center" }}>
                    {profileData.profilePicture ? (
                      <img src={profileData.profilePicture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 34, fontWeight: 800, color: "var(--ink-soft)" }}>
                        {(profileData.fullName || activeUser.name || "N").trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <label style={{ ...outlineBtn, textAlign: "center", display: "inline-block" }}>
                    Upload photo
                    <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} style={{ display: "none" }} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 760 ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Full Name</label>
                    <input value={profileData.fullName} onChange={(e) => setProfileData((prev) => ({ ...prev, fullName: e.target.value }))} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Email</label>
                    <input value={activeUser.email || ""} readOnly style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#f8f8f6" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Primary Phone</label>
                    <input value={profileData.phone} onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="07XXXXXXXX" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Alternative Phone</label>
                    <input value={profileData.altPhone} onChange={(e) => setProfileData((prev) => ({ ...prev, altPhone: e.target.value }))} placeholder="Optional" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Bio</label>
                    <textarea rows={3} value={profileData.bio} onChange={(e) => setProfileData((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Tell us what tech you shop for most..." style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
                  </div>
                </div>
              </div>

              <div style={panel}>
                <h3 style={{ ...h3, marginBottom: 10 }}>Delivery Address Book</h3>
                <p style={{ ...pMuted, marginBottom: 12, fontSize: 13 }}>
                  Save multiple delivery points like Home, Work, or Recipient pickup and choose which one is your default at checkout.
                </p>

                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  {(profileData.addresses || []).map((address) => (
                    <div key={address.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: profileData.defaultAddressId === address.id ? "#f8fcf8" : "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{address.label || "Address"}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => setDefaultProfileAddress(address.id)} style={{ ...outlineBtn, padding: "8px 10px", fontSize: 12 }}>
                            {profileData.defaultAddressId === address.id ? "Default address" : "Set default"}
                          </button>
                          {(profileData.addresses || []).length > 1 && (
                            <button onClick={() => removeProfileAddress(address.id)} style={{ ...outlineBtn, padding: "8px 10px", fontSize: 12, borderColor: "#dc2626", color: "#dc2626" }}>Remove</button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 760 ? "1fr" : "1fr 1fr", gap: 10 }}>
                        <input value={address.label || ""} onChange={(e) => updateProfileAddress(address.id, "label", e.target.value)} placeholder="Address label" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <input value={address.recipientName || ""} onChange={(e) => updateProfileAddress(address.id, "recipientName", e.target.value)} placeholder="Recipient name" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <input value={address.phone || ""} onChange={(e) => updateProfileAddress(address.id, "phone", e.target.value)} placeholder="Recipient phone" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <input value={address.county || ""} onChange={(e) => updateProfileAddress(address.id, "county", e.target.value)} placeholder="County" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <input value={address.town || ""} onChange={(e) => updateProfileAddress(address.id, "town", e.target.value)} placeholder="Town / Area" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <input value={address.addressLine || ""} onChange={(e) => updateProfileAddress(address.id, "addressLine", e.target.value)} placeholder="Estate, house/apartment, street" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                        <div style={{ gridColumn: "1 / -1" }}>
                          <textarea rows={2} value={address.landmark || ""} onChange={(e) => updateProfileAddress(address.id, "landmark", e.target.value)} placeholder="Landmark, nearest stage, gate color" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 12 }}>
                  <h4 style={{ ...h3, marginBottom: 8, fontSize: 14 }}>Add another address</h4>
                  <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 760 ? "1fr" : "1fr 1fr", gap: 10 }}>
                    <input value={addressDraft.label || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, label: e.target.value }))} placeholder="Label e.g. Home / Work" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={addressDraft.recipientName || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, recipientName: e.target.value }))} placeholder="Recipient name" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={addressDraft.phone || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Recipient phone" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={addressDraft.county || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, county: e.target.value }))} placeholder="County" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={addressDraft.town || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, town: e.target.value }))} placeholder="Town / Area" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={addressDraft.addressLine || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, addressLine: e.target.value }))} placeholder="Address line" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <textarea rows={2} value={addressDraft.landmark || ""} onChange={(e) => setAddressDraft((prev) => ({ ...prev, landmark: e.target.value }))} placeholder="Landmark or instructions" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button onClick={addProfileAddress} style={outlineBtn}>Add address</button>
                  </div>
                </div>
              </div>

              <div style={panel}>
                <h3 style={{ ...h3, marginBottom: 10 }}>Payment Preferences</h3>
                <p style={{ ...pMuted, marginBottom: 10, fontSize: 13 }}>
                  Similar to global marketplaces, saved payment methods speed up checkout. For security, only masked card details are stored in your profile.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 760 ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>M-Pesa Number</label>
                    <input value={profileData.mpesaPhone} onChange={(e) => setProfileData((prev) => ({ ...prev, mpesaPhone: e.target.value }))} placeholder="07XXXXXXXX" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>M-Pesa Account Name</label>
                    <input value={profileData.mpesaName} onChange={(e) => setProfileData((prev) => ({ ...prev, mpesaName: e.target.value }))} placeholder="Name on M-Pesa" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 12, marginTop: 4 }}>
                  <h4 style={{ ...h3, marginBottom: 8, fontSize: 14 }}>Saved Cards</h4>
                  <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 1fr 1fr auto", gap: 8, marginBottom: 10 }}>
                    <input value={cardDraft.holder} onChange={(e) => setCardDraft((prev) => ({ ...prev, holder: e.target.value }))} placeholder="Card holder" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={cardDraft.number} onChange={(e) => setCardDraft((prev) => ({ ...prev, number: e.target.value }))} placeholder="Card number" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input value={cardDraft.expMonth} onChange={(e) => setCardDraft((prev) => ({ ...prev, expMonth: e.target.value }))} placeholder="MM" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                      <input value={cardDraft.expYear} onChange={(e) => setCardDraft((prev) => ({ ...prev, expYear: e.target.value }))} placeholder="YYYY" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    </div>
                    <button onClick={addProfileCard} style={outlineBtn}>Add card</button>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {(profileData.cards || []).length === 0 ? (
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>No card saved yet.</div>
                    ) : (
                      (profileData.cards || []).map((card) => (
                        <div key={card.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{card.brand} �?��?��?��?� {card.last4}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{card.holder} · Exp {card.expMonth}/{card.expYear}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => setProfileData((prev) => ({ ...prev, defaultCardId: card.id }))}
                              style={{ ...outlineBtn, padding: "8px 10px", fontSize: 12 }}
                            >
                              {profileData.defaultCardId === card.id ? "Default" : "Set default"}
                            </button>
                            <button onClick={() => removeProfileCard(card.id)} style={{ ...outlineBtn, padding: "8px 10px", fontSize: 12, borderColor: "#dc2626", color: "#dc2626" }}>Remove</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={panel}>
                <h3 style={{ ...h3, marginBottom: 8 }}>Notifications</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
                    <input type="checkbox" checked={profileData.notifyEmail} onChange={(e) => setProfileData((prev) => ({ ...prev, notifyEmail: e.target.checked }))} />
                    Order updates by email
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
                    <input type="checkbox" checked={profileData.notifySms} onChange={(e) => setProfileData((prev) => ({ ...prev, notifySms: e.target.checked }))} />
                    Order updates by SMS
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
                    <input type="checkbox" checked={profileData.notifyDeals} onChange={(e) => setProfileData((prev) => ({ ...prev, notifyDeals: e.target.checked }))} />
                    Weekly deals and hot-drop alerts
                  </label>
                </div>
              </div>

              <div style={panel}>
                <h3 style={{ ...h3, marginBottom: 8 }}>Security Center</h3>
                <p style={{ ...pMuted, marginBottom: 12 }}>
                  Passwords, social sign-in methods, sessions, and account verification stay secured by Clerk. Use the buttons below to manage sensitive account settings safely.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 760 ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "#fafaf9" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>Email Verification</div>
                    <div style={{ marginTop: 6, fontWeight: 700, color: "var(--ink)" }}>
                      {window.Clerk?.user?.primaryEmailAddress?.verification?.status === "verified" ? "Verified" : "Pending verification"}
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "#fafaf9" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>Sign-in Methods</div>
                    <div style={{ marginTop: 6, fontWeight: 700, color: "var(--ink)" }}>
                      {(window.Clerk?.user?.externalAccounts?.length || 0) > 0 ? `${window.Clerk.user.externalAccounts.length} social account(s) linked` : "Email / password or social managed by Clerk"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={openSecurityCenter} style={solidBtn}>Open account security</button>
                  <button onClick={signOut} style={outlineBtn}>Sign out this device</button>
                </div>
              </div>

              {/* Recent Orders */}
              {userOrders.length > 0 && (
                <div style={panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ ...h3, margin: 0 }}>Recent Orders</h3>
                    <button onClick={() => setPage("my-orders")} style={{ ...outlineBtn, padding: "6px 14px", fontSize: 12 }}>
                      View all
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {userOrders.slice(0, 3).map((order) => {
                      const statusKey = computeLiveStatus(order);
                      const step = STATUS_STEPS[stepIdx(statusKey)] || STATUS_STEPS[0];
                      return (
                        <div key={order.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "grid", gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>{order.id}</span>
                            <span style={{ background: "#f3faf5", border: "1px solid #d8ece0", color: "var(--green)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                              {step.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-mid)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <span>{fmt(order.total || order.price)}</span>
                            <span>{new Date(order.timestamp).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span>{order.itemCount || 1} item{(order.itemCount || 1) !== 1 ? "s" : ""}</span>
                          </div>
                          <button
                            onClick={() => { setTrackRef(order.id); setPage("track"); setTimeout(trackOrder, 50); }}
                            style={{ ...outlineBtn, padding: "5px 12px", fontSize: 12, alignSelf: "start", marginTop: 2 }}
                          >
                            Track
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => void saveProfileData(profileData, "Profile and payment details saved.")}
                  disabled={profileSaving}
                  style={{ ...solidBtn, opacity: profileSaving ? 0.65 : 1 }}
                >
                  {profileSaving ? "Saving..." : "Save profile"}
                </button>
                <button onClick={() => setPage("home")} style={outlineBtn}>Back home</button>
                <button onClick={() => setPage("my-orders")} style={outlineBtn}>View my orders</button>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "my-orders") {
    return (
      <>
        <PageMeta page="myOrders" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>My Orders</h1>
          {!activeUser ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 12 }}>Sign in to view orders tied to your account.</p>
              <button onClick={() => openAuth("signin")} style={solidBtn}>Sign in</button>
            </div>
          ) : userOrders.length === 0 ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 8 }}>No orders yet for <strong>{activeUser.email}</strong>.</p>
              <button onClick={() => setPage("products")} style={solidBtn}>Start Shopping</button>
            </div>
          ) : (
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {userOrders.map((order) => {
                const statusKey = computeLiveStatus(order);
                const step = STATUS_STEPS[stepIdx(statusKey)] || STATUS_STEPS[0];
                return (
                  <div key={order.id} style={{ ...panel, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Reference</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>{order.id}</div>
                      </div>
                      <span style={{ border: "1px solid #d8ece0", background: "#f3faf5", color: "var(--green)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, alignSelf: "start" }}>
                        {step.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 700 ? "1fr" : "1fr 1fr 1fr", gap: 8, color: "var(--text-mid)", fontSize: 13 }}>
                      <div>Items: <strong style={{ color: "var(--ink)" }}>{order.itemCount || 1}</strong></div>
                      <div>Total: <strong style={{ color: "var(--ink)" }}>{fmt(order.total || order.price)}</strong></div>
                      <div>Placed: <strong style={{ color: "var(--ink)" }}>{new Date(order.timestamp).toLocaleDateString()}</strong></div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-mid)" }}>{step.detail}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <button onClick={() => { setTrackRef(order.id); setPage("track"); setTimeout(trackOrder, 50); }} style={solidBtn}>Track</button>
                      <button onClick={() => setPage("products")} style={outlineBtn}>Shop again</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "blog") {
    return (
      <>
        <PageMeta page="blog" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "44px 24px" }}>
          <div style={{ ...panel, marginBottom: 16, display: "grid", gap: 8 }}>
            <h1 style={{ ...h2, marginBottom: 0 }}>Tech Journal</h1>
            <p style={pMuted}>
              Practical buying guides, maintenance tips, and SEO-driven electronics insights from Nafuu Mart.
            </p>
          </div>

          {blogError && (
            <div style={{ ...panel, border: "1px solid #fecaca", background: "#fff5f5", color: "#991b1b", marginBottom: 12 }}>
              {blogError}
            </div>
          )}

          {blogLoading ? (
            <div style={panel}>Loading articles...</div>
          ) : blogPosts.length === 0 ? (
            <div style={panel}>No published articles yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 1fr", gap: 14 }}>
              {blogPosts.map((post) => (
                <article
                  key={post.id || post.slug}
                  style={{ ...panel, display: "grid", gap: 10, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedBlogPost(post);
                    setSelectedBlogSlug(slugifySegment(post.slug));
                    setPage("blog-post");
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)", fontWeight: 700 }}>
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Draft"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", border: "1px solid #d8ece0", background: "#f3faf5", borderRadius: 999, padding: "4px 10px" }}>
                      SEO score {Math.round(Number(post.seoScore || 0))}
                    </span>
                  </div>
                  <h3 style={{ ...h3, margin: 0, fontSize: 21 }}>{post.title}</h3>
                  <p style={{ ...pMuted, margin: 0 }}>{buildExcerpt(post, 160)}</p>
                  <button
                    style={{ ...outlineBtn, justifySelf: "start" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedBlogPost(post);
                      setSelectedBlogSlug(slugifySegment(post.slug));
                      setPage("blog-post");
                    }}
                  >
                    Read article
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "blog-post") {
    const articleSlug = slugifySegment(selectedBlogPost?.slug || selectedBlogSlug);
    const articleTitle = selectedBlogPost?.metaTitle || selectedBlogPost?.title || "Tech Article - Nafuu Mart";
    const articleDescription = selectedBlogPost?.metaDescription || buildExcerpt(selectedBlogPost, 155) || "Read the latest tech insights from Nafuu Mart.";
    const articleCanonical = articleSlug
      ? `${window.location.origin}/blog/${articleSlug}`
      : `${window.location.origin}/blog`;

    return (
      <>
        <PageMeta
          page="blogPost"
          additionalMeta={{
            title: articleTitle,
            description: articleDescription,
            canonical: articleCanonical,
            ogType: "article",
            ogUrl: articleCanonical,
            keywords: selectedBlogPost?.focusKeyword || "nafuu mart tech journal",
          }}
        />
        {selectedBlogPost && (
          <BlogArticleMeta
            article={{
              title: articleTitle,
              description: articleDescription,
              datePublished: selectedBlogPost.publishedAt || selectedBlogPost.createdAt || undefined,
              dateModified: selectedBlogPost.updatedAt || selectedBlogPost.publishedAt || undefined,
              url: articleCanonical,
            }}
          />
        )}
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px" }}>
          {selectedBlogPost?._isPreview && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "8px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#713f12" }}>PREVIEW MODE — This article is not published</span>
              <button
                onClick={() => {
                  setSelectedBlogPost(null);
                  setPage("admin");
                }}
                style={{ ...outlineBtn, padding: "5px 10px", fontSize: 12 }}
              >
                Back to Admin
              </button>
            </div>
          )}
          {!selectedBlogPost?._isPreview && (
            <button onClick={() => setPage("blog")} style={linkBtn}>Back to Tech Journal</button>
          )}

          {blogError && (
            <div style={{ ...panel, border: "1px solid #fecaca", background: "#fff5f5", color: "#991b1b", marginTop: 12 }}>
              {blogError}
            </div>
          )}

          {blogLoading && <div style={{ ...panel, marginTop: 12 }}>Loading article...</div>}

          {!blogLoading && !selectedBlogPost && (
            <div style={{ ...panel, marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ ...pMuted, margin: 0 }}>This article is unavailable or still unpublished.</div>
              <button onClick={() => setPage("blog")} style={solidBtn}>Browse Articles</button>
            </div>
          )}

          {!blogLoading && selectedBlogPost && (
            <article style={{ ...panel, marginTop: 12, padding: viewportWidth < 760 ? 18 : 24 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {selectedBlogPost.publishedAt ? new Date(selectedBlogPost.publishedAt).toLocaleDateString() : "Unpublished"}
                </span>
                {selectedBlogPost.focusKeyword && (
                  <span style={{ fontSize: 12, color: "var(--green)", border: "1px solid #d8ece0", borderRadius: 999, padding: "4px 10px", background: "#f3faf5" }}>
                    {selectedBlogPost.focusKeyword}
                  </span>
                )}
              </div>

              <h1 style={{ ...h2, marginBottom: 10 }}>{selectedBlogPost.title}</h1>
              <p style={{ ...pMuted, marginBottom: 18 }}>{buildExcerpt(selectedBlogPost, 240)}</p>

              <div
                style={{ color: "var(--ink-soft)", lineHeight: 1.8, fontSize: 15 }}
                dangerouslySetInnerHTML={{ __html: selectedBlogPost.content || "<p>Content unavailable.</p>" }}
              />

              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setPage("blog")} style={outlineBtn}>More Articles</button>
                {articleSlug && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/blog/${articleSlug}`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                    }}
                    style={solidBtn}
                  >
                    Copy Link
                  </button>
                )}
              </div>
            </article>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "status") {
    const checks = Object.entries(systemStatus?.checks || {});
    return (
      <>
        <PageMeta page="status" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>System Status</h1>
          <p style={{ ...pMuted, marginBottom: 14 }}>
            Live readiness diagnostics for API, auth, database, and payments.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={() => void loadSystemStatus()} style={solidBtn}>
              {systemStatusLoading ? "Refreshing..." : "Refresh Status"}
            </button>
            <button onClick={() => setPage("home")} style={outlineBtn}>Back Home</button>
          </div>

          {systemStatusError && (
            <div style={{ ...panel, border: "1px solid #fecaca", background: "#fff5f5", color: "#991b1b", marginBottom: 12 }}>
              {systemStatusError}
            </div>
          )}

          {systemStatus && (
            <>
              <div style={{ ...panel, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 700 ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "#fafaf9" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>API Health</div>
                    <div style={{ marginTop: 4, fontWeight: 800, color: systemStatus.apiOk ? "#166534" : "#b91c1c" }}>
                      {systemStatus.apiOk ? "Online" : "Unavailable"}
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, background: "#fafaf9" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Backend Readiness</div>
                    <div style={{ marginTop: 4, fontWeight: 800, color: systemStatus.ready ? "#166534" : "#b91c1c" }}>
                      {systemStatus.ready ? "Ready" : "Not Ready"}
                    </div>
                  </div>
                </div>
                {systemStatus.message && <p style={{ ...pMuted, marginTop: 10 }}>{systemStatus.message}</p>}
                <p style={{ ...pMuted, marginTop: 6 }}>Auth mode: <strong>{systemStatus.envMode || "auto"}</strong></p>
              </div>

              <div style={{ ...panel, marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, marginBottom: 10 }}>Checks</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {checks.length === 0 && <div style={{ ...pMuted }}>No check data returned.</div>}
                  {checks.map(([key, ok]) => (
                    <div key={key} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, background: "#fff" }}>
                      <span style={{ color: "var(--ink)", fontWeight: 700 }}>{key}</span>
                      <span style={{ color: ok ? "#166534" : "#b91c1c", fontWeight: 700 }}>{ok ? "OK" : "Missing"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!systemStatus.ready && systemStatus.missingKeys.length > 0 && (
                <div style={{ ...panel, border: "1px solid #fed7aa", background: "#fff7ed" }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8, color: "#9a3412" }}>Missing Setup</h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#9a3412" }}>
                    {systemStatus.missingKeys.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray(systemStatus.preflightRows) && systemStatus.preflightRows.length > 0 && (
                <div style={{ ...panel, marginTop: 12 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>Preflight Detail</h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    {systemStatus.preflightRows.map((row) => (
                      <div key={row.key} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 2, background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ color: "var(--ink)", fontWeight: 700 }}>{row.key}</span>
                          <span style={{ color: row.present ? "#166534" : row.required ? "#b91c1c" : "#6b7280", fontWeight: 700 }}>
                            {row.present ? "OK" : row.required ? "Missing" : "Optional"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{row.scope} · {row.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "info" && infoPage) {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px" }}>
          <button onClick={() => setPage("home")} style={linkBtn}>Back to Home</button>
          <article style={{ ...panel, padding: 24 }}>
            <h1 style={{ ...h2, marginBottom: 14 }}>{infoPage.title}</h1>
            <p style={{ ...pMuted, marginBottom: 14 }}>{infoPage.summary}</p>
            {Array.isArray(infoPage.points) && infoPage.points.length > 0 && (
              <ul style={{ paddingLeft: 18, color: "var(--ink-soft)", lineHeight: 1.9 }}>
                {infoPage.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setPage("products")} style={solidBtn}>Continue Shopping</button>
              <button onClick={() => { setTrackedOrder(null); setTrackRef(""); setPage("track"); }} style={outlineBtn}>Track Order</button>
            </div>
          </article>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "track") {
    return (
      <>
        <PageMeta page="track" />
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "50px 24px" }}>
          <h1 style={h2}>Order Tracking</h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={trackRef} onChange={(e) => setTrackRef(e.target.value.toUpperCase())} placeholder="NFU-XXXXX" style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontWeight: 700, letterSpacing: 1 }} />
            <button onClick={trackOrder} style={solidBtn}>Track</button>
          </div>
          {trackError && <div style={{ color: "#b91c1c", marginBottom: 10 }}>{trackError}</div>}
          {trackedOrder && (
            <div style={panel}>
              <div style={{ marginBottom: 14, color: "var(--text-mid)" }}>
                Ref: <strong>{trackedOrder.id}</strong>
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  Items: <strong style={{ color: "var(--ink)" }}>{trackedOrder.itemCount || 1}</strong>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  Total: <strong style={{ color: "var(--ink)" }}>{fmt(trackedOrder.total || trackedOrder.price)}</strong>
                </div>
              </div>
              {(() => {
                const liveStatus = computeLiveStatus(trackedOrder);
                const idx = stepIdx(liveStatus);
                const currentStep = STATUS_STEPS[idx] || STATUS_STEPS[0];
                return (
                  <>
                    <div style={{ marginBottom: 14, padding: "10px 12px", background: "#f3faf5", border: "1px solid #d8ece0", borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Current Status</div>
                      <div style={{ fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{currentStep.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 2 }}>{currentStep.detail}</div>
                    </div>

                    <div style={{ position: "relative", paddingLeft: 4 }}>
                      {STATUS_STEPS.map((s, i) => {
                        const done = i <= idx;
                        const active = i === idx;
                        return (
                          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, alignItems: "start", marginBottom: i === STATUS_STEPS.length - 1 ? 0 : 12 }}>
                            <div style={{ display: "grid", justifyItems: "center" }}>
                              <span style={{ width: 14, height: 14, borderRadius: 999, border: done ? "2px solid var(--green)" : "2px solid #cfcfc9", background: active ? "var(--green)" : done ? "#e7f6ed" : "#fff", marginTop: 2 }} />
                              {i < STATUS_STEPS.length - 1 && (
                                <span style={{ width: 2, height: 26, background: done ? "#7ecf9f" : "#e1e1db", marginTop: 3 }} />
                              )}
                            </div>
                            <div style={{ paddingBottom: 6 }}>
                              <div style={{ color: done ? "var(--ink)" : "var(--text-dim)", fontWeight: active ? 800 : 600, fontSize: 14 }}>
                                {s.label} {active ? "(Current)" : ""}
                              </div>
                              <div style={{ color: "var(--text-mid)", fontSize: 12, marginTop: 2 }}>{s.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "auth") {

    if (forcedClerkMode) {
      return (
        <>
          <style>{G}</style>
          {Nav()}
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 24px" }}>
            <div style={{ ...panel, border: "1px solid #f5d6a5", background: "#fffaf2", display: "grid", gap: 10 }}>
              <h1 style={{ ...h2, marginBottom: 0 }}>Clerk Configuration Required</h1>
              <p style={pMuted}>Set VITE_CLERK_PUBLISHABLE_KEY in your env file, then restart the app.</p>
              <button onClick={() => setPage("home")} style={solidBtn}>Back Home</button>
            </div>
          </div>
          <Footer />
        </>
      );
    }

    const showAuthPromo = viewportWidth >= 920;

    return (
      <>
        <style>{G}</style>
        <div style={{ height: "100svh", overflow: "hidden", background: "linear-gradient(145deg,#f7f9f4 0%,#edf5ff 55%,#fff7ef 100%)", display: "grid", placeItems: "center", padding: "10px" }}>
          <div style={{ width: "100%", maxWidth: 940, maxHeight: "calc(100svh - 20px)", display: "grid", gridTemplateColumns: showAuthPromo ? "0.95fr 1.05fr" : "1fr", background: "#fff", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.12)" }}>
            {showAuthPromo && <section style={{ padding: "26px 24px", background: "linear-gradient(165deg,#1f4338 0%,#2d5a4d 52%,#4f7669 100%)", color: "#f4f8f5", position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#ffd84d", color: "#1f4338", fontWeight: 800, display: "grid", placeItems: "center" }}>N</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700 }}>Nafuu Account</div>
              </div>
              <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 34, lineHeight: 1.08, marginBottom: 10 }}>Shop smarter from Mombasa</h2>
              <p style={{ color: "rgba(244,248,245,.88)", lineHeight: 1.65, maxWidth: 420 }}>
                One account for order history, warranty tracking, photo approvals, and faster checkout.
              </p>
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {[
                  "Track every order with one tap",
                  "Auto-fill delivery details at checkout"
                ].map((line) => (
                  <div key={line} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "9px 11px", fontSize: 13 }}>{line}</div>
                ))}
              </div>
            </section>}

            <section style={{ padding: showAuthPromo ? "22px 24px" : "18px 16px", overflowY: "auto", maxHeight: "calc(100svh - 20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 480 }}>
                {/* Title */}
                <div style={{ marginBottom: 22 }}>
                  <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", marginBottom: 4, lineHeight: 1.1 }}>
                    {authMode === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>
                    {authMode === "signin" ? "Sign in to continue to Nafuu Mart" : "One account for orders, tracking and checkout"}
                  </p>
                </div>

                {/* Message banner */}
                {authMsg && (
                  <div style={{
                    background: /sent|created|check your email/i.test(authMsg) ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${/sent|created|check your email/i.test(authMsg) ? "#bbf7d0" : "#fecaca"}`,
                    color: /sent|created|check your email/i.test(authMsg) ? "#166534" : "#991b1b",
                    borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, lineHeight: 1.5
                  }}>
                    {authMsg}
                  </div>
                )}

                {/* Form fields */}
                <div style={{ display: "grid", gap: 14 }}>
                  {authMode === "signup" && (
                    <div>
                      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: 0.4 }}>Full Name</label>
                      <input
                        type="text"
                        value={authForm.name}
                        onChange={e => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your full name"
                        autoComplete="name"
                        style={{ width: "100%", border: `1.5px solid ${authErrors.name ? "#ef4444" : "var(--line)"}`, borderRadius: 10, padding: "11px 13px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                        onKeyDown={e => e.key === "Enter" && submitAuth()}
                      />
                      {authErrors.name && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{authErrors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: 0.4 }}>Email address</label>
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      autoComplete="email"
                      style={{ width: "100%", border: `1.5px solid ${authErrors.email ? "#ef4444" : "var(--line)"}`, borderRadius: 10, padding: "11px 13px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      onKeyDown={e => e.key === "Enter" && submitAuth()}
                    />
                    {authErrors.email && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{authErrors.email}</p>}
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.4 }}>Password</label>
                      {authMode === "signin" && (
                        <button type="button" onClick={requestPasswordReset} disabled={authPending} style={{ background: "none", border: "none", color: "#2d5a4d", fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={authMode === "signup" ? "Min. 8 characters" : "Your password"}
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                      style={{ width: "100%", border: `1.5px solid ${authErrors.password ? "#ef4444" : "var(--line)"}`, borderRadius: 10, padding: "11px 13px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      onKeyDown={e => e.key === "Enter" && submitAuth()}
                    />
                    {authErrors.password && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{authErrors.password}</p>}
                  </div>

                  {authMode === "signup" && (
                    <div>
                      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: 0.4 }}>Confirm Password</label>
                      <input
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        style={{ width: "100%", border: `1.5px solid ${authErrors.confirmPassword ? "#ef4444" : "var(--line)"}`, borderRadius: 10, padding: "11px 13px", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                        onKeyDown={e => e.key === "Enter" && submitAuth()}
                      />
                      {authErrors.confirmPassword && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{authErrors.confirmPassword}</p>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submitAuth}
                    disabled={authPending}
                    style={{ ...solidBtn, width: "100%", justifyContent: "center", opacity: authPending ? 0.65 : 1, padding: "13px 20px", fontSize: 15 }}
                  >
                    {authPending ? "Please wait..." : authMode === "signin" ? "Sign in" : "Create account"}
                  </button>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                      <span style={{ height: 1, background: "var(--line)" }} />
                      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>or continue with</span>
                      <span style={{ height: 1, background: "var(--line)" }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => signInWithSocial("oauth_google")}
                      disabled={authPending}
                      style={{ ...outlineBtn, width: "100%", justifyContent: "center", opacity: authPending ? 0.65 : 1 }}
                    >
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={() => signInWithSocial("oauth_apple")}
                      disabled={authPending}
                      style={{ ...outlineBtn, width: "100%", justifyContent: "center", opacity: authPending ? 0.65 : 1 }}
                    >
                      Continue with Apple
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <button
                    onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthErrors({}); setAuthMsg(""); setAuthForm({ name: "", email: authForm.email, password: "", confirmPassword: "" }); }}
                    style={{ background: "none", border: "none", color: "#2d5a4d", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {authMode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <button
                    onClick={() => setPage("home")}
                    style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}
                  >
                    Back to Nafuu Mart
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{G}</style>
      {Nav()}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ ...panel, border: "1px solid #fed7aa", background: "#fff7ed" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>Page could not be loaded</h1>
          <p style={{ ...pMuted, marginBottom: 12 }}>
            The current view is unavailable. Return home and continue shopping.
          </p>
          <button onClick={() => setPage("home")} style={solidBtn}>Go to Home</button>
        </div>
      </div>
      <Footer />
    </>
  );
}

function ProductCard({
  p,
  i,
  onSelect,
  addToCart = () => {},
  toggleWishlist = () => {},
  isInWishlist = () => false,
  toggleComparison = () => {},
  isInComparison = () => false,
  toggleStockAlert = () => {},
  hasStockAlert = () => false,
  getProductReviews = () => [],
  getProductAverageRating = () => 0,
}) {
  const saving = p.market - p.price;
  const drop = Math.round((saving / p.market) * 100);
  const grade = GRADE_INFO[p.grade] || GRADE_INFO.A;
  const inWishlist = isInWishlist(p.id);
  const inComparison = isInComparison(p.id);
  const hasAlert = hasStockAlert(p.id);
  const stockMeta = getStockMeta(p.stockStatus);
  const available = isAvailable(p);
  const reviewCount = getProductReviews(p.id).length;
  const avgRating = getProductAverageRating(p.id);
  
  return (
    <div
      style={{ textAlign: "left", background: "white", border: `1px solid ${inComparison ? "var(--green)" : "var(--line)"}`, borderRadius: 18, padding: 18, cursor: "pointer", animation: `fadeUp .45s ${Math.min(i, 8) * 0.06}s both`, boxShadow: inComparison ? "0 5px 22px rgba(26,122,74,.15)" : "0 5px 22px rgba(0,0,0,.04)", transition: "transform .22s ease, box-shadow .22s ease, border-color .22s ease", position: "relative" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = inComparison ? "0 12px 26px rgba(26,122,74,.2)" : "0 12px 26px rgba(0,0,0,.1)";
        e.currentTarget.style.borderColor = inComparison ? "var(--green)" : "#b8b8a8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = inComparison ? "0 5px 22px rgba(26,122,74,.15)" : "0 5px 22px rgba(0,0,0,.04)";
        e.currentTarget.style.borderColor = inComparison ? "var(--green)" : "var(--line)";
      }}
    >
      <button
        onClick={() => toggleWishlist(p)}
        style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: inWishlist ? "var(--cherry)" : "rgba(255,255,255,0.9)", border: "1px solid var(--line)", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 10, transition: "all .2s ease" }}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={inWishlist ? "#fff" : "none"} stroke={inWishlist ? "#fff" : "currentColor"} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      
      <div onClick={onSelect} style={{ cursor: "pointer" }}>
        {p.image && (
          <div style={{ width: "100%", height: 200, background: "#f5f5f0", borderRadius: 12, marginBottom: 12, overflow: "hidden", display: "grid", placeItems: "center" }}>
            <img loading="lazy" src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ink)", fontSize: 12, fontWeight: 700 }}>{p.brand}</span>
          <span style={{ background: "var(--cherry)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>{drop}% price drop</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
            {reviewCount > 0 ? `⭐ ${avgRating}/5 (${reviewCount})` : "No reviews yet"}
          </span>
          <span style={{ color: grade.color, fontSize: 12, fontWeight: 700 }}>{grade.label}</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "3px 9px", background: stockMeta.bg, color: stockMeta.color, fontSize: 11, fontWeight: 700 }}>
            {stockMeta.label}
          </span>
        </div>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: "var(--ink)", fontSize: 18 }}>{p.name}</div>
        <div style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 12px", minHeight: 34 }}>{p.spec}</div>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, color: "var(--ink)", fontSize: 22 }}>{fmt(p.price)}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through" }}>New in Mombasa: {fmt(p.market)}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent-dark)", fontWeight: 700 }}>You save {fmt(saving)}</div>
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComparison(p);
          }}
          style={{ border: `2px solid ${inComparison ? "var(--green)" : "var(--line)"}`, background: inComparison ? "#f0fdf4" : "white", color: inComparison ? "var(--green)" : "var(--ink)", borderRadius: 8, padding: "8px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all .2s ease" }}
          title={inComparison ? "Remove from comparison" : "Add to comparison"}
        >
          �s-️ Compare
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStockAlert(p);
          }}
          style={{ border: `2px solid ${hasAlert ? "#f59e0b" : "var(--line)"}`, background: hasAlert ? "#fffbeb" : "white", color: hasAlert ? "#f59e0b" : "var(--ink)", borderRadius: 8, padding: "8px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all .2s ease" }}
          title={hasAlert ? "Remove stock alert" : "Notify when in stock"}
        >
          �Y"" Alert
        </button>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          addToCart(p);
        }}
        disabled={!available}
        style={{ width: "100%", marginTop: 8, border: "none", borderRadius: 10, background: available ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: available ? "pointer" : "not-allowed", transition: "all .2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        onMouseEnter={(e) => {
          if (available) e.currentTarget.style.background = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = available ? "var(--accent-dark)" : "#a8a8a8";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        {available ? "Add to Cart" : "Out of Stock"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, error, multiline = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-mid)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: `1px solid ${error ? "#dc2626" : "var(--border)"}`, borderRadius: 10, padding: "10px 12px" }} />
      )}
      {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const topLink = { background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, fontSize: 14, padding: 0 };
const topNavItem = { background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, fontSize: 15, padding: "10px 0", borderBottom: "2px solid transparent", transition: "all .2s ease" };
const actionBtn = { background: "white", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 14, color: "var(--ink)", cursor: "pointer", transition: "all .2s ease" };
const iconBtn = { background: "white", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 11px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s ease" };
const footerHeading = { fontSize: 15, color: "#3d3d3d", fontWeight: 700, marginBottom: 10, fontFamily: "'Fraunces',serif" };
const footerLink = { display: "block", border: "none", background: "none", padding: "0", marginBottom: 7, color: "#5a5a5a", fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.6 };
const solidBtn = { background: "var(--ink)", color: "white", border: "none", borderRadius: 10, padding: "12px 16px", cursor: "pointer", fontWeight: 700 };
const outlineBtn = { background: "white", color: "var(--ink)", border: "1px solid var(--ink)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 };
const linkBtn = { background: "none", border: "none", color: "var(--muted)", marginBottom: 10, cursor: "pointer" };
const panel = { background: "white", border: "1px solid var(--line)", borderRadius: 14, padding: 18 };
const h2 = { fontFamily: "'Fraunces',serif", color: "var(--ink)", fontWeight: 700, fontSize: 32, marginBottom: 12 };
const h3 = { fontFamily: "'Fraunces',serif", color: "var(--ink)", fontWeight: 700, fontSize: 16, marginBottom: 8 };
const pMuted = { color: "var(--ink-soft)", lineHeight: 1.7 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const featureCard = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 };
const filterLabel = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };
const chipWrap = { display: "flex", flexWrap: "wrap", gap: 8 };
const chipBtn = (active) => ({
  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
  background: active ? "var(--ink)" : "white",
  color: active ? "white" : "var(--ink)",
  borderRadius: 999,
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
});


