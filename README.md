# CSV Viewer

Simple browser app to view and edit CSV files. No build step, no dependencies.

Live at [csv-viewer.app](https://csv-viewer.app/) (canonical) and [editcsv.app](https://editcsv.app/).

## Usage

Open `index.html` in a browser.

- Drag a CSV file onto the page (or pick one with the button).
- Choose whether the first row holds column names. If not, enter your own column names.
- Click a cell to edit it; click a column name to rename it. `Enter` saves, `Esc` cancels.
- Use `×` to delete a row or a column.
- Switch to `Row` view to see one row as column name → value. Browse with `Previous`/`Next`, the arrow keys, or type a row number. Clicking a row number in the table opens that row.
- `Download CSV` saves the edited data. The arrow next to it offers Excel (`.xlsx`), plain text (`.txt`, aligned columns) and Markdown (`.md`, a table). Plain text and Markdown can also be copied to the clipboard. Exporters live in `export.js`.
- The interface language follows your browser settings. Pick another language in the top bar; the choice is remembered. Supported: English, Dutch, German, French, Spanish, Italian, Portuguese, Polish, Turkish, Russian, Ukrainian, Arabic (right-to-left), Hindi, Indonesian, Chinese (Simplified), Japanese and Korean. Translations live in `i18n.js`.
- The footer links to `changelog.html`, the release history. Add new releases at the top of `CHANGELOG` in `changelog.js`.

## SEO and hosting

- `csv-viewer.app` is the canonical domain: `canonical`, Open Graph URLs, `sitemap.xml` and `robots.txt` point there. Redirect `editcsv.app` to it with a 301 (Cloudflare redirect rule), so search engines see one site.
- Update `lastmod` in `sitemap.xml` when page content changes.
- The intro and FAQ on the start page are duplicated in the JSON-LD `FAQPage` in `index.html`. Keep both in sync.
- `404.html` uses absolute paths, so it works at any URL. The web server must serve it for missing pages (nginx: `error_page 404 /404.html;`).
- Icons: `favicon.svg` is the source. The PNGs in `icons/`, `apple-touch-icon.png`, `favicon.ico` and `og-image.png` (1200×630) are rendered from it.
