const $ = (id) => document.getElementById(id);

const els = {
  dropzone: $('dropzone'),
  about: $('about'),
  fileInput: $('fileInput'),
  emptyFileBtn: $('emptyFileBtn'),
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
  addRowBtn: $('addRowBtn'),
  addRecordBtn: $('addRecordBtn'),
  addColumnBtn: $('addColumnBtn'),
  headerToggle: $('headerToggle'),
};

// File waiting in the import panel.
let pending = null; // { name, text, rows, customNames }

// Loaded data.
// { name, delimiter, headers: string[], rows: string[][], widths: px[] set by dragging,
//   hasHeader: headers are a row of the file (else generated names), isNew: started empty }
let data = null;

// Active view of the loaded data: 'table' or 'record' (one row at a time).
let view = 'table';
let currentRow = 0; // zero-based index shown in record view

// Row selection for bulk delete. Holds row arrays, so indices can shift without breaking it.
let selecting = false;
let selected = new Set();

// Table rows start clipped to a few lines; dragging a row's bottom edge sets its
// maximum cell height in px. Keyed by row array, like the selection.
const rowHeights = new WeakMap();
const RESIZE_EDGE = 5; // px around a row or column border that starts a resize
const MIN_ROW_HEIGHT = 21; // one line of text
// Columns start as wide as their title, within these bounds, until dragged.
const MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 320;
const HEADER_CHROME = 80; // cell padding, border, gaps, insert and delete buttons around the title
let justResized = false; // swallows the click that ends a resize drag
const measureCtx = document.createElement('canvas').getContext('2d');

const PREVIEW_ROWS = 5;

function show(section) {
  els.dropzone.hidden = section !== 'dropzone';
  els.about.hidden = section !== 'dropzone';
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
  openData({
    name: pending.name,
    delimiter: els.delimiter.value,
    headers: importHeaders(),
    rows: pending.rows.slice(hasHeader ? 1 : 0),
    widths: [],
    hasHeader,
  });
  pending = null;
}

// Starts a new file with one column and one empty row, and opens that cell for editing.
function startEmptyFile() {
  openData({
    name: `${t('untitled')}.csv`,
    delimiter: ',',
    headers: [t('column', { n: 1 })],
    rows: [['']],
    widths: [],
    hasHeader: true,
    isNew: true,
  });
  const cell = view === 'record'
    ? els.recordTable.querySelector('td[data-col="0"]')
    : els.dataTable.querySelector('td.cell[data-row="0"][data-col="0"]');
  startEdit(cell, '', (v) => { data.rows[0][0] = v; });
}

function openData(newData) {
  data = newData;
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

function iconButton(className, text, title, action, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.title = title;
  btn.textContent = text;
  btn.dataset.action = action;
  btn.dataset.index = index;
  return btn;
}

const deleteButton = (title, action, index) => iconButton('delete', '×', title, action, index);

function insertButton(title, action, index) {
  const btn = iconButton('insert', '+', title, action, index);
  btn.setAttribute('aria-haspopup', 'menu');
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
    // Without a header row the bar keeps only the column controls, no names.
    if (data.hasHeader) {
      name.textContent = h;
      name.title = h;
    }
    name.dataset.col = c;
    inner.append(name, insertButton(t('insertColumn'), 'insert-col-menu', c), deleteButton(t('deleteColumn'), 'delete-col', c));
    th.appendChild(inner);
    headRow.appendChild(th);
  });
  // Placeholder column at the end: clicking it adds a real column.
  const ghostHead = document.createElement('th');
  ghostHead.className = 'ghost-col';
  ghostHead.textContent = `+ ${t('newColumn')}`;
  headRow.appendChild(ghostHead);

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
    num.append(deleteButton(t('deleteRow'), 'delete-row', r), insertButton(t('insertRow'), 'insert-row-menu', r), open);
    const height = rowHeights.get(row);
    if (height) tr.style.setProperty('--cell-max', `${height}px`);
    row.forEach((value, c) => {
      const td = tr.insertCell();
      td.className = 'cell';
      td.dataset.row = r;
      td.dataset.col = c;
      const content = document.createElement('div');
      content.className = 'cell-content';
      content.textContent = value;
      td.appendChild(content);
    });
    const ghostCell = tr.insertCell();
    ghostCell.className = 'ghost-col';
    ghostCell.dataset.row = r;
  });

  // Placeholder row at the bottom: clicking it adds a real row.
  const tfoot = document.createElement('tfoot');
  if (data.headers.length) {
    const ghost = tfoot.insertRow();
    ghost.className = 'ghost';
    const plus = ghost.insertCell();
    plus.className = 'rownum';
    plus.textContent = '+';
    data.headers.forEach((_, c) => {
      const td = ghost.insertCell();
      td.dataset.col = c;
      if (c === 0) td.textContent = t('newRow');
    });
    ghost.insertCell();
  }

  els.dataTable.replaceChildren(thead, tbody, tfoot);
  sizeColumns(headRow);
  updateSelectionUI();
}

