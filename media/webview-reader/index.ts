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
            <span id="spinner" class="bb-reader__spinner bb-reader__spinner--hidden" aria-hidden="true"></span>
            <span id="gen-tokens" class="bb-reader__gen-tokens"></span>
            <span class="bb-reader__spacer"></span>
            <button id="btn-regenerate" class="bb-reader__btn" disabled>↻ Regenerate</button>
            <button id="btn-export" class="bb-reader__btn bb-reader__btn--primary" disabled>⬇ Export</button>
        </div>
        <div class="bb-reader__row2">
            <span id="preset-label" class="bb-reader__preset-label"></span>
            <input
                id="prompt-input"
                class="bb-reader__prompt-input"
                type="text"
                placeholder="Refine the prompt, then press Enter or click Regenerate…"
                autocomplete="off"
                spellcheck="false"
            />
        </div>
        <div id="source-banner" class="bb-reader__banner bb-reader__banner--hidden">
            <span id="banner-msg">Source changed</span>
            <button id="banner-regen" class="bb-reader__banner-btn">Regenerate</button>
            <button id="banner-dismiss" class="bb-reader__banner-btn-icon" aria-label="Dismiss">×</button>
        </div>
    </div>
    <div id="content-area" class="bb-reader__content">
        <div id="status-overlay" class="bb-reader__status-overlay">Waiting for source…</div>
        <iframe
            id="ai-frame"
            class="bb-reader__iframe bb-reader__iframe--hidden"
            sandbox="allow-scripts"
            srcdoc=""
        ></iframe>
    </div>
</div>
`;
document.body.innerHTML = appHtml;

// ---- State ----

let baseUri = '';
let preset = '';
let currentUserPrompt = '';

// ---- Helpers ----

function $(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error(`#${id} missing`); }
    return el;
}

function setPhase(text: string): void { $('phase').textContent = text; }
function setSpinner(on: boolean): void {
    $('spinner').classList.toggle('bb-reader__spinner--hidden', !on);
}
function setGenTokens(text: string): void { $('gen-tokens').textContent = text; }
function setPresetLabel(name: string): void { $('preset-label').textContent = name; }
function setPromptValue(text: string): void {
    ($('prompt-input') as HTMLInputElement).value = text;
}
function getPromptValue(): string {
    return ($('prompt-input') as HTMLInputElement).value;
}
function showStatus(text: string | null): void {
    const overlay = $('status-overlay');
    if (text === null) {
        overlay.classList.add('bb-reader__status-overlay--hidden');
    } else {
        overlay.textContent = text;
        overlay.classList.remove('bb-reader__status-overlay--hidden');
    }
}
function showFrame(on: boolean): void {
    $('ai-frame').classList.toggle('bb-reader__iframe--hidden', !on);
}

// ---- Image src rewriting ----

/**
 * Replace local-path <img src="..."> with webview URIs. Skips https:, data:,
 * and vscode-webview:. Mirrors the host-side rewrite used in BB Editor.
 */
function rewriteImageSrcs(html: string, base: string): string {
    if (!base) { return html; }
    const encodedBase = base.replace(/\+/g, '%2B');
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

// ---- Iframe srcdoc with throttled updates ----
//
// Each chunk arrives ~50ms apart. Setting srcdoc reloads the iframe; doing it
// on every chunk causes flicker. Throttle to one update per animation frame so
// the iframe re-renders at most 60fps regardless of chunk arrival rate.

let accumulatedHtml = '';
let pendingFrameUpdate = false;

function scheduleFrameUpdate(html: string): void {
    accumulatedHtml = html;
    if (pendingFrameUpdate) { return; }
    pendingFrameUpdate = true;
    requestAnimationFrame(() => {
        pendingFrameUpdate = false;
        const frame = $('ai-frame') as HTMLIFrameElement;
        frame.srcdoc = rewriteImageSrcs(accumulatedHtml, baseUri);
    });
}

function setFrameNow(html: string): void {
    // Used for the canonical reader-done payload — bypass throttle so the
    // final HTML lands immediately without an extra animation-frame delay.
    accumulatedHtml = html;
    pendingFrameUpdate = false;
    const frame = $('ai-frame') as HTMLIFrameElement;
    frame.srcdoc = rewriteImageSrcs(html, baseUri);
}

// ---- Streaming state ----

let receivedChars = 0;

function resetForNewGeneration(): void {
    accumulatedHtml = '';
    receivedChars = 0;
    setGenTokens('');
    $('btn-regenerate').setAttribute('disabled', 'true');
    $('btn-export').setAttribute('disabled', 'true');
    showFrame(false);
    showStatus('Generating…');
    setSpinner(true);
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
            setPresetLabel(`${preset}:`);
            setPromptValue(currentUserPrompt);
            setPhase(`Ready (${preset})`);
            setSpinner(false);
            break;

        case 'reader-start':
            resetForNewGeneration();
            setPhase(`Generating (${preset})`);
            break;

        case 'reader-chunk': {
            // Switch from status overlay to the iframe as soon as the first
            // chunk arrives. Subsequent chunks throttle into the same iframe.
            if (!$('status-overlay').classList.contains('bb-reader__status-overlay--hidden')) {
                showStatus(null);
                showFrame(true);
            }
            scheduleFrameUpdate(accumulatedHtml + msg.text);
            receivedChars += msg.text.length;
            const approxTok = Math.ceil(receivedChars / 4);
            setGenTokens(`${approxTok.toLocaleString()} tok generated`);
            break;
        }

        case 'reader-done': {
            setFrameNow(msg.fullHtml);
            showStatus(null);
            showFrame(true);
            setSpinner(false);
            const seconds = (msg.durationMs / 1000).toFixed(1);
            const tokens = msg.tokensUsed.toLocaleString();
            const costStr = msg.costUsd !== undefined ? ` · $${msg.costUsd.toFixed(4)}` : '';
            setGenTokens(`${tokens} tok · ${seconds}s${costStr}`);
            setPhase(`Done (${preset})`);
            $('btn-regenerate').removeAttribute('disabled');
            $('btn-export').removeAttribute('disabled');
            break;
        }

        case 'reader-error':
            setSpinner(false);
            setPhase('Error');
            showFrame(false);
            showStatus(msg.message);
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
            $('banner-regen').setAttribute('disabled', 'true');
            break;

        case 'reader-export-result':
            if (msg.success) {
                setPhase('Exported');
                setTimeout(() => setPhase(`Done (${preset})`), 2000);
            } else if (msg.error && msg.error !== 'Cancelled') {
                setPhase('Export failed');
                setGenTokens(msg.error);
            }
            break;

        case 'reader-theme':
            document.body.dataset.theme = msg.kind;
            break;

        default:
            break;
    }
}

// ---- Regenerate (top bar + banner + Enter in prompt input) ----

function fireRegenerate(): void {
    currentUserPrompt = getPromptValue();
    vscode.postMessage({ type: 'reader-regenerate', userPrompt: currentUserPrompt });
}

$('btn-regenerate').addEventListener('click', () => fireRegenerate());
$('btn-export').addEventListener('click', () => {
    vscode.postMessage({ type: 'reader-export' });
});
$('banner-regen').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
    fireRegenerate();
});
$('banner-dismiss').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
});

// Enter in the prompt input fires Regenerate (unless the button is disabled,
// e.g. while a generation is in flight).
$('prompt-input').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Enter') { return; }
    e.preventDefault();
    if ($('btn-regenerate').hasAttribute('disabled')) { return; }
    fireRegenerate();
});

// ---- Bootstrap ----

vscode.postMessage({ type: 'reader-ready' });
