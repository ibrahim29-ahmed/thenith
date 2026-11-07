import { useState, useEffect, useCallback } from 'react';
import { ReferralData } from '../types';
import apiClient from '../../../api/client';

export const INITIAL_MOCK_REFERRAL_DATA: ReferralData = {
  code: 'THENITH-XXXXX',
  link: typeof window !== 'undefined' ? `${window.location.origin}/r/THENITH-XXXXX` : 'https://thenith.com/r/THENITH-XXXXX',
  monthlyCount: 0,
  totalCount: 0,
  grandTarget: 14,
  daysLeftInCycle: 30,
  rewards: [],
  referrals: [],
};

export type UseReferralDataResult = {
  data: ReferralData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useReferralData(mockOverride?: ReferralData): UseReferralDataResult {
  const [data, setData] = useState<ReferralData>(mockOverride || INITIAL_MOCK_REFERRAL_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(!mockOverride);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (mockOverride) {
      setData(mockOverride);
      setIsLoading(false);
      return;
    }

    try {
      if (!isBackground) {
        setIsLoading(true);
      }
      setIsError(false);
      setError(null);

      // Attempt to load from dedicated user endpoint
      const response = await apiClient.get('/referrals/my-dashboard');
      const payload = response.data?.data || response.data;

      if (payload) {
        const normalized: ReferralData = {
          code: payload.referralCode || 'THENITH-XXXXX',
          link: typeof window !== 'undefined'
            ? `${window.location.origin}/r/${payload.referralCode || ''}`
            : (payload.referralUrl || `https://thenith.com/r/${payload.referralCode || ''}`),
          isSubscribed: Boolean(payload.isSubscribed),
          monthlyCount: Number(payload.monthlyProgress?.successfulCount || 0),
          totalCount: Number(payload.lifetimeProgress?.lifetimeCount || 0),
          grandTarget: Number(payload.lifetimeProgress?.targetCount || 14),
          daysLeftInCycle: Number(payload.monthlyProgress?.daysLeftInMonth || 30),
          rewards: (payload.rewards || []).map((r: any) => ({
            id: r._id || String(Math.random()),
            label:
              r.rewardType === 'invitee_discount'
                ? 'خصم ترحيبي للمدعوين'
                : r.rewardType === 'milestone_discount'
                ? 'خصم الإنجاز (50%)'
                : payload.isSubscribed
                ? 'خصم التجديد الشهري'
                : 'خصم الإحالة الشهري',
            percent: Number(r.discountPercent || 0),
            expiresAt: r.expiresAt,
          })),
          referrals: (payload.history || []).map((h: any) => ({
            id: h._id || String(Math.random()),
            name: h.inviteeName || 'صديق مدعو',
            status: (h.status === 'successful' ? 'active' : 'pending') as ReferralData['referrals'][0]['status'],
            joinedAt: h.registeredAt || new Date().toISOString(),
          })),
        };
        setData(normalized);
      }
    } catch (err: any) {
      console.warn('[useReferralData] Failed to load remote data:', err?.message);
      if (!isBackground) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [mockOverride]);

  useEffect(() => {
    fetchData(false);

    // Ultra-fast sync: 4-second background poll
    const timer = setInterval(() => {
      fetchData(true);
    }, 4000);

    // Instant refresh when user returns to tab
    const onFocus = () => fetchData(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    const onRealtimeSync = () => fetchData(true);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('thenith_realtime_sync', onRealtimeSync);
    window.addEventListener('thenith_profile_sync', onRealtimeSync);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('thenith_realtime_sync', onRealtimeSync);
      window.removeEventListener('thenith_profile_sync', onRealtimeSync);
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => fetchData(false),
  };
}

