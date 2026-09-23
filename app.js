const $ = (id) => document.getElementById(id);

const els = {
  dropzone: $('dropzone'),
  fileInput: $('fileInput'),
  importPanel: $('importPanel'),
  importName: $('importName'),
  hasHeader: $('hasHeader'),
  delimiter: $('delimiter'),
  columnNames: $('columnNames'),
  columnNameInputs: $('columnNameInputs'),
  previewTable: $('previewTable'),
  cancelImportBtn: $('cancelImportBtn'),
  confirmImportBtn: $('confirmImportBtn'),
  viewer: $('viewer'),
  dataTable: $('dataTable'),
  actions: $('actions'),
  fileInfo: $('fileInfo'),
  downloadBtn: $('downloadBtn'),
  resetBtn: $('resetBtn'),
  tableView: $('tableView'),
  recordView: $('recordView'),
  tableViewBtn: $('tableViewBtn'),
  recordViewBtn: $('recordViewBtn'),
  recordTable: $('recordTable'),
  recordEmpty: $('recordEmpty'),
  rowNumber: $('rowNumber'),
  rowTotal: $('rowTotal'),
  prevRowBtn: $('prevRowBtn'),
  nextRowBtn: $('nextRowBtn'),
  deleteRecordBtn: $('deleteRecordBtn'),
  languageSelect: $('languageSelect'),
  tableTools: $('tableTools'),
  selectToggleBtn: $('selectToggleBtn'),
  selectedCount: $('selectedCount'),
  deleteSelectedBtn: $('deleteSelectedBtn'),
};

// File waiting in the import panel.
let pending = null; // { name, text, rows, customNames }

// Loaded data.
let data = null; // { name, delimiter, headers: string[], rows: string[][] }

// Active view of the loaded data: 'table' or 'record' (one row at a time).
let view = 'table';
let currentRow = 0; // zero-based index shown in record view

// Row selection for bulk delete. Holds row arrays, so indices can shift without breaking it.
let selecting = false;
let selected = new Set();

const PREVIEW_ROWS = 5;

function show(section) {
  els.dropzone.hidden = section !== 'dropzone';
  els.importPanel.hidden = section !== 'import';
  els.viewer.hidden = section !== 'viewer';
  els.actions.hidden = section !== 'viewer';
}

// ---------- Loading a file ----------

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => startImport(file.name, reader.result);
  reader.onerror = () => alert(t('readError'));
  reader.readAsText(file);
}

function startImport(name, text) {
  const delimiter = detectDelimiter(text.replace(/^﻿/, ''));
  pending = { name, text, rows: [], customNames: [] };
  els.importName.textContent = name;
  els.delimiter.value = delimiter;
  els.hasHeader.checked = true;
  refreshImport();
  show('import');
}

function refreshImport() {
  pending.rows = parseCSV(pending.text, els.delimiter.value).rows;
  const width = pending.rows[0] ? pending.rows[0].length : 0;
  const hasHeader = els.hasHeader.checked;

  els.columnNames.hidden = hasHeader;
  if (!hasHeader) renderColumnNameInputs(width);

  const headers = importHeaders();
  const body = pending.rows.slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + PREVIEW_ROWS);
  renderSimpleTable(els.previewTable, headers, body);
}

function renderColumnNameInputs(width) {
  els.columnNameInputs.replaceChildren();
  for (let i = 0; i < width; i++) {
    const label = document.createElement('label');
    label.textContent = t('column', { n: i + 1 });
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('column', { n: i + 1 });
    input.value = pending.customNames[i] || '';
    input.addEventListener('input', () => {
      pending.customNames[i] = input.value;
      const headers = importHeaders();
      els.previewTable.querySelectorAll('thead th')[i].textContent = headers[i];
    });
    label.appendChild(input);
    els.columnNameInputs.appendChild(label);
  }
}

function importHeaders() {
  const width = pending.rows[0] ? pending.rows[0].length : 0;
  if (els.hasHeader.checked) return pending.rows[0] ? [...pending.rows[0]] : [];
  return Array.from({ length: width }, (_, i) => (pending.customNames[i] || '').trim() || t('column', { n: i + 1 }));
}

function confirmImport() {
  const hasHeader = els.hasHeader.checked;
  data = {
    name: pending.name,
    delimiter: els.delimiter.value,
    headers: importHeaders(),
    rows: pending.rows.slice(hasHeader ? 1 : 0),
  };
  pending = null;
  currentRow = 0;
  stopSelecting();
  render();
  show('viewer');
}

// ---------- Rendering ----------

function renderSimpleTable(table, headers, rows) {
  const thead = document.createElement('thead');
  const headRow = thead.insertRow();
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  }
  const tbody = document.createElement('tbody');
  for (const r of rows) {
    const tr = tbody.insertRow();
    for (const v of r) tr.insertCell().textContent = v;
  }
  table.replaceChildren(thead, tbody);
}

