// Planetary Hours Widget — compact collapsible panel showing today's
// Chaldean planetary hours with current hour highlighted.
//
// Exported: buildPlanetaryHoursWidget(container, model)

import {
  computeTodayHours,
  getCurrentHour,
  fmtTime,
  CHALDEAN_SYMBOLS,
  CHALDEAN_COLORS,
} from '../core/planetaryHours.js';

const EPOCH = Date.UTC(2017, 0, 1);

export function buildPlanetaryHoursWidget(container, model) {
  const widget = document.createElement('div');
  widget.id = 'planetary-hours-widget';
  widget.className = 'ph-widget ph-collapsed';
  container.appendChild(widget);

  let _hours       = [];
  let _collapsed   = true;
  let _lastDateKey = null;  // 'YYYY-MM-DD' string, used to detect day changes
  let _tickTimer   = null;

  // ── Build / refresh hours for current day ─────────────────────────────
  function refreshHours() {
    const { hours } = computeTodayHours(model);
    _hours = hours;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    if (!_hours.length) return;
    const cur = getCurrentHour(_hours);
    if (!cur) return;

    if (_collapsed) {
      // Collapsed: symbol + end time + expand arrow
      widget.innerHTML = `
        <button class="ph-collapsed-btn" id="ph-toggle" type="button" title="Planetary Hours">
          <span class="ph-cur-sym" style="color:${cur.color}">${cur.symbol}</span>
          <span class="ph-cur-planet" style="color:${cur.color}">${capitalize(cur.planet)}</span>
          <span class="ph-until">until ${fmtTime(cur.end)} UTC</span>
          <span class="ph-arrow">▼</span>
        </button>
      `;
    } else {
      // Expanded: header + full schedule list
      const rowsHtml = _hours.map((h) => {
        const isNow = h === cur;
        return `<div class="ph-hour-row${isNow ? ' ph-hour-current' : ''}" style="border-left:2px solid ${h.color}22">
          <span class="ph-hr-sym" style="color:${h.color}">${h.symbol}</span>
          <span class="ph-hr-name" style="color:${isNow ? h.color : ''}">${capitalize(h.planet)}</span>
          <span class="ph-hr-time">${fmtTime(h.start)}</span>
          <span class="ph-hr-sep">–</span>
          <span class="ph-hr-end">${fmtTime(h.end)}</span>
          ${h.isDay ? '<span class="ph-hr-tag ph-day">day</span>' : '<span class="ph-hr-tag ph-night">night</span>'}
        </div>`;
      }).join('');

      widget.innerHTML = `
        <div class="ph-header">
          <span class="ph-cur-sym ph-hdr-sym" style="color:${cur.color}">${cur.symbol}</span>
          <span class="ph-hdr-title" style="color:${cur.color}">${capitalize(cur.planet)} Hour</span>
          <button class="ph-close-btn" id="ph-toggle" type="button" title="Collapse">▲</button>
        </div>
        <div class="ph-cur-until">Until ${fmtTime(cur.end)} UTC</div>
        <div class="ph-divider"></div>
        <div class="ph-schedule-label">Today's hours</div>
        <div class="ph-schedule" id="ph-schedule">${rowsHtml}</div>
      `;

      // Scroll current row into view
      requestAnimationFrame(() => {
        const curRow = widget.querySelector('.ph-hour-current');
        if (curRow) curRow.scrollIntoView({ block: 'nearest' });
      });
    }

    // Wire toggle
    const toggleBtn = widget.querySelector('#ph-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _collapsed = !_collapsed;
        widget.classList.toggle('ph-collapsed', _collapsed);
        widget.classList.toggle('ph-expanded', !_collapsed);
        render();
      });
    }
  }

  // ── Tick every 30 s to update "until" time ─────────────────────────────
  function startTick() {
    if (_tickTimer) clearInterval(_tickTimer);
    _tickTimer = setInterval(() => {
      render();
    }, 30000);
  }

  // ── Day-change detection ───────────────────────────────────────────────
  function currentDateKey() {
    const dt = model.state.DateTime || 0;
    const d  = new Date(EPOCH + dt * 86400000);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  }

  model.addEventListener('update', () => {
    const key = currentDateKey();
    if (key !== _lastDateKey) {
      _lastDateKey = key;
      refreshHours();
      render();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────
  refreshHours();
  render();
  startTick();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
