// Feature 6: Time Travel Scrubber
// Compact horizontal bar at the top of #view for jumping through time.

const EPOCH = Date.UTC(2017, 0, 1); // ms

function dtToDate(dt) {
  return new Date(EPOCH + dt * 86400000);
}

function dateToDt(d) {
  return (d.getTime() - EPOCH) / 86400000;
}

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function formatDate(dt) {
  const d = dtToDate(dt);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function buildTimeScrubber(container, model) {
  const bar = document.createElement('div');
  bar.id = 'time-scrubber';

  // Buttons
  const yearBack  = makeBtn('◀', 'Year back');
  const monthBack = makeBtn('‹', 'Month back');
  const todayBtn  = makeBtn('⌂', 'Go to today');
  const display   = document.createElement('span');
  display.className = 'ts-date';
  const monthFwd  = makeBtn('›', 'Month forward');
  const yearFwd   = makeBtn('▶', 'Year forward');

  bar.appendChild(yearBack);
  bar.appendChild(monthBack);
  bar.appendChild(display);
  bar.appendChild(todayBtn);
  bar.appendChild(monthFwd);
  bar.appendChild(yearFwd);

  container.appendChild(bar);

  function refresh() {
    display.textContent = formatDate(model.state.DateTime || 0);
  }

  model.addEventListener('update', refresh);
  refresh();

  yearBack.addEventListener('click', () => {
    model.setState({ DateTime: (model.state.DateTime || 0) - 365.25 });
  });
  monthBack.addEventListener('click', () => {
    model.setState({ DateTime: (model.state.DateTime || 0) - 30 });
  });
  monthFwd.addEventListener('click', () => {
    model.setState({ DateTime: (model.state.DateTime || 0) + 30 });
  });
  yearFwd.addEventListener('click', () => {
    model.setState({ DateTime: (model.state.DateTime || 0) + 365.25 });
  });
  todayBtn.addEventListener('click', () => {
    model.setState({ DateTime: dateToDt(new Date()) });
  });
}

function makeBtn(label, title) {
  const b = document.createElement('button');
  b.className = 'ts-btn';
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  return b;
}
