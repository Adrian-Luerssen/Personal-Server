export const AGENT_SCOPES: Record<string, string> = {
  'workout:read': 'Read workout sessions, exercises, bodyweight',
  'workout:write': 'Create/update workout data',
  'finance:read': 'Read transactions, wallets, categories',
  'finance:write': 'Create/update financial data',
  'habits:read': 'Read habits and entries',
  'habits:write': 'Create/update habit data',
  'music:read': 'Read Spotify listening history',
  'dashboard:read': 'Read cross-domain analytics',
  'profile:read': 'Read basic profile info',
};

export const ALL_SCOPES = Object.keys(AGENT_SCOPES);
