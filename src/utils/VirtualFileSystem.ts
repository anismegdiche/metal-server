//
//
//
//
//
import { Readable } from 'node:stream'


export class VirtualFileSystem {
    Files: { [key: string]: Readable } = {};

    // Upload a Readable stream to the VFS
    public UploadFile(filePath: string, stream: Readable): void {
        // Store the stream in the VFS
        this.Files[filePath] = stream
    }

    // Read a file from the VFS as a Readable stream
    public ReadFile(filePath: string): Readable {
        return this.Files[filePath] // Return the stored stream or null if not found
    }
}