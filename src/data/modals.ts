// Modals content is now in i18n JSON files under "modals" key.
// This module provides a helper to get modal content from the current locale.
import { useI18n } from 'vue-i18n';

export interface ModalContent {
  title: string;
  body: string;
}

export function useModal(key: string): ModalContent | null {
  const { t, te } = useI18n();
  const titleKey = `modals.${key}.title`;
  const bodyKey = `modals.${key}.body`;
  if (!te(titleKey)) return null;
  return {
    title: t(titleKey),
    body: t(bodyKey),
  };
}

export const MODAL_KEYS = [
  'loanInfo',
  'propInfo',
  'rateTypeInfo',
  'fixedRateInfo',
  'payTypeInfo',
  'indexInfo',
  'indexRateInfo',
  'spreadInfo',
  'earlyPayInfo',
  'indexChangeInfo',
] as const;
