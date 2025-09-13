
'use client';

import * as React from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

type Currency = 'LKR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  onValueChange: (value: number) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  readOnlyCurrency?: boolean;
}

export function CurrencyInput({
  value,
  onValueChange,
  currency,
  onCurrencyChange,
  readOnlyCurrency,
  ...props
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
        className="pl-4 pr-24"
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        <Select value={currency} onValueChange={(val) => onCurrencyChange(val as Currency)} disabled={props.readOnly || readOnlyCurrency}>
          <SelectTrigger className="w-[80px] h-full rounded-l-none border-l bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LKR">LKR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
