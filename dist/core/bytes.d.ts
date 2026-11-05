/** Small byte helpers, so the core depends on no chain library. */
export type Bytes = Uint8Array;
export declare const utf8: (text: string) => Bytes;
export declare const fromUtf8: (bytes: Bytes) => string;
export declare function concat(...parts: Bytes[]): Bytes;
export declare function equal(a: Bytes, b: Bytes): boolean;
export declare function toHex(bytes: Bytes): string;
export declare function fromHex(hex: string): Bytes;
export declare const bigEndian: (bytes: Bytes) => bigint;
export declare function littleEndian(bytes: Bytes): bigint;
export declare function toBigEndian(n: bigint, length: number): Bytes;
export declare function toLittleEndian(n: bigint, length: number): Bytes;
