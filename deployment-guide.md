# Deployment Guide

## RECOMMENDED: Python-Friendly Deployment Options

### 1. Railway (Recommended) ⭐
Railway supports Python + Next.js out of the box with minimal configuration.

**Why Railway is better:**
- ✅ Keeps your existing Python backend unchanged
- ✅ Real eBay and Price Charting data (no mocking needed)
- ✅ Generous free tier
- ✅ Simple configuration
- ✅ Auto-deploys from Git

**Setup:**
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables:
   - `RAPIDAPI_KEY` - Your RapidAPI key
   - `NODE_ENV` - `production`
4. Deploy! Railway will auto-detect Python + Node.js

**Files already created:**
- `railway.json` - Railway configuration
- `Procfile` - Process configuration
- `requirements.txt` - Python dependencies

### 2. Render (Also Great) ⭐
Similar to Railway with excellent Python support.

**Setup:**
1. Create account at [render.com](https://render.com)
2. Connect your GitHub repository  
3. Choose "Web Service"
4. Add environment variables
5. Deploy using the included `render.yaml`

**Files already created:**
- `render.yaml` - Render configuration

### 3. Heroku (Classic Choice)
Reliable option with good Python support.

**Setup:**
1. Install Heroku CLI
2. `heroku create your-app-name`
3. `heroku config:set RAPIDAPI_KEY=your_key`
4. `git push heroku main`

---

---

## Alternative: Vercel (TypeScript Only)

⚠️ **Note: Vercel requires converting Python to TypeScript** - see below for details.

### eBay & Price Charting Data with TypeScript

**Good news: Both can work with TypeScript!**

#### eBay Options:
1. **Official eBay APIs** (Better than scraping):
   - [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html) - Get sold listings
   - [eBay Finding API](https://developer.ebay.com/devzone/finding/callref/index.html) - Find completed listings
   - Much more reliable than web scraping

2. **Web scraping with TypeScript**:
   - Use Puppeteer or Playwright for Node.js
   - Same scraping logic, just in TypeScript

#### Price Charting Options:
1. **Check for API** - They may have official APIs
2. **TypeScript scraping** - Using Puppeteer/Playwright
3. **Alternative sources** - TCGPlayer, TCGDEX APIs

# Pokemon Arbitrage - Vercel Deployment Guide

## 🚀 Quick Deploy Steps

### Step 1: Restructure for Vercel

**Move Next.js to root:**
```bash
# From project root
cd pokemon-arbitrage-ui
mv * ../ 
cd ..
rm -rf pokemon-arbitrage-ui/
```

### Step 2: Update API Routes

Your current API routes call Python scripts via `spawn()`, which won't work on Vercel. You have 3 options:

#### Option A: Convert to Pure TypeScript (Recommended)
- Replace Python logic with TypeScript/Node.js
- Use libraries like `puppeteer` for scraping
- All logic runs in Vercel's Edge Runtime

#### Option B: External Python API
- Deploy Python scripts to Railway/Heroku/Fly.io
- Call them as external APIs from Next.js
- Keep Next.js on Vercel, Python elsewhere

#### Option C: Vercel Python Functions
- Convert Python scripts to Vercel API functions
- Limited by Vercel's serverless constraints

### Step 3: Environment Variables

Add to Vercel project settings:
```env
RAPID_API_KEY=your_pokemon_tcg_api_key
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

### Step 4: Package.json Updates

Ensure your root `package.json` has:
```json
{
  "name": "pokemon-arbitrage",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Step 5: Vercel Configuration

Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "functions": {
    "src/app/api/**/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🔧 Recommended Implementation: Option A

### Convert Python to TypeScript

**For Card Comp (Script 7):**

1. **Replace Python scraping with:**
```typescript
// Use Playwright for eBay scraping
import { chromium } from 'playwright-core'

// Use fetch for Pokemon TCG API  
const response = await fetch('https://pokemon-tcg-api.p.rapidapi.com/cards', {
  headers: {
    'X-RapidAPI-Key': process.env.RAPID_API_KEY
  }
})
```

2. **Update API route structure:**
```typescript
// src/app/api/script7/route.ts
export async function POST(request: NextRequest) {
  const { searchTerm } = await request.json()
  
  // Direct TypeScript implementation
  const ebayPrices = await scrapeEbayUK(searchTerm)
  const priceCharting = await scrapePriceCharting(searchTerm)
  const tcgData = await fetchPokemonTCG(searchTerm)
  
  return NextResponse.json({
    success: true,
    data: { ebayPrices, priceCharting, tcgData }
  })
}
```

### Required Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "playwright-core": "^1.40.0",
    "@playwright/test": "^1.40.0",
    "cheerio": "^1.0.0-rc.12",
    "node-fetch": "^3.3.2"
  }
}
```

## 🚀 Quick Deploy Commands

```bash
# 1. Move files to root
cd pokemon-arbitrage-ui && mv * ../ && cd .. && rm -rf pokemon-arbitrage-ui/

# 2. Install Vercel CLI
npm i -g vercel

# 3. Deploy
vercel

# 4. Set environment variables
vercel env add RAPID_API_KEY
vercel env add NEXT_PUBLIC_APP_URL

# 5. Redeploy with env vars
vercel --prod
```

## 🔍 What Needs Converting

| Script | Current (Python) | Convert To (TypeScript) |
|--------|------------------|-------------------------|
| Script 1 | `bulk_simple.py` | Japanese market API calls |
| Script 2 | `grading_arbitrage_analyzer.py` | Grading calc functions |
| Script 3 | `trending_cards_analyzer.py` | Pokemon TCG API calls |
| Script 4 | `etb_arbitrage_analyzer.py` | ETB pricing logic |
| Script 5 | `grading_arbitrage_analyzer.py` | Service comparison |
| Script 6 | Vintage pack tracker | Pack pricing APIs |
| Script 7 | `what_to_pay_analyzer.py` | **Already converted!** ✅ |

## 💡 Pro Tips

1. **Start with Script 7**: It's your main feature and mostly API-based
2. **Use serverless functions**: Each script becomes an API route
3. **Cache responses**: Use Vercel's Edge caching for better performance
4. **Monitor limits**: Vercel has execution time limits (10s hobby, 30s pro)

## 🚨 Common Issues

- **Timeout errors**: Split long operations into smaller chunks
- **Memory limits**: Optimize data processing
- **File system**: Can't write files, use memory or external storage
- **Environment differences**: Test locally with `vercel dev`

---

**Ready to deploy?** The Card Comp feature (Script 7) should work immediately since it already uses the Pokemon TCG API properly! 