// validators.js
//
// Lightweight, dependency-free input validation & sanitization.
// Every write in AppContext.jsx should run user-supplied data through one
// of these before it reaches Supabase. This is defense-in-depth, not the
// real backstop — RLS policies and the server-side RPC functions
// (see supabase/002_mark_attendance_rpc.sql) are what actually protect the
// database. This layer exists to reject obviously bad input fast, with a
// friendly message, before it's even sent over the wire.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

export class ValidationError extends Error {
  constructor(field, message) {
    super(`${field} ${message}`)
    this.field = field
  }
}

/** Strip control characters and trim. NOTE: this does not HTML-escape —
 * React already escapes text content on render, so this is about size and
 * shape, not XSS. If any of these fields are ever put through
 * dangerouslySetInnerHTML, or exported to CSV/Excel, re-sanitize at that
 * boundary too (leading =, +, -, @ characters need quoting to prevent
 * CSV formula injection). */
export function cleanString(value) {
  if (typeof value !== 'string') return ''
  return value.replace(CONTROL_CHARS, '').trim()
}

export function requireString(value, field, { maxLength = 255, minLength = 1, pattern } = {}) {
  const v = cleanString(value)
  if (v.length < minLength) throw new ValidationError(field, `must be at least ${minLength} character(s)`)
  if (v.length > maxLength) throw new ValidationError(field, `must be ${maxLength} characters or fewer`)
  if (pattern && !pattern.test(v)) throw new ValidationError(field, 'has an invalid format')
  return v
}

export function optionalString(value, field, opts = {}) {
  if (value === undefined || value === null || value === '') return ''
  return requireString(value, field, { ...opts, minLength: 0 })
}

export function requireNumber(value, field, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) throw new ValidationError(field, 'must be a number')
  if (integer && !Number.isInteger(n)) throw new ValidationError(field, 'must be a whole number')
  if (n < min || n > max) throw new ValidationError(field, `must be between ${min} and ${max}`)
  return n
}

/** Only accepts https URLs. Pass allowedHosts once you know your storage
 * bucket's public hostname, to stop proof-of-merit links pointing anywhere
 * on the internet (phishing / SSRF-adjacent risk for whoever reviews claims). */
export function requireUrl(value, field, { allowedHosts } = {}) {
  const v = cleanString(value)
  let parsed
  try {
    parsed = new URL(v)
  } catch {
    throw new ValidationError(field, 'must be a valid URL')
  }
  if (parsed.protocol !== 'https:') throw new ValidationError(field, 'must use https')
  if (allowedHosts && !allowedHosts.includes(parsed.hostname)) {
    throw new ValidationError(field, `must be hosted on ${allowedHosts.join(' or ')}`)
  }
  return parsed.toString()
}

/** Reject any object containing keys outside the allow-list — a cheap way
 * to stop "extra field" / mass-assignment style payloads before they get
 * anywhere near an .insert()/.upsert() call. */
export function pickAllowed(obj, allowedKeys) {
  const out = {}
  const unexpected = []
  for (const key of Object.keys(obj || {})) {
    if (allowedKeys.includes(key)) out[key] = obj[key]
    else unexpected.push(key)
  }
  if (unexpected.length) {
    throw new ValidationError('payload', `has unexpected field(s): ${unexpected.join(', ')}`)
  }
  return out
}

export function requireDescriptorArray(value, field, { length = 128 } = {}) {
  if (!Array.isArray(value)) throw new ValidationError(field, 'must be an array')
  if (value.length !== length) throw new ValidationError(field, `must have exactly ${length} values`)
  if (!value.every((n) => Number.isFinite(n))) throw new ValidationError(field, 'must contain only numbers')
  return value
}

export const ALLOWED_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function requireWeekdayList(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 7) {
    throw new ValidationError(field, 'must be a non-empty list of weekdays')
  }
  for (const day of value) {
    if (!ALLOWED_WEEKDAYS.includes(day)) throw new ValidationError(field, `contains an invalid day: ${day}`)
  }
  return value
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function requireTime(value, field) {
  return requireString(value, field, { maxLength: 5, pattern: TIME_PATTERN })
}