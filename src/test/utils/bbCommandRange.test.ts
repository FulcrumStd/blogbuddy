import * as assert from 'assert';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { findBBCommandRange } from '../../utils/bbCommandRange';

suite('BB command source ranges', () => {
    const schema = new Schema({ nodes: {
        doc: { content: 'block+' }, paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' }, image: { inline: true, group: 'inline', atom: true },
        math: { inline: true, group: 'inline', atom: true },
    }, marks: { strong: {} } });
    const paragraph = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
    test('cross-paragraph selections remove only the actual tag', () => {
        const doc = schema.nodes.doc.create(null, [paragraph('First paragraph'), paragraph('Second <bb-impv> rest')]);
        const match = findBBCommandRange(doc, 1, doc.content.size - 1); assert.ok(match);
        const result = EditorState.create({ doc, schema }).tr.delete(match.from, match.to).doc;
        assert.strictEqual(result.textBetween(0, result.content.size, '\n'), 'First paragraph\nSecond  rest');
    });
    test('images and math before a tag each occupy one source position', () => {
        const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, [
            schema.text('Before '), schema.nodes.image.create(), schema.nodes.math.create(), schema.text(' <bb-impv> after'),
        ]));
        const match = findBBCommandRange(doc, 1, doc.content.size - 1); assert.ok(match);
        const result = EditorState.create({ doc, schema }).tr.delete(match.from, match.to).doc;
        assert.strictEqual(result.firstChild?.childCount, 4);
        assert.strictEqual(result.textBetween(0, result.content.size, '\n', '◊'), 'Before ◊◊  after');
    });
    test('a tag split across formatted text nodes is located correctly', () => {
        const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, [
            schema.text('<bb-'), schema.text('impv', [schema.marks.strong.create()]), schema.text('> text'),
        ]));
        const match = findBBCommandRange(doc, 1, doc.content.size - 1); assert.ok(match);
        assert.strictEqual(match.command, 'bb-impv');
        assert.strictEqual(EditorState.create({ doc, schema }).tr.delete(match.from, match.to).doc.textContent, ' text');
    });
    test('Reader tags use the same exact source mapping', () => {
        const doc = schema.nodes.doc.create(null, [paragraph('First'), paragraph('<bb-render-blog:简洁> trailing')]);
        const match = findBBCommandRange(doc, 1, doc.content.size - 1); assert.ok(match);
        assert.strictEqual(match.message, '简洁');
        assert.strictEqual(EditorState.create({ doc, schema }).tr.delete(match.from, match.to).doc.textContent, 'First trailing');
    });
    test('does not execute tags outside the selection', () => {
        const doc = schema.nodes.doc.create(null, [paragraph('Selected'), paragraph('<bb-impv>')]);
        assert.strictEqual(findBBCommandRange(doc, 1, 9), undefined);
    });
    test('ordinary HTML text is never treated as an AI command', () => {
        const doc = schema.nodes.doc.create(null, paragraph('<div>keep this</div>'));
        assert.strictEqual(findBBCommandRange(doc, 1, doc.content.size - 1), undefined);
    });
});
