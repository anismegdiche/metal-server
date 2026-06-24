import { disposable } from 'disposable-class';

interface DbConnection {
    close(): void;
}

@disposable
class Repository {
    private _conn: string;

    constructor(conn: string) {
        this._conn = conn;
    }

    public dispose(): void {
        // with decorator you do not have to call super.dispose();
        // the decorator does it automatically

        console.log('disposed')
    }
}


function main() {
    const r = new Repository('conn')
    
}

main()
console.log('end')