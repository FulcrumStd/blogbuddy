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

// ---- Aesthetic core (applies to every render) ----
//
// This block carries the universal aesthetic principles, the "no generic AI
// look" forbidden list, and a self-check the model performs before finishing.
// It sits between HARD_CONSTRAINTS (technical safety) and the per-preset block
// (structural function). When a Style reference (.bbreader.md) is supplied it
// overrides the specific font/color/layout choices below — but the Forbidden
// list and Self-check below still apply universally.
//
// Adapted from Anthropic's frontend-design skill philosophy, tuned for the
// constraints of our Reader webview (no network → system fonts only).

const AESTHETIC_CORE = `
DESIGN PHILOSOPHY — applies to every render. If a Style reference is supplied
later in this system message, it OVERRIDES specific font/color/layout choices
here. The Forbidden list and Self-check below still apply universally.

Step 0 — Commit to a tone, then write a Design Brief BEFORE the HTML.
Pick ONE distinctive tone (close-to-catalog or your own variant). Do not
silently default to the same one every render — vary deliberately:
  editorial-magazine     — generous columns, serif gravitas, restrained palette
  brutalist              — raw mono, harsh borders, no decoration, exposed grid
  refined-minimal        — extreme whitespace, single accent, optical precision
  retro-futuristic       — saturated neon, mono display, scanline/CRT textures
  art-deco-geometric     — symmetric ornament, gilded accents, vertical rhythm
  industrial-utilitarian — dense data, tabular, system mono, sharp corners
  luxury-refined         — slow serif display, ivory paper, hairline rules
  organic-natural        — earthy palette, irregular shapes, hand-drawn marks
  soft-pastel            — muted tints, rounded soft forms, low contrast
  maximalist-chaotic     — layered backgrounds, mixed fonts, decorative overload
  didactic-clinical      — schematic, labeled, technical-diagram aesthetic
  zine-handmade          — collage, photocopy textures, mismatched alignment

Emit the brief as an HTML comment at the very top of <html>, like:
<!-- Design Brief: tone=editorial-magazine | display="Hoefler Text" |
     body="Iowan Old Style" | palette=#1a1a1a on #f5f1e8, accent=#a02020 |
     motion=staggered headline reveal -->

Typography — system fonts only (no network is available, so no Google Fonts).
Pick characterful fonts that ship with macOS/Windows/iOS/Linux and declare
graceful fallbacks. Recommended candidates (mix freely):
  Serif: "Iowan Old Style", Charter, Palatino, "Hoefler Text", Georgia,
         Cambria, "Big Caslon", "Times New Roman"
  Sans:  "Avenir Next", Optima, Futura, "Gill Sans", "Trebuchet MS",
         "Helvetica Neue", Tahoma
  Mono:  "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas, "Courier New"
  Display (only when the tone genuinely calls for them):
         Copperplate, "Bradley Hand", "Marker Felt", Papyrus, Impact
Always declare a graceful fallback chain
  e.g. font-family: "Iowan Old Style", Charter, Palatino, Georgia, serif;

Color — commit to a clear palette:
- ONE dominant body color + ONE sharp accent. Avoid evenly-distributed pastels
  and timid palettes that hedge between three or four near-neutral hues.
- Backgrounds should have atmosphere — paper warmth, ink wash, deep matte,
  gradient mesh, noise texture. A flat #ffffff only works if the tone is
  brutalist or refined-minimal AND you commit to it.

Motion — one orchestrated page-load reveal beats scattered hover wiggles.
Use animation-delay to stagger hero, headings, first body block. Do not add
motion that does not serve the reading experience.

Layout & spatial composition:
- A single readable column is one option, not the default. Asymmetry,
  marginalia, decorative sidebars, intentional overlap, grid-breaking
  elements are all on the table when the tone supports them.
- Match implementation complexity to the tone: maximalist needs elaborate
  code (layered backgrounds, ornaments, multiple type sizes, decorative
  SVG); minimal needs precision (exact spacing rhythm, optical alignment,
  one restrained accent). Do not ship a half-committed in-between.

FORBIDDEN — never produce these "AI default" patterns:
- Fonts: Inter, Roboto, Arial, Helvetica (plain), system-ui, -apple-system,
  "SF Pro", "Segoe UI", "Lucida Grande", Verdana — UNLESS the tone is
  "industrial-utilitarian" and you note it explicitly in the brief.
- Color clichés: purple-to-blue or pink-to-blue gradients on a white page;
  pastel rainbow gradients; flat Material drop shadows; uniform
  border-radius:8px applied to every surface.
- Layout clichés: a centered max-width:720px column with a generic h1 + lede
  paragraph, UNLESS the tone is "editorial-magazine" and you commit to it.
- Component clichés: rounded card grid with shadow-md; "Tailwind default"
  feel; Bootstrap-style alert/badge components.

ANTI-CONVERGENCE — do not silently re-default across renders:
- If the source is technical, do NOT auto-reach for slate-blue dev-blog look.
- If the source is personal/essay, do NOT auto-reach for serif memoir look.
- Vary between light-first and dark-first base palettes across renders.
- Reach for an unexpected but contextually fitting tone, not the safe one.

SELF-CHECK before finishing (mental pass over the HTML you wrote):
- No horizontal overflow at 1280px AND at 380px viewport.
- Both prefers-color-scheme schemes have ≥ AA text contrast.
- Every <svg> has a correct viewBox and renders standalone.
- If a diagram would exceed ~8 nodes/connections, render it with semantic
  HTML+CSS instead of SVG — SVG geometry beyond that threshold tends to
  misalign and read as broken.
- No accidental overlap between absolute/fixed-positioned elements; any
  overlap must be intentional and aesthetically motivated.
- Font-family chains include a graceful fallback if the display font is not
  installed locally.
- The brief comment at the top accurately matches what you actually shipped.
`.trim();

