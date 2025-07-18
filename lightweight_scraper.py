#!/usr/bin/env python3
"""
Lightweight Pokemon card price scraper for Railway free tier
Uses requests + BeautifulSoup instead of Playwright to minimize memory usage
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import time
import os
from datetime import datetime
from urllib.parse import quote
import sys

def emit_progress(stage, message):
    """Emit progress updates that can be captured by the API"""
    progress_data = {
        'stage': stage,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    print(f"PROGRESS:{json.dumps(progress_data)}", flush=True)

def search_ebay_uk_lightweight(card_name, max_results=4):
    """Lightweight eBay search using requests only - much lower memory usage"""
    emit_progress("ebay", "Connecting to eBay UK (lightweight)...")
    print(f"🔍 Searching eBay UK for: {card_name}")
    
    prices = []
    
    try:
        # Set up session with realistic headers
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Build eBay search URL for sold auctions
        search_query = card_name
        ebay_url = f"https://www.ebay.co.uk/sch/i.html?_nkw={quote(search_query)}&_sacat=0&_from=R40&Graded=No&_dcat=183454&LH_PrefLoc=1&LH_Sold=1&LH_Complete=1&rt=nc&LH_Auction=1&_ipg=50&_sop=13"
        
        print(f"   Searching: {ebay_url}")
        emit_progress("ebay", "Fetching eBay results...")
        
        # Make request with timeout
        response = session.get(ebay_url, timeout=15)
        response.raise_for_status()
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find listing containers
        listings = soup.find_all('div', class_='s-item') or soup.find_all('div', {'data-testid': 'item-card'})
        
        if not listings:
            print("   ❌ No listings found")
            return prices
        
        print(f"   Found {len(listings)} potential listings")
        emit_progress("ebay", f"Processing {len(listings)} listings...")
        
        count = 0
        for i, listing in enumerate(listings):
            if count >= max_results:
                break
                
            try:
                # Extract title
                title_elem = (listing.find('span', role='heading') or 
                             listing.find('h3') or 
                             listing.find('a', class_='s-item__link'))
                
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                
                # Skip non-listings
                if ('shop on ebay' in title.lower() or 
                    'advertisement' in title.lower() or
                    len(title) < 15):
                    continue
                
                # Extract price
                price_elem = (listing.find('span', class_='s-item__price') or
                             listing.find('span', class_='notranslate'))
                
                if not price_elem:
                    continue
                    
                price_text = price_elem.get_text(strip=True)
                
                # Parse price
                price_match = re.search(r'£([\d,]+\.?\d*)', price_text)
                if price_match:
                    price = float(price_match.group(1).replace(',', ''))
                    
                    if price > 0:
                        # Extract URL
                        link_elem = listing.find('a', class_='s-item__link')
                        listing_url = link_elem['href'] if link_elem else None
                        
                        price_data = {
                            'title': title,
                            'price': price,
                            'source': 'eBay UK Sold Auction',
                            'url': listing_url
                        }
                        
                        prices.append(price_data)
                        count += 1
                        
                        print(f"   ✅ Added price: £{price} - {title[:30]}...")
                        
            except Exception as e:
                print(f"   ❌ Error processing listing {i}: {e}")
                continue
        
        emit_progress("ebay", f"Found {len(prices)} auction results")
        return prices
        
    except Exception as e:
        print(f"   ❌ eBay search failed: {e}")
        emit_progress("ebay", "eBay search failed")
        return prices

def search_price_charting_lightweight(card_name):
    """Lightweight Price Charting search using requests only"""
    emit_progress("price_charting", "Connecting to Price Charting (lightweight)...")
    print(f"🔍 Searching Price Charting for: {card_name}")
    
    try:
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Try direct search
        search_url = f"https://www.pricecharting.com/search-products?q={quote(card_name)}&type=prices"
        print(f"   Searching: {search_url}")
        
        response = session.get(search_url, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for game links
        game_links = soup.find_all('a', href=re.compile(r'/game/'))
        
        for link in game_links:
            href = link['href']
            text = link.get_text().lower()
            
            # Simple matching
            if 'pokemon' in href.lower() and any(word in text for word in card_name.lower().split()):
                if href.startswith('/'):
                    product_url = f"https://www.pricecharting.com{href}"
                else:
                    product_url = href
                
                print(f"   Found product page: {product_url}")
                
                # Get product page
                product_response = session.get(product_url, timeout=15)
                product_soup = BeautifulSoup(product_response.content, 'html.parser')
                
                # Look for ungraded price in table
                rows = product_soup.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        first_cell = cells[0].get_text(strip=True).lower()
                        second_cell = cells[1].get_text(strip=True)
                        
                        if first_cell == 'ungraded':
                            price_match = re.search(r'\$\s*([\d,]+\.?\d*)', second_cell)
                            if price_match:
                                price_usd = float(price_match.group(1).replace(',', ''))
                                price_gbp = round(price_usd * 0.79, 2)  # Convert USD to GBP
                                
                                emit_progress("price_charting", f"Found price: £{price_gbp}")
                                return {
                                    'title': f"{card_name} (Price Charting)",
                                    'price': price_gbp,
                                    'source': 'Price Charting',
                                    'url': product_url
                                }
                break
        
        emit_progress("price_charting", "No price found")
        return None
        
    except Exception as e:
        print(f"   ❌ Price Charting search failed: {e}")
        emit_progress("price_charting", "Price Charting search failed")
        return None

def search_pokemon_tcg_api(card_name):
    """Search Pokemon TCG API - same as before, already lightweight"""
    emit_progress("cardmarket", "Connecting to Pokemon TCG API...")
    print(f"🔍 Searching Pokemon TCG API for: {card_name}")
    
    try:
                 api_host = "pokemon-tcg-api.p.rapidapi.com"
         api_key = os.getenv('RAPIDAPI_KEY', "2390eefca8msh0b090b1b575b879p1c9090jsn0df6e6a47659")
        
        headers = {
            'X-RapidAPI-Key': api_key,
            'X-RapidAPI-Host': api_host
        }
        
        search_url = f"https://{api_host}/cards"
        params = {
            'search': card_name,
            'pageSize': 10
        }
        
        response = requests.get(search_url, headers=headers, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'data' in data and data['data']:
                card = data['data'][0]  # Take first result
                
                # Extract pricing if available
                if 'prices' in card and 'tcg_player' in card['prices']:
                    tcg_data = card['prices']['tcg_player']
                    if tcg_data.get('market_price'):
                        price_gbp = round(float(tcg_data['market_price']) / 1.17, 2)  # Convert EUR to GBP
                        
                        emit_progress("cardmarket", f"Found API price: £{price_gbp}")
                        return {
                            'title': f"{card.get('name', card_name)} (Pokemon TCG API)",
                            'price': price_gbp,
                            'source': 'Pokemon TCG API',
                            'url': f"https://www.tcgplayer.com/search/pokemon/product?q={quote(card_name)}"
                        }
        
        emit_progress("cardmarket", "No API price found")
        return None
        
    except Exception as e:
        print(f"   ❌ Pokemon TCG API search failed: {e}")
        emit_progress("cardmarket", "API search failed")
        return None

def analyze_lightweight(card_name):
    """Lightweight analysis using minimal memory"""
    print("=" * 80)
    print(f"🎯 LIGHTWEIGHT ANALYZER: {card_name.upper()}")
    print("Memory-optimized for Railway free tier")
    print("=" * 80)
    
    results = {
        'card_name': card_name,
        'timestamp': datetime.now().isoformat(),
        'ebay_prices': [],
        'price_charting': None,
        'cardmarket': None,
        'analysis': {}
    }
    
    # Run searches sequentially to minimize memory usage
    emit_progress("analysis", "Starting lightweight analysis...")
    
    # eBay search
    ebay_prices = search_ebay_uk_lightweight(card_name, 4)
    results['ebay_prices'] = ebay_prices
    
    # Price Charting search  
    price_charting = search_price_charting_lightweight(card_name)
    results['price_charting'] = price_charting
    
    # Pokemon TCG API search
    cardmarket = search_pokemon_tcg_api(card_name)
    results['cardmarket'] = cardmarket
    
    # Analysis
    print("\n📊 ANALYSIS")
    print("-" * 40)
    
    all_prices = []
    
    # eBay average
    if ebay_prices:
        ebay_avg = round(sum(item['price'] for item in ebay_prices) / len(ebay_prices), 2)
        all_prices.append(ebay_avg)
        results['analysis']['ebay_average'] = ebay_avg
        print(f"eBay UK Average: £{ebay_avg}")
    
    # Price Charting
    if price_charting:
        all_prices.append(price_charting['price'])
        results['analysis']['price_charting_price'] = price_charting['price']
        print(f"Price Charting: £{price_charting['price']}")
    
    # Pokemon TCG API
    if cardmarket:
        all_prices.append(cardmarket['price'])
        results['analysis']['cardmarket_price'] = cardmarket['price']
        print(f"Pokemon TCG API: £{cardmarket['price']}")
    
    # Final recommendation
    if all_prices:
        final_average = round(sum(all_prices) / len(all_prices), 2)
        recommendation = f"£{round(final_average * 0.8, 2)} - £{round(final_average * 0.9, 2)}"
        
        results['analysis']['final_average'] = final_average
        results['analysis']['recommendation'] = recommendation
        
        print(f"\n🎯 RECOMMENDED: {recommendation}")
        emit_progress("analysis", f"Analysis complete - {recommendation}")
    else:
        results['analysis']['recommendation'] = "Insufficient data"
        emit_progress("analysis", "Analysis complete - insufficient data")
    
    return results

def main():
    if len(sys.argv) > 1:
        search_term = ' '.join(sys.argv[1:])
    else:
        search_term = input("Enter Pokemon card name: ")
    
    if not search_term:
        return
    
    results = analyze_lightweight(search_term)
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"lightweight_analysis_{timestamp}.json"
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Results saved to: {output_file}")
    print(output_file)

if __name__ == "__main__":
    main() 