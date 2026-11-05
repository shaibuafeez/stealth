import { type Bytes } from './bytes.js';
import type { ChainAdapter } from './types.js';
/**
 * Stealth keys: a spending key that moves money and a viewing key that only finds and reads it.
 *
 * They come from secret material the user already controls, never from new storage:
 *   - a wallet signature over a fixed message (fromSignature): EVM wallets sign deterministically
 *     (RFC 6979), so the same wallet and message give the same keys on every device;
 *   - or any 32+ bytes of secret (fromSeed): a passkey's PRF output, a seed phrase, a KMS secret.
 * Each key is the scheme's hash of its material under its own label.
 */
export interface StealthKeys {
    spendingPrivateKey: Bytes;
    viewingPrivateKey: Bytes;
}
export interface KeyLabels {
    spending: string;
    viewing: string;
}
/** Kova's labels: keys made under them are the keys Kova makes, so the two interoperate. */
export declare const KOVA_LABELS: KeyLabels;
/** Secret material for each key. */
export interface KeyMaterial {
    spending: Bytes;
    viewing: Bytes;
}
/** From a 65-byte (r ‖ s ‖ v) signature: the spending key from r, the viewing key from s. */
export declare function fromSignature(signature: Bytes): KeyMaterial;
/** From a seed of 32 bytes or more: both keys from the same seed, told apart by their labels. */
export declare function fromSeed(seed: Bytes): KeyMaterial;
/** What a wallet signs to make its stealth keys. Name the app and what the keys are for. */
export declare function keysMessage(app: string, scope: string): string;
export declare function deriveKeys(chain: ChainAdapter, material: KeyMaterial, labels?: KeyLabels): StealthKeys;
export interface MetaAddress {
    spendingPublicKey: Bytes;
    viewingPublicKey: Bytes;
}
/** The meta-address to share: both public keys, under the chain's tag (ERC-5564's format on EVM). */
export declare function metaAddress(chain: ChainAdapter, keys: StealthKeys): string;
export declare function encodeMetaAddress(chain: ChainAdapter, meta: MetaAddress): string;
/** Both public keys of a meta-address, checked to be valid points for the chain's scheme. */
export declare function parseMetaAddress(chain: ChainAdapter, meta: string): MetaAddress;
export interface ViewKey {
    viewingPrivateKey: Bytes;
    spendingPublicKey: Bytes;
}
export declare const viewKeyOf: (chain: ChainAdapter, keys: StealthKeys) => ViewKey;
/** A shareable view key, for an accountant or an auditor. It holds no spending secret. */
export declare function encodeViewKey(chain: ChainAdapter, view: ViewKey): string;
export declare function parseViewKey(chain: ChainAdapter, text: string): ViewKey;
/** What a wallet signs to publish its meta-address in a signed (off-chain) registry. */
export declare function registrationMessage(app: string, owner: string, meta: string): string;