// Gives each column its dragged width, or one that fits its title.
function sizeColumns(headRow) {
  const cells = [...headRow.cells].slice(1, data.headers.length + 1);
  if (!cells.length) return;
  const style = getComputedStyle(cells[0]);
  measureCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  cells.forEach((th, c) => {
    const fit = Math.ceil(measureCtx.measureText(data.hasHeader ? data.headers[c] : '').width) + HEADER_CHROME;
    const width = data.widths[c] ?? Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, fit));
    th.style.width = `${width}px`;
  });
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
      th.append(num, document.createTextNode(data.hasHeader ? h : ''));
      tr.appendChild(th);
      const td = tr.insertCell();
      td.dataset.col = c;
      td.textContent = data.rows[currentRow][c];
    });
  }
  els.recordTable.replaceChildren(tbody);
}

// Without a header row, columns get position names (not shown, but used in messages like the delete confirmation).
function genericHeaders() {
  return data.headers.map((_, i) => t('column', { n: i + 1 }));
}

// Turns the header row into the first data row, or the first data row into the header row.
function setHasHeader(on) {
  if (on === data.hasHeader) return;
  if (on) {
    if (!data.rows.length) return;
    const first = data.rows.shift();
    selected.delete(first);
    data.headers = first;
    currentRow = Math.max(currentRow - 1, 0);
  } else {
    data.rows.unshift(data.headers);
    currentRow++;
  }
  data.hasHeader = on;
  render();
}

