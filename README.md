# av-csv-viewer

Simple browser app to view and edit CSV files. No build step, no dependencies.

## Usage

Open `index.html` in a browser.

- Drag a CSV file onto the page (or pick one with the button).
- Choose whether the first row holds column names. If not, enter your own column names.
- Click a cell to edit it; click a column name to rename it. `Enter` saves, `Esc` cancels.
- Use `×` to delete a row or a column.
- Switch to `Rij` view to see one row as column name → value. Browse with `Vorige`/`Volgende`, the arrow keys, or type a row number. Clicking a row number in the table opens that row.
- `Download CSV` saves the edited data.
