import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * The scaffolded template for .bbreader.md. Intentionally compact — the user
 * fills it in for their blog. Each section is a place the AI will read when
 * generating Reader HTML; leaving a section empty just means "no guidance
 * for this aspect", which is fine.
 */
const TEMPLATE_CONTENT = `# BB Reader Style Reference

This file is read by BlogBuddy's AI Reader (\`<bb-render-*:>\`) and used as
authoritative guidance on visual style and conventions. Edit each section to
describe your blog's look. Leave any section blank if you don't have an opinion.

## Visual style

- **Typography:** e.g. "Serif body (Charter, Source Serif Pro), sans-serif display headings (Inter)."
- **Body width:** e.g. "max 720px, centered."
- **Color scheme:** e.g. "Warm off-white #fafaf7 background, #2a2a2a body text, #c2410c accent."
- **Headings:** e.g. "Left-aligned. h2 has a thin underline. Generous space-above."
- **Code blocks:** e.g. "Monospace, light gray background, no border, soft rounded corners."
- **Callouts / pull quotes:** e.g. "Left-border tinted blocks, italic body."
- **Links:** e.g. "Accent color, no underline, underline on hover."

## Document structure

- **Table of contents:** Show one at the top? Sticky on scroll?
- **Byline:** How should author/date appear?
- **Date format:** e.g. "March 5, 2026"
- **Reading time estimate:** Show one?

## Components

Special elements the AI may use when appropriate:

- e.g. "SVG diagrams for system explanations — keep them line-art, no fill colors."
- e.g. "Comparison tables with alternating row background."
- e.g. "Side notes (small italic text) in a right-side gutter when there's room."

## Example HTML

If you have an existing rendered page that captures the look you want, paste a
representative excerpt below (head styles + a body sample). The AI will read it
and mirror the patterns.

\`\`\`html
<!-- Paste your reference snippet here, or leave empty -->
\`\`\`

## Things to avoid

- e.g. "Don't use emoji icons in section headings."
- e.g. "Don't auto-link bare URLs in body text."
`;

export function registerCreateReaderTemplateCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.createReaderTemplate', () => createReaderTemplate()),
    );
}

async function createReaderTemplate(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        vscode.window.showErrorMessage('Open a workspace folder first — .bbreader.md is scaffolded at its root.');
        return;
    }

    const targetUri = vscode.Uri.joinPath(folder.uri, '.bbreader.md');
    const targetFsPath = targetUri.fsPath;

    // Confirm before overwriting an existing file.
    let exists = false;
    try {
        await fs.access(targetFsPath);
        exists = true;
    } catch {
        // doesn't exist — that's the happy path
    }
    if (exists) {
        const choice = await vscode.window.showWarningMessage(
            `${path.basename(targetFsPath)} already exists in this workspace. Overwrite with the template?`,
            { modal: true },
            'Overwrite',
        );
        if (choice !== 'Overwrite') { return; }
    }

    try {
        await fs.writeFile(targetFsPath, TEMPLATE_CONTENT, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(
            'Created .bbreader.md — fill it in, then your next AI Reader render will use it as the style reference.',
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to create .bbreader.md: ${msg}`);
    }
}
