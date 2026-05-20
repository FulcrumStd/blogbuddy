import yaml from 'js-yaml';

// ---- Types ----

interface VsCode {
    postMessage(message: unknown): void;
}

type KnownFieldType = 'text' | 'textarea' | 'date' | 'tags' | 'boolean';

interface KnownField {
    key: string;
    label: string;
    type: KnownFieldType;
}

// Ordered: title → date → tags → categories → draft → description
const KNOWN_FIELDS: KnownField[] = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'tags', label: 'Tags', type: 'tags' },
    { key: 'categories', label: 'Categories', type: 'tags' },
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'slug', label: 'Slug', type: 'text' },
    { key: 'draft', label: 'Draft', type: 'boolean' },
    { key: 'description', label: 'Description', type: 'textarea' },
];

// ---- Module state ----

// The full frontmatter string (with leading/trailing "---" markers) as it lives on disk.
let raw = '';
// Parsed object (non-array, non-null). `null` means parse failure.
let parsed: Record<string, unknown> | null = null;
let changeListener: (() => void) | null = null;
let commitDebounce: ReturnType<typeof setTimeout> | null = null;
let vscodeRef: VsCode | null = null;
let isUpdatingRawFromPanel = false;

// ---- Parse / Serialize ----

const YAML_RE = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)$/;
const TOML_RE = /^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?$/;

function stripMarkers(full: string): { head: string; body: string; tail: string } | null {
    const m = full.match(YAML_RE);
    if (!m) { return null; }
    return { head: m[1], body: m[2], tail: m[3] };
}

function parseYaml(full: string): Record<string, unknown> | null {
    const stripped = stripMarkers(full);
    if (!stripped) { return null; }
    try {
        const obj = yaml.load(stripped.body);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            return obj as Record<string, unknown>;
        }
        return {};
    } catch {
        return null;
    }
}

function serializeYaml(obj: Record<string, unknown>, originalFull: string): string {
    if (Object.keys(obj).length === 0) { return ''; }
    const stripped = stripMarkers(originalFull);
    const head = stripped?.head ?? '---\n';
    const tail = stripped?.tail ?? '\n---\n';
    // js-yaml's dump appends a trailing newline; we strip and let `tail` provide it.
    const body = yaml.dump(obj, { lineWidth: -1, noRefs: true }).replace(/\n$/, '');
    return head + body + tail;
}

// ---- Field rendering ----

function toDateString(v: unknown): string {
    if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof v === 'string') { return v; }
    return '';
}

function toTagsArray(v: unknown): string[] {
    if (Array.isArray(v)) { return v.map(String); }
    if (typeof v === 'string' && v.trim() !== '') {
        return v.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function toBool(v: unknown): boolean {
    if (typeof v === 'boolean') { return v; }
    if (typeof v === 'string') { return v.toLowerCase() === 'true'; }
    return false;
}

function toStr(v: unknown): string {
    if (v == null) { return ''; }
    if (typeof v === 'string') { return v; }
    if (typeof v === 'number' || typeof v === 'boolean') { return String(v); }
    return '';
}

function renderRow(field: KnownField, value: unknown, onChange: (v: unknown) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'prop-row';

    const label = document.createElement('label');
    label.className = 'prop-label';
    label.textContent = field.label;
    row.appendChild(label);

    const control = document.createElement('div');
    control.className = 'prop-control';

    switch (field.type) {
        case 'text': {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'prop-input';
            input.value = toStr(value);
            input.addEventListener('input', () => onChange(input.value));
            control.appendChild(input);
            break;
        }
        case 'textarea': {
            const ta = document.createElement('textarea');
            ta.className = 'prop-input prop-textarea';
            ta.value = toStr(value);
            ta.rows = 2;
            ta.addEventListener('input', () => onChange(ta.value));
            control.appendChild(ta);
            break;
        }
        case 'date': {
            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'prop-input';
            input.value = toDateString(value);
            input.addEventListener('input', () => onChange(input.value));
            control.appendChild(input);
            break;
        }
        case 'boolean': {
            const wrap = document.createElement('label');
            wrap.className = 'prop-switch';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = toBool(value);
            cb.addEventListener('change', () => onChange(cb.checked));
            const slider = document.createElement('span');
            slider.className = 'prop-switch-slider';
            wrap.appendChild(cb);
            wrap.appendChild(slider);
            control.appendChild(wrap);
            break;
        }
        case 'tags': {
            control.appendChild(renderTags(toTagsArray(value), onChange));
            break;
        }
    }

    row.appendChild(control);
    return row;
}

function renderTags(initial: string[], onChange: (v: string[]) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'prop-tags';
    let tags = [...initial];

    const render = () => {
        wrap.replaceChildren();
        for (const tag of tags) {
            const chip = document.createElement('span');
            chip.className = 'prop-tag';
            chip.textContent = tag;
            const x = document.createElement('button');
            x.type = 'button';
            x.className = 'prop-tag-remove';
            x.textContent = '×';
            x.addEventListener('click', () => {
                tags = tags.filter(t => t !== tag);
                render();
                onChange(tags);
            });
            chip.appendChild(x);
            wrap.appendChild(chip);
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'prop-tag-input';
        input.placeholder = 'Add tag…';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const v = input.value.trim();
                if (v && !tags.includes(v)) {
                    tags.push(v);
                    onChange(tags);
                    render();
                    // Refocus on the new input rendered above.
                    const next = wrap.querySelector<HTMLInputElement>('.prop-tag-input');
                    next?.focus();
                }
            } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
                tags.pop();
                onChange(tags);
                render();
                const next = wrap.querySelector<HTMLInputElement>('.prop-tag-input');
                next?.focus();
            }
        });
        wrap.appendChild(input);
    };
    render();
    return wrap;
}

