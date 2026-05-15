import * as assert from 'assert';
import { BBCmd } from '../../core/types';
import { buildReaderMessages, getPresetDisplayName, isRenderCmd } from '../../core/reader';

suite('reader.buildReaderMessages', () => {
    test('Blog View preset uses BLOG system prompt', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: '# Hello',
            sourceFileName: 'post.md',
        });
        assert.strictEqual(msgs.length, 2);
        assert.strictEqual(msgs[0].role, 'system');
        assert.ok(
            typeof msgs[0].content === 'string' && msgs[0].content.includes('polished'),
            'Blog View system prompt should mention "polished"',
        );
    });

    test('Skim Mode preset is distinct from Blog View', () => {
        const blog = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
        });
        const skim = buildReaderMessages({
            cmd: BBCmd.RENDER_SKIM, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
        });
        assert.notStrictEqual(blog[0].content, skim[0].content);
    });

    test('user prompt is appended as "Additionally:" line', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: 'make it slidy',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
        });
        assert.ok(
            typeof msgs[0].content === 'string' && msgs[0].content.includes('Additionally: make it slidy'),
        );
    });

    test('Custom render uses the user prompt as the primary instruction', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER,
            userPrompt: 'turn it into a slide deck',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
        });
        // System still contains hard constraints; user prompt is the steering signal.
        assert.ok(typeof msgs[0].content === 'string' && msgs[0].content.length > 0);
        assert.ok(typeof msgs[1].content === 'string' && msgs[1].content.includes('turn it into a slide deck') === false,
            'For custom render, user instruction goes into the system message, not the user message');
        assert.ok(typeof msgs[0].content === 'string' && msgs[0].content.includes('turn it into a slide deck'));
    });

    test('frontmatter is included in the user message as a labeled block', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '---\ntitle: Hello\n---\n',
            body: '# Body',
            sourceFileName: 'a.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('Frontmatter'));
        assert.ok(userContent.includes('title: Hello'));
        assert.ok(userContent.includes('# Body'));
    });

    test('omits frontmatter section when empty', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: '# B', sourceFileName: 'a.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(!/Frontmatter/i.test(userContent));
    });

    test('source filename appears in the user message', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: '# B', sourceFileName: 'my-post.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('my-post.md'));
    });
});

suite('reader.getPresetDisplayName', () => {
    test('maps each enum value to a human label', () => {
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER), 'Custom');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_BLOG), 'Blog View');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_SKIM), 'Skim Mode');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_EXPL), 'Explainer');
    });
});

suite('reader.isRenderCmd', () => {
    test('returns true for render commands', () => {
        assert.strictEqual(isRenderCmd('bb-render'), true);
        assert.strictEqual(isRenderCmd('bb-render-blog'), true);
        assert.strictEqual(isRenderCmd('bb-render-skim'), true);
        assert.strictEqual(isRenderCmd('bb-render-expl'), true);
    });
    test('returns false for non-render commands', () => {
        assert.strictEqual(isRenderCmd('bb'), false);
        assert.strictEqual(isRenderCmd('bb-expd'), false);
        assert.strictEqual(isRenderCmd('bb-renderer'), false);  // not in our enum
    });
});
