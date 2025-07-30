# 📈 Market Insights Setup Guide

## 🎯 Overview

The Market Insights feature tracks popular Pokemon cards daily and identifies trending cards with significant price increases. It leverages your existing eBay integration and database infrastructure.

## 🗄️ Database Setup

### 1. Initialize Market Insights Tables

```bash
curl -X POST "http://localhost:3000/api/init-market-insights-db" \
  -H "Content-Type: application/json"
```

This creates:
- `market_insights` table: Daily price snapshots for popular cards
- `trending_cards` table: Processed trend calculations
- Proper indices for performance

## 🔧 Manual Testing

### 2. Test Price Collection

```bash
# Collect prices for popular cards (takes ~5-10 minutes)
curl -X POST "http://localhost:3000/api/market-insights/collect-prices" \
  -H "Content-Type: application/json"
```

### 3. Calculate Trending Cards

```bash
# Calculate 7-day trends with 5% minimum increase
curl -X POST "http://localhost:3000/api/market-insights/calculate-trends" \
  -H "Content-Type: application/json" \
  -d '{"period": "7_days", "minPercentageIncrease": 5.0}'
```

### 4. View Results

```bash
# Get trending cards for 7 days
curl "http://localhost:3000/api/market-insights/calculate-trends?period=7_days&limit=10"
```

## ⚙️ Automation

The system runs automatically via Vercel Cron Jobs:

- **6:00 AM UTC Daily**: Price collection (`/api/market-insights/collect-prices`)  
- **7:00 AM UTC Daily**: Trend calculation (`/api/market-insights/calculate-trends`)

### Cron Schedule Details:

```json
{
  "crons": [
    {
      "path": "/api/market-insights/collect-prices",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/market-insights/calculate-trends", 
      "schedule": "0 7 * * *"
    }
  ]
}
```

## 📊 Frontend Integration

The Market Insights component is now integrated into the main page at `/` for authenticated users.

**Features:**
- ✅ Real-time trending cards display
- ✅ Multiple time period selection (24h, 3d, 7d, 14d, 30d)
- ✅ Price change visualization
- ✅ Confidence scoring
- ✅ Responsive design with animations

## 🎯 Tracked Cards

The system currently tracks **16 popular cards** across different eras:

**Classic Era:**
- Charizard (Base Set #4/102)
- Blastoise (Base Set #2/102) 
- Venusaur (Base Set #15/102)
- Pikachu (Base Set #58/102)

**Neo Genesis:**
- Lugia (#9/111)
- Ho-Oh (#7/111)

**Modern Era:**
- Charizard VMAX (Darkness Ablaze)
- Pikachu VMAX (Vivid Voltage)
- Umbreon VMAX (Evolving Skies)

*And more...*

## 📈 How It Works

### 1. **Daily Price Collection**
- Fetches current eBay UK sold prices for popular cards
- Stores price snapshots with confidence scores
- Uses existing `analyzeCard` function for consistency

### 2. **Trend Calculation**
- Compares current prices with historical data (1, 3, 7, 14, or 30 days ago)
- Calculates percentage changes and absolute amounts
- Filters cards with significant increases (configurable threshold)

### 3. **Frontend Display**
- Shows top 10 trending cards by percentage increase
- Displays confidence levels and listing counts
- Real-time period switching without page refresh

## 🔍 Data Sources

**Same as your existing system:**
- eBay UK Sold Items API (primary)
- eBay UK web scraping (fallback)
- TCG Player API (supplementary)
- UK marketplace focus

## 🎛️ Configuration

### Minimum Increase Threshold
Default: **5%** - Cards must increase by at least 5% to appear in trending

### Confidence Filtering
Minimum confidence: **5.0/10** - Only cards with reliable data are included

### Price Filtering
Minimum price: **£5.00** - Filters out very low-value cards

## 📝 API Endpoints

### Collection Endpoints
- `POST /api/market-insights/collect-prices` - Collect daily prices
- `GET /api/market-insights/collect-prices` - View collection stats

### Analysis Endpoints  
- `POST /api/market-insights/calculate-trends` - Calculate trending cards
- `GET /api/market-insights/calculate-trends` - Get trending results

### Database Setup
- `POST /api/init-market-insights-db` - Initialize database tables

## 🚀 Production Deployment

### Environment Variables
No new environment variables required - uses existing eBay API credentials.

### Database Migration
Run the database initialization endpoint after deploying to production.

### Monitoring
- Check Vercel Function logs for cron job execution
- Monitor API response times (price collection can take 5-10 minutes)
- Verify daily data updates in the database

## 🔧 Troubleshooting

### No Trending Cards Found
- Check if price collection ran successfully
- Verify minimum increase threshold isn't too high
- Ensure sufficient historical data (wait a few days after setup)

### Price Collection Timeout
- Function has 5-minute timeout for price collection
- Reduce number of tracked cards if needed
- Check eBay API rate limits

### Database Issues
- Verify tables exist: `market_insights`, `trending_cards`
- Check for unique constraint violations (duplicate daily entries)
- Monitor PostgreSQL connection limits

## 📊 Sample Data Structure

### Market Insights Table
```sql
SELECT card_name, ebay_average_price, price_date, confidence_score 
FROM market_insights 
WHERE price_date = CURRENT_DATE
ORDER BY ebay_average_price DESC;
```

### Trending Cards Table
```sql
SELECT card_name, price_change_percentage, current_price, previous_price
FROM trending_cards 
WHERE trend_period = '7_days' 
AND calculation_date = CURRENT_DATE
ORDER BY price_change_percentage DESC;
```

## 🎉 Success Metrics

After setup, you should see:
- ✅ Daily price data collection
- ✅ Trending cards calculations  
- ✅ Frontend display of market insights
- ✅ Historical price tracking
- ✅ Automated daily updates

The Market Insights feature is now ready to provide valuable market intelligence to your users! 🚀 