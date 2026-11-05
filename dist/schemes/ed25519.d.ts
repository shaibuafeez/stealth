import { type Bytes } from '../core/bytes.js';
import type { StealthScheme } from '../core/types.js';
/**
 * Stealth addresses on ed25519, for Solana, Sui and Aptos: the CryptoNote construction Monero has
 * run since 2014, with ERC-5564's view tag added.
 *
 *   shared  = enc( a·B )                                32 bytes
 *   H       = SHA-512(shared ‖ label)                   64 bytes; view tag = H[0]
 *   P       = S + (H mod L)·G                           the one-time public key (an address)
 *   p       = s + (H mod L)               mod L         its private key, a raw scalar
 *
 * Keys are raw scalars, not RFC 8032 seeds: P has no seed, only p. signWithScalar signs with p
 * directly, and its signatures verify under standard Ed25519 (RFC 8032), so a one-time address
 * signs a Solana, Sui or Aptos transaction like any other key. Public keys are checked to lie in the
 * prime-order subgroup, so a malicious meta-address can't push a sender into a small subgroup.
 */
export declare const ed25519Scheme: StealthScheme;
/**
 * An Ed25519 signature made with a raw scalar (a one-time private key) instead of an RFC 8032
 * seed. The nonce is derived deterministically from the scalar and the message, as RFC 8032
 * derives it from the seed, so signing twice gives the same signature and no randomness can leak
 * the key. Verifies with any standard Ed25519 verifier.
 */
export declare function signWithScalar(message: Bytes, privateKey: Bytes): Bytes;
/** Standard Ed25519 verification (RFC 8032). */
export declare const verifyEd25519: (signature: Bytes, message: Bytes, publicKey: Bytes) => boolean;
