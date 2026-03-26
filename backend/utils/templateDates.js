/**
 * Template-based date validation helpers
 *
 * Weekend pack  → check-in must be Friday, check-out must be Sunday (3 days)
 * Business pack → both days must fall Mon–Fri, no weekend overlap
 * Standard      → any dates, future only, end after start
 */

const DAY = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

/**
 * Determine pack type from template name (case-insensitive substring match).
 * Returns 'weekend' | 'business' | 'standard'
 */
function packTypeFromName(templateName) {
  if (!templateName) return 'standard';
  const n = templateName.toLowerCase();
  if (n.includes('уикенд') || n.includes('weekend')) return 'weekend';
  if (n.includes('бизнес') || n.includes('business')) return 'business';
  return 'standard';
}

/**
 * Returns true if the date range [start, end) contains any Saturday or Sunday.
 */
function rangeOverlapsWeekend(start, end) {
  const cur = new Date(start);
  while (cur < end) {
    const d = cur.getDay();
    if (d === DAY.SAT || d === DAY.SUN) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

/**
 * Main validation function.
 *
 * @param {string} startDateStr  ISO date string  e.g. '2025-01-10'
 * @param {string} endDateStr    ISO date string  e.g. '2025-01-12'
 * @param {string} templateName  Template name from DB  e.g. 'Уикенд'
 * @returns {{ valid: boolean, errors: Array<{field:string, message:string}> }}
 */
function validateTemplateDates(startDateStr, endDateStr, templateName) {
  const errors = [];

  function parseLocal(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const start = parseLocal(startDateStr);
  const end   = parseLocal(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Basic sanity checks ────────────────────────────────────────────────────
  if (isNaN(start.getTime())) {
    errors.push({ field: 'start_date', message: 'Невалидна начална дата' });
  }
  if (isNaN(end.getTime())) {
    errors.push({ field: 'end_date', message: 'Невалидна крайна дата' });
  }
  if (errors.length) return { valid: false, errors };

  if (start < today) {
    errors.push({ field: 'start_date', message: 'Началната дата не може да бъде в миналото' });
  }
  if (end <= start) {
    errors.push({ field: 'end_date', message: 'Крайната дата трябва да е след началната' });
  }
  if (errors.length) return { valid: false, errors };

  // ── Pack-specific rules ────────────────────────────────────────────────────
  const pack = packTypeFromName(templateName);

  if (pack === 'weekend') {
    if (start.getDay() !== DAY.FRI) {
      errors.push({
        field: 'start_date',
        message: 'Уикенд пакетът трябва да започва в петък'
      });
    }
    if (end.getDay() !== DAY.SUN) {
      errors.push({
        field: 'end_date',
        message: 'Уикенд пакетът трябва да завършва в неделя'
      });
    }
    const days = Math.round((end - start) / 86400000);
    if (days < 2) {
      errors.push({
        field: 'end_date',
        message: 'Уикенд пакетът изисква минимум 2 нощувки (пет–нед)'
      });
    }
  }

  if (pack === 'business') {
    if (start.getDay() === DAY.SAT || start.getDay() === DAY.SUN) {
      errors.push({
        field: 'start_date',
        message: 'Бизнес пакетът трябва да започва в работен ден (пон–пет)'
      });
    }
    if (end.getDay() === DAY.SAT || end.getDay() === DAY.SUN) {
      errors.push({
        field: 'end_date',
        message: 'Бизнес пакетът трябва да завършва в работен ден (пон–пет)'
      });
    }
    if (rangeOverlapsWeekend(start, end)) {
      errors.push({
        field: 'end_date',
        message: 'Бизнес пакетът не може да включва събота или неделя'
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateTemplateDates, packTypeFromName };
