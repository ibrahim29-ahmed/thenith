import { publicClient } from "../client.js";

export const publicProfileRoutes = {
  getPublicProfile: async (identifier = "", options = {}) => {
    const endpoint = identifier ? `/p/${encodeURIComponent(identifier)}` : "/";
    const response = await publicClient.get(endpoint, {
      params: options?.force ? { _t: Date.now() } : undefined,
      headers: options?.force ? { "Cache-Control": "no-cache" } : undefined,
    });
    return response.data;
  },

  submitContact: async (payload = {}) => {
    const response = await publicClient.post("/public/contact", payload);
    return response.data;
  },

  resolvePublicWallet: async (identifier, params = {}) => {
    const response = await publicClient.get(`/public/wallet/${encodeURIComponent(identifier)}`, {
      params,
    });
    return response.data;
  },
};

export default publicProfileRoutes;
