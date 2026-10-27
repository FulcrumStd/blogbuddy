import * as assert from 'assert';
import { preserveUnchangedBlocks } from '../../utils/preserveUnchanged';

// Serialized inputs below mirror real remark-stringify output (the same
// library family Milkdown serializes with): "*" bullets, "*em*" emphasis,
// escaped punctuation, soft-wraps joined, indented code → fenced.

suite('preserveUnchangedBlocks', () => {
    test('an unrelated edit preserves table separator widths and cell padding', () => {
        const table = '| Name | State |\n| --- | --- |\n| Editor | Ready |';
        const normalized = '| Name   | State |\n| ------ | ----- |\n| Editor | Ready |';
        assert.strictEqual(preserveUnchangedBlocks(`${table}\n\nOld\n`, `${normalized}\n\nNew\n`), `${table}\n\nNew\n`);
    });
    test('changing table alignment remains a content edit', () => {
        const before = '| A | B |\n| --- | --- |\n| x | y |\n';
        const after = '| A | B |\n| :---: | --- |\n| x | y |\n';
        assert.strictEqual(preserveUnchangedBlocks(before, after), after);
    });
    test('an unrelated edit preserves tight list spacing after a loose-list round trip', () => {
        const original = '- [ ] first\n- [x] second\n\nUnchanged paragraph.\n';
        const serialized = '- [ ] first\n\n- [x] second\n\nEdited paragraph.\n';
        assert.strictEqual(preserveUnchangedBlocks(original, serialized), '- [ ] first\n- [x] second\n\nEdited paragraph.\n');
    });
    const onDisk = [
        '# My _Blog_ Post',
        '',
        'Intro with _italics_ and',
        'a soft-wrapped line.',
        '',
        '- first item',
        '- second item with _em_',
        '',
        'Text with 2*3 math and underscore_word here.',
        '',
        '    indented code',
        '    line two',
        '',
        'Final paragraph.',
        '',
    ].join('\n');

    // What the serializer would emit for the same content, untouched.
    const serializedNoEdit = [
        '# My *Blog* Post',
        '',
        'Intro with *italics* and a soft-wrapped line.',
        '',
        '* first item',
        '* second item with *em*',
        '',
        'Text with 2\\*3 math and underscore\\_word here.',
        '',
        '```',
        'indented code',
        'line two',
        '```',
        '',
        'Final paragraph.',
        '',
    ].join('\n');

    test('no-edit save is byte-identical', () => {
        assert.strictEqual(preserveUnchangedBlocks(onDisk, serializedNoEdit), onDisk);
    });

    test('only the edited block is rewritten', () => {
        const serialized = serializedNoEdit.replace('Final paragraph.', 'Final paragraph, edited.');
        const merged = preserveUnchangedBlocks(onDisk, serialized);
        assert.ok(merged.includes('Final paragraph, edited.'));
        // Everything before the final paragraph keeps original bytes.
        assert.strictEqual(
            merged.split('Final paragraph')[0],
            onDisk.split('Final paragraph')[0],
        );
    });

    test('block insertion and deletion are honored, neighbors preserved', () => {
        const inserted = serializedNoEdit.replace(
            'Final paragraph.',
            'Brand new paragraph.\n\nFinal paragraph.',
        );
        let merged = preserveUnchangedBlocks(onDisk, inserted);
        assert.ok(merged.includes('Brand new paragraph.'));
        assert.ok(merged.includes('    indented code'));

        const deleted = serializedNoEdit.replace(
            'Text with 2\\*3 math and underscore\\_word here.\n\n', '');
        merged = preserveUnchangedBlocks(onDisk, deleted);
        assert.ok(!merged.includes('underscore_word'));
        assert.ok(merged.includes('- second item with _em_'));
    });

    test('hard-break removal is a real edit, not reverted', () => {
        const disk = 'A line with a break  \nand continuation.\n';
        const serialized = 'A line with a break and continuation.\n';
        assert.strictEqual(preserveUnchangedBlocks(disk, serialized), serialized);
    });

    test('unchanged hard break is preserved', () => {
        const disk = 'A line with a break  \nand continuation.\n';
        const serialized = 'A line with a break\\\nand continuation.\n';
        assert.strictEqual(preserveUnchangedBlocks(disk, serialized), disk);
    });

    test('code→paragraph conversion is a real edit, not reverted', () => {
        const disk = '    was code\n';
        const serialized = 'was code\n';
        assert.strictEqual(preserveUnchangedBlocks(disk, serialized), serialized);
    });

    test('duplicate blocks: the edited copy is the one rewritten', () => {
        const disk = 'Same text.\n\nMiddle.\n\nSame text.\n';
        const serialized = 'Same text.\n\nMiddle.\n\nSame text, edited.\n';
        assert.strictEqual(preserveUnchangedBlocks(disk, serialized), serialized);
    });

    test('missing trailing newline on disk stays stable', () => {
        const disk = 'Para one.\n\nPara two.';
        const serialized = 'Para one.\n\nPara two.\n';
        assert.strictEqual(preserveUnchangedBlocks(disk, serialized), disk);
    });

    test('blank lines inside fences do not split blocks', () => {
        const disk = '```js\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter.\n';
        const serialized = '```js\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter, edited.\n';
        const merged = preserveUnchangedBlocks(disk, serialized);
        assert.ok(merged.includes('const a = 1;\n\nconst b = 2;'));
        assert.ok(merged.includes('After, edited.'));
    });
});
