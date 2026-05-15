// Shared utilities for Supabase Edge Functions.
// Mirrors the relevant logic from src/lib/products.ts for the Deno runtime.

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

// Characters: no 0, O, 1, I, L — avoids misreading when spoken or handwritten.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateVoucherCode(productName: string): string {
  const typeCode = TYPE_CODES[productName] ?? 'GW'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const random = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join('')
  return `GW-${typeCode}-${random}`
}

// Returns total price in euros.
// For value_voucher: variant is "25 €" → 25
// For tasting_voucher: variant is "2 Personen" → base_price × 2
export function calculatePriceEuros(
  productName: string,
  variant: string,
  voucherType: string,
): number {
  if (voucherType === 'value_voucher') {
    return parseInt(variant) // "50 €" → 50
  }
  const persons = parseInt(variant) // "2 Personen" → 2
  return (TASTING_PRICES[productName] ?? 0) * persons
}

export function personsFromVariant(variant: string): number | null {
  const m = variant.match(/^(\d+)/)
  return m ? parseInt(m[1]) : null
}

export function valueFromVariant(variant: string): number | null {
  const m = variant.match(/(\d+)\s*€/)
  return m ? parseInt(m[1]) : null
}
