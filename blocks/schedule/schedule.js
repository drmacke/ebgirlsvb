export default async function decorate(block) {
  const source = 'https://main--ebgirlsvb--drmacke.aem.live/schedule.json';

  try {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`Schedule request failed: ${response.status}`);
    }

    const json = await response.json();
    const games = json.data || [];

    block.innerHTML = '';

    if (!games.length) {
      block.innerHTML = '<p class="schedule-empty">No games scheduled.</p>';
      return;
    }

    const schedule = document.createElement('div');
    schedule.className = 'schedule-list';

    games.forEach((game) => {
      schedule.append(renderGame(game));
    });

    block.append(schedule);
  } catch (error) {
    console.error('Unable to load volleyball schedule', error);

    block.innerHTML = `
      <p class="schedule-error">
        Unable to load the volleyball schedule.
      </p>
    `;
  }
}

function renderGame(game) {
  const card = document.createElement('article');
  card.className = 'schedule-game';

  const date = game.Date || '';
  const opponent = game.Opponent || '';
  const location = game.Location || '';
  const jvTime = game['JV time'] || '';
  const varsityTime = game['Varsity Time'] || '';

  const jvSets = getSets(game, 'JV');
  const varsitySets = getSets(game, 'V');

  const jvResult = calculateResult(jvSets);
  const varsityResult = calculateResult(varsitySets);

  card.innerHTML = `
    <div class="schedule-date">
      ${escapeHtml(formatDate(date))}
    </div>

    <div class="schedule-opponent">
      <span class="schedule-home-away">
        ${escapeHtml(location)}
      </span>
      <h3>${escapeHtml(opponent)}</h3>
    </div>

    <div class="schedule-level">
      ${renderGameLevel('JV', jvTime, jvSets, jvResult)}
      ${renderGameLevel('Varsity', varsityTime, varsitySets, varsityResult)}
    </div>
  `;

  return card;
}

function renderGameLevel(level, time, sets, result) {
  if (!sets.length) {
    return `
      <div class="schedule-row">
        <div class="schedule-team">
          ${level}
        </div>
        <div class="schedule-time">
          ${escapeHtml(time)}
        </div>
      </div>
    `;
  }

  const scoreDisplay = sets
    .map((set) => escapeHtml(set))
    .join(' · ');

  const resultClass = result.startsWith('W') ? 'w' : 'l';

  return `
    <div class="schedule-row schedule-final">
      <div class="schedule-team">
        <strong>${level}</strong>
        <span class="schedule-result ${resultClass}">
          ${escapeHtml(result)}
        </span>
      </div>

      <div class="schedule-score">
        ${scoreDisplay}
      </div>
    </div>
  `;
}

function getSets(game, level) {
  const sets = [];

  for (let i = 1; i <= 5; i += 1) {
    let value = '';

    if (level === 'JV') {
      value = game[`JV Set ${i}`] || '';
    } else {
      value = game[`V Set ${i}`] || '';
    }

    if (String(value).trim()) {
      sets.push(String(value).trim());
    }
  }

  return sets;
}

function calculateResult(sets) {
  if (!sets.length) {
    return '';
  }

  let teamWins = 0;
  let opponentWins = 0;

  sets.forEach((score) => {
    const match = score.match(/^(\d+)\s*[-:]\s*(\d+)$/);

    if (!match) {
      return;
    }

    const teamScore = Number(match[1]);
    const opponentScore = Number(match[2]);

    if (teamScore > opponentScore) {
      teamWins += 1;
    } else if (opponentScore > teamScore) {
      opponentWins += 1;
    }
  });

  if (teamWins > opponentWins) {
    return `W ${teamWins}-${opponentWins}`;
  }

  if (opponentWins > teamWins) {
    return `L ${teamWins}-${opponentWins}`;
  }

  return '';
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
