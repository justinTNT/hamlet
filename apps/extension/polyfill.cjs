if (!globalThis.File) {
    globalThis.File = class File extends Blob {
        constructor(fileBits, fileName, options) {
            super(fileBits, options);
            this.name = fileName;
            this.lastModified = options?.lastModified ?? Date.now();
        }
    };
}
if (!globalThis.FormData) {
    globalThis.FormData = class FormData {
        append() { }
    }
}
