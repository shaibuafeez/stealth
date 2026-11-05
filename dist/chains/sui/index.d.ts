import { type Bytes } from '../../core/bytes.js';
import type { ChainAdapter } from '../../core/types.js';
/**
 * Sui: an address is BLAKE2b-256(flag ‖ public key), with 0x00 for ed25519.
 *
 * Spending without SUI is native: a sponsored transaction has a gas owner (the relayer) and a
 * sender (the one-time address), and both sign. signSuiTransaction makes the sender's half.
 */
export declare const sui: ChainAdapter;
/** The digest a Sui signature covers: BLAKE2b-256 of the transaction intent (0,0,0) and its BCS bytes. */
export declare const suiTransactionDigest: (transactionBytes: Bytes) => Bytes;
/** The one-time address's signature on a Sui transaction, serialized as Sui expects (flag ‖ sig ‖ key, base64). */
export declare function signSuiTransaction(stealthPrivateKey: Bytes, transactionBytes: Bytes): string;
