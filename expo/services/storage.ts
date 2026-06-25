import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Tiny typed wrapper over AsyncStorage for JSON values. This is the local
 * persistence primitive the service layer uses when Supabase isn't connected
 * (or for offline caches alongside it). All methods are best-effort and never
 * throw, so callers can treat storage as a cache that may miss.
 */
export const storage = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // best-effort
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // best-effort
    }
  },
};
