#!/usr/bin/env node

/**
 * eBay OAuth Token Generator
 * 
 * This script helps you generate eBay API access tokens.
 * Run: node scripts/generate-ebay-token.js
 */

const https = require('https');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function generateClientCredentialsToken(appId, certId) {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');
    
    const data = 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope';
    
    const options = {
      hostname: 'api.ebay.com',
      path: '/identity/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`Token generation failed: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  log('🛒 eBay OAuth Token Generator', colors.bright + colors.blue);
  log('================================\n');
  
  log('You need your eBay App credentials from:', colors.yellow);
  log('https://developer.ebay.com/my/keys\n');
  
  // In a real implementation, you'd prompt for input
  // For now, show instructions
  log('Steps to get your token:', colors.bright);
  log('1. Go to https://developer.ebay.com/my/keys');
  log('2. Copy your App ID (Client ID)');
  log('3. Copy your Client Secret (Cert ID)');
  log('4. Either use the built-in token generator OR');
  log('5. Run this script with your credentials\n');
  
  log('Example usage:', colors.green);
  log('EBAY_APP_ID=your_app_id EBAY_CERT_ID=your_cert_id node scripts/generate-ebay-token.js\n');
  
  // Check if credentials are provided via environment
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  
  if (appId && certId) {
    log('Generating token...', colors.yellow);
    try {
      const token = await generateClientCredentialsToken(appId, certId);
      log('\n✅ Success! Your access token:', colors.green);
      log(`${token}\n`, colors.bright);
      log('Add this to your .env.local file:', colors.blue);
      log(`EBAY_APP_ID=${appId}`);
      log(`EBAY_ACCESS_TOKEN=${token}\n`);
      log('⚠️  Note: This token expires in 2 hours for client credentials flow', colors.yellow);
    } catch (error) {
      log(`❌ Error generating token: ${error.message}`, colors.red);
    }
  } else {
    log('💡 Tip: For production, you may want to implement the Authorization Code flow', colors.blue);
    log('   for longer-lasting tokens. The client credentials flow tokens expire in 2 hours.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateClientCredentialsToken }; 