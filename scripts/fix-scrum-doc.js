const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'documentation', 'ScumDevelopmentProcess.md');

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');
const originalLength = content.length;

// Sprint renumbering based on chronological dates
// The entries after line 1000 are out of order and need fixing

const replacements = [
  // Line 5503: Sep 8-11 should be Sprint 19
  { from: '### Sprint 15 (Sep 8 - Sep 11, 2025)', to: '### Sprint 19 (Sep 8 - Sep 11, 2025)' },
  // Line 5615: Sep 11 should be Sprint 20
  { from: '### Sprint 16 (Sep 11, 2025)', to: '### Sprint 20 (Sep 11, 2025)' },
  // Line 5714: Sep 12-13 should be Sprint 21
  { from: '### Sprint 22 (Sep 12 - Sep 13, 2025)', to: '### Sprint 21 (Sep 12 - Sep 13, 2025)' },
  // Line 5970: Sep 15 should be Sprint 22
  { from: '### Sprint 14 (Sep 15, 2025 - Current)', to: '### Sprint 22 (Sep 15, 2025) [COMPLETED]' },
  // Line 6062: Sep 16-17 should be Sprint 23
  { from: '### Sprint 24 (Sep 16-17, 2025)', to: '### Sprint 23 (Sep 16-17, 2025) [COMPLETED]' },
  // Line 6295: Oct 2 should be Sprint 24
  { from: '### Sprint 17 (Oct 2, 2025) [COMPLETED]', to: '### Sprint 24 (Oct 2, 2025) [COMPLETED]' },
  // Line 6395: Oct 3 should be Sprint 25
  { from: '### Sprint 18 (Oct 3, 2025) [COMPLETED]', to: '### Sprint 25 (Oct 3, 2025) [COMPLETED]' },
  // Line 6601: Oct 3 Extension stays as Extension of Sprint 25
  { from: '### Sprint 18 Extension (Oct 3, 2025) [COMPLETED]', to: '### Sprint 25 Extension (Oct 3, 2025) [COMPLETED]' },
  // Line 6823: Oct 3 should be Sprint 26
  { from: '### Sprint 19 (Oct 3, 2025) [COMPLETED]', to: '### Sprint 26 (Oct 3, 2025) [COMPLETED]' },
  // Line 7127: Oct 4 should be Sprint 27
  { from: '### Sprint 20 (Oct 4, 2025) [COMPLETED]', to: '### Sprint 27 (Oct 4, 2025) [COMPLETED]' },
  // Line 1162: Oct 10-14 should be Sprint 28
  { from: '### Sprint 17 (Oct 10 - Oct 14, 2025) [COMPLETED]', to: '### Sprint 28 (Oct 10 - Oct 14, 2025) [COMPLETED]' },
  // Line 7481: Oct 15 should be Sprint 29
  { from: '### Sprint 21 (Oct 15, 2025) [COMPLETED]', to: '### Sprint 29 (Oct 15, 2025) [COMPLETED]' },
  // Line 7683: Oct 15 should be Sprint 30
  { from: '### Sprint 22 (Oct 15, 2025) [COMPLETED]', to: '### Sprint 30 (Oct 15, 2025) [COMPLETED]' },
  // Line 8108: Oct 16 should be Sprint 31
  { from: '### Sprint 23 (Oct 16, 2025) [COMPLETED]', to: '### Sprint 31 (Oct 16, 2025) [COMPLETED]' },
  // Line 1543: Nov 5-9 should be Sprint 32
  { from: '### Sprint 18 (Nov 5 - Nov 9, 2025) [COMPLETED]', to: '### Sprint 32 (Nov 5 - Nov 9, 2025) [COMPLETED]' },
  // Line 3833: Nov 19-23 should be Sprint 33
  { from: '### Sprint 19 (Nov 19 - Nov 23, 2025) [COMPLETED]', to: '### Sprint 33 (Nov 19 - Nov 23, 2025) [COMPLETED]' },
  // Line 4286: Nov 19-21 should be Sprint 34
  { from: '### Sprint 22 (Nov 19 - Nov 21, 2025) [IN PROGRESS]', to: '### Sprint 34 (Nov 19 - Nov 21, 2025) [COMPLETED]' },
  // Line 1917: Nov 20-25 should be Sprint 35
  { from: '### Sprint 25 (Nov 20 - Nov 25, 2025) [COMPLETED]', to: '### Sprint 35 (Nov 20 - Nov 25, 2025) [COMPLETED]' },
  // Line 3282: Nov 24 should be Sprint 36
  { from: '### Sprint 19 (Nov 24, 2025) [IN PROGRESS]', to: '### Sprint 36 (Nov 24, 2025) [COMPLETED]' },
  // Line 8628: Nov 25 should be Sprint 37
  { from: '### Sprint 24 (Nov 25, 2025) [COMPLETED]', to: '### Sprint 37 (Nov 25, 2025) [COMPLETED]' },
];

let replacementCount = 0;
replacements.forEach(({ from, to }) => {
  if (content.includes(from)) {
    content = content.replace(from, to);
    console.log(`Replaced: "${from}" -> "${to}"`);
    replacementCount++;
  } else {
    console.log(`NOT FOUND: "${from}"`);
  }
});

console.log(`\\nTotal replacements made: ${replacementCount}`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved!');

