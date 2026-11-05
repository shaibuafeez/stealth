/**
 * Monad: chain ids, public RPCs, and the dollars that support gasless EIP-3009 transfers. Token
 * domains were read from each contract (EIP-5267) and checked against its DOMAIN_SEPARATOR.
 */
export declare const monad: {
    readonly mainnet: {
        readonly chainId: 143;
        readonly rpcUrl: "https://rpc.monad.xyz";
        readonly explorer: "https://monadscan.com";
        readonly tokens: {
            readonly AUSD: {
                readonly address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a";
                readonly domain: {
                    readonly name: "Agora Dollar";
                    readonly version: "1";
                };
                readonly decimals: 6;
            };
            readonly USDC: {
                readonly address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
                readonly domain: {
                    readonly name: "USDC";
                    readonly version: "2";
                };
                readonly decimals: 6;
            };
        };
    };
    readonly testnet: {
        readonly chainId: 10143;
        readonly rpcUrl: "https://testnet-rpc.monad.xyz";
        readonly explorer: "https://testnet.monadscan.com";
        readonly tokens: {
            readonly AUSD: {
                readonly address: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";
                readonly domain: {
                    readonly name: "Agora Dollar";
                    readonly version: "1";
                };
                readonly decimals: 6;
            };
            readonly USDC: {
                readonly address: "0x534b2f3A21130d7a60830c2Df862319e593943A3";
                readonly domain: {
                    readonly name: "USDC";
                    readonly version: "2";
                };
                readonly decimals: 6;
            };
        };
    };
};
