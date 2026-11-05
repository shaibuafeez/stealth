import { type Bytes } from '../../core/bytes.js';
import type { ChainAdapter } from '../../core/types.js';
/**
 * Stellar: an account id is the ed25519 public key in StrKey (G…, base32 with a CRC16 checksum).
 *
 * A one-time address on Stellar is not an account until someone creates it, and it can't hold an
 * asset like USDC until it adds a trustline, which only it can sign. So a sender pays with a
 * claimable balance (CAP-23) whose claimant is the one-time address: no account or trustline needed
 * to receive. The receiver claims later in one transaction it signs, while a relayer sponsors the
 * account's reserves (CAP-33) and pays the fee with a fee-bump transaction (CAP-15), so the receiver
 * never holds XLM. signStellarTransaction makes the one-time address's signature for that.
 */
export declare const stellar: ChainAdapter;
/** The hash a Stellar signature covers: SHA-256(SHA-256(network passphrase) ‖ ENVELOPE_TYPE_TX ‖ tx XDR). */
export declare const stellarTransactionHash: (networkPassphrase: string, transactionXdr: Bytes) => Bytes;
export declare const STELLAR_PUBLIC_NETWORK = "Public Global Stellar Network ; September 2015";
export declare const STELLAR_TEST_NETWORK = "Test SDF Network ; September 2015";
/**
 * The one-time address's signature on a Stellar transaction, as a decorated signature: the hint
 * (the public key's last four bytes) and the 64-byte ed25519 signature.
 */
export declare function signStellarTransaction(stealthPrivateKey: Bytes, networkPassphrase: string, transactionXdr: Bytes): {
    hint: Bytes;
    signature: Bytes;
};
