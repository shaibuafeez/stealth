import { type Address, type Hex } from 'viem';
/**
 * Gasless spending, with EIP-3009 transferWithAuthorization.
 *
 * A one-time address holds dollars and nothing else: no MON to pay gas. Sending it gas from your
 * wallet would tie the two together on chain and undo the privacy. Instead, the one-time
 * address's key signs a transfer off chain (EIP-712), and anyone (a relayer) submits it and pays
 * the gas. The token checks the signature, so the relayer can carry the transfer but never change
 * where it goes or how much. AUSD and Circle's USDC both support it on Monad.
 */
export declare const eip3009Abi: readonly [{
    readonly type: "function";
    readonly name: "transferWithAuthorization";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly name: "from";
        readonly type: "address";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly name: "validAfter";
        readonly type: "uint256";
    }, {
        readonly name: "validBefore";
        readonly type: "uint256";
    }, {
        readonly name: "nonce";
        readonly type: "bytes32";
    }, {
        readonly name: "v";
        readonly type: "uint8";
    }, {
        readonly name: "r";
        readonly type: "bytes32";
    }, {
        readonly name: "s";
        readonly type: "bytes32";
    }];
    readonly outputs: readonly [];
}, {
    readonly type: "function";
    readonly name: "balanceOf";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const transferAuthorizationTypes: {
    readonly TransferWithAuthorization: readonly [{
        readonly name: "from";
        readonly type: "address";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "value";
        readonly type: "uint256";
    }, {
        readonly name: "validAfter";
        readonly type: "uint256";
    }, {
        readonly name: "validBefore";
        readonly type: "uint256";
    }, {
        readonly name: "nonce";
        readonly type: "bytes32";
    }];
};
/** A token that supports EIP-3009, with the EIP-712 domain its contract reports (EIP-5267). */
export interface Eip3009Token {
    address: Address;
    /** Signing against any other name or version fails. */
    domain: {
        name: string;
        version: string;
    };
    decimals: number;
}
export interface TransferAuthorization {
    from: Address;
    to: Address;
    value: bigint;
    /** Unix seconds. 0 means valid at once. */
    validAfter: bigint;
    /** Unix seconds after which it can no longer be used. */
    validBefore: bigint;
    /** 32 random bytes: each authorization can be used once. */
    nonce: Hex;
}
export declare function transferAuthorizationTypedData(token: Eip3009Token, chainId: number, message: TransferAuthorization): {
    domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: `0x${string}`;
    };
    types: {
        readonly TransferWithAuthorization: readonly [{
            readonly name: "from";
            readonly type: "address";
        }, {
            readonly name: "to";
            readonly type: "address";
        }, {
            readonly name: "value";
            readonly type: "uint256";
        }, {
            readonly name: "validAfter";
            readonly type: "uint256";
        }, {
            readonly name: "validBefore";
            readonly type: "uint256";
        }, {
            readonly name: "nonce";
            readonly type: "bytes32";
        }];
    };
    primaryType: "TransferWithAuthorization";
    message: TransferAuthorization;
};
/**
 * Signs a transfer out of a one-time address with its private key (from stealthPrivateKey), and
 * returns the calldata a relayer submits to the token. Nothing here touches the network.
 */
export declare function signStealthTransfer(input: {
    stealthPrivateKey: Hex;
    token: Eip3009Token;
    chainId: number;
    to: Address;
    value: bigint;
    /** Seconds the signature stays valid. Default ten minutes. */
    validFor?: number;
    nonce?: Hex;
}): Promise<{
    authorization: TransferAuthorization;
    signature: Hex;
    calldata: Hex;
}>;
/** The calldata for transferWithAuthorization, from a signed authorization. */
export declare function transferWithAuthorizationCalldata(authorization: TransferAuthorization, signature: Hex): Hex;
