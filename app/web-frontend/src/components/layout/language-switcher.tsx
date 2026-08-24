"use client";

import React from "react";
import { useTranslation, Locale } from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale, locales } = useTranslation();

  return (
    <div className="flex items-center">
      <Select value={locale} onValueChange={(val) => setLocale(val as Locale)}>
        <SelectTrigger className="h-8 gap-1.5 bg-[#12161e] border-[#2a3341] text-xs text-[#8b94a3] hover:text-[#f6f8fb] rounded-full px-2.5">
          <Globe className="w-3.5 h-3.5 text-[#fe2c55]" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#12161e] border-[#2a3341] min-w-[130px]">
          {locales.map((item) => (
            <SelectItem key={item.code} value={item.code} className="text-xs">
              <span className="mr-1.5">{item.flag}</span>
              <span>{item.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