function deleteButton(title, action, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'delete';
  btn.title = title;
  btn.textContent = '×';
  btn.dataset.action = action;
  btn.dataset.index = index;
  return btn;
}

function renderData() {
  const thead = document.createElement('thead');
  const headRow = thead.insertRow();
  const corner = document.createElement('th');
  corner.className = 'rownum';
  if (selecting) {
    corner.appendChild(checkbox('select-all', -1, t('selectAll')));
  } else {
    corner.textContent = '#';
  }
  headRow.appendChild(corner);

  data.headers.forEach((h, c) => {
    const th = document.createElement('th');
    const inner = document.createElement('div');
    inner.className = 'th-inner';
    const name = document.createElement('span');
    name.className = 'col-name';
    name.textContent = h;
    name.dataset.col = c;
    inner.append(name, deleteButton(t('deleteColumn'), 'delete-col', c));
    th.appendChild(inner);
    headRow.appendChild(th);
  });

  const tbody = document.createElement('tbody');
  data.rows.forEach((row, r) => {
    const tr = tbody.insertRow();
    tr.classList.toggle('selected', selected.has(row));
    const num = tr.insertCell();
    num.className = 'rownum';
    if (selecting) {
      const box = checkbox('select-row', r, t('selectRow', { n: r + 1 }));
      box.checked = selected.has(row);
      num.appendChild(box);
    }
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'rowlink';
    open.title = t('openRow');
    open.textContent = String(r + 1);
    open.dataset.action = 'open-row';
    open.dataset.index = r;
    num.append(deleteButton(t('deleteRow'), 'delete-row', r), open);
    row.forEach((value, c) => {
      const td = tr.insertCell();
      td.className = 'cell';
      td.textContent = value;
      td.dataset.row = r;
      td.dataset.col = c;
    });
  });

  els.dataTable.replaceChildren(thead, tbody);
  updateSelectionUI();
}

function checkbox(action, index, label) {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.dataset.action = action;
  box.dataset.index = index;
  box.setAttribute('aria-label', label);
  return box;
}

function updateSelectionUI() {
  els.selectToggleBtn.textContent = t(selecting ? 'stopSelecting' : 'selectRows');
  els.selectToggleBtn.classList.toggle('active', selecting);
  els.selectedCount.hidden = !selecting;
  els.selectedCount.textContent = t('selectedCount', { n: selected.size });
  els.deleteSelectedBtn.hidden = !selecting;
  els.deleteSelectedBtn.disabled = selected.size === 0;
  const all = els.dataTable.querySelector('input[data-action="select-all"]');
  if (all) {
    all.checked = data.rows.length > 0 && selected.size === data.rows.length;
    all.indeterminate = selected.size > 0 && !all.checked;
  }
}

function stopSelecting() {
  selecting = false;
  selected.clear();
}

function renderRecord() {
  const total = data.rows.length;
  currentRow = Math.min(Math.max(currentRow, 0), Math.max(total - 1, 0));

  els.rowNumber.max = total;
  els.rowNumber.value = total ? currentRow + 1 : '';
  els.rowNumber.disabled = total === 0;
  els.rowTotal.textContent = t('ofTotal', { n: total });
  els.prevRowBtn.disabled = currentRow <= 0;
  els.nextRowBtn.disabled = currentRow >= total - 1;
  els.deleteRecordBtn.disabled = total === 0;
  els.recordEmpty.hidden = total > 0;

  const tbody = document.createElement('tbody');
  if (total) {
    data.headers.forEach((h, c) => {
      const tr = tbody.insertRow();
      const th = document.createElement('th');
      th.dataset.col = c;
      const num = document.createElement('span');
      num.className = 'colnum';
      num.textContent = c + 1;
      th.append(num, document.createTextNode(h));
      tr.appendChild(th);
      const td = tr.insertCell();
      td.dataset.col = c;
      td.textContent = data.rows[currentRow][c];
    });
  }
  els.recordTable.replaceChildren(tbody);
}

function render() {
  const isRecord = view === 'record';
  els.tableView.hidden = isRecord;
  els.recordView.hidden = !isRecord;
  els.tableTools.hidden = isRecord;
  els.viewer.classList.toggle('record-mode', isRecord);
  els.tableViewBtn.classList.toggle('active', !isRecord);
  els.recordViewBtn.classList.toggle('active', isRecord);
  if (isRecord) renderRecord();
  else renderData();
  els.fileInfo.textContent = `${data.name} · ${t('rows', { n: data.rows.length })} · ${t('columns', { n: data.headers.length })}`;
}

// ---------- Editing ----------

