import { type Address, type Hex } from 'viem';
import { KOVA_LABELS, type KeyLabels, keysMessage } from '../../core/keys.js';
import type { Memo } from '../../core/memo.js';
import type { ChainAdapter } from '../../core/types.js';
/**
 * Every EVM chain (Monad, Ethereum, Base, Arbitrum, …): ERC-5564 scheme 1 over the core, with the
 * hex-string API EVM code expects. Meta-addresses read `st:eth:0x…` on every EVM chain, as
 * ERC-5564 writes them; the chain is chosen by where you pay and announce, not by the keys.
 */
export declare const evm: ChainAdapter;
export declare const STEALTH_SCHEME_ID = 1n;
export interface StealthKeys {
    spendingPrivateKey: Hex;
    viewingPrivateKey: Hex;
}
export interface ViewKey {
    viewingPrivateKey: Hex;
    spendingPublicKey: Hex;
}
export interface StealthAnnouncement {
    stealthAddress: Address;
    /** Compressed, 33 bytes. */
    ephemeralPublicKey: Hex;
    viewTag: Hex;
}
export interface StealthPayment extends StealthAnnouncement {
    sealed: Hex | null;
}
/** What a wallet signs to make its stealth keys (name your app and what the keys are for). */
export declare const stealthKeysMessage: typeof keysMessage;
/** The stealth keys behind a 65-byte wallet signature: spending from r, viewing from s. */
export declare function stealthKeysFromSignature(signature: Hex, labels?: KeyLabels): StealthKeys;
/** `st:eth:0x<spending><viewing>`, both compressed, as ERC-5564 writes it. */
export declare const stealthMetaAddress: (keys: StealthKeys) => string;
export declare function parseStealthMetaAddress(meta: string): {
    spendingPublicKey: Hex;
    viewingPublicKey: Hex;
};
/** A meta-address as the 66 raw bytes ERC-6538's registry stores. */
export declare function metaAddressToBytes(meta: string): Hex;
export declare function metaAddressFromBytes(bytes: Hex): string;
/** A fresh one-time address for a meta-address. */
export declare function generateStealthAddress(meta: string, ephemeralPrivateKey?: Hex): StealthAnnouncement;
/** A fresh one-time address, with a note sealed for its owner. */
export declare function generateStealthPayment(meta: string, memo?: Memo | null, options?: {
    ephemeralPrivateKey?: Hex | undefined;
    label?: string;
    nonce?: Hex;
}): StealthPayment;
export declare const viewKeyOf: (keys: StealthKeys) => ViewKey;
/** Whether an announcement is for this view key: the one-time address, or null. */
export declare function checkStealthAddress(view: ViewKey, announcement: {
    ephemeralPublicKey: Hex;
    viewTag: Hex;
    stealthAddress?: Address;
}): Address | null;
/** The private key of a one-time address. */
export declare const stealthPrivateKey: (keys: StealthKeys, ephemeralPublicKey: Hex) => Hex;
/** A shareable view key: finds and reads every payment, moves none. */
export declare const stealthViewKey: (keys: StealthKeys) => string;
/** Reads a view key; Kova's `kova-view:0x…` form too. */
export declare function parseStealthViewKey(text: string): ViewKey;
/** Opens a payment's sealed note with the viewing key. */
export declare function openStealthMemo(viewingPrivateKey: Hex, payment: {
    ephemeralPublicKey: Hex;
    stealthAddress: Address;
    sealed: Hex | null | undefined;
}, label?: string): (Memo & {
    from?: Address;
}) | null;
/** What a sender's wallet signs to vouch, inside a note, that a payment from private funds is theirs. */
export declare function memoProofMessage(stealthAddress: Address, app?: string): string;
/**
 * Who a private payment is from, and how sure that is: 'chain' when the chain shows it left their
 * wallet, 'signed' when their wallet signed for it, 'claimed' when only the note says so.
 */
export declare function stealthSender(memo: Memo | null, payment: {
    stealthAddress: Address;
    from?: Address | null;
}, app?: string): Promise<{
    address: Address;
    name: string | null;
    proven: 'chain' | 'signed' | 'claimed';
} | null>;
export { KOVA_LABELS, type KeyLabels };
