// src/context/UserContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const updateUser = (user) => {
    setMe(user);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  };

  const fetchMe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      updateUser(null);
      return;
    }
    setLoading(true);
    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    try {
      const data = await api.getMe({ signal: abortRef.current.signal });
      updateUser(data?.user || data || null);
    } catch {
      // unauthorized or error -> clear
      updateUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch me at app start ONLY if we have a token
    if (localStorage.getItem("accessToken")) fetchMe();

    // keep multiple tabs in sync
    const onStorage = (e) => {
      if (e.key === "accessToken") {
        if (e.newValue) fetchMe();
        else updateUser(null);
      }
      if (e.key === "user" && e.newValue) {
        try {
          setMe(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    abortRef.current?.abort?.();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    updateUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        me,
        setMe: updateUser,
        loadingUser: loading,
        refetchMe: fetchMe,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
