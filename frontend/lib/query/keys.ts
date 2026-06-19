export const queryKeys = {
  me: ["me"] as const,
  courses: ["courses"] as const,
  documents: ["documents"] as const,
  chatSessions: ["chat", "sessions"] as const,
  chatMessages: (sessionId: string | null) => ["chat", "messages", sessionId] as const,
  health: ["health"] as const
};
