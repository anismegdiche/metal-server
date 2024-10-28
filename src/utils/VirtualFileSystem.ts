//
//
//
//
//
import { Readable } from 'node:stream'


export class VirtualFileSystem {
    private files: { [key: string]: Readable } = {};

    // Upload a Readable stream to the VFS
    public UploadFile(filePath: string, stream: Readable): void {
        // Store the stream in the VFS
        this.files[filePath] = stream
    }

    // Read a file from the VFS as a Readable stream
    public ReadFile(filePath: string): Readable {
        return this.files[filePath] // Return the stored stream or null if not found
    }
}