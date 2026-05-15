import * as assert from 'assert';
import { extractFrontmatter } from '../../utils/frontmatter';

suite('extractFrontmatter', () => {
    test('extracts YAML frontmatter', () => {
        const input = '---\ntitle: Hello\ndate: 2026-05-15\n---\n\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '---\ntitle: Hello\ndate: 2026-05-15\n---\n');
        assert.strictEqual(body, '\n# Body');
    });

    test('extracts TOML frontmatter', () => {
        const input = '+++\ntitle = "Hello"\n+++\n\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '+++\ntitle = "Hello"\n+++\n');
        assert.strictEqual(body, '\n# Body');
    });

    test('handles CRLF line endings', () => {
        const input = '---\r\ntitle: Hello\r\n---\r\n\r\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '---\r\ntitle: Hello\r\n---\r\n');
        assert.strictEqual(body, '\r\n# Body');
    });

    test('returns empty frontmatter when none present', () => {
        const input = '# Just a heading\n\nText.';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '');
        assert.strictEqual(body, input);
    });

    test('ignores frontmatter that does not start at file beginning', () => {
        const input = 'leading text\n---\ntitle: Hello\n---\n';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '');
        assert.strictEqual(body, input);
    });

    test('two-line fence (empty body between delimiters) is not recognized as frontmatter', () => {
        const input = '---\n---\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '');
        assert.strictEqual(body, input);
    });
});
