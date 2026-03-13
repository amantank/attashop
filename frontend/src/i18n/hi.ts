import type { TranslationKey } from './en';

const hi: Record<TranslationKey, string> = {
  // Nav
  appName: 'अटाशॉप',
  tagline: 'ताजा आटा घर तक',
  cart: 'कार्ट',
  orders: 'मेरे ऑर्डर',
  subscriptions: 'सब्सक्रिप्शन',
  admin: 'एडमिन',

  // Home
  heroTitle: 'शुद्ध और ताजा आटा',
  heroSubtitle: 'हर हफ्ते आपके दरवाजे पर डिलीवर।',
  shopNow: 'अभी खरीदें',
  subscribe: 'सब्सक्राइब करें',
  featuredProducts: 'विशेष उत्पाद',
  reorderLastPurchase: 'पिछला ऑर्डर दोबारा करें',
  reorderDesc: 'आपका पिछला ऑर्डर दोबारा करने के लिए तैयार है!',
  reorderBtn: 'कार्ट में डालें',
  allCategories: 'सभी',
  searchPlaceholder: 'आटा, चावल, दाल खोजें…',


    // Offers
  offers: 'ऑफर्स',
  flashSale: 'फ्लैश सेल',
  saleEndsIn: 'सेल समाप्त होगी',
  shopOffer: 'अभी खरीदें',
  noOffers: 'अभी कोई ऑफर नहीं',
  offersPage: 'ऑफर्स और सेल',
  viewOffers: 'ऑफर देखें',

  // Products
  products: 'उत्पाद',
  outOfStock: 'स्टॉक खत्म',
  addToCart: 'कार्ट में डालें',
  viewDetails: 'विवरण देखें',
  discount: 'छूट',
  inStock: 'उपलब्ध',
  selectVariant: 'पैक चुनें',
  quantity: 'मात्रा',
  subscribeProduct: 'नियमित डिलीवरी के लिए सब्सक्राइब करें',
  subscriptionPlan: 'डिलीवरी आवृत्ति',
  weekly: 'साप्ताहिक',
  biweekly: 'हर 2 हफ्ते',
  monthly: 'मासिक',
  addSubscription: 'अभी सब्सक्राइब करें',
  perKg: '/किलो',
  price: 'कीमत',

  // Cart
  yourCart: 'आपका कार्ट',
  emptyCart: 'कार्ट खाली है',
  emptyCartDesc: 'शुरू करने के लिए कुछ उत्पाद जोड़ें।',
  continueShopping: 'खरीदारी जारी रखें',
  subtotal: 'उपकुल',
  deliveryCharge: 'डिलीवरी शुल्क',
  free: 'मुफ्त',
  total: 'कुल',
  proceedToCheckout: 'चेकआउट करें',

  // Checkout
  checkout: 'चेकआउट',
  customerDetails: 'ग्राहक विवरण',
  name: 'पूरा नाम',
  phone: 'फोन नंबर',
  address: 'पूरा पता',
  pincode: 'पिनकोड',
  landmark: 'लैंडमार्क (वैकल्पिक)',
  deliverySchedule: 'डिलीवरी समय',
  deliveryDate: 'डिलीवरी तारीख',
  deliverySlot: 'डिलीवरी स्लॉट',
  chooseSlot: 'समय स्लॉट चुनें',
  slotFull: 'भरा हुआ',
  paymentMethod: 'भुगतान विधि',
  upi: 'यूपीआई',
  gpay: 'गूगल पे',
  paytm: 'पेटीएम',
  cod: 'नकद भुगतान',
  placeOrder: 'ऑर्डर दें',
  orderSummary: 'ऑर्डर सारांश',
  pincodeNotServiced: 'इस पिनकोड पर डिलीवरी उपलब्ध नहीं है।',
  selectSlotFirst: 'कृपया डिलीवरी स्लॉट चुनें।',
  placingOrder: 'ऑर्डर दिया जा रहा है…',

  // Order Confirmation
  orderPlaced: 'ऑर्डर मिल गया!',
  orderConfirmMsg: 'आपका ऑर्डर प्राप्त हो गया। हम समय पर डिलीवर करेंगे।',
  orderId: 'ऑर्डर आईडी',
  deliveryOn: 'डिलीवरी',
  paymentStatus: 'भुगतान स्थिति',
  pending: 'लंबित',
  paid: 'भुगतान किया',
  viewOrders: 'मेरे ऑर्डर देखें',
  backHome: 'होम पर जाएं',

  // Order History
  myOrders: 'मेरे ऑर्डर',
  enterPhone: 'ऑर्डर देखने के लिए फोन नंबर दर्ज करें',
  lookupOrders: 'ऑर्डर खोजें',
  noOrders: 'इस नंबर पर कोई ऑर्डर नहीं मिला।',
  repeatOrder: 'दोबारा ऑर्डर करें',
  repeatSuccess: 'आइटम कार्ट में जोड़े गए!',
  orderDate: 'ऑर्डर दिनांक',
  finalAmount: 'कुल',
  status: 'स्थिति',

  // Subscriptions
  mySubscriptions: 'मेरे सब्सक्रिप्शन',
  activeSubscriptions: 'सक्रिय सब्सक्रिप्शन',
  newSubscription: 'नया सब्सक्रिप्शन',
  nextDelivery: 'अगली डिलीवरी',
  cancelSubscription: 'रद्द करें',
  subscriptionCancelled: 'सब्सक्रिप्शन रद्द किया गया।',
  noSubscriptions: 'कोई सक्रिय सब्सक्रिप्शन नहीं।',
  createSubscription: 'सब्सक्रिप्शन बनाएं',

  // Admin
  adminDashboard: 'एडमिन डैशबोर्ड',
  todayOrders: 'आज के ऑर्डर',
  todayRevenue: 'आज की आय',
  weekRevenue: 'इस हफ्ते की आय',
  pendingOrders: 'लंबित',
  completedOrders: 'पूर्ण',
  topProducts: 'शीर्ष उत्पाद',
  ordersBySlot: 'स्लॉट के अनुसार ऑर्डर',

  // Status labels
  placed: 'रखा गया',
  confirmed: 'पुष्टि की गई',
  out_for_delivery: 'डिलीवरी पर',
  delivered: 'डिलीवर हुआ',
  cancelled: 'रद्द',
  failed: 'असफल',

  // General
  loading: 'लोड हो रहा है…',
  error: 'कुछ गड़बड़ हो गई।',
  retry: 'पुनः प्रयास',
  save: 'सहेजें',
  remove: 'निकालें',
  specifications: 'विशेष विवरण',
  cancel: 'रद्द करें',
  close: 'बंद करें',
  pcs: 'पीस',
  kg: 'किलो',
  items: 'आइटम',
};

export default hi;
