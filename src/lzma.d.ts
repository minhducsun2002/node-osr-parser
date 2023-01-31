declare module 'lzma' {
    export function decompress(s : Uint8Array): Uint8Array | string;
}