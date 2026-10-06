# whatis.foundation

A Foundation course site. Each course component is a GitHub issue written in a small HTML-comment tag language; `scripts/sync-issues.js` parses the issues into `src/content/*.json` and Eleventy builds `docs/`.

## Where things live
- `scripts/lib/schema.js` — Zod schemas (`BaseSchema`, `PartSchema`, `DivisionSchema`, `OverviewSchema`) and `DOC_TYPES` (which meta attributes and blocks each type accepts).
- `scripts/lib/tag-parser.js` — the tag parser. `scripts/lib/issue-doc.js` — issue → validated document. `scripts/lib/base-refs.js` — `base_prop_refs` checks.
- `README.md` — the full syntax reference. `npm run validate` must pass; `npm run build` regenerates `docs/`.

## Writing an issue
The issue's label sets its type (`FOUNDATION BASE`, `FOUNDATION PART`, `FOUNDATION DIVISION`, `FOUNDATION COURSE OVERVIEW`); `<!-- meta:TYPE … -->` is optional. Number and part come from the issue title ("Base 30 — …") when omitted.

- Everything inside `<!-- … -->` is hidden on GitHub. Text that must be readable goes between two complete tags: `<!-- base:long_title -->Full title<!-- /base:long_title -->` (`field:`, `base:`, `part:`, `division:` and `overview:` are interchangeable prefixes). Every tag needs its own closing `-->`.
- `long_title` is the full handwritten title shown as the heading on cards and base pages; the GitHub issue title is the short `title`. Put it in a visible tag, not in the `meta` tag.
- Blocks hold items: `<!-- block:scripture_list -->`, `<!-- item:scripture ref="John 1:5" essential -->text<!-- /item:scripture -->`, `<!-- /block:scripture_list -->`. Any `item:*` alias works inside a known block.
- Repeating a block, a `short_description` or a `long_description` appends in order of occurrence; single-valued fields (`title`, `number`, urls) keep the first value and warn on a conflict. Items sharing an `order` merge.
- Outline: `item:link` and `item:sublink` (sublinks attach by `order_parent`). A sublink may carry `base_prop_refs="scripture:John 1:5, concept_entry:Light, image:2"` pointing at items in the same base.
- Escape `"` as `&quot;` and a literal `-->` as `--&gt;` inside attribute values.
- A bot comment titled "Tag check" reports parse errors and warnings after each edit; fix those first.

## Working in the repo
Don't edit `src/content/` or `docs/` by hand; they are generated. Validate with `npm run validate`, then `npm run build`.
