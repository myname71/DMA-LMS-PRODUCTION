import { getAuthHeaders } from '../lib/session';

export interface SubscriptionCheckout {
  planId: 'basic' | 'pro' | 'advanced';
  userId: string;
  userEmail: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
  redirect?: string;
}

export const PLAN_PRICES: Record<string, number> = {
  basic: 0,
  pro: 999,
  advanced: 1999, // BDT
};

export async function getCurrentSubscription(userId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/subscription/status', { headers: getAuthHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.plan || null;
  } catch {
    return null;
  }
}

export async function upgradeSubscription(checkout: SubscriptionCheckout): Promise<PaymentResult> {
  try {
    const res = await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ planId: checkout.planId }),
    });
    const data = await res.json().catch(() => ({}));
    // Plans are never granted client-side: the server asks for a payment ID
    // to be verified on the contact page.
    if (res.status === 402 && data.redirect) {
      window.location.assign(data.redirect);
      return { success: false, message: data.error, redirect: data.redirect };
    }
    return { success: false, message: data.error || 'Upgrade failed' };
  } catch {
    return { success: false, message: 'Network error. Please try again.' };
  }
}

export async function cancelSubscription(): Promise<PaymentResult> {
  try {
    const res = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { success: false, message: 'Cancellation failed' };
    return { success: true, message: 'Subscription cancelled' };
  } catch {
    return { success: false, message: 'Network error. Please try again.' };
  }
}

export function formatPrice(bdt: number): string {
  return bdt === 0 ? 'Free' : `৳${bdt.toLocaleString()}`;
}
