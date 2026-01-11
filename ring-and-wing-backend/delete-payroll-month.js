/*
  Safe payroll cleanup script (for TEST data only).

  Usage (PowerShell):
    $env:MONGODB_URI="<your MongoDB URI>"
    node delete-payroll-month.js --month 2026-01 --dry-run
    node delete-payroll-month.js --month 2026-01 --confirm YES_DELETE

  Notes:
  - Deletes Payroll documents whose payrollPeriod falls within the given month (UTC).
  - Defaults to dry-run unless you pass --confirm YES_DELETE.
*/

const mongoose = require('mongoose');
const Payroll = require('./models/Payroll');

// Load local .env if present (prevents pasting credentials into terminal history)
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch {
  // dotenv is optional; script can still run if env vars are already set
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parseMonth(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new Error('Invalid --month. Use YYYY-MM (e.g., 2026-01).');
  }
  const [yearStr, monthStr2] = monthStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr2);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error('Invalid --month. Use YYYY-MM (e.g., 2026-01).');
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // exclusive
  return { start, end };
}

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing env var MONGO_URI (or MONGODB_URI). Refusing to run.');
  }

  const month = getArgValue('--month');
  const confirm = getArgValue('--confirm');
  const dryRun = hasFlag('--dry-run') || confirm !== 'YES_DELETE';

  const { start, end } = parseMonth(month);

  await mongoose.connect(mongoUri);

  const filter = {
    payrollPeriod: { $gte: start, $lt: end }
  };

  const count = await Payroll.countDocuments(filter);
  console.log(`[payroll-cleanup] Month: ${month}`);
  console.log(`[payroll-cleanup] Matching Payroll docs: ${count}`);

  if (dryRun) {
    console.log('[payroll-cleanup] Dry-run mode: no deletions performed.');
    return;
  }

  const result = await Payroll.deleteMany(filter);
  console.log(`[payroll-cleanup] Deleted Payroll docs: ${result.deletedCount ?? 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[payroll-cleanup] Error:', err?.message || err);
    process.exit(1);
  });
