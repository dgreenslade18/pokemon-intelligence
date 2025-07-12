# Deployment Guide - API-Based Pokemon Card Price Analyzer

## Overview

This application has been converted from Python to pure TypeScript/JavaScript to work seamlessly with Vercel and other modern hosting platforms. It now uses:

- **eBay API** for sold items data (with web scraping fallback)
- **Pokemon TCG API** for card information and pricing
- **Price Charting** web scraping for additional price data
- **Server-Sent Events** for real-time progress updates

## Prerequisites

### 1. eBay Developer Account

1. Go to [eBay Developers Program](https://developer.ebay.com/)
2. Sign up for a free developer account
3. Create an application to get your credentials

### 2. Getting eBay API Credentials

1. Log into your eBay Developer account
2. Go to [My Account > Application Keys](https://developer.ebay.com/my/keys)
3. Create a new application or select an existing one
4. You'll need:
   - **App ID** (Client ID)
   - **Access Token** (you can generate this from the developer console)

### 3. OAuth Token Generation

For production use, you'll need to set up OAuth 2.0:

```bash
# Get a client credentials token (for public data)
curl -X POST 'https://api.ebay.com/identity/v1/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Authorization: Basic <base64(client_id:client_secret)>' \
  -d 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add EBAY_APP_ID
   vercel env add EBAY_ACCESS_TOKEN
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Manual Vercel Deploy

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `EBAY_APP_ID`
   - `EBAY_ACCESS_TOKEN`
4. Deploy

### Option 3: Other Platforms

The application will work on any Node.js hosting platform:

- **Netlify**: Add environment variables in site settings
- **Railway**: Set environment variables in project settings
- **DigitalOcean App Platform**: Configure via app spec
- **AWS Lambda**: Use environment variables in function config

## Environment Variables

Create a `.env.local` file for local development:

```env
EBAY_APP_ID=your_app_id_here
EBAY_ACCESS_TOKEN=your_access_token_here
```

## Features & Fallbacks

### 1. eBay Integration

- **Primary**: eBay Browse API for accurate, real-time data
- **Fallback**: Web scraping if API credentials are not available
- **Data**: Live pricing from eBay UK marketplace

### 2. Pokemon TCG API

- **Direct API**: No authentication required
- **Data**: Card information, set details, TCG Player pricing
- **Fallback**: Default pricing if API is unavailable

### 3. Price Charting

- **Web Scraping**: Extracts pricing data from pricecharting.com
- **Currency**: Automatically converts USD to GBP
- **Fallback**: Default pricing if scraping fails

## Testing the Deployment

1. **Health Check**
   ```bash
   curl https://your-app.vercel.app/api/script7 \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"searchTerm": "Charizard", "streamProgress": false}'
   ```

2. **Streaming Test**
   ```bash
   curl https://your-app.vercel.app/api/script7 \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"searchTerm": "Pikachu", "streamProgress": true}'
   ```

## Performance Optimizations

### 1. Caching

- Pokemon TCG API responses are cached for 1 hour
- Consider adding Redis for extended caching

### 2. Rate Limiting

- eBay API has rate limits (typically 1000 calls/day for free accounts)
- Implement request throttling if needed

### 3. Error Handling

- Graceful fallbacks for all external APIs
- Proper error messages for users
- Logging for debugging

## Monitoring & Maintenance

### 1. API Health

Monitor these endpoints:
- `https://api.ebay.com/buy/browse/v1/item_summary/search`
- `https://api.pokemontcg.io/v2/cards`
- `https://www.pricecharting.com/search-products`

### 2. Logs

Check Vercel function logs for:
- API call failures
- Rate limit hits
- Parsing errors

### 3. Performance

Monitor:
- Response times
- Memory usage
- Function execution time

## Troubleshooting

### Common Issues

1. **eBay API 401 Errors**
   - Check if access token is valid
   - Regenerate token if expired
   - Verify app credentials

2. **No Results Returned**
   - Check if search terms are valid
   - Verify API endpoints are accessible
   - Check for rate limiting

3. **Slow Performance**
   - APIs run in parallel by default
   - Consider adding request timeouts
   - Implement caching layer

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed console logs for API calls and responses.

## Migration from Python Version

The new TypeScript version maintains the same API interface:

- Same request/response format
- Same streaming progress updates
- Same data structure
- Improved reliability and performance

## Next Steps

1. **Enhanced eBay Integration**: Use Marketplace Insights API for sold items data
2. **Caching Layer**: Add Redis for improved performance
3. **Rate Limiting**: Implement request quotas
4. **Analytics**: Add usage tracking
5. **UI Improvements**: Enhanced progress indicators
6. **Mobile Optimization**: Responsive design updates

## Support

For issues or questions:
1. Check the Vercel deployment logs
2. Verify API credentials are correct
3. Test individual API endpoints
4. Review error messages in browser dev tools 