// CSV parsing and serialising (RFC 4180 style: quoted fields, "" escapes, newlines inside quotes).

function detectDelimiter(text) {
  const candidates = [',', ';', '\t', '|'];
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function parseCSV(text, delimiter) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  delimiter = delimiter || detectDelimiter(text);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully empty lines (e.g. trailing blank lines).
  const filtered = rows.filter((r) => !(r.length === 1 && r[0] === ''));

  // Pad rows so every row has the same number of columns.
  const width = filtered.reduce((max, r) => Math.max(max, r.length), 0);
  for (const r of filtered) {
    while (r.length < width) r.push('');
  }
  return { rows: filtered, delimiter };
}

function toCSV(headers, rows, delimiter) {
  delimiter = delimiter || ',';
  const escape = (value) => {
    const s = String(value ?? '');
    return /["\r\n]/.test(s) || s.includes(delimiter) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(delimiter)).join('\r\n') + '\r\n';
}

if (typeof module !== 'undefined') {
  module.exports = { parseCSV, toCSV, detectDelimiter };
}
