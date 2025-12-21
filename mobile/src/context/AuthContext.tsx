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
  register: (payload: { username: string; email: string; password: string; phone?: string }) => Promise<void>;
  startPhoneRegistration: (payload: { username: string; phone: string; password: string }) => Promise<{
    phone: string;
    resend_seconds: number;
    detail?: string;
  }>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "cafe_mobile_tokens";

type StoredTokens = { access: string; refresh?: string | null };

type PermissionKey = Exclude<keyof RolePermissions, "role">;

const PERMISSION_KEYS: PermissionKey[] = [
  "can_view_dashboard",
  "can_manage_orders",
  "can_manage_products",
  "can_manage_categories",
  "can_manage_subcategories",
  "can_access_cashier",
  "can_manage_tables",
  "can_manage_inventory",
  "can_view_activity_log",
  "can_manage_support",
  "can_manage_contact_messages",
  "can_manage_users",
  "can_view_user_activity",
  "can_manage_store_settings",
  "can_manage_loyalty",
  "can_view_hr_dashboard",
  "can_manage_employees",
  "can_manage_attendance",
  "can_manage_hr_leaves",
  "can_manage_hr_payroll",
  "can_manage_hr_documents",
  "can_manage_hr_reports",
  "can_manage_hr_work_reports",
  "can_view_hr_performance",
];

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n", ""].includes(v)) return false;
  }
  return false;
};

const normalizePermissions = (raw: any, fallbackRole?: RolePermissions["role"]): RolePermissions => {
  const role = (raw?.role as RolePermissions["role"]) || fallbackRole || "customer";
  const normalized: RolePermissions = { role };
  for (const key of PERMISSION_KEYS) {
    normalized[key] = toBoolean(raw?.[key]);
  }
  return normalized;
};

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
        const res = await api.get<User>("auth/me/", {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
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

  const fetchPermissions = useCallback(async (tokenOverride?: string | null) => {
    const effectiveToken = tokenOverride ?? accessToken;
    if (!effectiveToken) {
      setPermissions(null);
      return;
    }
    try {
      const res = await api.get<RolePermissions>("auth/role-permissions/me/", {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      setPermissions(normalizePermissions(res.data, (user?.role as any) || undefined));
    } catch (error) {
      console.warn("Failed to load permissions", error);
      setPermissions(null);
    }
  }, [accessToken, user?.role]);

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

  // Ensure permissions are loaded for employee roles when authenticated.
  useEffect(() => {
    if (!accessToken || !user) return;
    const isEmployee = user.role === "manager" || user.role === "supervisor" || user.role === "staff";
    if (!isEmployee) return;
    if (permissions) return;
    fetchPermissions(accessToken).catch(() => null);
  }, [accessToken, user, permissions, fetchPermissions]);

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
            setPermissions(normalizePermissions(res.data));
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
        await fetchPermissions(access);
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile, fetchPermissions]
  );

  const register = useCallback(
    async (payload: { username: string; email: string; password: string; phone?: string }) => {
      setLoading(true);
      try {
        await api.post("auth/register/", { ...payload, role: "customer" });
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startPhoneRegistration = useCallback(
    async (payload: { username: string; phone: string; password: string }) => {
      setLoading(true);
      try {
        const res = await api.post("auth/phone/register/", payload);
        return res.data;
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyPhoneOtp = useCallback(
    async (phone: string, otp: string) => {
      setLoading(true);
      try {
        const res = await api.post("auth/phone/verify/", { phone, otp });
        const { access, refresh } = res.data || {};
        if (!access) throw new Error(copy.messages.genericError);

        setAccessToken(access);
        setRefreshToken(refresh || null);
        setAuthToken(access);
        await fetchProfile(access);
        await fetchPermissions(access);
      } catch (error) {
        throw new Error(parseApiError(error) || copy.messages.genericError);
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile, fetchPermissions]
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
      startPhoneRegistration,
      verifyPhoneOtp,
      logout,
      refreshProfile: fetchProfile,
      refreshPermissions: fetchPermissions,
    }),
    [
      user,
      accessToken,
      initializing,
      loading,
      permissions,
      login,
      register,
      startPhoneRegistration,
      verifyPhoneOtp,
      logout,
      fetchProfile,
      fetchPermissions,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
