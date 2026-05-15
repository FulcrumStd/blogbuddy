import type {
    ReaderWebviewMessage,
    ReaderHostMessage,
} from '../../src/services/webviewProtocol';

// VS Code webview API — provided at runtime by VS Code, declare for TS.
declare function acquireVsCodeApi(): {
    postMessage: (msg: ReaderWebviewMessage) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// ---- DOM ----

const appHtml = `
<div class="bb-reader">
    <div class="bb-reader__topbar">
        <div class="bb-reader__row1">
            <span id="phase" class="bb-reader__phase">Idle</span>
            <span id="tail" class="bb-reader__tail"></span>
        </div>
        <div class="bb-reader__row2">
            <div class="bb-reader__progress"><div id="progress-fill" class="bb-reader__progress-fill"></div></div>
        </div>
        <div class="bb-reader__row3">
            <span id="user-prompt-echo" class="bb-reader__user-prompt"></span>
            <span class="bb-reader__spacer"></span>
            <span id="cost" class="bb-reader__cost"></span>
            <button id="btn-regenerate" class="bb-reader__btn" disabled>↻ Regenerate</button>
            <button id="btn-export" class="bb-reader__btn bb-reader__btn--primary" disabled>⬇ Export</button>
        </div>
        <div id="source-banner" class="bb-reader__banner bb-reader__banner--hidden">
            <span id="banner-msg">Source changed</span>
            <button id="banner-regen" class="bb-reader__banner-btn">Regenerate</button>
            <button id="banner-dismiss" class="bb-reader__banner-btn-icon" aria-label="Dismiss">×</button>
        </div>
    </div>
    <div id="ai-output" class="bb-reader__output">
        <div class="bb-reader__empty">Waiting for source…</div>
    </div>
</div>
`;
document.body.innerHTML = appHtml;

// ---- State ----

let baseUri = '';
let lastFullHtml = ''; // canonical accumulated text from render-done

// ---- Helpers ----

function $(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error(`#${id} missing`); }
    return el;
}

function setPhase(text: string): void { $('phase').textContent = text; }
function setTail(text: string): void { $('tail').textContent = text; }
function setProgress(percent: number): void {
    $('progress-fill').style.width = `${Math.min(100, Math.max(0, percent))}%`;
}
function setUserPromptEcho(text: string): void {
    $('user-prompt-echo').textContent = text ? `↳ Custom: "${text}"` : '';
}
function setCost(tokens: number, cost?: number): void {
    const tokStr = tokens ? `${tokens.toLocaleString()} tok` : '';
    const costStr = cost !== undefined ? `· $${cost.toFixed(4)}` : '';
    $('cost').textContent = `${tokStr} ${costStr}`.trim();
}

// ---- Image src rewriting ----

/**
 * Replace local-path <img src="..."> with webview URIs. Skips https:, data:,
 * and vscode-webview:. Mirrors the host-side rewrite used in BB Editor.
 */
function rewriteImageSrcs(html: string, baseUri: string): string {
    if (!baseUri) { return html; }
    const encodedBase = baseUri.replace(/\+/g, '%2B');
    return html.replace(
        /(<img\b[^>]*\bsrc=)("([^"]*)"|'([^']*)')/gi,
        (match, before: string, _quoted: string, dq?: string, sq?: string) => {
            const src = dq ?? sq ?? '';
            if (!src || /^(https?:|data:|vscode-webview:)/i.test(src)) { return match; }
            const resolved = `${encodedBase}/${src}`;
            const quote = dq !== undefined ? '"' : "'";
            return `${before}${quote}${resolved}${quote}`;
        },
    );
}

// ---- Tail preview buffer ----

const TAIL_MAX = 80;
let tailBuffer = '';

function pushTail(chunk: string): void {
    // Strip tags and squash whitespace to get a clean preview.
    const text = chunk.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    tailBuffer = (tailBuffer + text).slice(-TAIL_MAX);
    setTail(tailBuffer);
}

// ---- Streaming state ----

let estInputTokens = 0;
let receivedChars = 0;
let preset = '';
let currentUserPrompt = '';

