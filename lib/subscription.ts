export const TRIAL_DAYS = 30;
export const TRIAL_BANNER_DAYS_THRESHOLD = 10; // show banner when ≤ 10 days remaining

export const SUBSCRIPTION_PLANS = {
  MONTHLY: { label: "1개월", days: 30, amount: 9900 },
  QUARTERLY: { label: "3개월", days: 90, amount: 27000 },
  YEARLY: { label: "1년", days: 365, amount: 99000 },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export type CalculatedSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXEMPT"
  | "BLOCKED"
  | "EXPIRED";

export function getCalculatedSubscriptionStatus(input: {
  subscriptionStatus: string;
  subscriptionEnd?: Date | null;
  now?: Date;
}): CalculatedSubscriptionStatus {
  const now = input.now ?? new Date();

  if (input.subscriptionStatus === "BLOCKED") return "BLOCKED";
  if (input.subscriptionStatus === "EXEMPT") return "EXEMPT";

  // ACTIVE: check if subscription hasn't expired
  if (input.subscriptionStatus === "ACTIVE") {
    if (
      input.subscriptionEnd &&
      input.subscriptionEnd.getTime() < now.getTime()
    ) {
      return "EXPIRED";
    }
    return "ACTIVE";
  }

  // TRIAL: check subscriptionEnd
  if (!input.subscriptionEnd) return "TRIAL"; // no end set = unlimited trial (legacy)
  if (input.subscriptionEnd.getTime() < now.getTime()) return "EXPIRED";
  return "TRIAL";
}

/** Returns days remaining in trial/subscription (can be negative if expired) */
export function getDaysRemaining(
  subscriptionEnd: Date | null | undefined,
  now: Date = new Date()
): number | null {
  if (!subscriptionEnd) return null;
  const ms = subscriptionEnd.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** True if we should show the "N일 남았어요" trial banner (≤ 10 days remaining) */
export function shouldShowTrialBanner(
  status: CalculatedSubscriptionStatus,
  subscriptionEnd: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (status !== "TRIAL") return false;
  const days = getDaysRemaining(subscriptionEnd, now);
  if (days === null) return false;
  return days >= 1 && days <= TRIAL_BANNER_DAYS_THRESHOLD;
}

/** Returns the new subscriptionEnd when approving a subscription request */
export function getNextSubscriptionEnd(
  plan: SubscriptionPlan,
  currentEnd?: Date | null,
  now: Date = new Date()
): Date {
  const baseDate =
    currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return new Date(
    baseDate.getTime() + SUBSCRIPTION_PLANS[plan].days * 24 * 60 * 60 * 1000
  );
}

/** True when the subscription allows full feature access */
export function isSubscriptionActive(
  status: CalculatedSubscriptionStatus
): boolean {
  return status === "TRIAL" || status === "ACTIVE" || status === "EXEMPT";
}
