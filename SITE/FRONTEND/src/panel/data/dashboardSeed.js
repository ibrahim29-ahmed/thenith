export const makeId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createEmptyCard = (name = "New Card") => ({
  id: makeId(),
  name,
  link: `https://thenith.com/cards/${encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase())}`,
  personal: {
    fullName: "",
    title: "",
    company: "",
    jobTitle: "",
    bio: "",
    avatar: "",
    coverImage: "",
  },
  contacts: [],
  links: [],
  theme: "default",
  actionType: "form",
  calendarSettings: {
    availableDates: [],
    startTime: "09:00",
    endTime: "17:00",
    alwaysAvailable: false,
  },
  requests: [],
  appointments: [],
  analytics: {
    visits: {
      week: [0, 0, 0, 0, 0, 0, 0],
      month: Array(30).fill(0),
      year: Array(12).fill(0),
    },
    linkClicks: {},
  },
});

export const defaultDashboardData = {
  owner: {
    username: "",
    publicId: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
    orders: [],
    paymentMethods: [],
    activePaymentMethodId: null,
  },
  cards: [], // Default is completely empty, relies on backend
  metrics: [
    {
      id: "visits",
      labelKey: "metrics.totalVisits",
      value: "0",
      hintKey: "metrics.visitsHint",
    },
    {
      id: "linkClicks",
      labelKey: "metrics.linkClicks",
      value: "0",
      hintKey: "metrics.linksHint",
    },
    {
      id: "directContacts",
      labelKey: "metrics.directContacts",
      value: "0",
      hintKey: "metrics.contactsHint",
    },
  ],
  visits: Array(12).fill(0),
  notifications: [],
};

export function normalizeCard(card, index = 0) {
  const fallback = createEmptyCard(`Card ${index + 1}`);
  return {
    ...fallback,
    ...card,
    id: card?.id || fallback.id,
    theme: card?.theme || fallback.theme || "default", // EXPLICITLY SET THEME
    name: card?.name || fallback.name,
    link: card?.link || `https://thenith.com/cards/${card?.id || fallback.id}`,
    personal: { ...fallback.personal, ...(card?.personal || {}) },
    contacts: Array.isArray(card?.contacts) ? card.contacts : fallback.contacts,
    links: Array.isArray(card?.links) ? card.links : fallback.links,
    actionType: card?.actionType === "calendar" ? "calendar" : "form",
    calendarSettings: { ...fallback.calendarSettings, ...(card?.calendarSettings || {}) },
    requests: Array.isArray(card?.requests) ? card.requests : [],
    appointments: Array.isArray(card?.appointments) ? card.appointments : [],
    analytics: card?.analytics
      ? { ...fallback.analytics, ...card.analytics }
      : fallback.analytics,
  };
}

export function normalizeDashboardData(data) {
  const source = data || defaultDashboardData;
  return {
    ...defaultDashboardData,
    ...source,
    owner: {
      ...defaultDashboardData.owner,
      ...(source.owner || {}),
      paymentMethods: source.owner?.paymentMethods || [],
      activePaymentMethodId:
        source.owner?.activePaymentMethodId ||
        (source.owner?.paymentMethods?.[0]?.id || null),
    },
    cards: Array.isArray(source.cards)
      ? source.cards.map((c, i) => normalizeCard(c, i))
      : [],
    // Preserve subscription/entitlements exactly as received from Backend — do NOT modify
    subscription: source.subscription ?? defaultDashboardData.subscription,
  };
}