// ---- Panel lifecycle ----

function renderPanel(): void {
    const propsEl = document.getElementById('frontmatter-props');
    if (!propsEl) { return; }
    propsEl.replaceChildren();

    if (parsed === null) {
        const err = document.createElement('div');
        err.className = 'prop-error';
        err.textContent = 'YAML parse error — edit the raw view below to fix.';
        propsEl.appendChild(err);
        return;
    }

    for (const field of KNOWN_FIELDS) {
        if (!(field.key in parsed)) { continue; }
        const row = renderRow(field, parsed[field.key], (v) => {
            if (!parsed) { return; }
            if (field.type === 'tags') {
                parsed[field.key] = v as string[];
            } else {
                parsed[field.key] = v;
            }
            applyParsedToRaw();
        });
        propsEl.appendChild(row);
    }

    // Add-field dropdown for missing known fields
    const missing = KNOWN_FIELDS.filter(f => !(f.key in (parsed || {})));
    if (missing.length > 0) {
        const addRow = document.createElement('div');
        addRow.className = 'prop-row prop-row-add';
        const select = document.createElement('select');
        select.className = 'prop-input';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '+ Add field…';
        select.appendChild(placeholder);
        for (const f of missing) {
            const opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.label;
            select.appendChild(opt);
        }
        select.addEventListener('change', () => {
            const key = select.value;
            if (!key || !parsed) { return; }
            const field = KNOWN_FIELDS.find(f => f.key === key);
            if (!field) { return; }
            parsed[key] = field.type === 'tags' ? [] : field.type === 'boolean' ? false : '';
            applyParsedToRaw();
            renderPanel();
        });
        addRow.appendChild(select);
        propsEl.appendChild(addRow);
    }
}

// Single commit path for both panel-driven and textarea-driven edits.
// Dirty state flips synchronously; the actual frontmatter-update message is
// debounced the same 500ms as body auto-save.
function scheduleFrontmatterCommit(): void {
    changeListener?.();
    if (commitDebounce) { clearTimeout(commitDebounce); }
    commitDebounce = setTimeout(() => {
        vscodeRef?.postMessage({ type: 'frontmatter-update', frontmatter: raw });
    }, 500);
}

function applyParsedToRaw(): void {
    if (!parsed) { return; }
    raw = serializeYaml(parsed, raw || '---\n---\n');
    syncTextarea();
    scheduleFrontmatterCommit();
}

function syncTextarea(): void {
    const textarea = document.getElementById('frontmatter-editor') as HTMLTextAreaElement | null;
    if (!textarea) { return; }
    isUpdatingRawFromPanel = true;
    textarea.value = raw;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    isUpdatingRawFromPanel = false;
}

export function initFrontmatterPanel(vscode: VsCode): void {
    const panel = document.getElementById('frontmatter-panel');
    const toggle = document.getElementById('frontmatter-toggle');
    const textarea = document.getElementById('frontmatter-editor') as HTMLTextAreaElement | null;
    if (!panel || !toggle || !textarea) { return; }

    vscodeRef = vscode;

    toggle.addEventListener('click', () => {
        panel.classList.toggle('frontmatter-collapsed');
    });

    textarea.addEventListener('input', () => {
        if (isUpdatingRawFromPanel) { return; }
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        raw = ensureMarkers(textarea.value);
        parsed = parseYaml(raw);
        renderPanel();
        scheduleFrontmatterCommit();
    });
}

function ensureMarkers(v: string): string {
    if (v.trim() === '') { return ''; }
    // If user removed markers, wrap as-is.
    if (!YAML_RE.test(v) && !TOML_RE.test(v)) {
        // Try to salvage: wrap content in --- markers.
        return `---\n${v.replace(/^---\r?\n?/, '').replace(/\r?\n---\r?\n?$/, '')}\n---\n`;
    }
    return v;
}

export function updateFrontmatterPanel(frontmatter: string): void {
    const panel = document.getElementById('frontmatter-panel');
    const textarea = document.getElementById('frontmatter-editor') as HTMLTextAreaElement | null;
    if (!panel || !textarea) { return; }

    raw = frontmatter || '';
    parsed = raw ? parseYaml(raw) : {};

    if (frontmatter) {
        panel.classList.remove('frontmatter-hidden');
        // Collapsed by default — the user reaches for frontmatter
        // intentionally when they need it; leaving it expanded eats
        // vertical space on every doc load. The toggle button still flips
        // state on demand.
        panel.classList.add('frontmatter-collapsed');
    } else {
        panel.classList.add('frontmatter-hidden');
    }

    syncTextarea();
    renderPanel();
}

export function onFrontmatterChange(listener: () => void): void {
    changeListener = listener;
}
