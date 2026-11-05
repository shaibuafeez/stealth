import { describe, expect, it } from 'vitest'
import { aptos } from '../src/chains/aptos/index.js'
import { evm } from '../src/chains/evm/stealth.js'
import { solana } from '../src/chains/solana/index.js'
import { stellar } from '../src/chains/stellar/index.js'
import { sui } from '../src/chains/sui/index.js'
import { decodeEnvelope, encodeEnvelope, readEnvelope } from '../src/core/envelope.js'
import { deriveKeys, fromSeed, metaAddress, viewKeyOf } from '../src/core/keys.js'
import { createPayment, findPayment, openPaymentMemo } from '../src/core/stealth.js'
import { utf8 } from '../src/core/bytes.js'
import type { ChainAdapter } from '../src/core/types.js'

describe('the announcement envelope', () => {
  const meta = metaAddress(solana, deriveKeys(solana, fromSeed(new Uint8Array(32).fill(5))))
  const pay = createPayment(solana, meta, { memo: { note: 'Coffee' } })

  it('carries every field and reads back without knowing the chain', () => {
    const envelope = encodeEnvelope(solana, {
      schemeId: solana.scheme.id,
      stealthAddress: pay.stealthAddress,
      ephemeralPublicKey: pay.ephemeralPublicKey,
      viewTag: pay.viewTag,
      asset: utf8('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      amount: 2_500_000n,
      sealed: pay.sealed,
    })
    const back = decodeEnvelope(envelope)
    expect(back).toMatchObject({ schemeId: 0x0101, viewTag: pay.viewTag, amount: 2_500_000n, sealed: pay.sealed })
    expect(back?.stealthAddressBytes).toEqual(solana.addressBytes(pay.stealthAddress))
    expect(back?.ephemeralPublicKey).toEqual(pay.ephemeralPublicKey)
  })

  it('leaves out what a payment doesn’t carry, and refuses what isn’t an envelope', () => {
    const bare = decodeEnvelope(
      encodeEnvelope(solana, { schemeId: 0x0101, stealthAddress: pay.stealthAddress, ephemeralPublicKey: pay.ephemeralPublicKey, viewTag: pay.viewTag }),
    )
    expect(bare?.amount).toBeUndefined()
    expect(bare?.sealed).toBeNull()
    expect(decodeEnvelope(utf8('not an envelope at all'))).toBeNull()
    expect(decodeEnvelope(new Uint8Array([1, 1, 1, 99]))).toBeNull()
  })
})

// The whole receiving side through the envelope, on every chain: the receiver gets bytes from some
// transport and must find and open its payment from them alone. On Sui, Aptos and EVM an address is a
// hash of a key, so the address must be written back from its bytes, not re-derived from them.
const chains: ChainAdapter[] = [evm, solana, sui, aptos, stellar]

describe.each(chains.map((c) => [c.tag, c] as const))('%s: from envelope bytes to a found, opened payment', (_, chain) => {
  const keys = deriveKeys(chain, fromSeed(new Uint8Array(32).fill(9)))
  const payment = createPayment(chain, metaAddress(chain, keys), { memo: { name: 'Ada', note: 'Rent' } })
  const bytes = encodeEnvelope(chain, { schemeId: chain.scheme.id, ...payment, amount: 5_000_000n })

  it('writes an address back from its bytes', () => {
    expect(chain.addressFromBytes(chain.addressBytes(payment.stealthAddress))).toBe(payment.stealthAddress)
  })

  it('reads the envelope back as an announcement the receiver finds and opens', () => {
    const announcement = readEnvelope(chain, bytes)
    expect(announcement?.stealthAddress).toBe(payment.stealthAddress)
    expect(findPayment(chain, viewKeyOf(chain, keys), announcement!)).toBe(payment.stealthAddress)
    expect(openPaymentMemo(chain, keys.viewingPrivateKey, announcement!)?.note).toBe('Rent')
  })

  it('stays silent for someone else’s keys', () => {
    const other = deriveKeys(chain, fromSeed(new Uint8Array(32).fill(10)))
    expect(findPayment(chain, viewKeyOf(chain, other), readEnvelope(chain, bytes)!)).toBeNull()
  })
})

it('refuses an envelope whose address is not the chain’s', () => {
  const keys = deriveKeys(solana, fromSeed(new Uint8Array(32).fill(11)))
  const payment = createPayment(solana, metaAddress(solana, keys))
  const bytes = encodeEnvelope(solana, { schemeId: solana.scheme.id, ...payment })
  expect(readEnvelope(evm, bytes)).toBeNull()
})
