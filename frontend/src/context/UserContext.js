// src/context/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [me, setMe] = useState(() => {
    // Load from localStorage if available
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // keep localStorage in sync
  const updateUser = (user) => {
    setMe(user);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  };

  // optional: fetch /users/me when app starts (to be sure)
  useEffect(() => {
    const run = async () => {
      try {
        const data = await api.getMe();
        updateUser(data?.user || data);
      } catch {
        // if unauthorized -> clear
        updateUser(null);
      }
    };
    run();
  }, []);

  return (
    <UserContext.Provider value={{ me, setMe: updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

// hook for easy use
export const useUser = () => useContext(UserContext);
