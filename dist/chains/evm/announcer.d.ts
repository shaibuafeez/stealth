import { type Address, type Hex, type PublicClient } from 'viem';
import { type StealthAnnouncement, type ViewKey } from './stealth.js';
/**
 * On chain: ERC-5564's announcer and ERC-6538's registry, both at their canonical addresses.
 *
 * The announcer's Announcement events are the public record of private payments: any wallet scans
 * them to find its own, with no server in between. The registry maps a wallet to its stealth
 * meta-address, so anyone can pay that wallet privately knowing only its address.
 *
 * On Monad: the announcer is deployed on mainnet and testnet; the registry on mainnet.
 */
export declare const ERC5564_ANNOUNCER: Address;
export declare const ERC6538_REGISTRY: Address;
export declare const erc5564AnnouncerAbi: readonly [{
    readonly type: "function";
    readonly name: "announce";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "schemeId";
        readonly type: "uint256";
    }, {
        readonly name: "stealthAddress";
        readonly type: "address";
    }, {
        readonly name: "ephemeralPubKey";
        readonly type: "bytes";
    }, {
        readonly name: "metadata";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "event";
    readonly name: "Announcement";
    readonly inputs: readonly [{
        readonly name: "schemeId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "stealthAddress";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "caller";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "ephemeralPubKey";
        readonly type: "bytes";
        readonly indexed: false;
    }, {
        readonly name: "metadata";
        readonly type: "bytes";
        readonly indexed: false;
    }];
}];
export declare const erc6538RegistryAbi: readonly [{
    readonly type: "function";
    readonly name: "registerKeys";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "schemeId";
        readonly type: "uint256";
    }, {
        readonly name: "stealthMetaAddress";
        readonly type: "bytes";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "stealthMetaAddressOf";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "registrant";
        readonly type: "address";
    }, {
        readonly name: "schemeId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "bytes";
    }];
}];
/** transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32) */
export declare const TRANSFER_WITH_AUTHORIZATION_SELECTOR: Hex;
/**
 * An announcement's metadata, laid out as ERC-5564 recommends for a token: the view tag, the
 * function that moved the funds, the token and the amount; then, when there is one, the sealed memo.
 */
export declare function stealthMetadata(input: {
    viewTag: Hex;
    token: Address;
    amount: bigint;
    sealed?: Hex | null;
    selector?: Hex;
}): Hex;
export declare function parseStealthMetadata(metadata: Hex): {
    viewTag: Hex;
    selector: Hex;
    token: Address;
    amount: bigint;
    sealed: Hex | null;
} | null;
/** The calldata that announces a payment (anyone can send it; whoever does pays the gas). */
export declare function announceCalldata(payment: StealthAnnouncement & {
    sealed?: Hex | null;
}, token: Address, amount: bigint): Hex;
/** The calldata that publishes a wallet's meta-address in ERC-6538's registry. */
export declare function registerKeysCalldata(meta: string): Hex;
export interface FoundPayment {
    stealthAddress: Address;
    ephemeralPublicKey: Hex;
    viewTag: Hex;
    token: Address | null;
    amount: bigint | null;
    sealed: Hex | null;
    /** Who sent the announcement (often a relayer, not the payer). */
    caller: Address;
    blockNumber: bigint;
    transactionHash: Hex;
}
/**
 * Scans the announcer's events between two blocks for payments this view key opens. Public RPCs
 * cap how many blocks one eth_getLogs may cover, so it asks in steps (Monad's public RPC: keep
 * `step` at 100 or less; an indexer or a paid RPC can go higher).
 */
export declare function scanAnnouncements(input: {
    client: PublicClient;
    view: ViewKey;
    fromBlock: bigint;
    toBlock: bigint;
    step?: bigint;
    announcer?: Address;
}): Promise<FoundPayment[]>;
