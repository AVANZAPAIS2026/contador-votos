const SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuscYuojiaUcryghz1mhpwEinXhGp9QtIv9u_HrzIlpo1LOSAfqU2jfk-ZRdExDMOU5l9i2tVfGq5R/pub';
const RESULTS_SHEET_GID = 257000309;
const TABLE_SHEET_GIDS = [613666229, 854994891, 279078735, 1215162400];
const TOTAL_TABLES = 422;
const REFRESH_INTERVAL = 60000;
const CANDIDATE_PARTIES = {
  'Javier Diez': 'Renovación Popular',
  'Alberto Tejada': 'Acción Popular',
  'Willy Soriano': 'PPC',
  'Roberth Montoya': 'Avanza País',
  'Gina Casanova': 'Somos Perú',
  'Edgar Núñez': 'Libertad Popular',
  'Juan Pilco': 'APRA',
  'Joel Miranda': 'ADP',
};

const electionState = {
  totalVotes: 0,
  countedTables: 0,
  totalTables: TOTAL_TABLES,
  blankVotes: 0,
  nullAndInvalidVotes: 0,
  candidates: [],
};

const elements = {
  totalVotes: document.querySelector('#total-votes'),
  countedTables: document.querySelector('#counted-tables'),
  countedPercent: document.querySelector('#counted-percent'),
  countedProgress: document.querySelector('#counted-progress'),
  blankVotes: document.querySelector('#blank-votes'),
  nullAndInvalidVotes: document.querySelector('#null-invalid-votes'),
  resultsList: document.querySelector('#results-list'),
  dataStatus: document.querySelector('#data-status'),
};

const formatNumber = (value) => new Intl.NumberFormat('es-CL').format(Math.round(value));
const formatPercentage = (value) => `${value.toFixed(1).replace('.', ',')}%`;

function parseVotes(value) {
  const parsedValue = Number.parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function parseSheet(text) {
  const rows = text.trim().split(/\r?\n/).map((row) => row.split('\t').map((cell) => cell.trim()));
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.toUpperCase() === 'BLANCO')
    && row.some((cell) => cell.toUpperCase() === 'N/V')
    && row.some((cell) => cell.toUpperCase() === 'TOTAL'));

  if (headerIndex < 0) throw new Error('No se encontró el encabezado de resultados.');

  const headers = rows[headerIndex];
  const blankIndex = headers.findIndex((cell) => cell.toUpperCase() === 'BLANCO');
  const nullAndInvalidIndex = headers.findIndex((cell) => cell.toUpperCase() === 'N/V');
  const totalIndex = headers.findIndex((cell) => cell.toUpperCase() === 'TOTAL');
  const totalRow = rows.find((row, index) => index > headerIndex && row.some((cell) => cell.toUpperCase() === 'TOTAL'));
  const pollingPlaceRows = rows.filter((row, index) => index > headerIndex && /^\d+$/.test(row[0] || ''));
  const voteAt = (row, index) => parseVotes(row[index] || '0');
  const aggregateVotes = (index) => totalRow
    ? voteAt(totalRow, index)
    : pollingPlaceRows.reduce((sum, row) => sum + voteAt(row, index), 0);

  const totalVotes = totalRow
    ? voteAt(totalRow, totalIndex)
    : pollingPlaceRows.reduce((sum, row) => sum + voteAt(row, totalIndex), 0);

  const candidates = headers.slice(2, blankIndex).map((name, index) => ({
    name,
    votes: aggregateVotes(index + 2),
    color: index % 2 === 0 ? '#ff007e' : '#0041a7',
  }));

  candidates.push(
    { name: 'BLANCO', votes: aggregateVotes(blankIndex), color: '#ff007e', description: 'Votos en blanco' },
    { name: 'N/V', votes: aggregateVotes(nullAndInvalidIndex), color: '#0041a7', description: 'Votos nulos o viciados' },
  );

  return {
    totalVotes,
    blankVotes: aggregateVotes(blankIndex),
    nullAndInvalidVotes: aggregateVotes(nullAndInvalidIndex),
    candidates,
  };
}

function findCompletedTableNumbers(text) {
  const rows = text.split(/\r?\n/).map((row) => row.split('\t').map((cell) => cell.trim()));
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.toUpperCase() === 'N° DE MESA')
    && row.some((cell) => cell.toUpperCase() === 'TOTAL'));

  if (headerIndex < 0) throw new Error('No se encontró el encabezado de mesas.');

  const totalIndex = rows[headerIndex].findIndex((cell) => cell.toUpperCase() === 'TOTAL');
  return rows.slice(headerIndex + 1)
    .filter((row) => /^\d+$/.test(row[0] || '') && parseVotes(row[totalIndex] || '0') > 0)
    .map((row) => row[0]);
}

