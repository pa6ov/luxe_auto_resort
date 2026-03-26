/**
 * Tests for backend/utils/templateDates.js
 * Run with:  node backend/utils/templateDates.test.js
 */

const { validateTemplateDates } = require('./templateDates');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a YYYY-MM-DD string that is `daysFromNow` days in the future.
 * Uses local noon to stay on the correct calendar day regardless of timezone.
 */
function futureDate(daysFromNow) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the next occurrence of a weekday (0=Sun … 6=Sat), at least 1 day
 * from today.  Uses local noon to avoid timezone getDay() drift.
 */
function nextWeekday(dayOfWeek) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  // minimum 1 day ahead so we never land on "today"
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add n calendar days to a YYYY-MM-DD string.
 * Parses at local noon to stay on the correct day across DST boundaries.
 */
function addDays(dateStr, n) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d, 12, 0, 0);
  date.setDate(date.getDate() + n);
  const yr  = date.getFullYear();
  const mon = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${yr}-${mon}-${day}`;
}

// ── Standard pack ─────────────────────────────────────────────────────────────

console.log('\nStandard pack');

test('accepts any weekday range in the future', () => {
  const mon = nextWeekday(1);
  const wed = addDays(mon, 2);
  const r = validateTemplateDates(mon, wed, null);
  assert(r.valid, JSON.stringify(r.errors));
});

test('rejects past start date', () => {
  const r = validateTemplateDates('2020-01-01', '2020-01-05', null);
  assert(!r.valid);
  assert(r.errors.some(e => e.field === 'start_date'));
});

test('rejects end before start', () => {
  const mon = nextWeekday(1);
  const r = validateTemplateDates(mon, addDays(mon, -1), null);
  assert(!r.valid);
  assert(r.errors.some(e => e.field === 'end_date'));
});

// ── Weekend pack ──────────────────────────────────────────────────────────────

console.log('\nWeekend pack (Уикенд)');

test('accepts Friday-to-Sunday', () => {
  const fri = nextWeekday(5);
  const sun = addDays(fri, 2);
  const r = validateTemplateDates(fri, sun, 'Уикенд');
  assert(r.valid, JSON.stringify(r.errors));
});

test('rejects Monday start', () => {
  const mon = nextWeekday(1);
  const wed = addDays(mon, 2);
  const r = validateTemplateDates(mon, wed, 'Уикенд');
  assert(!r.valid);
  assert(r.errors.some(e => e.field === 'start_date' && e.message.includes('петък')));
});

test('rejects Friday to Saturday (not Sunday)', () => {
  const fri = nextWeekday(5);
  const sat = addDays(fri, 1);
  const r = validateTemplateDates(fri, sat, 'Уикенд');
  assert(!r.valid);
  assert(r.errors.some(e => e.field === 'end_date' && e.message.includes('неделя')));
});

test('rejects Friday to Friday (too short)', () => {
  const fri = nextWeekday(5);
  const nextFri = addDays(fri, 7);
  const r = validateTemplateDates(fri, nextFri, 'Уикенд');
  // end is a Friday, not Sunday → invalid
  assert(!r.valid);
});

// ── Business pack ─────────────────────────────────────────────────────────────

console.log('\nBusiness pack (Бизнес)');

test('accepts Monday-to-Friday', () => {
  const mon = nextWeekday(1);
  const fri = addDays(mon, 4);
  const r = validateTemplateDates(mon, fri, 'Бизнес');
  assert(r.valid, JSON.stringify(r.errors));
});

test('rejects Saturday start', () => {
  const sat = nextWeekday(6);
  const mon = addDays(sat, 2);
  const r = validateTemplateDates(sat, mon, 'Бизнес');
  assert(!r.valid);
  assert(r.errors.some(e => e.field === 'start_date' && e.message.includes('работен')));
});

test('rejects range that spans a weekend', () => {
  const fri = nextWeekday(5);
  const mon = addDays(fri, 3); // fri → mon crosses sat+sun
  const r = validateTemplateDates(fri, mon, 'Бизнес');
  assert(!r.valid);
  assert(r.errors.some(e => e.message.includes('събота')));
});

test('accepts Monday-to-Wednesday (no weekend overlap)', () => {
  const mon = nextWeekday(1);
  const wed = addDays(mon, 2);
  const r = validateTemplateDates(mon, wed, 'Бизнес');
  assert(r.valid, JSON.stringify(r.errors));
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
