import type { Address } from 'viem';
/**
 * The exact messages Kova's wallets sign to make their stealth keys. Use these with
 * stealthKeysFromSignature (and the default labels) to make the same keys a Kova wallet has, for
 * example to pay a Kova user privately from your own app, or to build a Kova-compatible wallet.
 */
/** A person's private-receiving keys. */
export declare function kovaPersonalKeysMessage(wallet: Address): string;
/** A shop's private-takings keys (one set per shop, so one wallet's shops stay separate). */
export declare function kovaShopKeysMessage(shop: string): string;
