export { };

declare global {
    interface Window {
        showSaveFilePicker(options?: {
            suggestedName?: string;
            types?: Array<{
                description?: string;
                accept: Record<string, string[]>;
            }>;
        }): Promise<FileSystemFileHandle>;
    }

    interface FileSystemFileHandle {
        createWritable(): Promise<FileSystemWritableFileStream>;
    }

    interface FileSystemWritableFileStream extends WritableStream {
        write(data: Blob | BufferSource | string): Promise<void>;
        close(): Promise<void>;
    }
}