function animateValue(element, nextValue, formatter = formatNumber) {
  const currentValue = Number(element.dataset.value || 0);
  const duration = 700;
  const startTime = performance.now();

  element.dataset.value = nextValue;
  element.classList.remove('number-update');
  void element.offsetWidth;
  element.classList.add('number-update');

  function tick(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const displayedValue = currentValue + (nextValue - currentValue) * easedProgress;
    element.textContent = formatter(displayedValue);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function renderCandidates() {
  const previousPositions = new Map([...elements.resultsList.querySelectorAll('.candidate-row')]
    .map((row) => [row.dataset.candidateName, row.getBoundingClientRect().top]));
  const sortedCandidates = [...electionState.candidates].sort((first, second) => second.votes - first.votes);

  elements.resultsList.innerHTML = sortedCandidates.map((candidate, index) => {
    const percentage = electionState.totalVotes ? (candidate.votes / electionState.totalVotes) * 100 : 0;
    const candidateName = escapeHtml(candidate.name);
    const description = escapeHtml(candidate.description || CANDIDATE_PARTIES[candidate.name] || 'Candidato');
    return `
      <article class="candidate-row" data-candidate-name="${candidateName}">
        <div class="candidate-rank">${String(index + 1).padStart(2, '0')}</div>
        <div>
          <div class="candidate-name">${candidateName}</div>
          <div class="candidate-party">${description}</div>
        </div>
        <div class="bar-area" aria-label="${formatPercentage(percentage)} de los votos">
          <div class="bar-fill" style="--candidate-color: ${candidate.color}; width: ${percentage}%"></div>
        </div>
        <div class="candidate-result">
          <div class="candidate-percent">${formatPercentage(percentage)}</div>
          <div class="candidate-votes">${formatNumber(candidate.votes)} votos</div>
        </div>
      </article>
    `;
  }).join('');

  if (!previousPositions.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const row of elements.resultsList.querySelectorAll('.candidate-row')) {
    const previousTop = previousPositions.get(row.dataset.candidateName);
    if (previousTop === undefined) continue;

    const verticalOffset = previousTop - row.getBoundingClientRect().top;
    if (Math.abs(verticalOffset) < 1) continue;

    row.animate(
      [{ transform: `translateY(${verticalOffset}px)` }, { transform: 'translateY(0)' }],
      { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }
}

function renderSummary() {
  animateValue(elements.totalVotes, electionState.totalVotes);
  animateValue(elements.countedTables, electionState.countedTables);
  animateValue(elements.blankVotes, electionState.blankVotes);
  animateValue(elements.nullAndInvalidVotes, electionState.nullAndInvalidVotes);

  const countedPercent = Math.min((electionState.countedTables / electionState.totalTables) * 100, 100);
  elements.countedPercent.textContent = formatPercentage(countedPercent);
  elements.countedProgress.style.width = `${countedPercent}%`;
  elements.countedProgress.parentElement.setAttribute('aria-valuenow', String(electionState.countedTables));
}

function render() {
  renderSummary();
  renderCandidates();
}

async function loadResults() {
  try {
    const responses = await Promise.all([
      fetch(`${SHEET_BASE_URL}?gid=${RESULTS_SHEET_GID}&single=true&output=tsv`, { cache: 'no-store' }),
      ...TABLE_SHEET_GIDS.map((gid) => fetch(`${SHEET_BASE_URL}?gid=${gid}&single=true&output=tsv`, { cache: 'no-store' })),
    ]);
    const failedResponse = responses.find((response) => !response.ok);
    if (failedResponse) throw new Error(`Una hoja respondió con estado ${failedResponse.status}.`);

    const [resultsText, ...tableSheetTexts] = await Promise.all(responses.map((response) => response.text()));
    const completedTables = new Set(tableSheetTexts.flatMap(findCompletedTableNumbers));
    if (completedTables.size > electionState.totalTables) throw new Error('El conteo de mesas supera las 422 actas esperadas.');

    Object.assign(electionState, parseSheet(resultsText), { countedTables: completedTables.size });
    render();
    elements.dataStatus.textContent = `Datos actualizados: ${new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' }).format(new Date())}`;
  } catch (error) {
    elements.dataStatus.textContent = electionState.candidates.length
      ? 'No se pudo actualizar. Se conservan los últimos datos cargados.'
      : 'No se pudieron cargar los resultados. Verifica tu conexión y vuelve a intentar.';
    console.error('Error al cargar resultados desde Google Sheets:', error);
  }
}

elements.dataStatus.textContent = 'Cargando resultados...';
loadResults();
setInterval(loadResults, REFRESH_INTERVAL);
