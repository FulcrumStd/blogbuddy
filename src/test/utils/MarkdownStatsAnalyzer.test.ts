import * as assert from 'assert';
import { MarkdownStatsAnalyzer } from '../../utils/MarkdownStatsAnalyzer';

suite('Markdown editor word count', () => {
    const analyzer = new MarkdownStatsAnalyzer();
    const words = (content: string): number => { const stats = analyzer.analyze(content); return stats.chineseCharacters + stats.englishWords; };
    test('counts Chinese characters and English words together', () => { assert.strictEqual(words('中文 hello world'), 4); });
    test('HTML image sizing attributes do not inflate the count', () => {
        assert.strictEqual(words('中文 hello\n\n<img src="assets/my-photo.png" alt="图片" title="Caption" width="320">'), 3);
    });
    test('fenced code and Markdown images are excluded by default', () => {
        assert.strictEqual(words('中文\n\n![caption](my-image.png)\n\n```mermaid\nflowchart LR\nA --> B\n```'), 2);
    });
    test('remains stable across repeated live updates', () => {
        assert.strictEqual(words('# 中文 hello'), words('# 中文 hello'));
        assert.strictEqual(words('中文 hello'), 3);
    });
});
