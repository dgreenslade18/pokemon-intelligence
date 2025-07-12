# Pokemon Card Arbitrage Analyzer - Web UI

A modern web interface for analyzing Pokemon card arbitrage opportunities using Next.js 14 and Tailwind CSS.

## 🎯 Features

### Script 1: Japanese Profit Singles Finder
- **Upload CSV files** with Japanese Pokemon card URLs
- **Automated analysis** comparing Japanese prices with eBay sold listings
- **Profit margin calculations** with currency conversion
- **CSV export** of profitable opportunities

### Script 2: Raw to Graded Profit Finder  
- **Multi-select Pokemon sets** from 1-2 year timeframe
- **Grading arbitrage analysis** (ACE vs PSA comparison)
- **ROI calculations** including grading costs (£20-25)
- **3x return filtering** with 100%+ profit targeting

## 🛠 Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS 4 with neutral color palette
- **Backend:** Next.js API routes
- **File Processing:** Python script integration
- **File Handling:** Multer for uploads, CSV generation

## 📁 Project Structure

```
pokemon-arbitrage-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── script1/route.ts      # Japanese singles API
│   │   │   ├── script2/route.ts      # Grading arbitrage API  
│   │   │   └── download/route.ts     # File download API
│   │   ├── globals.css               # Tailwind styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Main page
│   └── components/
│       ├── ScriptSelector.tsx        # Script selection UI
│       ├── Script1Panel.tsx          # Japanese singles UI
│       └── Script2Panel.tsx          # Grading arbitrage UI
├── demo.html                         # Standalone demo
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### Option 1: View Demo (Immediate)
```bash
# Open the standalone demo in your browser
open demo.html
```

### Option 2: Full Development Setup
```bash
# Install dependencies (requires Node.js 18+)
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## 🎨 UI Design

### Neutral Color Palette
- **Primary:** Neutral grays (50-900)
- **Accent:** Green for success states
- **Background:** Light neutral (50)
- **Cards:** White with subtle shadows

### Component Features
- **Responsive design** (mobile-first)
- **Hover animations** and transitions
- **File drag-and-drop** interface
- **Multi-select checkboxes** for Pokemon sets
- **Progress indicators** with status messages
- **Download buttons** with success feedback

## 📊 Integration Points

### Python Script Connections
```javascript
// Script 1: Japanese Singles
POST /api/script1
- Uploads CSV file
- Calls bulk_simple.py
- Returns download URL

// Script 2: Grading Arbitrage  
POST /api/script2
- Sends selected sets array
- Calls grading_arbitrage_analyzer.py
- Returns download URL

// File Download
GET /api/download?file=filename.csv
- Serves generated CSV files
- Secure file validation
```

### Expected CSV Outputs
- **Script 1:** `japanese_profit_opportunities_TIMESTAMP.csv`
- **Script 2:** `grading_arbitrage_analysis_TIMESTAMP.csv`

## 🔧 Configuration

### Environment Setup
```bash
# Python virtual environment (required)
cd ../
source venv/bin/activate

# Install Python dependencies
pip install playwright requests csv

# Install Playwright browsers
playwright install
```

### API Configuration
```typescript
// API timeout settings
timeout: 300000 // 5 minutes

// File upload limits  
sizeLimit: '10mb'

// Supported formats
accept: '.csv,.xlsx,.xls'
```

## 📋 Pokemon Sets Available

| Set | Release | Description |
|-----|---------|-------------|
| Scarlet & Violet Base | March 2023 | Base set with starters |
| Paldea Evolved | June 2023 | Iono, Gardevoir ex featured |
| Obsidian Flames | August 2023 | Charizard focus |
| Paradox Rift | November 2023 | Ancient/Future variants |
| Paldean Fates | January 2024 | Shiny Pokemon subset |
| Temporal Forces | March 2024 | Time-themed mechanics |
| Twilight Masquerade | May 2024 | Mask-themed artistic cards |
| Shrouded Fable | August 2024 | Mystery/folklore theme |

## 🛡 Security Features

- **File type validation** (CSV/Excel only)
- **Directory traversal prevention** 
- **File size limits** (10MB max)
- **Secure file serving** with proper headers
- **Input sanitization** for all user data

## 🚨 Known Issues & Compatibility

### Node.js Version Requirements
- **Minimum:** Node.js 18.17.0
- **Current system:** Node.js 14.17.6 (incompatible)
- **Solution:** Use demo.html or upgrade Node.js

### TypeScript Errors
- Missing Next.js type definitions
- Node.js built-in module types
- **Workaround:** `skipLibCheck: true` in tsconfig.json

## 🎯 Usage Examples

### Script 1: Japanese Singles
1. Select "Japanese Profit Singles Finder"
2. Upload CSV with columns: `url, card_name, japanese_price`
3. Click "Run Analysis"
4. Download results with profit margins

### Script 2: Grading Arbitrage
1. Select "Raw to Graded Profit Finder"  
2. Choose Pokemon sets (e.g., Paldea Evolved, Obsidian Flames)
3. Click "Run Analysis"
4. Download results with ACE/PSA recommendations

## 📈 Expected Results

### Script 1 Output Columns
- `card_name`, `japanese_price_jpy`, `ebay_price_gbp`
- `profit_margin`, `roi_percentage`, `ebay_search_url`

### Script 2 Output Columns  
- `card_name`, `raw_price_gbp`, `ace10_price_gbp`, `psa10_price_gbp`
- `ace_net_profit`, `psa_net_profit`, `recommendation`

## 🤝 Contributing

1. Ensure Node.js 18+ for development
2. Follow TypeScript strict mode
3. Use Tailwind classes for styling
4. Test with both demo and full setup
5. Validate Python script integration

## 📄 License

Created for Pokemon card arbitrage analysis. Includes integration with existing Python scrapers and analysis tools. 