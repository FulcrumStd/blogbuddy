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

// ---- Bootstrap ----

window.addEventListener('message', (event: MessageEvent<ReaderHostMessage>) => {
    handleHost(event.data);
});

vscode.postMessage({ type: 'reader-ready' });

// Stub handler — full body lives in Task 9.
function handleHost(msg: ReaderHostMessage): void {
    switch (msg.type) {
        case 'reader-init':
            baseUri = msg.baseUri;
            $('user-prompt-echo').textContent = msg.userPrompt ? `↳ Custom: "${msg.userPrompt}"` : '';
            setPhase(`Initialized (${msg.preset})`);
            void baseUri; // suppress unused warning until Task 9
            break;
        default:
            // Other messages handled in later tasks. No-op for now.
            break;
    }
}

// Mark unused to silence TS until Task 9 wires them up.
void setTail; void setProgress; void setCost; void setUserPromptEcho; void lastFullHtml;
