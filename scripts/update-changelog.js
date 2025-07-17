#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// This script helps generate changelog entries from git commits
// Run with: node scripts/update-changelog.js

const changelogTemplate = `// Auto-generated changelog entries
// Run this script after significant commits to update the changelog

const recentChanges = [
  // Add new entries here based on git commits
  // Format: {
  //   version: 'v2.x.x',
  //   date: 'YYYY-MM-DD',
  //   title: 'Brief title',
  //   description: 'Detailed description of the change',
  //   type: 'feature|improvement|fix|performance',
  //   icon: '🎉'
  // }
];

// Copy this to WhatsNewModal.tsx changelog array
console.log('\\n=== Recent Changes ===');
recentChanges.forEach(change => {
  console.log(\`
  {
    version: '\${change.version}',
    date: '\${change.date}',
    title: '\${change.title}',
    description: '\${change.description}',
    type: '\${change.type}',
    icon: '\${change.icon}'
  },\`);
});

console.log('\\n=== Instructions ===');
console.log('1. Copy the entries above to src/components/WhatsNewModal.tsx');
console.log('2. Update the changelog array with the new entries');
console.log('3. Test the modal by clicking "What\'s New" in the user dropdown');
`;

// Write the template to a file
const outputPath = path.join(__dirname, 'changelog-template.js');
fs.writeFileSync(outputPath, changelogTemplate);

console.log('✅ Changelog template created at scripts/changelog-template.js');
console.log('📝 Edit the template with your recent changes, then copy to WhatsNewModal.tsx'); 