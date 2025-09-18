
'use client';

// src/context/CurrencyContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase"; // adjust path to your firebase init

export type CurrencyCode = "USD" | "LKR" | "EUR" | "GBP" | string;

type CurrencyContextValue = {
  globalCurrency: CurrencyCode | null;
  setGlobalCurrency: (c: CurrencyCode) => Promise<void>;
  loading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined
);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [globalCurrency, setGlobalCurrencyState] = useState<CurrencyCode | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const settingsDocRef = doc(db, "settings", "global"); // single doc: settings/global

  // Load & subscribe
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let isMounted = true;

    const unsub = onSnapshot(
      settingsDocRef,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const data = snap.data() as any;
          setGlobalCurrencyState(data?.currency ?? "USD");
        } else {
          // initialize to USD if not present
          setDoc(settingsDocRef, { currency: "USD" }).catch((err) =>
            console.error("init settings doc failed", err)
          );
          setGlobalCurrencyState("USD");
        }
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error("settings snapshot error", err);
        setLoading(false);
      }
    );
    unsubscribe = unsub;

    return () => {
        isMounted = false;
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, []);

  // setter that writes to Firestore
  const setGlobalCurrency = async (c: CurrencyCode) => {
    setGlobalCurrencyState(c);
    try {
      await setDoc(settingsDocRef, { currency: c }, { merge: true });
    } catch (err) {
      console.error("failed to update global currency", err);
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ globalCurrency, setGlobalCurrency, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
