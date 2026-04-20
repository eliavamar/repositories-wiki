---
name: update-wiki
description: Use this skill when your code changes impact the repository wiki — whether updating existing pages, adding new pages or sections, or removing obsolete ones. Trigger whenever you modify, add, or delete code that is referenced in wiki/INDEX.md, or when you introduce significant new modules or features that should be documented in the wiki.
---

# Update Wiki

This skill guides you through detecting wiki-impacting changes and applying the correct update — whether editing an existing page, adding a new page or section, or removing obsolete content.

## Step 1: Detect What Changed

Identify which source files you changed, added, or deleted:

1. Check your current session context — you may already know what changed
2. If unclear, use `git diff` against your last commit to understand the changes
3. If still unclear, ask the user

**Before proceeding: confirm with the user that the detected changes are correct.**

## Step 2: Decide What to Do

Open `wiki/INDEX.md` and check whether your changes relate to any documented wiki pages.

- **Your changes affect behavior or functionality documented in an existing wiki page** → Update that page (Step 3a)
- **You added a new file whose functionality is related to an existing wiki page** → Update that page (Step 3a)
- **New functionality fits under an existing section but no page covers it** → Add a new page (Step 3b)
- **New functionality doesn't fit any existing section** → Add a new section and page (Step 3b)
- **You deleted a module entirely** → Remove its wiki page and section if empty (Step 3c)

## Step 3a: Update an Existing Page

Make surgical edits to the affected sections only — do not rewrite the entire page.

1. Read the wiki page that covers your changes
2. Identify which sections are now stale or incomplete
3. Edit only those sections, following the style reminder in `templates/content-guidelines-reminder.md`
4. Update source citations to reflect new line numbers or files
5. Update `wiki/INDEX.md` if the page's relevant source files changed (added or removed files)

## Step 3b: Add a New Page (or Section)

1. Read the source files relevant to the new page
2. Write the full page following the Content Generation Guidelines in `templates/content-guidelines.md`
3. Update `wiki/INDEX.md`:
   - If adding a page to an existing section: add a row to that section's table
   - If adding a new section: add a new section heading and table

## Step 3c: Remove a Page or Section

1. Delete the wiki page file
2. Remove its entry from `wiki/INDEX.md`
3. If the section is now empty, remove the section heading from `wiki/INDEX.md`
4. Check other wiki pages for links to the removed page and update or remove them

## Step 4: Finalize

After applying any changes (3a, 3b, or 3c):

1. Update the commit ID in `wiki/INDEX.md` to reflect the current commit. If you don't have the commit ID, ask the user. If the user doesn't provide one, warn them that the wiki changes will not match the commit ID in the index.
