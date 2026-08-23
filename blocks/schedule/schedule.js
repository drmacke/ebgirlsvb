export default async function decorate(block) {
  // The block should contain the URL to your DA.live sheet.
  // Example authored content:
  //
  // | Schedule URL |
  // | https://content.da.live/myorg/mysite/volleyball-schedule.json |
  //
  const source = block.querySelector('a')?.href || block.textContent.trim();

  if (!source) {
    block.textContent = 'Schedule data source not configured.';
    return;
  }

  try {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`Schedule request failed: ${response.status}`);
    }

    const json = await response.json();

    // DA.live sheets are generally returned with the rows in `data`.
    const rows = json.data || [];

    if (!rows.length) {
      block.innerHTML = '<p class="schedule-empty">No games scheduled.</p>';
      return;
    }

    // Clear the authored block content.
    block.innerHTML = '';

    const schedule = document.createElement('div');
    schedule.className = 'schedule-list';

    rows.forEach((game) => {
      const card = renderGame(game);
      schedule.append(card);
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

/**
 * Render one game.
 *
 * Expected sheet columns:
 * Date
 * Opponent
 * Location
 * JV Time
 * Varsity Time
 * JV Set 1
 * JV Set 2
 * JV Set 3
 * JV Set 4
 * JV Set 5
 * Varsity Set 1
 * Varsity Set 2
 * Varsity Set 3
 * Varsity Set 4
 * Varsity Set 5
 *
 * Each set should contain the score like:
 * 25-18
 */

function renderGame(game) {
  const card = document.createElement('article');
  card.className = 'schedule-game';

  const date = game.Date || game.date || '';
  const opponent = game.Opponent || game.opponent || '';
  const location = game.Location || game.location || '';
  const jvTime = game['JV Time'] || game.jvTime || '';
  const varsityTime = game['Varsity Time'] || game.varsityTime || '';

  const jvSets = getSets(game, 'JV');
  const varsitySets = getSets(game, 'Varsity');

  const jvResult = calculateResult(jvSets);
  const varsityResult = calculateResult(varsitySets);

  card.innerHTML = `
    <div class="schedule-date">
      ${escapeHtml(date)}
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
  // No score yet.
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

  return `
    <div class="schedule-row schedule-final">
      <div class="schedule-team">
        <strong>${level}</strong>
        <span class="schedule-result ${result.toLowerCase()}">
          ${result}
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
    const key = `${level} Set ${i}`;

    const value =
      game[key] ??
      game[`${level.toLowerCase()}Set${i}`] ??
      '';

    if (String(value).trim()) {
      sets.push(String(value).trim());
    }
  }

  return sets;
}

/**
 * Takes scores such as:
 *
 * 25-18
 * 20-25
 * 25-17
 * 22-25
 * 15-12
 *
 * and determines W/L.
 */
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
