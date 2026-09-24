// Release history, newest first. Each version is also the element id, so /changelog.html#v1.2.0 links to it.
// Change texts are keyed by language; languages without their own text show English.

const CHANGELOG = [
  {
    version: '1.5.0',
    date: '2026-09-24',
    changes: {
      en: [
        'Long cell values are cut off after four lines, so rows stay compact.',
        'Drag the line below a row to make it taller and see more of its content.',
        'Columns start as wide as their title and can be resized by dragging the line between them.',
      ],
      nl: [
        'Lange celwaarden worden na vier regels afgekapt, zodat rijen compact blijven.',
        'Sleep de lijn onder een rij omlaag om die hoger te maken en meer inhoud te zien.',
        'Kolommen zijn standaard zo breed als hun titel en je kunt ze breder of smaller slepen.',
      ],
    },
  },
  {
    version: '1.4.0',
    date: '2026-09-23',
    changes: {
      en: [
        'The start page explains what CSV Viewer does and answers frequently asked questions.',
        'New app icon, also when you add CSV Viewer to your home screen.',
        'Shared links now show a preview image.',
        'Footer links to the source code on GitHub.',
        'Friendly page for links that do not exist.',
      ],
      nl: [
        'De startpagina legt uit wat CSV Viewer doet en beantwoordt veelgestelde vragen.',
        'Nieuw app-icoon, ook als je CSV Viewer aan je beginscherm toevoegt.',
        'Gedeelde links tonen nu een voorbeeldafbeelding.',
        'Footer linkt naar de broncode op GitHub.',
        'Nette pagina voor links die niet bestaan.',
      ],
    },
  },
  {
    version: '1.3.0',
    date: '2026-09-23',
    changes: {
      en: [
        'New changelog page with the release history as a timeline.',
        'Footer with credits and a link to the changelog on every page.',
      ],
      nl: [
        'Nieuwe changelog-pagina met de versiegeschiedenis als tijdlijn.',
        'Footer met credits en een link naar de changelog op elke pagina.',
      ],
    },
  },
  {
    version: '1.2.0',
    date: '2026-09-23',
    changes: {
      en: [
        'Select rows with checkboxes and delete them in one go.',
        'Select all rows at once with the checkbox in the header.',
        'Deleting a single row now asks for confirmation.',
      ],
      nl: [
        'Rijen selecteren met selectievakjes en in één keer verwijderen.',
        'Alle rijen tegelijk selecteren met het vakje in de kop.',
        'Eén rij verwijderen vraagt nu eerst om bevestiging.',
      ],
    },
  },
  {
    version: '1.1.1',
    date: '2026-09-23',
    changes: {
      en: [
        'Row view is centered on the page.',
        'The table grows with its content; the page scrolls instead of the table.',
      ],
      nl: [
        'Rij-weergave staat gecentreerd op de pagina.',
        'De tabel groeit mee met de inhoud; de pagina scrollt in plaats van de tabel.',
      ],
    },
  },
  {
    version: '1.1.0',
    date: '2026-09-23',
    changes: {
      en: [
        'Interface available in 17 languages.',
        'Language is detected from the browser and can be changed in the top bar.',
        'Right-to-left layout for Arabic.',
        'Your language choice is remembered for next time.',
        'Fixed: the download and new-file buttons no longer show before a file is loaded.',
      ],
      nl: [
        'Interface beschikbaar in 17 talen.',
        'Taal wordt uit de browser gehaald en is te wijzigen in de topbalk.',
        'Rechts-naar-links opmaak voor Arabisch.',
        'Je taalkeuze wordt onthouden voor de volgende keer.',
        'Opgelost: de knoppen voor downloaden en nieuw bestand staan niet meer in beeld voordat een bestand is geladen.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-09-23',
    changes: {
      en: [
        'Open CSV files by drag and drop or file picker.',
        'Choose the delimiter and whether the first row holds column names.',
        'Edit cells and column names, delete rows and columns.',
        'Row view to browse one row at a time, with the arrow keys or by row number.',
        'Click a row number in the table to open that row.',
        'Download the edited file as CSV.',
      ],
      nl: [
        'CSV-bestanden openen via slepen of bestandskiezer.',
        'Scheidingsteken kiezen en aangeven of de eerste rij kolomnamen bevat.',
        'Cellen en kolomnamen bewerken, rijen en kolommen verwijderen.',
        'Rij-weergave om rij voor rij te bladeren, met de pijltjestoetsen of via het rijnummer.',
        'Klik op een rijnummer in de tabel om die rij te openen.',
        'Het bewerkte bestand downloaden als CSV.',
      ],
    },
  },
];

function renderChangelog() {
  const list = document.getElementById('timeline');
  const dateFormat = new Intl.DateTimeFormat(lang, { dateStyle: 'long' });
  list.replaceChildren();

  CHANGELOG.forEach((release, i) => {
    const item = document.createElement('li');
    item.className = 'release';
    item.id = `v${release.version}`;

    const head = document.createElement('div');
    head.className = 'release-head';
    const version = document.createElement('a');
    version.className = 'release-version';
    version.href = `#${item.id}`;
    version.textContent = `v${release.version}`;
    head.appendChild(version);
    if (i === 0) {
      const latest = document.createElement('span');
      latest.className = 'release-latest';
      latest.textContent = t('latest');
      head.appendChild(latest);
    }
    const date = document.createElement('time');
    date.className = 'muted';
    date.dateTime = release.date;
    date.textContent = dateFormat.format(new Date(`${release.date}T00:00:00`));
    head.appendChild(date);

    const changes = document.createElement('ul');
    for (const text of release.changes[lang] || release.changes.en) {
      changes.appendChild(document.createElement('li')).textContent = text;
    }

    item.append(head, changes);
    list.appendChild(item);
  });
}

initSite(renderChangelog);
renderChangelog();
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
