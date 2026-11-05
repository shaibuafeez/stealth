import { equal } from './bytes.js';
import { parseMetaAddress } from './keys.js';
import { openMemo, sealMemo } from './memo.js';
/** A fresh one-time address for a meta-address, with an optional note sealed for its owner. */
export function createPayment(chain, meta, options = {}) {
    const { spendingPublicKey, viewingPublicKey } = parseMetaAddress(chain, meta);
    const ephemeral = options.ephemeralPrivateKey ?? chain.scheme.randomPrivateKey();
    const shared = chain.scheme.sharedPoint(ephemeral, viewingPublicKey);
    const hashed = chain.scheme.hashedSecret(shared);
    const stealthAddress = chain.address(chain.scheme.stealthPublicKey(spendingPublicKey, hashed));
    return {
        stealthAddress,
        ephemeralPublicKey: chain.scheme.publicKey(ephemeral),
        viewTag: hashed[0],
        sealed: options.memo
            ? sealMemo(chain, shared, stealthAddress, options.memo, { label: options.memoLabel, nonce: options.nonce })
            : null,
    };
}
/**
 * Whether a payment is for this view key: its one-time address, or null. The view tag is checked
 * first, so 255 of every 256 other people's payments cost one point multiplication and a hash.
 */
export function findPayment(chain, view, announcement) {
    const shared = chain.scheme.sharedPoint(view.viewingPrivateKey, announcement.ephemeralPublicKey);
    const hashed = chain.scheme.hashedSecret(shared);
    if (hashed[0] !== announcement.viewTag)
        return null;
    const address = chain.address(chain.scheme.stealthPublicKey(view.spendingPublicKey, hashed));
    if (announcement.stealthAddress !== undefined &&
        !equal(chain.addressBytes(address), chain.addressBytes(announcement.stealthAddress)))
        return null;
    return address;
}
/** The private key of a one-time address: only the holder of the spending key can make it. */
export function paymentPrivateKey(chain, keys, ephemeralPublicKey) {
    const shared = chain.scheme.sharedPoint(keys.viewingPrivateKey, ephemeralPublicKey);
    return chain.scheme.stealthPrivateKey(keys.spendingPrivateKey, chain.scheme.hashedSecret(shared));
}
/** Opens a payment's sealed note with the viewing key: null when there's none, or not for this key. */
export function openPaymentMemo(chain, viewingPrivateKey, payment, label) {
    if (!payment.sealed)
        return null;
    try {
        const shared = chain.scheme.sharedPoint(viewingPrivateKey, payment.ephemeralPublicKey);
        return openMemo(chain, shared, payment.stealthAddress, payment.sealed, label);
    }
    catch {
        return null;
    }
}