// ---- Preset system prompts (structural function, not aesthetic) ----
//
// Aesthetic direction is now centralized in AESTHETIC_CORE above. Each preset
// here describes WHAT structural elements to include (TOC, callouts, diagrams)
// and which tones from the catalog support its reading mode, but it does NOT
// dictate fonts, colors, or column widths — those are chosen per-render via
// the Design Brief.

const PRESET_BLOG = `
Mode: a polished long-form reading experience.

Structural elements to include:
- An in-page table of contents at the top, auto-generated from headings.
- Callout boxes for note-worthy passages and a "key takeaway" pull-quote
  for each major section.
- Syntax-highlighted code blocks (inline CSS, no external highlighter).
- Whitespace tuned to the chosen tone — column width is your call based on
  the tone, not a fixed 720px default.

Tone — fully open. Pick whatever serves the content. Lean into the chosen
direction; do not split the difference. A blog post in retro-futuristic,
zine-handmade, or luxury-refined tone is far more memorable than one more
serif column on off-white.

Goal: the reader bookmarks this page because it is a complete designed
object, not just well-typeset text.
`.trim();

const PRESET_SKIM = `
Mode: optimized for 30-second scanning.

Structural elements to include:
- A one-paragraph TL;DR at the very top, in a visually distinct block.
- Tables, badges, and tight sidebars used heavily for facts and lists.
- <details> collapsibles for any elaboration the reader can skip on a
  first pass. Each <summary> states the claim concisely.
- Section-anchoring visual marks (SVG icons, numbered rules, type-only
  marks — whichever the chosen tone produces) so the eye lands cleanly.

Tone — favor tones that aid fast scanning:
  industrial-utilitarian, editorial-magazine, refined-minimal, didactic-clinical.
Maximalist-chaotic and zine-handmade undermine scanning; avoid them here
unless the user has explicitly steered you there.

Goal: a reader spends 30 seconds and walks away with the spine of the document.
`.trim();

