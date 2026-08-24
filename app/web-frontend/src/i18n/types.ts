export type Locale = "zh-CN" | "vi" | "en";

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export const DEFAULT_LOCALE: Locale = "zh-CN";

// Recursive key path generator for type-safety
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];
