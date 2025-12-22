
export default class SparkMD5 {
    static hash(str: string, raw?: boolean): string;
    static hashBinary(content: string, raw?: boolean): string;

    constructor();
    append(str: string): this;
    appendBinary(contents: string): this;
    end(raw?: boolean): string;
    reset(): this;
    destroy(): void;

    static ArrayBuffer: {
        new(): SparkMD5ArrayBuffer;
        hash(arr: ArrayBuffer, raw?: boolean): string;
    }
}

export interface SparkMD5ArrayBuffer {
    append(arr: ArrayBuffer): this;
    end(raw?: boolean): string;
    reset(): this;
    destroy(): void;
}
