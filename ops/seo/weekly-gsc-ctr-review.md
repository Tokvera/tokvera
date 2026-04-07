# Tokvera Weekly GSC and CTR Review

## Purpose

Run one disciplined weekly review across the highest-intent SEO pages so title, meta description, FAQ, proof blocks, and internal links are updated from actual search behavior instead of intuition.

## Inputs

Pull these from Google Search Console for the last 7 days and last 28 days:

- page
- query
- clicks
- impressions
- CTR
- average position
- indexed status

Pull these from the live site or internal review:

- current title tag
- current meta description
- whether the page has a proof panel
- whether the page has screenshots or trace visuals
- whether the page links to docs, product, and related compare/integration pages

## Weekly Priority Queue

Review these pages first every week:

1. `/compare/langfuse-alternative`
2. `/compare/tokvera-vs-langsmith`
3. `/integrations/fastapi-ai-tracing`
4. `/integrations/python-openai-tracing`
5. `/use-cases/rag-observability`
6. `/compare/langsmith-alternative`
7. `/compare/tokvera-vs-langfuse`
8. `/integrations/langgraph-tracing`
9. `/integrations/python-ai-workflow-tracing`
10. `/use-cases/customer-support-ai-observability`

## Review Rules

### 1. High impressions, weak CTR

Use this queue first:

- impressions above 100 in 7 days and CTR below 2.5%
- impressions above 300 in 28 days and CTR below 3.5%

Actions:

- rewrite the title to match the top query more directly
- rewrite the meta description around the exact operational pain point
- tighten the H1 if the SERP intent and page headline have drifted
- add or rewrite one FAQ around the top query variation

### 2. Ranking at positions 8-20

These are promotion pages, not rewrite pages.

Actions:

- add internal links from related compare, integration, blog, and glossary pages
- add one stronger proof block, screenshot, or trace visual
- sharpen comparison tables or implementation details
- make the CTA more specific to the page intent

### 3. Ranking at positions 20+

These pages usually need intent correction.

Actions:

- confirm the target keyword still fits the page
- inspect the current top 5 SERP pages
- decide whether the page needs:
  - stronger commercial framing
  - more implementation depth
  - more specific comparison language
  - a narrower long-tail focus

## Rewrite Patterns

### Compare pages

Good title pattern:

- `{Competitor} Alternative for {Operational Outcome} | Tokvera`
- `Tokvera vs {Competitor}: {Primary Decision Frame} | Tokvera`

Good description pattern:

- `Compare Tokvera and {Competitor} for {live ops / cost control / tracing / workflow review}.`

### Integration pages

Good title pattern:

- `{Framework} {Need} for Production {Language/Use Case} | Tokvera`

Examples:

- `FastAPI AI Tracing and Observability for Production Python | Tokvera`
- `Python OpenAI Tracing for FastAPI, Celery, and AI Workflows | Tokvera`

### Use-case pages

Good title pattern:

- `{Workflow} Observability and Tracing for {Production Outcome} | Tokvera`

Examples:

- `RAG Observability and Tracing for Production Retrieval Systems | Tokvera`

## Required Checks Per Page

For every page reviewed, confirm:

- title maps to the top query family
- description includes the operational outcome
- H1 is aligned to the title, not a different intent
- one proof block is visible above the FAQ
- at least one docs link exists
- at least one compare or integration link exists
- at least one product or signup CTA exists

## Output Per Review

For each page, record one of:

- `keep`
- `rewrite title/meta`
- `add FAQ`
- `add proof asset`
- `add internal links`
- `split into new page`

## Suggested Cadence

Every week:

1. export GSC page + query data
2. update `ops/seo/weekly-gsc-ctr-tracker.csv`
3. pick the top 5 underperforming pages
4. make one focused refresh batch
5. record the refresh in release evidence if code changes ship

## Fast Triage Thresholds

Refresh immediately when:

- a target page has impressions but zero clicks over 28 days
- a page reaches top 10 but CTR remains below 2%
- a page ranks for the wrong query family
- a compare page lacks proof or comparison depth
- an integration page ranks for implementation intent but lacks code specificity

## Distribution Checks

After every refresh batch, confirm whether the page also needs:

- GitHub README backlink
- docs backlink
- blog backlink
- dev.to or Medium support post
- LinkedIn distribution

## Notes

- Do not refresh titles randomly. Use the top query family from GSC.
- Do not expand page count when a page-intent rewrite will solve the problem.
- Do not treat page count as the bottleneck. At this stage, CTR, proof, and internal linking matter more.
