import { cookies } from 'next/headers'
import { LANG_COOKIE, isLang, translate, type DictKey, type Lang } from '@/lib/i18n'

// Language for API error messages, from the cookie the header toggle sets
export function serverLang(): Lang {
  const value = cookies().get(LANG_COOKIE)?.value
  return isLang(value) ? value : 'en'
}

export const st = (key: DictKey, vars?: Record<string, string | number>) => translate(serverLang(), key, vars)
