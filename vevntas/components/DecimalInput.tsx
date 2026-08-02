"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { parseLocaleNumber } from "@/lib/money";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
  decimals?: number;
};

export function DecimalInput({ value, onValueChange, decimals = 3, onFocus, onBlur, ...props }: Props) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(value === 0 ? "" : String(value));
  }, [value, editing]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(event) => {
        setEditing(true);
        if (value === 0 || text === "0") setText("");
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/[^0-9.,+-]/g, "");
        setText(next);
        onValueChange(parseLocaleNumber(next));
      }}
      onBlur={(event) => {
        setEditing(false);
        const parsed = parseLocaleNumber(text);
        const factor = 10 ** decimals;
        const normalized = Math.round(parsed * factor) / factor;
        onValueChange(normalized);
        setText(normalized === 0 ? "" : String(normalized));
        onBlur?.(event);
      }}
    />
  );
}
