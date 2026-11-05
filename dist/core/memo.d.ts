import { type Bytes } from './bytes.js';
import type { ChainAdapter } from './types.js';
/**
 * Sealed notes: who paid and why, readable only by the receiver.
 *
 *   key      = scheme.memoKey(shared point, label)
 *   sealed   = 0x01 ‖ nonce (24) ‖ XChaCha20-Poly1305(key, nonce, aad = one-time address bytes)
 *
 * Bound to the one-time address as associated data, so a note copied onto another payment fails
 * to open. The body is JSON with known fields only; anything else is dropped when opened.
 */
export interface Memo {
    /** The sender's own address, as their chain writes it. */
    from?: string;
    /** What the sender calls themselves. */
    name?: string;
    note?: string;
    /** 'change': the sender's own private funds, gathered into one new address of theirs. */
    kind?: 'send' | 'change';
    /** The sender's signature vouching for `from`, when the funds didn't come from that address. */
    proof?: string;
}
export declare const MEMO_VERSION = 1;
export declare const MEMO_NAME_MAX = 40;
export declare const MEMO_NOTE_MAX = 60;
/** Largest sealed note: the version, the nonce, 400 bytes of note and the tag. */
export declare const SEALED_MEMO_MAX: number;
/** Kova's label: notes sealed under it open in Kova, and the other way round. */
export declare const KOVA_MEMO_LABEL = "kova:stealth:memo:v1";
/** A memo from untrusted input: known fields, trimmed to their limits. */
export declare function cleanMemo(raw: unknown): Memo;
export declare function sealMemo(chain: ChainAdapter, sharedPoint: Bytes, stealthAddress: string, memo: Memo, options?: {
    label?: string | undefined;
    nonce?: Bytes | undefined;
}): Bytes;
/** Throws when the note isn't for this shared point and address. */
export declare function openMemo(chain: ChainAdapter, sharedPoint: Bytes, stealthAddress: string, sealed: Bytes, label?: string): Memo;
