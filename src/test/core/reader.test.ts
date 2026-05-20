import * as assert from 'assert';
import { BBCmd } from '../../core/types';
import { buildReaderMessages, getPresetDisplayName, isRenderCmd, appendBBTag, extractDesignBrief } from '../../core/reader';

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

    test('Custom render with empty userPrompt falls back to default direction', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER, userPrompt: '', frontmatter: '', body: '# Hi', sourceFileName: 'a.md',
        });
        const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
        assert.ok(
            systemContent.includes('User direction:'),
            'Empty custom-render userPrompt should still produce a User direction line',
        );
        assert.ok(
            systemContent.includes('clean, readable HTML article'),
            'Default fallback wording should appear',
        );
    });

    test('User message uses labeled Content separator, not bare ---', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: '# Hi', sourceFileName: 'a.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('Content (Markdown):'));
    });

    test('styleReference is appended to the system message when provided', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
            styleReference: 'Use serif body, sans-serif headings. Body width 720px.',
        });
        const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
        assert.ok(systemContent.includes('Style reference'));
        assert.ok(systemContent.includes('serif body, sans-serif headings'));
        // Body content should still be in the user message, not the system one.
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('# Hi'));
    });

    test('empty or whitespace styleReference is silently skipped', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
            styleReference: '   \n\n  ',
        });
        const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
        assert.ok(!/Style reference/i.test(systemContent));
    });

    test('styleReference is preserved verbatim (model sees the actual file content)', () => {
        const ref = '## Header\n\n- Bullet 1\n- Bullet 2\n\nCode: `const x = 1;`';
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: 'doc',
            sourceFileName: 'a.md',
            styleReference: ref,
        });
        const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
        assert.ok(systemContent.includes(ref));
    });

    test('previousBriefs appends a REGENERATION STEERING block with each brief', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: 'doc',
            sourceFileName: 'a.md',
            previousBriefs: [
                'tone=editorial-magazine | display=Hoefler Text | palette=#1a1a1a on #f5f1e8',
                'tone=brutalist | display=Menlo | palette=#000 on #fff',
            ],
        });
        const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
        assert.ok(systemContent.includes('REGENERATION STEERING'));
        assert.ok(systemContent.includes('Attempt 1:'));
        assert.ok(systemContent.includes('Attempt 2:'));
        assert.ok(systemContent.includes('editorial-magazine'));
        assert.ok(systemContent.includes('brutalist'));
    });

    test('previousBriefs omits the steering block when empty or all-whitespace', () => {
        const empty = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
            previousBriefs: [],
        });
        const whitespace = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
            previousBriefs: ['   ', '\n\n'],
        });
        const omitted = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
        });
        for (const msgs of [empty, whitespace, omitted]) {
            const systemContent = typeof msgs[0].content === 'string' ? msgs[0].content : '';
            assert.ok(!/REGENERATION STEERING/i.test(systemContent));
        }
    });
});

suite('reader.extractDesignBrief', () => {
    test('extracts the brief from a comment at the top of an HTML doc', () => {
        const html = '<!DOCTYPE html><html>\n<!-- Design Brief: tone=editorial-magazine | display="Hoefler Text" | palette=#1a1a1a on #f5f1e8 -->\n<head></head><body></body></html>';
        const brief = extractDesignBrief(html);
        assert.ok(brief);
        assert.ok(brief.includes('editorial-magazine'));
        assert.ok(brief.includes('Hoefler Text'));
    });

    test('handles case-insensitive comment label and inline whitespace', () => {
        const html = '<html><!--design brief:tone=brutalist-->';
        const brief = extractDesignBrief(html);
        assert.strictEqual(brief, 'tone=brutalist');
    });

    test('collapses multi-line briefs into a single normalized line', () => {
        const html = '<!-- Design Brief: tone=retro-futuristic\n     display=Menlo\n     palette=neon -->';
        const brief = extractDesignBrief(html);
        assert.ok(brief);
        assert.ok(!brief.includes('\n'));
        assert.ok(brief.includes('retro-futuristic'));
        assert.ok(brief.includes('Menlo'));
    });

    test('returns undefined when the comment is absent', () => {
        assert.strictEqual(extractDesignBrief('<html><body>nothing here</body></html>'), undefined);
    });

    test('returns undefined for empty input', () => {
        assert.strictEqual(extractDesignBrief(''), undefined);
    });

    test('returns undefined when the brief comment is empty', () => {
        assert.strictEqual(extractDesignBrief('<!-- Design Brief:    -->'), undefined);
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

suite('reader.appendBBTag', () => {
    test('inserts the tag before </body>', () => {
        const out = appendBBTag('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>');
        assert.ok(out.includes('created_with-BB'));
        // The tag must sit BEFORE </body>, not after.
        const tagIdx = out.indexOf('created_with-BB');
        const bodyCloseIdx = out.indexOf('</body>');
        assert.ok(tagIdx >= 0 && bodyCloseIdx > tagIdx);
    });

    test('links to the BlogBuddy GitHub repo', () => {
        const out = appendBBTag('<body></body>');
        assert.ok(out.includes('https://github.com/FulcrumStd/blogbuddy'));
    });

    test('appends the tag when no </body> is present', () => {
        const out = appendBBTag('<h1>fragment</h1>');
        assert.ok(out.includes('created_with-BB'));
        assert.ok(out.indexOf('created_with-BB') > out.indexOf('<h1>'));
    });

    test('uses the LAST </body> as the insertion point', () => {
        // Defensive: if a doc happens to contain "</body>" earlier (e.g. inside
        // a code block as an example), inject before the real closing tag.
        const html = '<body><pre>&lt;/body&gt;</pre><p>real content</p></body>';
        const out = appendBBTag(html);
        const tagIdx = out.indexOf('created_with-BB');
        const lastBodyClose = out.lastIndexOf('</body>');
        assert.ok(tagIdx >= 0 && lastBodyClose > tagIdx);
    });

    test('empty input returns empty (no spurious tag)', () => {
        assert.strictEqual(appendBBTag(''), '');
    });
});
