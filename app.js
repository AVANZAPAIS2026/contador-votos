const electionState = {
  totalVotes: 128460,
  countedTables: 782,
  totalTables: 1240,
  participation: 64.8,
  blankVotes: 3.2,
  nullVotes: 1.7,
  invalidVotes: 0.8,
  candidates: [
    { name: 'Valentina Ríos', party: 'Movimiento Progreso', votes: 54230, color: '#e28748' },
    { name: 'Tomás Herrera', party: 'Futuro Común', votes: 42180, color: '#5b83bd' },
    { name: 'Camila Torres', party: 'Acuerdo Ciudadano', votes: 23510, color: '#c27b91' },
    { name: 'Julián Vega', party: 'Partido Nacional', votes: 8510, color: '#8b9b73' },
  ],
};

const elements = {
  totalVotes: document.querySelector('#total-votes'),
  votesThisMinute: document.querySelector('#votes-this-minute'),
  countedTables: document.querySelector('#counted-tables'),
  countedPercent: document.querySelector('#counted-percent'),
  countedProgress: document.querySelector('#counted-progress'),
  participation: document.querySelector('#participation'),
  blankVotes: document.querySelector('#blank-votes'),
  nullVotes: document.querySelector('#null-votes'),
  invalidVotes: document.querySelector('#invalid-votes'),
  resultsList: document.querySelector('#results-list'),
};

const formatNumber = (value) => new Intl.NumberFormat('es-CL').format(Math.round(value));

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
  const sortedCandidates = [...electionState.candidates].sort((a, b) => b.votes - a.votes);
  elements.resultsList.innerHTML = sortedCandidates.map((candidate, index) => {
    const percentage = (candidate.votes / electionState.totalVotes) * 100;
    return `
      <article class="candidate-row">
        <div class="candidate-rank">${String(index + 1).padStart(2, '0')}</div>
        <div>
          <div class="candidate-name">${candidate.name}</div>
          <div class="candidate-party">${candidate.party}</div>
        </div>
        <div class="bar-area" aria-label="${percentage.toFixed(1)}% de los votos">
          <div class="bar-fill" style="--candidate-color: ${candidate.color}; width: ${percentage}%"></div>
        </div>
        <div class="candidate-result">
          <div class="candidate-percent">${percentage.toFixed(1).replace('.', ',')}%</div>
          <div class="candidate-votes">${formatNumber(candidate.votes)} votos</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderSummary(newVotes = 0) {
  animateValue(elements.totalVotes, electionState.totalVotes);
  elements.votesThisMinute.textContent = `+${formatNumber(newVotes)}`;
  animateValue(elements.countedTables, electionState.countedTables);
  animateValue(elements.participation, electionState.participation, (value) => value.toFixed(1).replace('.', ','));
  animateValue(elements.blankVotes, electionState.blankVotes, (value) => `${value.toFixed(1).replace('.', ',')}`);
  animateValue(elements.nullVotes, electionState.nullVotes, (value) => `${value.toFixed(1).replace('.', ',')}`);
  animateValue(elements.invalidVotes, electionState.invalidVotes, (value) => `${value.toFixed(1).replace('.', ',')}`);
  const countedPercent = (electionState.countedTables / electionState.totalTables) * 100;
  elements.countedPercent.textContent = `${countedPercent.toFixed(1).replace('.', ',')}%`;
  elements.countedProgress.style.width = `${countedPercent}%`;
}

function render() {
  renderSummary();
  renderCandidates();
}

// Sustituir esta función por la suscripción a WebSocket, SSE o API.
function simulateIncomingVotes() {
  const newVotes = Math.floor(Math.random() * 150) + 40;
  const leadingCandidate = electionState.candidates[0];
  leadingCandidate.votes += Math.floor(newVotes * 0.42);
  electionState.candidates[1].votes += Math.floor(newVotes * 0.33);
  electionState.candidates[2].votes += Math.floor(newVotes * 0.18);
  electionState.candidates[3].votes += newVotes - Math.floor(newVotes * 0.42) - Math.floor(newVotes * 0.33) - Math.floor(newVotes * 0.18);
  electionState.totalVotes += newVotes;
  electionState.countedTables = Math.min(electionState.totalTables, electionState.countedTables + (Math.random() > 0.6 ? 1 : 0));
  electionState.participation = Math.min(100, electionState.participation + 0.01);
  electionState.blankVotes = Math.min(100, electionState.blankVotes + 0.01);
  electionState.nullVotes = Math.min(100, electionState.nullVotes + 0.01);
  electionState.invalidVotes = Math.min(100, electionState.invalidVotes + 0.005);
  renderSummary(newVotes);
  renderCandidates();
}

render();
setInterval(simulateIncomingVotes, 8000);