function resetForNewGeneration(): void {
    tailBuffer = '';
    receivedChars = 0;
    lastFullHtml = '';
    setTail('');
    setProgress(0);
    setCost(0);
    $('btn-regenerate').setAttribute('disabled', 'true');
    $('btn-export').setAttribute('disabled', 'true');
    $('ai-output').innerHTML = '<div class="bb-reader__empty">Streaming…</div>';
    $('source-banner').classList.add('bb-reader__banner--hidden');
}

// ---- Message dispatch ----

window.addEventListener('message', (event: MessageEvent<ReaderHostMessage>) => {
    handleHost(event.data);
});

function handleHost(msg: ReaderHostMessage): void {
    switch (msg.type) {
        case 'reader-init':
            baseUri = msg.baseUri;
            preset = msg.preset;
            currentUserPrompt = msg.userPrompt;
            estInputTokens = msg.estInputTokens;
            setUserPromptEcho(currentUserPrompt);
            setPhase(`Ready (${preset})`);
            break;

        case 'reader-start':
            resetForNewGeneration();
            setPhase(`Generating (${preset})`);
            break;

        case 'reader-chunk': {
            if ($('ai-output').querySelector('.bb-reader__empty')) {
                $('ai-output').innerHTML = '';
            }
            const rewritten = rewriteImageSrcs(msg.text, baseUri);
            // Append by inserting an adjacent HTML span. innerHTML += would
            // re-parse the whole accumulated string each chunk, which is O(n²)
            // on long docs. insertAdjacentHTML appends.
            $('ai-output').insertAdjacentHTML('beforeend', rewritten);
            receivedChars += msg.text.length;
            const approxTok = Math.ceil(receivedChars / 4);
            const pct = estInputTokens > 0
                ? Math.min(99, (approxTok / estInputTokens) * 100)
                : 0;
            setProgress(pct);
            pushTail(msg.text);
            break;
        }

        case 'reader-done': {
            lastFullHtml = msg.fullHtml;
            // Re-render the canonical final HTML by replacing innerHTML once.
            const rewritten = rewriteImageSrcs(msg.fullHtml, baseUri);
            $('ai-output').innerHTML = rewritten;
            setProgress(100);
            setTail(`Rendered in ${(msg.durationMs / 1000).toFixed(1)}s`);
            setCost(msg.tokensUsed, msg.costUsd);
            setPhase(`Done (${preset})`);
            $('btn-regenerate').removeAttribute('disabled');
            $('btn-export').removeAttribute('disabled');
            break;
        }

        case 'reader-error':
            setPhase('Error');
            setTail(msg.message);
            $('btn-regenerate').removeAttribute('disabled');
            break;

        case 'reader-source-changed':
            $('source-banner').classList.remove('bb-reader__banner--hidden');
            $('banner-msg').textContent = 'Source changed — re-render to refresh.';
            break;

        case 'reader-source-closed':
            $('source-banner').classList.remove('bb-reader__banner--hidden');
            $('banner-msg').textContent = 'Source closed — Regenerate disabled.';
            $('btn-regenerate').setAttribute('disabled', 'true');
            break;

        case 'reader-export-result':
            // Toast-style: flash the phase area briefly.
            if (msg.success) {
                setPhase('Exported');
                setTimeout(() => setPhase(`Done (${preset})`), 2000);
            } else if (msg.error && msg.error !== 'Cancelled') {
                setPhase('Export failed');
                setTail(msg.error);
            }
            break;

        case 'reader-theme':
            document.body.dataset.theme = msg.kind;
            break;

        default:
            break;
    }
}

// ---- Button wiring ----

$('btn-regenerate').addEventListener('click', () => {
    vscode.postMessage({ type: 'reader-regenerate' });
});
$('btn-export').addEventListener('click', () => {
    vscode.postMessage({ type: 'reader-export', html: lastFullHtml });
});
$('banner-regen').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
    vscode.postMessage({ type: 'reader-regenerate' });
});
$('banner-dismiss').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
});

// ---- Bootstrap ----

vscode.postMessage({ type: 'reader-ready' });
