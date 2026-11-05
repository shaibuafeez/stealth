import { encodeFunctionData, parseSignature } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
/**
 * Gasless spending, with EIP-3009 transferWithAuthorization.
 *
 * A one-time address holds dollars and nothing else: no MON to pay gas. Sending it gas from your
 * wallet would tie the two together on chain and undo the privacy. Instead, the one-time
 * address's key signs a transfer off chain (EIP-712), and anyone (a relayer) submits it and pays
 * the gas. The token checks the signature, so the relayer can carry the transfer but never change
 * where it goes or how much. AUSD and Circle's USDC both support it on Monad.
 */
export const eip3009Abi = [
    {
        type: 'function',
        name: 'transferWithAuthorization',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
];
export const transferAuthorizationTypes = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
    ],
};
export function transferAuthorizationTypedData(token, chainId, message) {
    return {
        domain: { name: token.domain.name, version: token.domain.version, chainId, verifyingContract: token.address },
        types: transferAuthorizationTypes,
        primaryType: 'TransferWithAuthorization',
        message,
    };
}
/**
 * Signs a transfer out of a one-time address with its private key (from stealthPrivateKey), and
 * returns the calldata a relayer submits to the token. Nothing here touches the network.
 */
export async function signStealthTransfer(input) {
    const account = privateKeyToAccount(input.stealthPrivateKey);
    const authorization = {
        from: account.address,
        to: input.to,
        value: input.value,
        validAfter: 0n,
        validBefore: BigInt(Math.floor(Date.now() / 1000) + (input.validFor ?? 600)),
        nonce: input.nonce ?? generatePrivateKey(),
    };
    const signature = await account.signTypedData(transferAuthorizationTypedData(input.token, input.chainId, authorization));
    return { authorization, signature, calldata: transferWithAuthorizationCalldata(authorization, signature) };
}
/** The calldata for transferWithAuthorization, from a signed authorization. */
export function transferWithAuthorizationCalldata(authorization, signature) {
    const { r, s, v, yParity } = parseSignature(signature);
    return encodeFunctionData({
        abi: eip3009Abi,
        functionName: 'transferWithAuthorization',
        args: [
            authorization.from,
            authorization.to,
            authorization.value,
            authorization.validAfter,
            authorization.validBefore,
            authorization.nonce,
            Number(v ?? BigInt(yParity + 27)),
            r,
            s,
        ],
    });
}
