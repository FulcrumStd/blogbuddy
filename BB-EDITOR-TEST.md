---
title: BB Editor Feature Test
date: 2026-04-24
tags:
  - test
  - editor
  - qa
categories:
  - docs
author: BlogBuddy
slug: bb-editor-feature-test
draft: false
description: Open this file in BB Editor and walk through each section to verify the new features end-to-end.
---

# BB Editor Feature Test

This file is a manual smoke test for the eight new features. Work through the sections in order — each takes under a minute.

**How to open:** In the Explorer, right-click this file and pick **Open BB Editor**, or press `Cmd+B` while the file is selected.

---

## 0. Baseline: is the editor loading?

When the editor opens you should see:

- A collapsible **Frontmatter** panel at the top with typed fields already populated (Title / Date / Tags / …).
- This heading and body rendered WYSIWYG (not raw markdown).
- On the right of the Frontmatter header, a small **View source** button.

If any of that is missing, the rest will not work — stop and report.

---

## 1. Frontmatter Properties panel (#4)

**Expected:** The Frontmatter panel renders one row per known field in the YAML above: Title (text), Date (date picker), Tags (chips), Categories (chips), Author (text), Slug (text), Draft (switch), Description (textarea).

**Steps:**

1. Flip the **Draft** switch to ON. Within ~500ms the file on disk flips to `draft: true`. You can confirm by expanding **Raw YAML** at the bottom of the panel — the raw value should flip in lockstep.
2. On the **Tags** row, click the `×` inside the `test` chip. The chip disappears and `test` drops out of the YAML array.
3. Type a new tag into the input, press Enter. The chip appears; YAML array gains the new entry.
4. Backspace in the empty tag input deletes the last chip.
5. Open the **+ Add field…** dropdown, pick any field you don't have (e.g. remove `slug` first, then re-add it). A fresh empty control appears.
6. Expand **Raw YAML** and edit `title:` directly → the Title input up top mirrors the change on next tick.

**Failure modes to watch:** parse-error banner if your raw YAML is malformed; that's expected and correct — fix the YAML and it reappears.

---

## 2. View source button (#6)

**Steps:**

1. Click **View source** in the Frontmatter header.
2. A raw `.md` editor opens in a new tab beside the BB Editor.
3. Close the source tab when done (you'll reopen it in §6 and §7).

**Expected:** The two tabs coexist without error. BB Editor does not reload.

---

## 3. Code block syntax highlighting (#5)

**Expected:** Each fenced block below renders colored tokens. Switch between Light+ and Dark+ themes (`Cmd+K Cmd+T`) — colors should adapt.

```typescript
interface Blog {
  title: string;
  tags: string[];
  draft: boolean;
}

const post: Blog = { title: 'hi', tags: ['a', 'b'], draft: false };
```

```python
def greet(name: str) -> str:
    return f"hello, {name}"

if __name__ == "__main__":
    print(greet("world"))
```

```bash
#!/usr/bin/env bash
for f in *.md; do
  echo "processing: $f"
done
```

```yaml
site:
  title: My Blog
  feeds:
    - rss
    - atom
```

```json
{ "ok": true, "count": 42, "tags": ["a", "b"] }
```

```rust
fn main() {
    let xs: Vec<i32> = (1..=10).filter(|n| n % 2 == 0).collect();
    println!("{:?}", xs);
}
```

**Steps:**

1. Confirm every block above has visible syntax colors.
2. Type `/` on a new line → pick **Code Block** → type `go` as the language → paste:
   ```
   package main
   import "fmt"
   func main() { fmt.Println("hi") }
   ```
   It should highlight as soon as you leave the language field.

---

## 4. Arrow ligatures (#7)

**Steps:**

1. On the next line, **type** (do not paste) exactly: `if x -` then `>` then ` return`. The `->` should flip to `→` the instant you finish the `>`.

   Try here:
   

2. Similarly, type `promise =` then `>` — it should become `⇒`.

   Try here:
   

3. Confirm the ligature does NOT fire inside a code block — type `->` inside:

   ```js
   const cb = (x) -> x * 2
   ```

   The code block should keep the literal `->`.

4. Undo (`Cmd+Z`) reverts the ligature if the autoconvert caught you off-guard.

---

## 5. IME composition protection (#1)

Requires a CJK IME (Chinese Pinyin, Japanese, Korean). If you have none, skip.

**Steps:**

1. Switch to Chinese Pinyin (or any IME).
2. In VS Code's Explorer, note this file's modified time.
3. Click into the editor below this paragraph and type a full sentence in pinyin — e.g. `nihaoshijie` then Space to commit `你好世界`. Keep composing across multiple characters without pausing.
4. While the pinyin strip is **still open** (you haven't committed), the file's mtime must **not** tick.
5. After you commit (Space/Enter), within ~500ms the mtime updates once.

   Try here:
   

**Why this matters:** before the fix, every IME intermediate keystroke would trigger auto-save with a half-formed pinyin string. Now auto-save is suspended until composition commits.

---

## 6. Compact markdown normalization (#2, #8)

This section intentionally contains markdown that Milkdown's default serializer would emit in a non-normalized form. Compact-markdown normalizes it on save.

**Loose bullet list** (should tighten and switch from `*` to `-` on save):

* alpha

* beta

* gamma

**HTML-entity-ish text** (should decode on save):

A &amp; B &lt; C &gt; D

**Extra blank lines below** — collapsed to at most 2:




End of compact-markdown sample.

**Steps:**

1. Click into the document and press `Space` then `Backspace` anywhere in the body (to make it dirty).
2. Press `Cmd+S`.
3. Click **View source** to open the raw `.md`.
4. In the raw file, verify:
   - Bullets above use `-`, not `*`.
   - No blank lines between the bullet items.
   - `&amp;`, `&lt;`, `&gt;` are decoded to `&`, `<`, `>`.
   - At most two consecutive blank lines (the "extra blank lines" run is collapsed).
5. Close the source tab.

---

## 7. External file conflict detection (#3)

**Steps:**

1. In BB Editor, add a single character to the end of this sentence so the title bar shows the dirty dot (●): HERE
2. Click **View source** to open the raw .md in a side tab.
3. In the raw source tab, add any character at the end of the same sentence (so it differs from what BB Editor has), then `Cmd+S` to save the raw editor.
4. Click back on the BB Editor tab. A **yellow banner** should appear across the top:

   > This file changed on disk. Reload from disk, or keep your current edits?

5. Click **Reload**. BB Editor replaces its content with the disk version (your BB edit from step 1 is discarded).
6. Redo the experiment, but in step 5 click **Keep my version** instead. BB Editor's content wins; the raw source tab's unsaved buffer should be marked dirty or reload on its own.

**Failure mode to look for:** the banner does NOT appear if the file watcher missed the change — make sure you pressed Cmd+S in the raw source tab.

---

## 8. BB AI streaming (sanity check — existing feature)

Not part of this batch but worth confirming your AI config still works end-to-end.

**Steps:**

1. On a new line below, type a short paragraph about anything.
2. At the end of that line, type `<bb-impv>` literally.
3. Press `Cmd+B` twice in quick succession (`Cmd+B Cmd+B`).
4. The paragraph + tag gets replaced by a streaming AI block that refines the text, then the AI block resolves into the improved paragraph.

Your playground:



---

## Done

If every section above passes, all eight features are working. Please report which section (if any) misbehaves, ideally with a screenshot or the exact raw `.md` that came out of the editor.
