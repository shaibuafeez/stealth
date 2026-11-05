import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from '@noble/hashes/utils';
import { concat, fromUtf8, utf8 } from './bytes.js';
export const MEMO_VERSION = 1;
export const MEMO_NAME_MAX = 40;
export const MEMO_NOTE_MAX = 60;
/** Largest sealed note: the version, the nonce, 400 bytes of note and the tag. */
export const SEALED_MEMO_MAX = 1 + 24 + 400 + 16;
/** Kova's label: notes sealed under it open in Kova, and the other way round. */
export const KOVA_MEMO_LABEL = 'kova:stealth:memo:v1';
const chars = (text, max) => [...text.trim()].slice(0, max).join('');
/** A memo from untrusted input: known fields, trimmed to their limits. */
export function cleanMemo(raw) {
    const m = (raw && typeof raw === 'object' ? raw : {});
    const memo = {};
    if (typeof m.from === 'string' && m.from.length > 0 && m.from.length <= 100)
        memo.from = m.from;
    if (typeof m.name === 'string' && m.name.trim())
        memo.name = chars(m.name, MEMO_NAME_MAX);
    if (typeof m.note === 'string' && m.note.trim())
        memo.note = chars(m.note, MEMO_NOTE_MAX);
    if (m.kind === 'send' || m.kind === 'change')
        memo.kind = m.kind;
    if (typeof m.proof === 'string' && /^0x[0-9a-fA-F]{2,260}$/.test(m.proof))
        memo.proof = m.proof;
    return memo;
}
export function sealMemo(chain, sharedPoint, stealthAddress, memo, options = {}) {
    const body = utf8(JSON.stringify(cleanMemo(memo)));
    if (body.length > SEALED_MEMO_MAX - 41)
        throw new Error('That note is too long to seal.');
    const nonce = options.nonce ?? randomBytes(24);
    if (nonce.length !== 24)
        throw new Error('A nonce is 24 bytes');
    const key = chain.scheme.memoKey(sharedPoint, options.label ?? KOVA_MEMO_LABEL);
    const box = xchacha20poly1305(key, nonce, chain.addressBytes(stealthAddress)).encrypt(body);
    return concat(new Uint8Array([MEMO_VERSION]), nonce, box);
}
/** Throws when the note isn't for this shared point and address. */
export function openMemo(chain, sharedPoint, stealthAddress, sealed, label) {
    if (sealed[0] !== MEMO_VERSION || sealed.length < 41 || sealed.length > SEALED_MEMO_MAX)
        throw new Error('Not a sealed note');
    const key = chain.scheme.memoKey(sharedPoint, label ?? KOVA_MEMO_LABEL);
    const body = xchacha20poly1305(key, sealed.slice(1, 25), chain.addressBytes(stealthAddress)).decrypt(sealed.slice(25));
    return cleanMemo(JSON.parse(fromUtf8(body)));
}
