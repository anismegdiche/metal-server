//
//
//
import typia from 'typia';
//
import { Readable } from 'node:stream';
import { Logger } from './Logger';

//
export class VirtualFileSystem {
    
    // static
    static readonly #virtualFileSystem = typia.createIs<VirtualFileSystem>();
    
    @Logger.LogFunction(true)
    static Is(vfs: unknown): vfs is VirtualFileSystem {
        return VirtualFileSystem.#virtualFileSystem(vfs)
    }
    
    // dynamic

    Files: { [key: string]: Readable } = {};

    @Logger.LogFunction(true)
    UploadFile(filePath: string, stream: Readable): void {
        // Store the stream in the VFS
        this.Files[filePath] = stream
    }

    @Logger.LogFunction(true)
    ReadFile(filePath: string): Readable {
        return this.Files[filePath] // Return the stored stream or null if not found
    }

    @Logger.LogFunction(true)
    DeleteFile(filePath: string): void {
        delete this.Files[filePath]
    }
}