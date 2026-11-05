// Shared bits for the live round trips: the library under test, a throwaway funder key per chain
// (testnet only, kept beside these scripts, never printed), and the receiver's side.
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import * as S from '../dist/index.js'

export { S }

const FILE = new URL('./keys.json', import.meta.url)

/** A funder secret for a chain: made once, then reused, so faucets aren't hit on every run. */
export function funderSecret(chain, make) {
  const all = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}
  if (!all[chain]) {
    all[chain] = Buffer.from(make()).toString('hex')
    writeFileSync(FILE, JSON.stringify(all, null, 2), { mode: 0o600 })
  }
  return new Uint8Array(Buffer.from(all[chain], 'hex'))
}

/** A fresh receiver: its keys and the meta-address it would publish. */
export function receiver(chain) {
  const keys = S.deriveKeys(chain, S.fromSeed(randomBytes(32)))
  return { keys, meta: S.metaAddress(chain, keys), view: S.viewKeyOf(chain, keys) }
}

/** The announcement for a payment, through the envelope bytes and back, as any transport would. */
export function announce(chain, payment, amount) {
  const bytes = S.encodeEnvelope(chain, {
    schemeId: chain.scheme.id,
    stealthAddress: payment.stealthAddress,
    ephemeralPublicKey: payment.ephemeralPublicKey,
    viewTag: payment.viewTag,
    amount,
    sealed: payment.sealed,
  })
  return bytes
}

export function readAnnouncement(chain, bytes) {
  const a = S.readEnvelope(chain, bytes)
  if (!a) throw new Error('envelope did not parse')
  return a
}

export function step(label, value) {
  console.log(`  ${label.padEnd(26)} ${value}`)
}

export function check(label, ok) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) process.exitCode = 1
  return ok
}
