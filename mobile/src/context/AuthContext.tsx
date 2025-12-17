import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { api, parseApiError, setAuthToken } from "../services/api";
import { RolePermissions, User } from "../types";
import { copy } from "../config/copy";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  initializing: boolean;
  loading: boolean;
  permissions: RolePermissions | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; email?: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "cafe_mobile_tokens";

type StoredTokens = { access: string; refresh?: string | null };

// Disable token persistence to avoid stale/forced auto-login states.
const readTokens = async (): Promise<StoredTokens | null> => {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  return null;
};

const writeTokens = async (_tokens: StoredTokens) => {
  // no-op: persistence disabled
};

const clearTokens = async () => {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);

  const fetchProfile = useCallback(
    async (tokenOverride?: string | null) => {
      const effectiveToken = tokenOverride ?? accessToken;
      if (!effectiveToken) {
        setUser(null);
        setPermissions(null);
        return;
      }
      try {
        const res = await api.get<User>("auth/me/");
        setUser(res.data);
      } catch (error) {
        console.warn("Failed to load profile", error);
        setUser(null);
        setPermissions(null);
        setAccessToken(null);
        setAuthToken(null);
        await clearTokens();
      }
    },
    [accessToken]
  );

  const fetchPermissions = useCallback(async () => {
    if (!accessToken) {
      setPermissions(null);
      return;
    }
    try {
      const res = await api.get<RolePermissions>("auth/role-permissions/me/");
      setPermissions(res.data);
    } catch (error) {
      console.warn("Failed to load permissions", error);
      setPermissions(null);
    }
  }, [accessToken]);

  const refreshTokens = useCallback(
    async (refresh?: string | null) => {
      const tokenToUse = refresh ?? refreshToken;
      if (!tokenToUse) return null;
      try {
        const res = await api.post("auth/token/refresh/", { refresh: tokenToUse });
        const newAccess = res.data?.access;
        if (newAccess) {
          setAccessToken(newAccess);
          setRefreshToken(tokenToUse);
          setAuthToken(newAccess);
          await writeTokens({ access: newAccess, refresh: tokenToUse });
          return newAccess;
        }
      } catch (error) {
        console.warn("token refresh failed", error);
        await clearTokens();
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
      }
      return null;
    },
    [refreshToken]
  );

  // Wipe any legacy tokens on first mount to force fresh auth.
  useEffect(() => {
    clearTokens().catch((error) => console.warn("auth clearTokens on boot error", error));
  }, []);

  // Auto-logout on unauthorized responses to stop endless loading loops.
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await clearTokens();
          setAuthToken(null);
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
          setPermissions(null);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    } else {
      setAuthToken(null);
      setUser(null);
    }
  }, [accessToken]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await readTokens();
        if (stored?.access) {
          setAccessToken(stored.access);
          setRefreshToken(stored.refresh || null);
          setAuthToken(stored.access);
          await fetchProfile(stored.access);
          setPermissions(null);
          try {
            const res = await api.get<RolePermissions>("auth/role-permissions/me/");
            setPermissions(res.data);
          } catch (err) {
            console.warn("bootstrap perms", err);
          }
          if (stored.refresh) {
            await refreshTokens(stored.refresh);
          }
        }
      } catch (error) {
        console.warn("auth bootstrap error", error);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, [fetchProfile, refreshTokens]);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const res = await api.post("auth/token/", { username, password });
        const { access, refresh } = res.data;
        setAccessToken(access);
        setRefreshToken(refresh);
        await writeTokens({ access, refresh });
        setAuthToken(access);
        await fetchProfile(access);
        await fetchPermissions();
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile, fetchPermissions]
  );

  const register = useCallback(
    async (payload: { username: string; email?: string; password: string; phone?: string }) => {
      setLoading(true);
      try {
        await api.post("auth/register/", { ...payload, role: "customer" });
        await login(payload.username, payload.password);
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setPermissions(null);
    await clearTokens();
    setAuthToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      initializing,
      loading,
      permissions,
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
      refreshPermissions: fetchPermissions,
    }),
    [user, accessToken, initializing, loading, permissions, login, register, logout, fetchProfile, fetchPermissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
