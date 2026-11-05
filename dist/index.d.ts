/**
 * stealth: private payments on any chain.
 *
 * The core is chain-neutral (keys, meta-addresses, one-time addresses, view keys, sealed notes,
 * the announcement envelope, the privacy router). Chains plug in through an adapter:
 *
 *   import { evm } from 'stealth/evm'          // Monad, Ethereum, Base, … (ERC-5564)
 *   import { solana } from 'stealth/solana'
 *   import { sui } from 'stealth/sui'
 *   import { aptos } from 'stealth/aptos'
 *   import { stellar } from 'stealth/stellar'
 */
export * from './core/bytes.js';
export * from './core/envelope.js';
export * from './core/keys.js';
export * from './core/memo.js';
export * from './core/router.js';
export * from './core/stealth.js';
export type * from './core/types.js';
export { ed25519Scheme, signWithScalar, verifyEd25519 } from './schemes/ed25519.js';
export { secp256k1Scheme } from './schemes/secp256k1.js';
