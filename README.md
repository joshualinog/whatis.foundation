# whatis.foundation

Website for the Foundation course: **102 bases** (0–101) in five parts, built with Eleventy and Tailwind.

| Where | What |
|---|---|
| Base 0 | Introduction (Eldad) |
| Division 1 — The Beginning Elements | Part 1 bases 1–7 · Part 2 bases 8–12 · Part 3 bases 13–22 · Part 4 bases 23–29 |
| Base 30 | The nexus: Jesus, the only foundation |
| Division 2 — The Main Course | Part 5 bases 31–100 |
| Base 101 | Laying on of hands (Medad) |

The homepage is a masonry of base cards grouped by part; each card opens `/bases/<number>/`, which renders that base from the schema and has [giscus](https://giscus.app) comments.

## How content flows

1. There are 110 content issues, each with an issue template (*🧱 Base*, *🧩 Part*, *🏛️ Main division*, *🗺️ Course overview*) and a label:

   | Issues | Label | Written to |
   |---|---|---|
   | 102 bases (0–101) | `FOUNDATION BASE` | `src/content/bases/NNN.json` → `/bases/<n>/` |
   | 5 parts | `FOUNDATION PART` | `src/content/parts/N.json` → `/parts/<n>/` |
   | 2 main divisions | `FOUNDATION DIVISION` | `src/content/divisions/N.json` → `/divisions/<n>/` |
   | course overview | `FOUNDATION COURSE OVERVIEW` | `src/content/overview.json` → `/overview/` |

2. Handwriting is turned into text and pasted into the issue body, in any order, in the **tag language** below — HTML comments, invisible when GitHub renders the issue. There is no YAML front matter.
3. Saving the issue runs `scripts/sync-issues.js` (workflows *Issue Event Sync* and the nightly *Sync Issues to Data*). It parses the body, validates it with the matching Zod schema and commits the JSON; that commit rebuilds and deploys the site. A body with an error is skipped with an Actions error annotation, and the previous version stays live.
4. `src/data/bases.js` and `src/data/course.js` merge the synced content with the canonical titles (`src/data/base-titles.json`, issue #184) and the course structure (`src/content/course-defaults.js`), so every page exists even before any content is written.

The schema is the Zod file in the *Foundation Course YAML Front Matter Schema* PDF (`.github/ai chat ref/`), ported to `scripts/lib/schema.js`. Its one deviation: `part_parent` is optional for bases 0, 30 and 101, which belong to no part.

## The tag language

**The type.** `<!-- meta:TYPE … -->` says what the issue is: `meta:base`, `meta:part`, `meta:division` or `meta:overview` (`meta:course` also works). It may wrap the rest of the issue (closing with `<!-- /meta:TYPE -->`) or stand alone. A bare `<!-- meta … -->` means base. If the tag and the issue's label disagree the issue is rejected, so a part pasted into a base issue can never overwrite that base. Only one type per issue.

```html
<!-- meta:part number="5" -->
<!-- block:part-body -->
Freeform handwriting goes here, as markdown.
<!-- /block:part-body -->
<!-- /meta:part -->
```

**Pass 1 — tags.** `meta:TYPE` sets scalar fields; `block:<field>` holds items for an array field; an `item:<alias>` is one entry. Inside a known block the alias is free (`item:game`, `item:activity`, `item:content` are all the same). Attribute values go in quotes; lists are comma separated; `essential` / `main_image` / `main_video` can be written bare. The text between an item's open and close tags is its body.

```html
<!-- meta title="God is Light" number="1" part_parent="1" short_description="…" google_docs_url="https://…" -->

<!-- block:scripture_list -->
<!-- item:scripture ref="1 John 1:5" essential order="1" teacher_notes="Read slowly" -->
God is light, and in him is no darkness at all.
<!-- /item:scripture -->
<!-- /block:scripture_list -->

<!-- block:concept_lexicon -->
<!-- item:concept_entry term="Light" image="https://…" references="Base 02, Base 05" -->
The definition goes in the body.
<!-- /item:concept_entry -->
<!-- /block:concept_lexicon -->

<!-- block:board_game_content -->
<!-- item:game title="Catan" url="https://…" image_urls="https://…/1.png, https://…/2.png" -->
Notes / text.
<!-- /item:game -->
<!-- /block:board_game_content -->
```

**Pass 2 — body.** Everything that is not a tag (markdown, pasted handwriting images) becomes the freeform body (`base_body`, `part_body`, `division_body` or `overview_body`), shown as *Notes* on the page. A `<!-- block:part-body -->` (or `base-body`, `division-body`, `overview-body`, plain `body`) block is the same thing written explicitly. Raw HTML in it is not rendered.

**Meta attributes**

| Type | Attributes |
|---|---|
| `meta:base` | `title number part_parent short_description long_description google_docs_url google_slides_url booklet_chapter_url childrens_book_url` |
| `meta:part` / `meta:division` | `title number short_description long_description google_docs_url google_slides_url` |
| `meta:overview` | `title short_description long_description google_docs_url google_slides_url` |

`number` may be left out when the issue title starts with `Base <n>`, `Part <n>` or `Division <n>`. `title` defaults to the canonical title; a base's `part_parent` defaults to the part its number belongs to; Parts, divisions and the overview accept only the blocks `images`, `videos`, `scripture_list`, `youtube`, `podcast`, the four resource blocks and their own sketch block (`part_sketch`, `division_sketch`, `overview_sketch` — the equivalent of `base_sketch`); any other block is ignored with a warning.

**Blocks → item attributes (the body maps to the field in brackets):**

| Block | Attributes |
|---|---|
| `images` / `videos` | `src alt main_image` / `main_video` |
| `youtube` / `podcast` | `src alt` |
| `scripture_list` | `ref essential order teacher_notes` [`text`] |
| `outline_chain` | link: `order notes` [`text`]; `item:outline_sublink`: `order order_parent notes` [`text`] — attaches to the link whose `order` is `order_parent`, else the previous link |
| `concept_lexicon` | `term image references` [`definition`] |
| `practices` | `item:practice` `name` [`description`], followed by `item:step` `number image images` [`instructions`] |
| `mind_movies` | `order track_urls notes` [`text`] |
| `mishnah_catechesis` | `order hand_gisture question notes` [`answer`] |
| `hand_gistures` | `item:hand_gisture` `name` [`description`], followed by `item:step` `image` [`text`] |
| `block_talk_content` `homeschooling_supporting_content` `board_game_content` `childrens_content` `base_sketch` / `part_sketch` / `division_sketch` / `overview_sketch` | `title order url image_urls video_urls audio_urls notes` [`text`] |

**Non-linear drafting.** Items in the same block with the same explicit `order` are merged: bodies are joined, list attributes appended, other attributes keep the first value. Items without `order` keep writing order. Outline links and sublinks without `order` are numbered by position.

Syntax the PDF does not spell out (`meta:TYPE`, the body blocks, steps, sublinks, the `images`/`videos` blocks) follows the same conventions; those are the parts to adjust in `scripts/lib/tag-parser.js` if your sketchbook habits differ.

## Commands

```sh
npm run dev        # validate, build and serve
npm run build      # validate + css + eleventy → docs/
npm run validate   # schema, parser, generator, issue template and synced content
npm run sync       # sync issues (needs `gh` auth, or GH_TOKEN)
node scripts/bootstrap-issues.js --dry-run   # create the 110 issues from the templates (--only=bases|containers)
node scripts/migrate-issues.js [--apply]     # one-off: meetings → bases, plus parts, divisions and overview, in place (dry run by default)
node scripts/write-issue-templates.js        # regenerate .github/ISSUE_TEMPLATE/*.md from the schema
```

## Giscus comments

Enable Discussions on the repo, install the giscus app, then copy the repo and category IDs from giscus.app and set them as **repository variables** `GISCUS_REPO_ID` and `GISCUS_CATEGORY_ID` (optionally `GISCUS_CATEGORY`, default `Announcements`). The CI build injects them; until they are set, base pages show a short "not configured" note instead of the comment box.
