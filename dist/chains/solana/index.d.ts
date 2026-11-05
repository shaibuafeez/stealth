import type { Bytes } from '../../core/bytes.js';
import type { ChainAdapter } from '../../core/types.js';
/**
 * Solana: an address is the ed25519 public key in base58, so a one-time public key is a one-time
 * address with nothing more to derive.
 *
 * Spending without SOL is native: a transaction names its fee payer, and that can be a relayer.
 * Build the transfer with the relayer as fee payer and the one-time address as the token owner,
 * then add the one-time address's signature with signSolanaMessage. (The relayer also pays the
 * rent for any token account it creates.)
 */
export declare const solana: ChainAdapter;
/** The one-time address's signature over a serialized Solana transaction message. */
export declare const signSolanaMessage: (stealthPrivateKey: Bytes, message: Bytes) => Bytes;