function startEdit(el, value, onSave) {
  const container = el.tagName === 'SPAN' ? el.closest('th') : el;
  if (container.classList.contains('editing')) return;

  const original = container.cloneNode(true);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  container.classList.add('editing');
  container.replaceChildren(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    if (save && input.value !== value) {
      onSave(input.value);
      render();
    } else {
      container.replaceWith(original);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

els.dataTable.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    const i = Number(btn.dataset.index);
    if (btn.dataset.action === 'delete-row') {
      if (!confirm(t('confirmDeleteRow', { n: i + 1 }))) return;
      selected.delete(data.rows[i]);
      data.rows.splice(i, 1);
    } else if (btn.dataset.action === 'open-row') {
      currentRow = i;
      view = 'record';
    } else if (btn.dataset.action === 'delete-col') {
      if (!confirm(t('confirmDeleteColumn', { name: data.headers[i] }))) return;
      data.headers.splice(i, 1);
      data.rows.forEach((row) => row.splice(i, 1));
    }
    render();
    return;
  }

  const cell = e.target.closest('td.cell');
  if (cell) {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    startEdit(cell, data.rows[r][c], (v) => { data.rows[r][c] = v; });
    return;
  }

  const colName = e.target.closest('.col-name');
  if (colName) {
    const c = Number(colName.dataset.col);
    startEdit(colName, data.headers[c], (v) => { data.headers[c] = v; });
  }
});

els.dataTable.addEventListener('change', (e) => {
  const box = e.target.closest('input[type="checkbox"][data-action]');
  if (!box) return;
  if (box.dataset.action === 'select-all') {
    selected = box.checked ? new Set(data.rows) : new Set();
    renderData();
    return;
  }
  const row = data.rows[Number(box.dataset.index)];
  if (box.checked) selected.add(row);
  else selected.delete(row);
  box.closest('tr').classList.toggle('selected', box.checked);
  updateSelectionUI();
});

els.selectToggleBtn.addEventListener('click', () => {
  if (selecting) stopSelecting();
  else selecting = true;
  render();
});

els.deleteSelectedBtn.addEventListener('click', () => {
  if (!selected.size || !confirm(t('confirmDeleteRows', { n: selected.size }))) return;
  data.rows = data.rows.filter((row) => !selected.has(row));
  selected.clear();
  render();
});

els.recordTable.addEventListener('click', (e) => {
  const cell = e.target.closest('td, th');
  if (!cell || cell.classList.contains('editing')) return;
  const c = Number(cell.dataset.col);
  if (cell.tagName === 'TD') {
    const r = currentRow;
    startEdit(cell, data.rows[r][c], (v) => { data.rows[r][c] = v; });
  } else {
    startEdit(cell, data.headers[c], (v) => { data.headers[c] = v; });
  }
});

function goToRow(index) {
  currentRow = index;
  renderRecord();
}

els.prevRowBtn.addEventListener('click', () => goToRow(currentRow - 1));
els.nextRowBtn.addEventListener('click', () => goToRow(currentRow + 1));
els.rowNumber.addEventListener('change', () => {
  const n = parseInt(els.rowNumber.value, 10);
  goToRow(Number.isNaN(n) ? currentRow : n - 1);
});
els.rowNumber.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.rowNumber.dispatchEvent(new Event('change'));
});
els.deleteRecordBtn.addEventListener('click', () => {
  if (!confirm(t('confirmDeleteRow', { n: currentRow + 1 }))) return;
  selected.delete(data.rows[currentRow]);
  data.rows.splice(currentRow, 1);
  render();
});

// Arrow keys browse rows in record view, unless the user is typing.
document.addEventListener('keydown', (e) => {
  if (view !== 'record' || els.viewer.hidden) return;
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowLeft' && currentRow > 0) goToRow(currentRow - 1);
  if (e.key === 'ArrowRight' && currentRow < data.rows.length - 1) goToRow(currentRow + 1);
});

function setView(v) {
  view = v;
  render();
}

els.tableViewBtn.addEventListener('click', () => setView('table'));
els.recordViewBtn.addEventListener('click', () => setView('record'));

// ---------- Download ----------

els.downloadBtn.addEventListener('click', () => {
  const csv = toCSV(data.headers, data.rows, data.delimiter);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = data.name.replace(/\.[^.]*$/, '') + `-${t('editedSuffix')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Wiring ----------

els.fileInput.addEventListener('change', () => {
  readFile(els.fileInput.files[0]);
  els.fileInput.value = '';
});

els.hasHeader.addEventListener('change', refreshImport);
els.delimiter.addEventListener('change', refreshImport);
els.confirmImportBtn.addEventListener('click', confirmImport);
els.cancelImportBtn.addEventListener('click', () => {
  pending = null;
  show(data ? 'viewer' : 'dropzone');
});

els.resetBtn.addEventListener('click', () => {
  if (!confirm(t('confirmReset'))) return;
  data = null;
  stopSelecting();
  show('dropzone');
});

// Drag & drop anywhere on the page.
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragDepth++;
  document.body.classList.add('dragging');
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) document.body.classList.remove('dragging');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  readFile(e.dataTransfer.files[0]);
});

// ---------- Language ----------

initSite(() => {
  if (pending) refreshImport();
  if (data) render();
});

show('dropzone');
