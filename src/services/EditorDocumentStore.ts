import * as fs from 'fs/promises';

export interface EditorSnapshot {
    revision: number;
    content: string;
}

export interface EditorWrite extends EditorSnapshot {
    editVersion: number;
}

export type EditorWriteResult =
    | { kind: 'saved'; content: string }
    | { kind: 'stale' }
    | { kind: 'conflict'; content: string };

/** Serializes our writes and checks the actual file before committing an edit. */
export class EditorDocumentStore {
    private revision = 0;
    private content = '';
    private savedVersion = -1;
    private mayCreate: boolean;
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private filePath: string) { this.mayCreate = !filePath; }

    accept(content: string): EditorSnapshot {
        this.content = content;
        this.savedVersion = -1;
        this.mayCreate = !this.filePath;
        return { revision: ++this.revision, content };
    }

    get snapshot(): EditorSnapshot {
        return { revision: this.revision, content: this.content };
    }

    setPath(filePath: string): void {
        this.filePath = filePath;
    }

    /** Save As target: the user already confirmed replacing it, so its current bytes become the write base. */
    async retarget(filePath: string): Promise<void> {
        return this.enqueue(async () => {
            let disk = '';
            try {
                disk = await fs.readFile(filePath, 'utf8');
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { throw error; }
            }
            this.filePath = filePath;
            this.content = disk;
            this.mayCreate = true;
        });
    }

    async externalContent(): Promise<string | undefined> {
        return this.enqueue(async () => {
            const content = await fs.readFile(this.filePath, 'utf8');
            return content === this.content ? undefined : content;
        });
    }

    async write(edit: EditorWrite): Promise<EditorWriteResult> {
        return this.enqueue(async () => {
            if (edit.revision !== this.revision || edit.editVersion < this.savedVersion) {
                return { kind: 'stale' };
            }
            let disk: string;
            try {
                disk = await fs.readFile(this.filePath, 'utf8');
            } catch (error) {
                // A deleted/replaced existing document must never be silently recreated.
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !this.mayCreate) { throw error; }
                disk = '';
            }
            if (edit.revision !== this.revision) { return { kind: 'stale' }; }
            if (disk !== this.content) { return { kind: 'conflict', content: disk }; }
            if (edit.content !== disk) {
                await fs.writeFile(this.filePath, edit.content, 'utf8');
            }
            this.content = edit.content;
            this.savedVersion = edit.editVersion;
            this.mayCreate = false;
            return { kind: 'saved', content: edit.content };
        });
    }

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const next = this.queue.then(operation);
        this.queue = next.catch(() => undefined);
        return next;
    }
}
