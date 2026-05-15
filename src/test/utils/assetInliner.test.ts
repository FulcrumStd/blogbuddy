import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { inlineImageAssets } from '../../utils/assetInliner';

suite('inlineImageAssets', () => {
    let tmpDir: string;

    setup(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-asset-test-'));
    });

    teardown(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    test('inlines a local PNG image', async () => {
        const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        await fs.writeFile(path.join(tmpDir, 'pic.png'), pngBytes);
        const html = '<p><img src="pic.png" alt="x"></p>';
        const result = await inlineImageAssets(html, tmpDir);
        assert.match(result, /^<p><img src="data:image\/png;base64,[A-Za-z0-9+/]+={0,2}" alt="x"><\/p>$/);
    });

    test('inlines a JPG image with proper mime', async () => {
        await fs.writeFile(path.join(tmpDir, 'photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));
        const html = '<img src="photo.jpg">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.ok(result.includes('data:image/jpeg;base64,'));
    });

    test('leaves https URLs untouched', async () => {
        const html = '<img src="https://example.com/x.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('leaves data URIs untouched', async () => {
        const html = '<img src="data:image/png;base64,iVBORw0=">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('leaves missing local files as-is', async () => {
        const html = '<img src="ghost.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('handles multiple images in one document', async () => {
        await fs.writeFile(path.join(tmpDir, 'a.png'), Buffer.from([0x89, 0x50]));
        await fs.writeFile(path.join(tmpDir, 'b.gif'), Buffer.from([0x47, 0x49, 0x46]));
        const html = '<img src="a.png"><img src="https://x/y.png"><img src="b.gif">';
        const result = await inlineImageAssets(html, tmpDir);
        const matches = result.match(/data:image\/(png|gif);base64,/g);
        assert.strictEqual(matches?.length, 2);
        assert.ok(result.includes('https://x/y.png'));
    });

    test('resolves subdirectory paths', async () => {
        await fs.mkdir(path.join(tmpDir, 'sub'));
        await fs.writeFile(path.join(tmpDir, 'sub', 'nested.png'), Buffer.from([0x89]));
        const html = '<img src="sub/nested.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.ok(result.includes('data:image/png;base64,'));
    });
});
