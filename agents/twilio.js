/**
 * Twilio Agent
 * Sends scoreboard images via MMS to a configured phone number
 */

import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const recipientPhone = process.env.RECIPIENT_PHONE_NUMBER;

let client = null;

/**
 * Get or create Twilio client
 * @returns {twilio.Twilio}
 */
function getClient() {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

/**
 * Send scoreboard image via MMS
 * @param {string} imageUrl - Public URL of the image (must be accessible by Twilio)
 * @param {string} message - Optional text message to include
 * @param {string} toPhone - Override recipient phone (optional)
 * @returns {Promise<object>} - Twilio message response
 */
export async function sendScoreboardImage(imageUrl, message = '', toPhone = null) {
  const client = getClient();

  const to = toPhone || recipientPhone;
  if (!to) {
    throw new Error('No recipient phone number. Set RECIPIENT_PHONE_NUMBER or pass toPhone');
  }

  if (!twilioPhone) {
    throw new Error('No Twilio phone number. Set TWILIO_PHONE_NUMBER');
  }

  console.log(`Sending scoreboard image to ${to}...`);

  const messageOptions = {
    from: twilioPhone,
    to: to,
    mediaUrl: [imageUrl],
  };

  if (message) {
    messageOptions.body = message;
  }

  try {
    const result = await client.messages.create(messageOptions);
    console.log(`Message sent successfully. SID: ${result.sid}`);
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
    };
  } catch (error) {
    console.error(`Failed to send message: ${error.message}`);
    throw error;
  }
}

/**
 * Send a text-only message (no image)
 * @param {string} message - Text message to send
 * @param {string} toPhone - Override recipient phone (optional)
 * @returns {Promise<object>} - Twilio message response
 */
export async function sendTextMessage(message, toPhone = null) {
  const client = getClient();

  const to = toPhone || recipientPhone;
  if (!to) {
    throw new Error('No recipient phone number. Set RECIPIENT_PHONE_NUMBER or pass toPhone');
  }

  if (!twilioPhone) {
    throw new Error('No Twilio phone number. Set TWILIO_PHONE_NUMBER');
  }

  console.log(`Sending text message to ${to}...`);

  try {
    const result = await client.messages.create({
      from: twilioPhone,
      to: to,
      body: message,
    });
    console.log(`Message sent successfully. SID: ${result.sid}`);
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
    };
  } catch (error) {
    console.error(`Failed to send message: ${error.message}`);
    throw error;
  }
}

/**
 * Validate Twilio configuration
 * @returns {object} - Validation result
 */
export function validateConfig() {
  const issues = [];

  if (!accountSid) issues.push('TWILIO_ACCOUNT_SID not set');
  if (!authToken) issues.push('TWILIO_AUTH_TOKEN not set');
  if (!twilioPhone) issues.push('TWILIO_PHONE_NUMBER not set');
  if (!recipientPhone) issues.push('RECIPIENT_PHONE_NUMBER not set');

  return {
    valid: issues.length === 0,
    issues,
  };
}

// CLI: Test sending a message
if (process.argv[1] && process.argv[1].includes('twilio.js')) {
  const validation = validateConfig();
  if (!validation.valid) {
    console.log('Twilio configuration issues:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
    process.exit(1);
  }

  const testImageUrl = process.argv[2];
  if (testImageUrl) {
    sendScoreboardImage(testImageUrl, 'Test scoreboard from CLI')
      .then(result => console.log('Result:', result))
      .catch(err => console.error('Error:', err.message));
  } else {
    console.log('Usage: node agents/twilio.js <image_url>');
    console.log('Config validation passed ✓');
  }
}
