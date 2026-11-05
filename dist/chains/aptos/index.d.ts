import { type Bytes } from '../../core/bytes.js';
import type { ChainAdapter } from '../../core/types.js';
/**
 * Aptos: an account address is its authentication key, SHA3-256(public key ‖ 0x00) for ed25519.
 *
 * Spending without APT is native: a fee-payer transaction names a fee payer (the relayer), and
 * the one-time address signs the same transaction with its data (RawTransactionWithData).
 */
export declare const aptos: ChainAdapter;
/**
 * What an Aptos signature covers: SHA3-256 of the domain ("APTOS::RawTransaction", or
 * "APTOS::RawTransactionWithData" for fee-payer and multi-agent transactions) and the BCS bytes.
 */
export declare function aptosSigningMessage(bcsBytes: Bytes, withData?: boolean): Bytes;
/** The one-time address's ed25519 signature on an Aptos transaction. */
export declare const signAptosTransaction: (stealthPrivateKey: Bytes, bcsBytes: Bytes, withData?: boolean) => Bytes;
