import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { EditorDocumentStore } from '../../services/EditorDocumentStore';

suite('EditorDocumentStore concurrent edits', () => {
    let dir: string;
    let file: string;
    setup(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-sync-')); file = path.join(dir, 'doc.md'); await fs.writeFile(file, 'original\n'); });
    teardown(async () => { await fs.rm(dir, { recursive: true, force: true }); });

    test('refuses an autosave when an external writer changed the file', async () => {
        const store = new EditorDocumentStore(file); const { revision } = store.accept('original\n');
        await fs.writeFile(file, 'agent update\n');
        assert.deepStrictEqual(await store.write({ revision, editVersion: 1, content: 'local edit\n' }), { kind: 'conflict', content: 'agent update\n' });
        assert.strictEqual(await fs.readFile(file, 'utf8'), 'agent update\n');
    });
    test('an old document epoch cannot overwrite a newly loaded external version', async () => {
        const store = new EditorDocumentStore(file); const old = store.accept('original\n');
        await fs.writeFile(file, 'new version\n'); const current = store.accept('new version\n');
        assert.deepStrictEqual(await store.write({ ...old, editVersion: 10, content: 'late old save\n' }), { kind: 'stale' });
        assert.strictEqual(await fs.readFile(file, 'utf8'), 'new version\n');
        assert.strictEqual((await store.write({ revision: current.revision, editVersion: 1, content: 'new local edit\n' })).kind, 'saved');
    });
    test('serializes own writes and refuses out of order edit versions', async () => {
        const store = new EditorDocumentStore(file); const { revision } = store.accept('original\n');
        const results = await Promise.all([
            store.write({ revision, editVersion: 2, content: 'edit 2\n' }),
            store.write({ revision, editVersion: 3, content: 'edit 3\n' }),
            store.write({ revision, editVersion: 1, content: 'edit 1\n' }),
        ]);
        assert.deepStrictEqual(results.map(result => result.kind), ['saved', 'saved', 'stale']);
        assert.strictEqual(await fs.readFile(file, 'utf8'), 'edit 3\n');
    });
    test('detects another external change after a conflict was acknowledged', async () => {
        const store = new EditorDocumentStore(file); store.accept('original\n');
        await fs.writeFile(file, 'agent v2\n'); const { revision } = store.accept('agent v2\n');
        await fs.writeFile(file, 'agent v3\n');
        assert.strictEqual((await store.write({ revision, editVersion: 4, content: 'my chosen version\n' })).kind, 'conflict');
        assert.strictEqual(await fs.readFile(file, 'utf8'), 'agent v3\n');
    });
    test('does not silently recreate a deleted document, including an empty one', async () => {
        await fs.writeFile(file, ''); const store = new EditorDocumentStore(file); const { revision } = store.accept('');
        await fs.unlink(file);
        await assert.rejects(store.write({ revision, editVersion: 1, content: 'must not recreate' }), /ENOENT/);
        await assert.rejects(fs.access(file));
    });
    test('a failed operation does not poison the write queue', async () => {
        const store = new EditorDocumentStore(file); const { revision } = store.accept('original\n');
        await fs.unlink(file);
        await assert.rejects(store.write({ revision, editVersion: 1, content: 'failed' }));
        await fs.writeFile(file, 'original\n');
        assert.strictEqual((await store.write({ revision, editVersion: 2, content: 'recovered\n' })).kind, 'saved');
    });
    test('saves frontmatter and body together and ignores own watcher notifications', async () => {
        const store = new EditorDocumentStore(file); const { revision } = store.accept('original\n');
        const content = '---\ntitle: New title\n---\n# Body\n';
        await store.write({ revision, editVersion: 1, content });
        assert.strictEqual(await fs.readFile(file, 'utf8'), content);
        assert.strictEqual(await store.externalContent(), undefined);
    });
    test('creates a new document only after a save destination was assigned', async () => {
        const store = new EditorDocumentStore(''); const { revision } = store.accept('');
        const destination = path.join(dir, 'new.md'); store.setPath(destination);
        assert.strictEqual((await store.write({ revision, editVersion: 1, content: 'new\n' })).kind, 'saved');
        assert.strictEqual(await fs.readFile(destination, 'utf8'), 'new\n');
    });
    test('Save As onto a confirmed existing file replaces it instead of reporting a conflict', async () => {
        const store = new EditorDocumentStore(''); const { revision } = store.accept('');
        await store.retarget(file);
        assert.strictEqual((await store.write({ revision, editVersion: 1, content: 'saved as\n' })).kind, 'saved');
        assert.strictEqual(await fs.readFile(file, 'utf8'), 'saved as\n');
        const missing = path.join(dir, 'fresh.md'); await store.retarget(missing);
        assert.strictEqual((await store.write({ revision, editVersion: 2, content: 'fresh\n' })).kind, 'saved');
        assert.strictEqual(await fs.readFile(missing, 'utf8'), 'fresh\n');
    });
});
