import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIService } from '../services/AIService';
import { BBCmd } from './types';

// ---- Hard constraints applied to every preset ----

const HARD_CONSTRAINTS = `
You are generating a self-contained HTML document for human reading.

Output requirements:
- Begin with <!DOCTYPE html> and a complete HTML document.
- All CSS must be inline in a <style> block in <head>. No external stylesheets.
- Support both light and dark themes via prefers-color-scheme.
- You may use <svg> for diagrams, and <script> for interactivity — but only INLINE.
  No external <script src="..."> or fetch() — there is no network.
- For images that appear in the source Markdown, KEEP the markdown URL string
  AS-IS in <img src="...">. The renderer translates paths before display.
- Do not echo the source Markdown verbatim as a code block. Render it.

You do NOT need to preserve the exact prose of the source; you may restructure,
summarize, or visualize as the preset directs. But do not invent factual claims
that contradict the source.
`.trim();

// ---- Preset system prompts ----

const PRESET_BLOG = `
You are rendering a polished, readable article. Use a clear hierarchy with an
in-page table of contents at the top (auto-generated from the headings). Use
callout boxes for note-worthy passages and "key takeaway" pull-quotes. Syntax-
highlight code blocks with inline CSS. Use generous whitespace and a body width
around 720px on wide screens — comfortable on a laptop. Pick a serif body and
a sans display heading. The goal: this should look like a hand-designed blog
post a reader would want to bookmark.
`.trim();

const PRESET_SKIM = `
Optimize for fast scanning. Lead with a one-paragraph TL;DR at the very top in
a tinted box. Use tables, badges, and tight sidebars heavily. Wrap any
elaboration that the reader can skip on a first pass in <details> collapsibles
with a clear summary line. Use SVG icons next to section headings to anchor
the eye. Pick a compact, modern sans typeface. The goal: a reader spends 30
seconds on this page and walks away with the spine of the document.
`.trim();

const PRESET_EXPL = `
Turn this into a teaching artifact. Where the source describes a concept,
system, or workflow, generate an SVG diagram (flowchart, sequence, anatomy
labels — whatever fits) to visualize it. Annotate every code block with
margin notes explaining what each section does. Add "Why this matters" or
"Common pitfall" sidebars on key sections. Use a clean, didactic visual
language with strong typographic hierarchy. The goal: someone unfamiliar
with the topic can learn from this in a single read.
`.trim();

function getSystemPromptForPreset(cmd: BBCmd): string {
    switch (cmd) {
        case BBCmd.RENDER_BLOG: return PRESET_BLOG;
        case BBCmd.RENDER_SKIM: return PRESET_SKIM;
        case BBCmd.RENDER_EXPL: return PRESET_EXPL;
        case BBCmd.RENDER:      return ''; // custom — user prompt is the only steer
        default: throw new Error(`getSystemPromptForPreset: not a render cmd: ${cmd}`);
    }
}

// ---- Public API ----

export type RenderCmd = BBCmd.RENDER | BBCmd.RENDER_BLOG | BBCmd.RENDER_SKIM | BBCmd.RENDER_EXPL;

export function isRenderCmd(cmd: string): cmd is RenderCmd {
    return (
        cmd === BBCmd.RENDER ||
        cmd === BBCmd.RENDER_BLOG ||
        cmd === BBCmd.RENDER_SKIM ||
        cmd === BBCmd.RENDER_EXPL
    );
}

export function getPresetDisplayName(cmd: RenderCmd): string {
    switch (cmd) {
        case BBCmd.RENDER:       return 'Custom';
        case BBCmd.RENDER_BLOG:  return 'Blog View';
        case BBCmd.RENDER_SKIM:  return 'Skim Mode';
        case BBCmd.RENDER_EXPL:  return 'Explainer';
    }
}

export interface BuildMessagesInput {
    cmd: BBCmd;
    userPrompt: string;
    frontmatter: string;   // raw frontmatter block (with delimiters) or ''
    body: string;          // Markdown body (frontmatter already stripped)
    sourceFileName: string;
}

export function buildReaderMessages(input: BuildMessagesInput): ChatCompletionMessageParam[] {
    const preset = getSystemPromptForPreset(input.cmd);
    const userPrompt = input.userPrompt.trim();

    // System message: hard constraints + preset (if any) + user steering (custom or "Additionally:")
    const systemParts: string[] = [HARD_CONSTRAINTS];
    if (preset) { systemParts.push(preset); }
    if (input.cmd === BBCmd.RENDER) {
        // Custom render: userPrompt IS the primary creative direction.
        // Fall back to a sensible default if the user provided none, so the
        // model still has steering beyond the hard structural constraints.
        const direction = userPrompt || 'Render this document as a clean, readable HTML article.';
        systemParts.push(`User direction: ${direction}`);
    } else if (userPrompt) {
        systemParts.push(`Additionally: ${userPrompt}`);
    }

    // User message: file context + frontmatter + body
    const userParts: string[] = [`File: ${input.sourceFileName}`];
    if (input.frontmatter.trim()) {
        userParts.push(`Frontmatter:\n${input.frontmatter.trim()}`);
    }
    userParts.push('Content (Markdown):', input.body);

    return [
        { role: 'system', content: systemParts.join('\n\n') },
        { role: 'user',   content: userParts.join('\n\n') },
    ];
}

// ---- Streaming call wrapper ----

/**
 * Run the render request through AIService streaming. Returns an async generator
 * yielding raw text deltas and finally the accumulated full text. Caller is
 * responsible for forwarding to the webview and tracking cancellation.
 *
 * This wrapper exists so callers (ReaderPanel) do not need to import OpenAI types
 * or know the AIService usage-stats flag ('render'). If you find yourself
 * inlining this call, prefer keeping the wrapper — it is the only place that
 * defines the prompt-to-API mapping.
 */
export async function runReaderStream(input: BuildMessagesInput): Promise<AsyncGenerator<string, string, unknown>> {
    const messages = buildReaderMessages(input);
    return AIService.getInstance().chatStreaming(messages, 'render');
}
