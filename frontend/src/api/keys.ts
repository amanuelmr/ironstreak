export const qk = {
  overview: ["overview"] as const,
  activity: (days: number) => ["activity", days] as const,
  challenges: (status?: string) => ["challenges", status ?? "all"] as const,
  challenge: (id: number) => ["challenge", id] as const,
};
