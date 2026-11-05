import { bytesToHex, getAddress, hexToBytes, isAddress, isAddressEqual, recoverMessageAddress } from 'viem';
import { publicKeyToAddress } from 'viem/accounts';
import { fromHex, toHex } from '../../core/bytes.js';
import { deriveKeys, encodeViewKey, fromSignature, KOVA_LABELS, keysMessage, metaAddress, parseMetaAddress, parseViewKey, viewKeyOf as coreViewKeyOf, } from '../../core/keys.js';
import { createPayment, findPayment, openPaymentMemo, paymentPrivateKey } from '../../core/stealth.js';
import { secp256k1Scheme, uncompressed } from '../../schemes/secp256k1.js';
/**
 * Every EVM chain (Monad, Ethereum, Base, Arbitrum, …): ERC-5564 scheme 1 over the core, with the
 * hex-string API EVM code expects. Meta-addresses read `st:eth:0x…` on every EVM chain, as
 * ERC-5564 writes them; the chain is chosen by where you pay and announce, not by the keys.
 */
export const evm = {
    tag: 'eth',
    scheme: secp256k1Scheme,
    address: (publicKey) => publicKeyToAddress(bytesToHex(uncompressed(publicKey))),
    addressBytes: (address) => hexToBytes(getAddress(address)),
};
export const STEALTH_SCHEME_ID = 1n;
const hex = (bytes) => `0x${toHex(bytes)}`;
const tag = (n) => `0x${n.toString(16).padStart(2, '0')}`;
const toCore = (keys) => ({
    spendingPrivateKey: fromHex(keys.spendingPrivateKey),
    viewingPrivateKey: fromHex(keys.viewingPrivateKey),
});
/** What a wallet signs to make its stealth keys (name your app and what the keys are for). */
export const stealthKeysMessage = keysMessage;
/** The stealth keys behind a 65-byte wallet signature: spending from r, viewing from s. */
export function stealthKeysFromSignature(signature, labels = KOVA_LABELS) {
    const keys = deriveKeys(evm, fromSignature(hexToBytes(signature)), labels);
    return { spendingPrivateKey: hex(keys.spendingPrivateKey), viewingPrivateKey: hex(keys.viewingPrivateKey) };
}
/** `st:eth:0x<spending><viewing>`, both compressed, as ERC-5564 writes it. */
export const stealthMetaAddress = (keys) => metaAddress(evm, toCore(keys));
export function parseStealthMetaAddress(meta) {
    const m = parseMetaAddress(evm, meta);
    return { spendingPublicKey: hex(m.spendingPublicKey), viewingPublicKey: hex(m.viewingPublicKey) };
}
/** A meta-address as the 66 raw bytes ERC-6538's registry stores. */
export function metaAddressToBytes(meta) {
    const m = parseMetaAddress(evm, meta);
    return hex(new Uint8Array([...m.spendingPublicKey, ...m.viewingPublicKey]));
}
export function metaAddressFromBytes(bytes) {
    if (hexToBytes(bytes).length !== 66)
        throw new Error('A stealth meta-address is 66 bytes');
    const meta = `st:eth:0x${bytes.slice(2).toLowerCase()}`;
    parseMetaAddress(evm, meta);
    return meta;
}
/** A fresh one-time address for a meta-address. */
export function generateStealthAddress(meta, ephemeralPrivateKey) {
    const { sealed: _, ...rest } = generateStealthPayment(meta, null, { ephemeralPrivateKey });
    return rest;
}
/** A fresh one-time address, with a note sealed for its owner. */
export function generateStealthPayment(meta, memo, options = {}) {
    const p = createPayment(evm, meta, {
        memo: memo ?? null,
        ...(options.label ? { memoLabel: options.label } : {}),
        ...(options.ephemeralPrivateKey ? { ephemeralPrivateKey: fromHex(options.ephemeralPrivateKey) } : {}),
        ...(options.nonce ? { nonce: fromHex(options.nonce) } : {}),
    });
    return {
        stealthAddress: getAddress(p.stealthAddress),
        ephemeralPublicKey: hex(p.ephemeralPublicKey),
        viewTag: tag(p.viewTag),
        sealed: p.sealed ? hex(p.sealed) : null,
    };
}
export const viewKeyOf = (keys) => {
    const v = coreViewKeyOf(evm, toCore(keys));
    return { viewingPrivateKey: hex(v.viewingPrivateKey), spendingPublicKey: hex(v.spendingPublicKey) };
};
/** Whether an announcement is for this view key: the one-time address, or null. */
export function checkStealthAddress(view, announcement) {
    const found = findPayment(evm, { viewingPrivateKey: fromHex(view.viewingPrivateKey), spendingPublicKey: fromHex(view.spendingPublicKey) }, {
        ephemeralPublicKey: fromHex(announcement.ephemeralPublicKey),
        viewTag: Number.parseInt(announcement.viewTag.slice(2, 4), 16),
        ...(announcement.stealthAddress ? { stealthAddress: announcement.stealthAddress } : {}),
    });
    return found ? getAddress(found) : null;
}
/** The private key of a one-time address. */
export const stealthPrivateKey = (keys, ephemeralPublicKey) => hex(paymentPrivateKey(evm, toCore(keys), fromHex(ephemeralPublicKey)));
/** A shareable view key: finds and reads every payment, moves none. */
export const stealthViewKey = (keys) => encodeViewKey(evm, coreViewKeyOf(evm, toCore(keys)));
/** Reads a view key; Kova's `kova-view:0x…` form too. */
export function parseStealthViewKey(text) {
    const normal = text.startsWith('kova-view:0x') ? `stealth-view:eth:0x${text.slice('kova-view:0x'.length)}` : text;
    const v = parseViewKey(evm, normal);
    return { viewingPrivateKey: hex(v.viewingPrivateKey), spendingPublicKey: hex(v.spendingPublicKey) };
}
/** Opens a payment's sealed note with the viewing key. */
export function openStealthMemo(viewingPrivateKey, payment, label) {
    const memo = openPaymentMemo(evm, fromHex(viewingPrivateKey), { ephemeralPublicKey: fromHex(payment.ephemeralPublicKey), stealthAddress: payment.stealthAddress, sealed: payment.sealed ? fromHex(payment.sealed) : null }, label);
    if (!memo)
        return null;
    const { from, ...rest } = memo;
    return from && isAddress(from) ? { ...rest, from: getAddress(from) } : rest;
}
/** What a sender's wallet signs to vouch, inside a note, that a payment from private funds is theirs. */
export function memoProofMessage(stealthAddress, app = 'Kova') {
    return `${app} private send\nTo ${stealthAddress.toLowerCase()}`;
}
/**
 * Who a private payment is from, and how sure that is: 'chain' when the chain shows it left their
 * wallet, 'signed' when their wallet signed for it, 'claimed' when only the note says so.
 */
export async function stealthSender(memo, payment, app = 'Kova') {
    const name = memo?.name ?? null;
    const claimed = memo?.from && isAddress(memo.from) ? getAddress(memo.from) : null;
    if (claimed) {
        if (payment.from && isAddressEqual(payment.from, claimed))
            return { address: claimed, name, proven: 'chain' };
        if (memo?.proof) {
            const signer = await recoverMessageAddress({
                message: memoProofMessage(payment.stealthAddress, app),
                signature: memo.proof,
            }).catch(() => null);
            if (signer && isAddressEqual(signer, claimed))
                return { address: claimed, name, proven: 'signed' };
        }
        return { address: claimed, name, proven: 'claimed' };
    }
    return payment.from ? { address: getAddress(payment.from), name, proven: 'chain' } : null;
}
export { KOVA_LABELS };
