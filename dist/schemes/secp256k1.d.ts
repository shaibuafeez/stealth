import { type Bytes } from '../core/bytes.js';
import type { StealthScheme } from '../core/types.js';
/**
 * ERC-5564 scheme 1: secp256k1 with view tags, as every EVM chain uses it.
 *
 *   shared  = compressed( ECDH(a, B) )                 33 bytes
 *   hashed  = keccak256(shared)                        32 bytes; view tag = hashed[0]
 *   P       = S + (hashed mod n)·G                     the one-time public key
 *   p       = s + (hashed mod n)          mod n        its private key
 *
 * Keys from material: keccak256(material ‖ label) mod n. Memo keys: keccak256(shared ‖ label).
 * Byte-for-byte what Kova runs on Monad, so the two interoperate.
 */
export declare const secp256k1Scheme: StealthScheme;
/** The uncompressed form (65 bytes) of a compressed secp256k1 public key. */
export declare const uncompressed: (publicKey: Bytes) => Bytes;
