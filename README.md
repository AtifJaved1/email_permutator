# Email Permutator

A static web app that generates ranked email-address guesses from a CSV of leads.
All processing happens in your browser — no data is ever sent to a server.

## Quick start

Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari).

1. Upload a CSV file of leads.
2. Verify the auto-detected column mapping (adjust dropdowns if needed).
3. Set your options (SMB mode, Top N, layout).
4. Click **Process & Download CSV**.

## Input CSV

Your file needs at least a first-name column and a website/domain column.
Column headers are matched case-insensitively and trimmed.

| Field    | Accepted header names |
|----------|-----------------------|
| First name | `first name`, `first_name`, `firstname`, `fname`, `first`, `given name` |
| Last name  | `last name`, `last_name`, `lastname`, `lname`, `last`, `surname`, `family name` |
| Company    | `company name`, `company_name`, `company`, `organization`, `organisation`, `account name` |
| Website    | `website`, `company website`, `domain`, `url`, `web`, `company domain`, `site` |

See `examples/sample_leads.csv` for a sample input file.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| SMB mode | ON | Reorders format patterns to put first-name-first variants at the top — common for small/medium businesses |
| Top N formats | 4 | How many format patterns to generate per lead (1–10) |
| Output layout | Long | `long`: one row per email guess; `wide`: one row per lead with `email_1`…`email_N` columns |

## Email format patterns

| Rank (default) | Format | Example — john / smith |
|----------------|--------|------------------------|
| 1 | `first.last`  | john.smith@   |
| 2 | `first`       | john@         |
| 3 | `flast`       | jsmith@       |
| 4 | `firstlast`   | johnsmith@    |
| 5 | `f.last`      | j.smith@      |
| 6 | `firstl`      | johns@        |
| 7 | `first_last`  | john_smith@   |
| 8 | `last`        | smith@        |
| 9 | `last.first`  | smith.john@   |
| 10| `lastf`       | smithj@       |

**SMB mode order:** first, first.last, firstlast, flast, f.last, firstl, first\_last, last, last.first, lastf

## Name cleaning

- NFKD-normalised, accent-stripped, lowercased, only `a-z` kept.
- Split on spaces and hyphens.
- Common prefixes (`dr`, `mr`, `mrs`, `ms`, `miss`, `prof`) and suffixes (`jr`, `sr`, `ii`–`iv`, `phd`, `md`, `cpa`, `esq`, `mba`, `dds`, `pe`) are dropped.
- Multi-part names produce two variants (joined + alternate) to multiply coverage:
  - **First name** — alternate = first token (`Mary Ann` → `maryann`, `mary`).
  - **Last name** — alternate = first token, **except** when the first token is a particle (`van`, `von`, `de`, `der`, `del`, `la`, `le`, `di`, `da`, `st`) or ≤ 3 characters, in which case the alternate is the **last** token (`van der Berg` → `vanderberg`, `berg`; `García-López` → `garcialopez`, `garcia`).

## Domain rules

- If the value contains `@`, the part after it is used.
- Subdomains are reduced to the root domain (`shop.acme.com` → `acme.com`).
- Multi-part TLDs are respected: `co.uk`, `com.au`, `co.nz`, `co.in`, `com.br`, `co.za`, `com.mx`, `co.jp`, `com.sg`, `com.pk`, `org.uk`, `ac.uk`, `gov.uk`, `net.au`, `org.au`.
- Leads with a free / social domain (Gmail, Yahoo, Hotmail, Outlook, AOL, iCloud, Live, MSN, LinkedIn, Facebook) produce no emails; the `note` column explains why.
- Missing domain or missing first name are similarly flagged in `note`.

## Running the tests

```bash
node test.js
```

Requires Node.js 18+ (uses `node:assert` and `URL`).

## Files

```
index.html              — the app (open directly in a browser)
permutator.js           — core logic; no DOM code; testable in Node.js
test.js                 — unit tests (node test.js)
examples/
  sample_leads.csv      — sample input CSV
README.md
```