function render() {
  closeInsertMenu();
  if (!data.hasHeader) data.headers = genericHeaders();
  els.headerToggle.checked = data.hasHeader;
  els.headerToggle.disabled = !data.hasHeader && !data.rows.length;
  const isRecord = view === 'record';
  els.tableView.hidden = isRecord;
  els.recordView.hidden = !isRecord;
  els.tableTools.hidden = isRecord;
  els.viewer.classList.toggle('record-mode', isRecord);
  els.dataTable.classList.toggle('no-header', !data.hasHeader);
  els.recordTable.classList.toggle('no-header', !data.hasHeader);
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

// Returns the border under the pointer: { col } for a column's end border,
// { tr } for a row's bottom border, or null. Columns win at a corner.
function resizeAt(e) {
  const cell = e.target.closest('th, td');
  if (!cell || cell.classList.contains('editing')) return null;
  const rect = cell.getBoundingClientRect();
  const rtl = document.documentElement.dir === 'rtl';
  const toEnd = rtl ? e.clientX - rect.left : rect.right - e.clientX;
  const toStart = rtl ? rect.right - e.clientX : e.clientX - rect.left;
  const colCell = toEnd <= RESIZE_EDGE ? cell : toStart <= RESIZE_EDGE ? cell.previousElementSibling : null;
  if (colCell && colCell.cellIndex > 0 && colCell.cellIndex <= data.headers.length) return { col: colCell.cellIndex - 1 };

  if (cell.tagName !== 'TD' || !cell.closest('tbody')) return null;
  const tr = cell.parentElement;
  if (rect.bottom - e.clientY <= RESIZE_EDGE) return { tr };
  if (e.clientY - rect.top <= RESIZE_EDGE && tr.previousElementSibling) return { tr: tr.previousElementSibling };
  return null;
}

// Tracks a drag from pointerdown until release; onMove gets the distance moved.
function dragResize(e, cursor, onMove) {
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  const rtl = document.documentElement.dir === 'rtl';
  const move = (ev) => onMove((rtl ? -1 : 1) * (ev.clientX - startX), ev.clientY - startY);
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('resizing', cursor);
    justResized = true;
    setTimeout(() => { justResized = false; });
  };
  document.body.classList.add('resizing', cursor);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

els.dataTable.addEventListener('pointermove', (e) => {
  if (e.buttons) return;
  const target = resizeAt(e);
  els.dataTable.classList.toggle('col-resize', target?.col !== undefined);
  els.dataTable.classList.toggle('row-resize', !!target?.tr);
});

els.dataTable.addEventListener('pointerdown', (e) => {
  const target = e.button === 0 && resizeAt(e);
  if (!target) return;

  if (target.tr) {
    const { tr } = target;
    const row = data.rows[tr.sectionRowIndex];
    const contents = [...tr.querySelectorAll('.cell-content')];
    const startHeight = Math.max(MIN_ROW_HEIGHT, ...contents.map((el) => el.offsetHeight));
    dragResize(e, 'row-resize', (dx, dy) => {
      const height = Math.max(MIN_ROW_HEIGHT, Math.round(startHeight + dy));
      rowHeights.set(row, height);
      tr.style.setProperty('--cell-max', `${height}px`);
    });
    return;
  }

  const { col } = target;
  const th = els.dataTable.tHead.rows[0].cells[col + 1];
  const startWidth = th.offsetWidth;
  dragResize(e, 'col-resize', (dx) => {
    const width = Math.max(MIN_COL_WIDTH, Math.round(startWidth + dx));
    data.widths[col] = width;
    th.style.width = `${width}px`;
  });
});

els.dataTable.addEventListener('click', (e) => {
  if (justResized) return;
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    const i = Number(btn.dataset.index);
    if (btn.dataset.action === 'delete-row') {
      if (!confirm(t('confirmDeleteRow', { n: i + 1 }))) return;
      selected.delete(data.rows[i]);
      data.rows.splice(i, 1);
    } else if (btn.dataset.action === 'insert-row-menu') {
      toggleInsertMenu(btn, [['insertAbove', () => addRow(i)], ['insertBelow', () => addRow(i + 1)]]);
      return;
    } else if (btn.dataset.action === 'insert-col-menu') {
      // Left and right follow the screen, so they swap places in the column order for RTL.
      const rtl = document.documentElement.dir === 'rtl';
      toggleInsertMenu(btn, [['insertLeft', () => addColumn(rtl ? i + 1 : i)], ['insertRight', () => addColumn(rtl ? i : i + 1)]]);
      return;
    } else if (btn.dataset.action === 'open-row') {
      currentRow = i;
      view = 'record';
    } else if (btn.dataset.action === 'delete-col') {
      if (!confirm(t('confirmDeleteColumn', { name: data.headers[i] }))) return;
      data.headers.splice(i, 1);
      data.widths.splice(i, 1);
      data.rows.forEach((row) => row.splice(i, 1));
    }
    render();
    return;
  }

  const ghostCol = e.target.closest('.ghost-col');
  if (ghostCol) {
    addColumn(data.headers.length, ghostCol.dataset.row === undefined ? -1 : Number(ghostCol.dataset.row));
    return;
  }

  if (e.target.closest('tr.ghost')) {
    addRow(data.rows.length, Number(e.target.closest('td').dataset.col ?? 0));
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
  if (colName && data.hasHeader) {
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
    if (data.hasHeader) startEdit(cell, data.headers[c], (v) => { data.headers[c] = v; });
  }
});

// ---------- Adding rows ----------

// Inserts an empty row at index, then opens its cell in column c for editing.
function addRow(index, c = 0) {
  data.rows.splice(index, 0, data.headers.map(() => ''));
  if (view === 'record') currentRow = index;
  render();
  const cell = view === 'record'
    ? els.recordTable.querySelector(`td[data-col="${c}"]`)
    : els.dataTable.querySelector(`td.cell[data-row="${index}"][data-col="${c}"]`);
  if (!cell) return;
  cell.scrollIntoView({ block: 'nearest' });
  startEdit(cell, '', (v) => { data.rows[index][c] = v; });
}

// Inserts an empty column at index. Opens the cell in row r for editing, or the column name when r is -1.
function addColumn(index, r = -1) {
  data.headers.splice(index, 0, t('column', { n: index + 1 }));
  data.widths.splice(index, 0, undefined);
  data.rows.forEach((row) => row.splice(index, 0, ''));
  render();
  // Without a header row there is no name to edit, so edit the first cell instead.
  if (r < 0 && !data.hasHeader) {
    if (!data.rows.length) return;
    r = 0;
  }
  const el = r < 0
    ? els.dataTable.querySelector(`.col-name[data-col="${index}"]`)
    : els.dataTable.querySelector(`td.cell[data-row="${r}"][data-col="${index}"]`);
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (r < 0) startEdit(el, data.headers[index], (v) => { data.headers[index] = v; });
  else startEdit(el, '', (v) => { data.rows[r][index] = v; });
}

// Menu under a row's or column's + button. Items are [translation key, action] pairs.
const insertMenu = document.createElement('div');
insertMenu.className = 'insert-menu';
insertMenu.setAttribute('role', 'menu');
insertMenu.hidden = true;
document.body.appendChild(insertMenu);
let menuButton = null; // + button the open menu belongs to
let menuActions = [];

function toggleInsertMenu(btn, items) {
  const wasOpen = menuButton === btn;
  closeInsertMenu();
  if (wasOpen) return;
  menuButton = btn;
  menuActions = items.map(([, action]) => action);
  btn.setAttribute('aria-expanded', 'true');
  insertMenu.replaceChildren(...items.map(([key], i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'secondary';
    item.setAttribute('role', 'menuitem');
    item.textContent = t(key);
    item.dataset.index = i;
    return item;
  }));
  insertMenu.hidden = false;
  const rect = btn.getBoundingClientRect();
  const rtl = document.documentElement.dir === 'rtl';
  insertMenu.style.top = `${rect.bottom + 4}px`;
  insertMenu.style.left = `${rtl ? rect.right - insertMenu.offsetWidth : rect.left}px`;
  insertMenu.firstChild.focus();
}

function closeInsertMenu() {
  if (!menuButton) return;
  menuButton.removeAttribute('aria-expanded');
  menuButton = null;
  insertMenu.hidden = true;
}

insertMenu.addEventListener('click', (e) => {
  const item = e.target.closest('button');
  if (item) menuActions[Number(item.dataset.index)]();
});

document.addEventListener('pointerdown', (e) => {
  if (menuButton && !insertMenu.contains(e.target) && e.target !== menuButton) closeInsertMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuButton) {
    menuButton.focus();
    closeInsertMenu();
  }
});
window.addEventListener('scroll', closeInsertMenu, true);

els.addRowBtn.addEventListener('click', () => addRow(data.rows.length));
els.addRecordBtn.addEventListener('click', () => addRow(data.rows.length));
els.addColumnBtn.addEventListener('click', () => addColumn(data.headers.length));

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

els.headerToggle.addEventListener('change', () => setHasHeader(els.headerToggle.checked));
els.tableViewBtn.addEventListener('click', () => setView('table'));
els.recordViewBtn.addEventListener('click', () => setView('record'));

// ---------- Download ----------

els.downloadBtn.addEventListener('click', () => {
  const csv = data.hasHeader ? toCSV(data.headers, data.rows, data.delimiter) : toCSV(data.rows[0] || [], data.rows.slice(1), data.delimiter);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = data.isNew ? data.name : data.name.replace(/\.[^.]*$/, '') + `-${t('editedSuffix')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Wiring ----------

els.fileInput.addEventListener('change', () => {
  readFile(els.fileInput.files[0]);
  els.fileInput.value = '';
});

els.emptyFileBtn.addEventListener('click', startEmptyFile);
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
