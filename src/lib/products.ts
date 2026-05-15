import type { ProductType } from '@/types/database'

// ─── Tasting Vouchers ─────────────────────────────────────────────────────────

export const TASTING_VOUCHERS = [
  { name: 'Wein Tasting',               code: 'WT', schedule: 'Do 19:00 · Fr 20:00 · Sa 20:00' },
  { name: 'Afterwork Wein Tasting',      code: 'AW', schedule: 'Mi 18:00' },
  { name: 'Gin Tasting',                 code: 'GT', schedule: '3. Sa 20:00' },
  { name: 'Champagner & Popcorn',        code: 'CP', schedule: 'Sa 12:00' },
  { name: 'Trüffel & Champagner',        code: 'TC', schedule: '3. Sa 20:00 (geteilt mit Gin Tasting)' },
  { name: 'Craft Beer Tasting',          code: 'CB', schedule: '1. Sa 20:00' },
  { name: 'Wagyu-Burger & Champagner',   code: 'WB', schedule: '2. Sa 20:00' },
  { name: 'Apéro & Antipasti',           code: 'AA', schedule: 'Fr 17:00 · Sa 16:00' },
] as const

export const TASTING_VARIANTS = ['1 Person', '2 Personen', '4 Personen'] as const

// ─── Value Vouchers ───────────────────────────────────────────────────────────

export const VALUE_VOUCHER_NAME = 'Wertgutschein'
export const VALUE_VOUCHER_VARIANTS = ['25 €', '50 €', '100 €'] as const

// ─── Gift Boxes ───────────────────────────────────────────────────────────────

export const GIFT_BOXES = [
  'Der Deutsche Klassiker',
  'Bella Italia Box',
  'Aperitivo Box',
  'Bonn Probierbox',
  'Date Night Box',
  'Feierabend Box',
] as const

export const GIFT_BOX_VARIANTS = ['Klein', 'Medium', 'Groß'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function productNamesForType(type: ProductType): string[] {
  if (type === 'tasting_voucher') return TASTING_VOUCHERS.map(t => t.name)
  if (type === 'value_voucher')   return [VALUE_VOUCHER_NAME]
  if (type === 'gift_box')        return [...GIFT_BOXES]
  return []
}

export function variantsForType(type: ProductType): string[] {
  if (type === 'tasting_voucher') return [...TASTING_VARIANTS]
  if (type === 'value_voucher')   return [...VALUE_VOUCHER_VARIANTS]
  if (type === 'gift_box')        return [...GIFT_BOX_VARIANTS]
  return []
}

export function scheduleForTasting(name: string): string {
  return TASTING_VOUCHERS.find(t => t.name === name)?.schedule ?? ''
}

export const ORDER_TYPE_LABELS: Record<string, string> = {
  tasting_voucher: 'Tasting-Gutschein',
  value_voucher:   'Wertgutschein',
  gift_box:        'Genussbox',
  mixed:           'Gemischt',
}

export const SOURCE_LABELS: Record<string, string> = {
  whatsapp:   'WhatsApp',
  formspree:  'Formspree',
  in_person:  'Vor Ort',
  manual:     'Manuell',
}

// ─── Tasting Prices ───────────────────────────────────────────────────────────
// Price per person in euros. Used by the Stripe checkout flow.

export const TASTING_PRICES: Record<string, number> = {
  'Wein Tasting':              29,
  'Afterwork Wein Tasting':    19,
  'Gin Tasting':               45,
  'Champagner & Popcorn':      39,
  'Trüffel & Champagner':      66,
  'Craft Beer Tasting':        25,
  'Wagyu-Burger & Champagner': 55,
  'Apéro & Antipasti':         29,
}

// ─── Voucher Code Generation ──────────────────────────────────────────────────
// Characters: no 0, O, 1, I, L — avoids misreading when spoken or handwritten.

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const TYPE_CODES: Record<string, string> = {
  'Wein Tasting':             'WT',
  'Afterwork Wein Tasting':   'AW',
  'Gin Tasting':              'GT',
  'Champagner & Popcorn':     'CP',
  'Trüffel & Champagner':     'TC',
  'Craft Beer Tasting':       'CB',
  'Wagyu-Burger & Champagner':'WB',
  'Apéro & Antipasti':        'AA',
  'Wertgutschein':            'VV',
}

export function generateVoucherCode(productName: string): string {
  const typeCode = TYPE_CODES[productName] ?? 'GW'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const random = Array.from(bytes).map(b => CHARS[b % CHARS.length]).join('')
  return `GW-${typeCode}-${random}`
}

// ─── Voucher field helpers ────────────────────────────────────────────────────

export function personsFromVariant(variant: string): number | null {
  const m = variant.match(/^(\d+)/)
  return m ? parseInt(m[1]) : null
}

export function valueFromVariant(variant: string): number | null {
  const m = variant.match(/(\d+)\s*€/)
  return m ? parseInt(m[1]) : null
}
