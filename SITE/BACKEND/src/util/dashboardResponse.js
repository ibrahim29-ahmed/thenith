import { ensurePrimaryContacts } from "../models/Card.js";
import _dashboardService5298 from "../services/dashboard/dashboardService.js";
const { getCardAnalytics } = _dashboardService5298;
import _entitlements3272 from "./entitlements.js";
const { buildDashboardCardDTO, canAccess, getFeatureLimit } = _entitlements3272;
import _env8311 from "../config/env.js";
const { env } = _env8311;

const getBaseUrl = () =>
  env.APP_URL ? env.APP_URL.replace(/\/+$/, "") : "http://localhost:3000";

function buildOwner(user, subscription, activeCard) {
  const canUseCustomUrl = canAccess(subscription.entitlements, "customLink");

  return {
    name: user.name,
    fullName: user.name,
    email: user.email,
    gender: user.gender || "male",
    secondaryEmails: user.secondaryEmails || [],
    phone: user.phone,
    address: user.address,
    username: canUseCustomUrl ? user.username : null,
    publicId: user.publicId,
    orders: user.orders,
    paymentMethods: user.paymentMethods || [],
    activePaymentMethodId:
      user.activePaymentMethodId ||
      (user.paymentMethods && user.paymentMethods.length > 0
        ? user.paymentMethods[0].id
        : null),
    activeCardId: activeCard?._id || null,
    publicUrl:
      canUseCustomUrl && user.username
        ? `${getBaseUrl()}/p/${user.username}`
        : user.publicId
          ? `${getBaseUrl()}/p/${user.publicId}`
          : null,
  };
}

async function buildCards(cards, user, subscription) {
  const canUseCustomUrl = canAccess(subscription.entitlements, "customLink");
  const hasAdvancedAnalytics = canAccess(
    subscription.entitlements,
    "advancedAnalytics",
  );

  return Promise.all(
    cards.map(async (card) => {
      const rawAnalytics = await getCardAnalytics(card._id);
      const analytics = rawAnalytics;
      const cardObj = {
        ...card.toObject(),
        id: card._id.toString(),
        _id: undefined,
        contacts: ensurePrimaryContacts(card.contacts),
        analytics,
        publicUrl:
          card.isActive && canUseCustomUrl && user.username
            ? `${getBaseUrl()}/p/${user.username}`
            : card.isActive && user.publicId
              ? `${getBaseUrl()}/p/${user.publicId}`
              : `${getBaseUrl()}/p/${card.publicId}`,
      };
      return buildDashboardCardDTO(cardObj, subscription.entitlements);
    }),
  );
}

async function buildDashboardResponse({
  user,
  cards,
  subscription,
  totalStored,
  activeCard,
}) {
  const maxCards = getFeatureLimit(subscription.entitlements, "maxCards");
  const accessibleCards = maxCards !== null ? cards.slice(0, maxCards) : cards;
  const enrichedSubscription = {
    ...subscription,
    entitlements: {
      ...subscription.entitlements,
      features: {
        ...subscription.entitlements.features,
        cards: {
          ...subscription.entitlements.features?.cards,
          hiddenCount: totalStored - accessibleCards.length,
          totalStored,
        },
      },
    },
  };

  return {
    owner: buildOwner(user, subscription, activeCard),
    cards: await buildCards(accessibleCards, user, subscription),
    subscription: enrichedSubscription,
  };
}

async function buildActiveCardResponse({
  user,
  cards,
  subscription,
  activeCard,
}) {
  const maxCards = getFeatureLimit(subscription.entitlements, "maxCards");
  const accessibleCards = maxCards !== null ? cards.slice(0, maxCards) : cards;
  return {
    activeCardId: activeCard._id.toString(),
    cardId: activeCard._id.toString(),
    cards: await buildCards(accessibleCards, user, subscription),
  };
}

export default {
  buildDashboardResponse,
  buildActiveCardResponse,
};
