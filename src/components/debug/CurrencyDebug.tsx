'use client';

// src/components/debug/CurrencyDebug.tsx
import React from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "../ui/button";

export const CurrencyDebug: React.FC = () => {
  const { globalCurrency, setGlobalCurrency, loading } = useCurrency();

  if (loading) return <div className="text-sm">Loading currency...</div>;

  return (
    <div className="p-2 border rounded-xl bg-card flex items-center gap-2">
      <div className="text-sm">Global Currency: <strong>{globalCurrency}</strong></div>
      <div className="flex gap-1">
        {["USD", "LKR", "EUR", "GBP"].map((c) => (
          <Button
            key={c}
            onClick={() => setGlobalCurrency(c)}
            size="sm"
            variant={globalCurrency === c ? "default" : "outline"}
          >
            {c}
          </Button>
        ))}
      </div>
    </div>
  );
};
