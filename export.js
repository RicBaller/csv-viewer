// Exporting to other formats: Excel (.xlsx), Markdown tables and aligned plain text.
// All take the header row plus data rows; hasHeader marks the first row as column names.

// ---------- Markdown ----------

function toMarkdown(headers, rows) {
  const escape = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n|\r/g, '<br>');
  const line = (cells) => '| ' + cells.map(escape).join(' | ') + ' |';
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n') + '\n';
}

// ---------- Plain text ----------

// Columns padded with spaces so they line up in a monospaced font. Wide (CJK) characters count double.
function toText(headers, rows, hasHeader) {
  const clean = (value) => String(value ?? '').replace(/\r?\n|\r|\t/g, ' ');
  const all = [headers, ...rows].map((r) => r.map(clean));
  const widths = headers.map((_, c) => Math.max(1, ...all.map((r) => displayWidth(r[c] || ''))));
  const line = (cells) => cells.map((s, c) => s + ' '.repeat(widths[c] - displayWidth(s))).join('  ').trimEnd();
  const lines = all.map(line);
  if (hasHeader) lines.splice(1, 0, widths.map((w) => '-'.repeat(w)).join('  '));
  return lines.join('\n') + '\n';
}

function displayWidth(s) {
  let width = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd);
    width += wide ? 2 : 1;
  }
  return width;
}

// ---------- Excel ----------

// Numbers Excel can store without changing them: no leading zeros, grouping or exponent.
function isPlainNumber(s) {
  return /^-?(0|[1-9]\d{0,14})(\.\d{1,15})?$/.test(s);
}

// A minimal .xlsx workbook with one sheet, zipped without compression.
// Plain numbers become number cells; everything else stays text, so values like 007 or 1,5 survive.
function toXLSX(headers, rows, hasHeader, sheetName) {
  const xml = (s) =>
    String(s ?? '')
      .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10ffff}]/gu, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const colName = (c) => {
    let name = '';
    for (c++; c > 0; c = Math.floor((c - 1) / 26)) name = String.fromCharCode(65 + ((c - 1) % 26)) + name;
    return name;
  };
  const cell = (value, ref, style) => {
    const s = String(value ?? '');
    if (s === '') return '';
    const attrs = `r="${ref}"${style ? ' s="1"' : ''}`;
    if (isPlainNumber(s) && !style) return `<c ${attrs}><v>${s}</v></c>`;
    return `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(s)}</t></is></c>`;
  };
  const sheetRows = [headers, ...rows]
    .map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, colName(c) + (i + 1), hasHeader && i === 0)).join('')}</row>`)
    .join('');
  const freeze = hasHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';
  const name = xml((sheetName || '').replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet1');

  const ns = 'http://schemas.openxmlformats.org';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zipStore({
    '[Content_Types].xml':
      `${head}<Types xmlns="${ns}/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
    '_rels/.rels':
      `${head}<Relationships xmlns="${ns}/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      '</Relationships>',
    'xl/workbook.xml':
      `${head}<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships">` +
      `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      `${head}<Relationships xmlns="${ns}/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>',
    'xl/styles.xml':
      `${head}<styleSheet xmlns="${ns}/spreadsheetml/2006/main">` +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>',
    'xl/worksheets/sheet1.xml':
      `${head}<worksheet xmlns="${ns}/spreadsheetml/2006/main">${freeze}<sheetData>${sheetRows}</sheetData></worksheet>`,
  });
}

// ---------- Zip (store only) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// files: { path: string content }. Returns the zip archive as a Uint8Array.
function zipStore(files) {
  const encoder = new TextEncoder();
  const DOS_DATE = 0x21; // 1980-01-01
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path);
    const body = encoder.encode(content);
    const crc = crc32(body);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, body.length, true);
    local.setUint16(26, name.length, true);
    locals.push(new Uint8Array(local.buffer), name, body);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(14, DOS_DATE, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, body.length, true);
    central.setUint32(24, body.length, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, offset, true);
    centrals.push(new Uint8Array(central.buffer), name);

    offset += 30 + name.length + body.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, centrals.length / 2, true);
  end.setUint16(10, centrals.length / 2, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { toMarkdown, toText, toXLSX, zipStore, crc32 };
}
