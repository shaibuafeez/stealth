import { type Bytes } from './bytes.js';
import type { Announcement, ChainAdapter } from './types.js';
/**
 * The announcement envelope: one byte layout for any transport that carries bytes, for chains with
 * no ERC-5564 announcer (a Solana memo instruction, a Sui or Aptos event, an indexer's API). EVM
 * chains use ERC-5564's event instead (chains/evm), which carries the same fields.
 *
 *   0       version            0x01
 *   1..2    scheme id          u16, big-endian
 *   3       n                  address length, then n bytes of the one-time address
 *   …       m                  ephemeral public key length, then m bytes
 *   …       view tag           1 byte
 *   …       k                  asset id length (0: none), then k bytes
 *   …       j                  amount length (0: none), then j bytes, big-endian
 *   …       sealed note        the rest (empty: none)
 *
 * Every length is one byte, so an envelope is self-describing and parses without knowing the chain.
 */
export declare const ENVELOPE_VERSION = 1;
export declare function encodeEnvelope(chain: ChainAdapter, a: Announcement): Bytes;
/**
 * An envelope read back as an announcement for one chain, ready for findPayment and
 * openPaymentMemo; null when the bytes aren't a v1 envelope or don't hold an address of that chain.
 */
export declare function readEnvelope(chain: ChainAdapter, bytes: Bytes): Announcement | null;
/** An envelope's fields, or null when the bytes aren't a v1 envelope. The address stays raw bytes: readEnvelope writes it for a chain. */
export declare function decodeEnvelope(bytes: Bytes): (Omit<Announcement, 'stealthAddress'> & {
    stealthAddressBytes: Bytes;
}) | null;
