export const qk = {
  streak: ["streak"] as const,
  today: ["today"] as const,
  history: (days: number) => ["history", days] as const,
  reminder: ["reminder"] as const,
  goal: ["goal"] as const,
  stats: ["stats"] as const,
};
