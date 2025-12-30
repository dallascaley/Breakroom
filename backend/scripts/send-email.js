/**
 * CLI script to send system emails from the database
 *
 * Usage: node scripts/send-email.js [email_key] [destination]
 *
 * Parameters:
 *   email_key   - The key of the email template in system_emails table (default: signup_verification)
 *   destination - The recipient email address (default: dallascaley@gmail.com)
 *
 * Examples:
 *   node scripts/send-email.js
 *   node scripts/send-email.js signup_verification
 *   node scripts/send-email.js signup_verification user@example.com
 *
 * Run this from the backend directory.
 */

require('dotenv').config();

const { getClient } = require('../utilities/db');
const { sendMail } = require('../utilities/aws-ses-email');

const DEFAULT_EMAIL_KEY = 'signup_verification';
const DEFAULT_DESTINATION = 'dallascaley@gmail.com';

async function sendSystemEmail(emailKey, destination) {
  console.log('=== Send System Email ===');
  console.log(`Email Key: ${emailKey}`);
  console.log(`Destination: ${destination}`);
  console.log('');

  const client = await getClient();

  try {
    // Fetch the email template from database
    const result = await client.query(
      'SELECT email_key, from_address, subject, html_content, description FROM system_emails WHERE email_key = $1 AND is_active = true',
      [emailKey]
    );

    if (result.rowCount === 0) {
      console.error(`Error: No active email template found with key "${emailKey}"`);
      console.log('\nAvailable email templates:');

      const allEmails = await client.query('SELECT email_key, description, is_active FROM system_emails');
      if (allEmails.rowCount > 0) {
        allEmails.rows.forEach(row => {
          const status = row.is_active ? 'active' : 'inactive';
          console.log(`  - ${row.email_key} (${status}): ${row.description || 'No description'}`);
        });
      } else {
        console.log('  No email templates found in database.');
      }

      client.release();
      process.exit(1);
    }

    const { from_address, subject, html_content, description } = result.rows[0];

    console.log(`Template: ${description || 'No description'}`);
    console.log(`From: ${from_address}`);
    console.log(`Subject: ${subject}`);
    console.log('');

    // Replace any placeholders with test values
    let processedContent = html_content;

    // Replace common placeholders with test values for preview
    processedContent = processedContent.replace(/\{\{verification_token\}\}/g, 'TEST-TOKEN-12345');
    processedContent = processedContent.replace(/\{\{first_name\}\}/g, 'Test');
    processedContent = processedContent.replace(/\{\{last_name\}\}/g, 'User');
    processedContent = processedContent.replace(/\{\{handle\}\}/g, 'testuser');

    console.log('Sending email...');
    const sendResult = await sendMail(destination, from_address, subject, processedContent);

    if (sendResult.status === 200) {
      console.log(`\nSuccess! ${sendResult.message}`);
    } else {
      console.error(`\nFailed: ${sendResult.message}`);
    }

    client.release();
    return sendResult;

  } catch (err) {
    console.error('Error:', err.message);
    client.release();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const emailKey = args[0] || DEFAULT_EMAIL_KEY;
const destination = args[1] || DEFAULT_DESTINATION;

sendSystemEmail(emailKey, destination)
  .then(() => {
    console.log('\nScript finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
