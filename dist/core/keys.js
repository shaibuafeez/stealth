import { concat, fromHex, toHex } from './bytes.js';
/** Kova's labels: keys made under them are the keys Kova makes, so the two interoperate. */
export const KOVA_LABELS = { spending: 'kova:stealth:spending', viewing: 'kova:stealth:viewing' };
/** From a 65-byte (r ‖ s ‖ v) signature: the spending key from r, the viewing key from s. */
export function fromSignature(signature) {
    if (signature.length !== 65)
        throw new Error('Expected a 65-byte signature');
    return { spending: signature.slice(0, 32), viewing: signature.slice(32, 64) };
}
/** From a seed of 32 bytes or more: both keys from the same seed, told apart by their labels. */
export function fromSeed(seed) {
    if (seed.length < 32)
        throw new Error('A seed is at least 32 bytes');
    return { spending: seed, viewing: seed };
}
/** What a wallet signs to make its stealth keys. Name the app and what the keys are for. */
export function keysMessage(app, scope) {
    return `${app} private receiving\n${scope}\n\nSign to open your private receiving keys. This only reads keys; it moves no money.`;
}
export function deriveKeys(chain, material, labels = KOVA_LABELS) {
    return {
        spendingPrivateKey: chain.scheme.privateKeyFrom(material.spending, labels.spending),
        viewingPrivateKey: chain.scheme.privateKeyFrom(material.viewing, labels.viewing),
    };
}
/** The meta-address to share: both public keys, under the chain's tag (ERC-5564's format on EVM). */
export function metaAddress(chain, keys) {
    return encodeMetaAddress(chain, {
        spendingPublicKey: chain.scheme.publicKey(keys.spendingPrivateKey),
        viewingPublicKey: chain.scheme.publicKey(keys.viewingPrivateKey),
    });
}
export function encodeMetaAddress(chain, meta) {
    return `st:${chain.tag}:0x${toHex(concat(meta.spendingPublicKey, meta.viewingPublicKey))}`;
}
/** Both public keys of a meta-address, checked to be valid points for the chain's scheme. */
export function parseMetaAddress(chain, meta) {
    const prefix = `st:${chain.tag}:0x`;
    const length = chain.scheme.publicKeyLength;
    if (!meta.startsWith(prefix) || meta.length !== prefix.length + length * 4)
        throw new Error(`Not a ${chain.tag} stealth meta-address`);
    const bytes = fromHex(meta.slice(prefix.length));
    const spendingPublicKey = bytes.slice(0, length);
    const viewingPublicKey = bytes.slice(length);
    chain.scheme.assertPublicKey(spendingPublicKey);
    chain.scheme.assertPublicKey(viewingPublicKey);
    return { spendingPublicKey, viewingPublicKey };
}
export const viewKeyOf = (chain, keys) => ({
    viewingPrivateKey: keys.viewingPrivateKey,
    spendingPublicKey: chain.scheme.publicKey(keys.spendingPrivateKey),
});
/** A shareable view key, for an accountant or an auditor. It holds no spending secret. */
export function encodeViewKey(chain, view) {
    return `stealth-view:${chain.tag}:0x${toHex(concat(view.viewingPrivateKey, view.spendingPublicKey))}`;
}
export function parseViewKey(chain, text) {
    const prefix = `stealth-view:${chain.tag}:0x`;
    const length = chain.scheme.publicKeyLength;
    if (!text.startsWith(prefix) || text.length !== prefix.length + (32 + length) * 2)
        throw new Error(`Not a ${chain.tag} view key`);
    const bytes = fromHex(text.slice(prefix.length));
    const view = { viewingPrivateKey: bytes.slice(0, 32), spendingPublicKey: bytes.slice(32) };
    chain.scheme.assertPublicKey(view.spendingPublicKey);
    return view;
}
/** What a wallet signs to publish its meta-address in a signed (off-chain) registry. */
export function registrationMessage(app, owner, meta) {
    return `${app} private receiving\nWallet ${owner.toLowerCase()}\nKey ${meta}`;
}