const PRESET_EXPL = `
Mode: a teaching artifact.

Structural elements to include:
- Diagrams for concepts, systems, workflows. Prefer SVG for small/simple
  diagrams; switch to semantic HTML+CSS schematics for anything richer than
  ~8 nodes/connections (per the Self-check rule).
- Margin notes or inline annotations on every code block, explaining what
  each section does.
- "Why this matters" or "Common pitfall" sidebars on key sections.

Tone — favor tones that aid comprehension:
  didactic-clinical, editorial-magazine, refined-minimal, retro-futuristic.

Goal: someone unfamiliar with the topic can learn from this in a single read.
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
    styleReference?: string;  // optional .bbreader.md content for style/conventions
    // Design Briefs from prior attempts in the SAME regeneration session.
    // When non-empty, a REGENERATION STEERING block is appended to the system
    // message asking the model to pick a meaningfully different direction.
    // Caller is responsible for capping length and clearing on new sessions.
    previousBriefs?: string[];
}

// ---- Design Brief extraction ----

/**
 * Pull the Design Brief out of a previously generated HTML document. AESTHETIC_CORE
 * instructs the model to emit a comment like:
 *   <!-- Design Brief: tone=editorial-magazine | display=Hoefler Text | ... -->
 * at the top of the document. We extract the inner string so it can be fed back
 * on the next attempt as an "avoid this direction" signal.
 *
 * Tolerant on purpose — the model may drop the comment, use different spacing,
 * or wrap across lines. We accept any case and any whitespace, and return
 * undefined if we cannot find one. Callers should treat undefined as "no signal
 * for this attempt" and skip steering for it rather than crashing.
 */
export function extractDesignBrief(html: string): string | undefined {
    if (!html) { return undefined; }
    const match = html.match(/<!--\s*Design Brief\s*:\s*([\s\S]*?)\s*-->/i);
    if (!match) { return undefined; }
    const inner = match[1].replace(/\s+/g, ' ').trim();
    return inner.length > 0 ? inner : undefined;
}

export function buildReaderMessages(input: BuildMessagesInput): ChatCompletionMessageParam[] {
    const preset = getSystemPromptForPreset(input.cmd);
    const userPrompt = input.userPrompt.trim();
    const styleRef = input.styleReference?.trim();

    // System message, layered top-down:
    //   HARD_CONSTRAINTS  (technical safety — always)
    //   AESTHETIC_CORE    (universal aesthetic philosophy + forbidden + self-check)
    //   PRESET            (structural function for blog/skim/expl; '' for custom)
    //   STYLE_REFERENCE   (.bbreader.md, overrides specific aesthetic picks)
    //   USER_DIRECTION    ("Additionally:" for presets, "User direction:" for custom)
    const systemParts: string[] = [HARD_CONSTRAINTS, AESTHETIC_CORE];
    if (preset) { systemParts.push(preset); }
    if (styleRef) {
        systemParts.push(
            'Style reference — the user\'s house style. This SUPERSEDES the specific ' +
            'font, palette, layout, and tone choices suggested in the Design Philosophy ' +
            'above; treat it as authoritative for any aspect it covers. The Forbidden ' +
            'list and Self-check from the Design Philosophy still apply universally. ' +
            'Aspects the reference does NOT mention remain your call per the Design ' +
            'Philosophy:\n\n' +
            styleRef
        );
    }
    if (input.cmd === BBCmd.RENDER) {
        // Custom render: userPrompt IS the primary creative direction.
        // Fall back to a sensible default if the user provided none, so the
        // model still has steering beyond the hard structural constraints.
        const direction = userPrompt || 'Render this document as a clean, readable HTML article.';
        systemParts.push(`User direction: ${direction}`);
    } else if (userPrompt) {
        systemParts.push(`Additionally: ${userPrompt}`);
    }

    // Regeneration steering — when the panel is asked to re-render with the
    // same source and prompt, we feed back the Design Briefs from previous
    // attempts so the model is forced off the same tone/font/palette cluster.
    // Without this signal, regenerate degrades to a sampling-temperature reroll
    // and the anti-convergence rule in AESTHETIC_CORE has nothing concrete to
    // steer away from.
    const priorBriefs = (input.previousBriefs ?? []).filter(b => b && b.trim().length > 0);
    if (priorBriefs.length > 0) {
        const lines = priorBriefs.map((b, i) => `- Attempt ${i + 1}: ${b}`).join('\n');
        systemParts.push(
            'REGENERATION STEERING — this is a re-render in the same session. Your ' +
            'previous attempts committed to the following design directions. Pick a ' +
            'meaningfully different tone AND font pairing AND palette this time. Do ' +
            'NOT minor-tweak the same direction — reach for a different family in the ' +
            'tone catalog:\n\n' + lines
        );
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

// ---- "Created with BB" tag injection ----

/**
 * The HTML credit tag that every AI-generated Reader output carries. Mirrors
 * the Markdown badge in core/bb.ts (shields.io image linked to the repo) but
 * wrapped in a discreet centered block so it sits cleanly at the foot of any
 * generated document. The shields.io URL is allowed by the Reader webview's
 * CSP (img-src https:) and survives export to a standalone HTML file.
 */
const BB_TAG_HTML = `
<div style="margin:48px auto 24px;padding:12px 16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;">
    <a href="https://github.com/FulcrumStd/blogbuddy" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
        <img src="https://img.shields.io/badge/created_with-BB-FFD900" alt="created with BlogBuddy" style="height:20px;vertical-align:middle;">
    </a>
</div>
`.trim();

/**
 * Inject the BB credit tag into a generated HTML document. Inserts just before
 * the LAST `</body>` close (in case the AI accidentally emitted nested body
 * tags inside CDATA/strings — unlikely but cheap to handle). Falls back to
 * appending at the end if no `</body>` is present. Empty input returns empty.
 */
export function appendBBTag(html: string): string {
    if (!html) { return html; }
    const idx = html.lastIndexOf('</body>');
    if (idx === -1) {
        return html + '\n' + BB_TAG_HTML;
    }
    return html.slice(0, idx) + BB_TAG_HTML + '\n' + html.slice(idx);
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
