---
title: The Quiet Power of Plain Text
subtitle: Why the simplest format we have keeps outliving the fancy ones
author: Jen Okonkwo
date: 2026-05-27
reading_time: 6 min
tags: [writing, tools, markdown, longevity]
---

> A file you can read in fifty years is worth more than a file that looks
> perfect today.

Every few years a new document format arrives promising to fix writing forever.
It has live cursors, embedded video, AI co-authors, a pricing page. And every few
years, quietly, the same people drift back to a `.txt` or `.md` file. Not because
they're nostalgic — because plain text keeps a promise the fancy formats can't.

This is a short defense of the least glamorous tool on your machine.

## What we actually mean by "plain text"

Plain text is just characters — no hidden bytes describing fonts, no proprietary
container, no server that has to stay alive for the file to open. **Markdown** is
plain text with a handful of conventions layered on top, light enough that the
raw file is still pleasant to read:

- `# Heading` for structure
- `*emphasis*` and `**weight**` for tone
- `- item` for a list, `1. item` when order matters
- `` `inline code` `` and fenced blocks for anything literal

The trick is that none of these *require* a renderer. Strip the tooling away and
the meaning survives.

### A quick taste

```python
def word_count(path: str) -> int:
    """Count words without loading the whole file into memory."""
    total = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            total += len(line.split())
    return total
```

You can read that on a phone, in an email, in a git diff, or printed on paper.
It doesn't *need* the syntax highlighting to be understood — the highlighting is
a courtesy, not a dependency.

## The longevity argument

Here's the part that matters. Formats die when the company or codec behind them
dies. Plain text has no company behind it.

| Format        | Born | Still openable raw? | Needs a vendor? |
| ------------- | ---- | ------------------- | --------------- |
| Plain text    | 1963 | Yes                 | No              |
| Word `.doc`   | 1983 | Barely              | Yes             |
| Flash `.swf`  | 1996 | No                  | Dead            |
| Markdown      | 2004 | Yes                 | No              |

> The best archival format is the one that requires nothing to read.

That row for ASCII — *1963* — is not a typo. Text you type today shares an
encoding lineage with documents older than the people who built every app you
use to edit it.

## What you give up, honestly

Plain text isn't free of trade-offs, and pretending otherwise is how you end up
disappointed:

1. **Layout control** is limited — you describe structure, not pixels.
2. **Rich media** lives *beside* the file (an image path), not *inside* it.
3. **Collaboration** needs an external layer like git rather than a magic cursor.

None of these are fatal. They're the cost of a format that does one thing and
refuses to rot.

![A weathered manuscript beside a glowing terminal](./assets/plain-text.jpg)

## A small practice to try this week

- [ ] Write your next set of notes in a single `.md` file
- [ ] Commit it to git instead of a notes app
- [ ] Open it again in a year and notice what *didn't* break

---

Plain text won't trend. It has no launch video and no Series A. It just keeps
working — patiently, unglamorously, decade after decade — which, for the things
you actually want to keep, turns out to be the only feature that counts.
