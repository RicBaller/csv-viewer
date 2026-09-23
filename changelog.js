// Release history, newest first. Each version is also the element id, so /changelog.html#v1.2.0 links to it.
// Change texts are keyed by language; languages without their own text show English.

const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-09-23',
    changes: {
      en: [
        'Footer with credits on every page.',
        'New changelog page with the release history as a timeline.',
      ],
      nl: [
        'Footer met credits op elke pagina.',
        'Nieuwe changelog-pagina met de versiegeschiedenis als tijdlijn.',
      ],
    },
  },
  {
    version: '1.2.0',
    date: '2026-09-23',
    changes: {
      en: [
        'Select rows with checkboxes and delete them in one go.',
        'Deleting a single row now asks for confirmation.',
      ],
      nl: [
        'Rijen selecteren met selectievakjes en in één keer verwijderen.',
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
      ],
      nl: [
        'Interface beschikbaar in 17 talen.',
        'Taal wordt uit de browser gehaald en is te wijzigen in de topbalk.',
        'Rechts-naar-links opmaak voor Arabisch.',
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
        'Row view to browse one row at a time.',
        'Download the edited file as CSV.',
      ],
      nl: [
        'CSV-bestanden openen via slepen of bestandskiezer.',
        'Scheidingsteken kiezen en aangeven of de eerste rij kolomnamen bevat.',
        'Cellen en kolomnamen bewerken, rijen en kolommen verwijderen.',
        'Rij-weergave om rij voor rij te bladeren.',
        'Bewerkte bestand downloaden als CSV.',
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
