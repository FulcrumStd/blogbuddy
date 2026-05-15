/**
 * Parse YAML (`---`) or TOML (`+++`) frontmatter from the head of a document.
 * Returns the raw frontmatter block (including delimiters and trailing newline)
 * and the remaining body. Frontmatter is only recognized at the start of input.
 */
export function extractFrontmatter(content: string): { frontmatter: string; body: string } {
    const yamlMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (yamlMatch) {
        return { frontmatter: yamlMatch[0], body: content.slice(yamlMatch[0].length) };
    }
    const tomlMatch = content.match(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/);
    if (tomlMatch) {
        return { frontmatter: tomlMatch[0], body: content.slice(tomlMatch[0].length) };
    }
    return { frontmatter: '', body: content };
}
