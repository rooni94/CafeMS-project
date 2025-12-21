// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { api } from "../services/api";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email?: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  startPhoneRegistration: (data: { username: string; phone: string; password: string }) => Promise<{
    phone: string;
    resend_seconds: number;
    detail?: string;
  }>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access")
  );
  const [loading, setLoading] = useState<boolean>(true);

  // 👈 عندما يتغير accessToken نضبط الهيدر في axios
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [accessToken]);

  // عند وجود توكن وقت تحميل التطبيق، نحاول نجلب بيانات المستخدم
  useEffect(() => {
    const fetchUser = async () => {
      if (!accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("auth/me/");
        setUser(res.data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [accessToken]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post("auth/token/", { username, password });
      const { access, refresh } = res.data;

      // خزّن التوكنات
      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      setAccessToken(access);

      // 👈 مباشرةً نضبط الهيدر قبل استدعاء /auth/me/
      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      // الآن نجيب البروفايل
      const profileRes = await api.get("auth/me/");
      setUser(profileRes.data);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    username: string;
    email?: string;
    password: string;
    phone?: string;
  }) => {
    setLoading(true);
    try {
      await api.post("auth/register/", {
        username: data.username,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: "customer",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPhoneRegistration = async (data: {
    username: string;
    phone: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const res = await api.post("auth/phone/register/", {
        username: data.username,
        phone: data.phone,
        password: data.password,
      });
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async (phone: string, otp: string) => {
    setLoading(true);
    try {
      const res = await api.post("auth/phone/verify/", { phone, otp });
      const { access, refresh, user: verifiedUser } = res.data || {};

      if (access) {
        localStorage.setItem("access", access);
        if (refresh) localStorage.setItem("refresh", refresh);
        setAccessToken(access);
        api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      }

      if (verifiedUser) setUser(verifiedUser);
    } finally {
      setLoading(false);
    }
  };



  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, register, startPhoneRegistration, verifyPhoneOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
