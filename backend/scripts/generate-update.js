/**
 * CLI script to generate a breakroom update from a git commit
 *
 * Usage: node scripts/generate-update.js [commit_hash] [summary]
 *
 * Parameters:
 *   commit_hash - Git commit hash (default: latest commit)
 *   summary     - Update summary text (required, max 1000 chars)
 *
 * Examples:
 *   node scripts/generate-update.js abc123 "Added new chat features with emoji support"
 *   node scripts/generate-update.js HEAD "Fixed bug in user authentication flow"
 *   node scripts/generate-update.js --list  (shows recent updates)
 *
 * This script is meant to be run manually after significant commits.
 */

require('dotenv').config();

const { getClient } = require('../utilities/db');

const MAX_SUMMARY_LENGTH = 1000;

async function listRecentUpdates() {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT id, commit_hash, LEFT(summary, 80) as summary_preview, created_at
       FROM breakroom_updates
       ORDER BY created_at DESC
       LIMIT 10`
    );

    console.log('=== Recent Breakroom Updates ===\n');

    if (result.rowCount === 0) {
      console.log('No updates found.');
    } else {
      result.rows.forEach((row, index) => {
        const date = new Date(row.created_at).toLocaleString();
        const hash = row.commit_hash || 'N/A';
        console.log(`${index + 1}. [${date}] ${hash.substring(0, 7)}`);
        console.log(`   ${row.summary_preview}${row.summary_preview.length >= 80 ? '...' : ''}`);
        console.log('');
      });
    }

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
    client.release();
    process.exit(1);
  }
}

async function generateUpdate(commitHash, summary) {
  console.log('=== Generate Breakroom Update ===');
  console.log(`Commit: ${commitHash || 'N/A'}`);
  console.log(`Summary length: ${summary.length} chars`);
  console.log('');

  if (summary.length > MAX_SUMMARY_LENGTH) {
    console.error(`Error: Summary exceeds ${MAX_SUMMARY_LENGTH} characters (${summary.length})`);
    process.exit(1);
  }

  if (summary.length < 10) {
    console.error('Error: Summary too short (minimum 10 characters)');
    process.exit(1);
  }

  const client = await getClient();

  try {
    // Check if commit already has an update
    if (commitHash) {
      const existing = await client.query(
        'SELECT id FROM breakroom_updates WHERE commit_hash = $1',
        [commitHash]
      );

      if (existing.rowCount > 0) {
        console.error(`Error: An update already exists for commit ${commitHash}`);
        client.release();
        process.exit(1);
      }
    }

    // Insert the update
    await client.query(
      'INSERT INTO breakroom_updates (commit_hash, summary) VALUES ($1, $2)',
      [commitHash || null, summary]
    );

    console.log('Update created successfully!');
    console.log('');
    console.log('Summary:');
    console.log(summary);

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
    client.release();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args[0] === '--list' || args[0] === '-l') {
  listRecentUpdates()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
} else if (args.length < 2) {
  console.log('Usage: node scripts/generate-update.js [commit_hash] [summary]');
  console.log('       node scripts/generate-update.js --list');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/generate-update.js abc123 "Added new chat features"');
  console.log('  node scripts/generate-update.js HEAD "Fixed authentication bug"');
  console.log('  node scripts/generate-update.js --list');
  process.exit(1);
} else {
  const commitHash = args[0] === 'null' ? null : args[0];
  const summary = args.slice(1).join(' ');

  generateUpdate(commitHash, summary)
    .then(() => {
      console.log('\nScript finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}
