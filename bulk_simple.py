#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import requests
import re
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

def get_jpy_to_usd_rate():
    """Get current JPY to USD exchange rate"""
    try:
        response = requests.get('https://api.exchangerate-api.com/v4/latest/JPY', timeout=10)
        data = response.json()
        return data['rates']['USD']
    except Exception as e:
        print(f"WARNING: Could not fetch exchange rate: {e}")
        print("Using fallback JPY to USD rate")
        return 0.0067  # Fallback rate

def get_english_name_for_csv(card_name):
    """Extract English name for CSV export"""
    # Extract base Pokemon name (remove AR/CHR/SAR etc)
    base_name = card_name.split('【')[0]
    
    # Convert common Japanese names to English
    name_translations = {
        'ジャノビー': 'Servine', 'ヤナップ': 'Pansage', 'ヤナッキー': 'Simisage',
        'チュリネ': 'Petilil', 'ドレディア': 'Lilligant', 'マラカッチ': 'Maractus',
        'カブルモ': 'Karrablast', 'サザンドラ': 'Hydreigon', 'リザードン': 'Charizard',
        'ピカチュウ': 'Pikachu', 'イーブイ': 'Eevee', 'リーフィア': 'Leafeon',
        'ミュウツー': 'Mewtwo', 'ルギア': 'Lugia', 'ポカブ': 'Tepig',
        'ミジュマル': 'Oshawott', 'ツタージャ': 'Snivy', 'ビクティニ': 'Victini'
    }
    
    english_name = name_translations.get(base_name, base_name)
    return english_name

def extract_card_number_for_csv(card_name):
    """Extract card number for CSV"""
    card_number_match = re.search(r'【.*?】\{(\d+/\d+)\}', card_name)
    return card_number_match.group(1) if card_number_match else ""

def extract_card_type_for_csv(card_name):
    """Extract card type for CSV"""
    card_type_match = re.search(r'【(.*?)】', card_name)
    return card_type_match.group(1) if card_type_match else ""

def scrape_cards_from_url(browser, url):
    """Scrape cards from a single CardRush URL"""
    print(f"\nLoading: {url}")
    
    try:
        page = browser.new_page()
        page.goto(url, wait_until='networkidle')
        
        # Use the exact same approach as the working AR/CHR scraper
        print("Scraping page...")
        
        # Wait for product listings to load
        try:
            page.wait_for_selector('div[class*="item"]', timeout=10000)
        except:
            print("ERROR: No items found")
            page.close()
            return []
        
        # Extract card information using the same selector as AR/CHR scraper
        items = page.query_selector_all('div[class*="item"]')
        
        if not items:
            print("ERROR: No items found")
            page.close()
            return []
            
        print(f"Found {len(items)} items using selector 'div[class*=\"item\"]'")
        
        exchange_rate = get_jpy_to_usd_rate()
        cards = []
        
        for item in items:
            try:
                # Use the exact same approach as the working AR/CHR scraper
                # Get all text content from the item
                item_text = item.inner_text().strip()
                
                # Skip if no useful content
                if not item_text or len(item_text) < 10:
                    continue
                
                # Extract card name - look for patterns like 【AR】, 【CHR】, 【SAR】, etc.
                card_match = re.search(r'([^【\n]*【(?:AR|CHR|SAR|SR|ex|V|VMAX|VSTAR|GX)】[^】\n]*)', item_text)
                if not card_match:
                    continue
                
                card_name = card_match.group(1).strip()
                
                # Extract JPY price
                price_match = re.search(r'(\d{1,3}(?:,\d{3})*)\s*円', item_text)
                if not price_match:
                    continue
                
                price_jpy = int(price_match.group(1).replace(',', ''))
                
                # Filter for reasonable prices  
                if 100 <= price_jpy <= 50000:  # Reasonable price range
                    price_usd = price_jpy * exchange_rate
                    
                    # Try to get URL from any link in the item
                    card_url = ""
                    try:
                        link_elem = item.query_selector('a')
                        if link_elem:
                            href = link_elem.get_attribute('href')
                            if href:
                                if href.startswith('http'):
                                    card_url = href
                                else:
                                    card_url = f"https://www.cardrush-pokemon.jp{href}"
                    except:
                        pass
                    
                    cards.append({
                        'name': card_name,
                        'price_jpy': price_jpy,
                        'price_usd': price_usd,
                        'url': card_url,
                        'source_url': url
                    })
                    
                    print(f"   Found: {card_name} - ¥{price_jpy:,}")
                
            except Exception as e:
                print(f"   ERROR processing item: {e}")
                continue
        
        page.close()
        return cards
        
    except Exception as e:
        print(f"ERROR loading {url}: {e}")
        return []

def get_ebay_price_improved(card_name):
    """Get eBay pricing and URL using improved search logic"""
    print(f"Searching eBay for: {card_name}")
    
    # Extract card info
    card_number_match = re.search(r'【.*?】\{(\d+/\d+)\}', card_name)
    card_type_match = re.search(r'【(.*?)】', card_name)
    
    card_number = card_number_match.group(1) if card_number_match else ""
    card_type = card_type_match.group(1) if card_type_match else ""
    
    print(f"   Card number: {card_number}")
    print(f"   Type: {card_type}")
    
    # Get English name for search
    english_name = get_english_name_for_csv(card_name).lower()
    print(f"   English name: {english_name}")
    
    # Create search strategies
    search_terms = []
    if card_number:
        search_terms.extend([
            f"pokemon {english_name} {card_number}",
            f"{english_name} {card_type} {card_number}",
            f"pokemon card {card_number}"
        ])
    else:
        search_terms.extend([
            f"pokemon {english_name} {card_type}",
            f"{english_name} pokemon card"
        ])
    
    # Try each search term
    for search_term in search_terms:
        try:
            print(f"   Searching: {search_term}")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            search_url = f"https://www.ebay.com/sch/i.html?_nkw={search_term}&_sacat=0&LH_Sold=1&rt=nc&_ipg=50"
            response = requests.get(search_url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                continue
            
            # Look for sold listings with price patterns
            price_matches = re.findall(r'\$([0-9]+(?:\.[0-9]{2})?)', response.text)
            
            if len(price_matches) >= 3:
                # Convert to float and filter reasonable prices
                prices = []
                for price_str in price_matches:
                    try:
                        price = float(price_str)
                        if 1 <= price <= 1000:  # Reasonable price range
                            prices.append(price)
                    except ValueError:
                        continue
                
                if len(prices) >= 3:
                    # Get last 3 prices and average them
                    recent_prices = prices[-3:]
                    avg_price = sum(recent_prices) / len(recent_prices)
                    
                    print(f"   Average of last 3 sales: ${avg_price:.2f}")
                    print(f"SUCCESS: Found eBay price: ${avg_price:.2f}")
                    
                    # Return both price and search URL
                    return avg_price, search_url
            
            time.sleep(1)  # Rate limiting
            
        except Exception as e:
            print(f"   ERROR: Search failed for '{search_term}': {e}")
            continue
    
    print(f"ERROR: Could not find eBay pricing for {card_name}")
    return None, None

def read_input_urls():
    """Read URLs from input.csv file"""
    urls = []
    try:
        with open('input.csv', 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            next(reader)  # Skip header
            for row in reader:
                if row and row[0].strip():
                    urls.append(row[0].strip())
        print(f"Loaded {len(urls)} URLs from input.csv")
        return urls
    except Exception as e:
        print(f"ERROR reading input.csv: {e}")
        return []

def export_bulk_opportunities(opportunities):
    """Export bulk opportunities to CSV with duplicates removed"""
    if not opportunities:
        print("No opportunities to export")
        return
    
    # Remove duplicates based on card name and card number
    seen = set()
    unique_opportunities = []
    
    for opp in opportunities:
        # Create a unique key based on card name and number
        key = (opp['japanese_name'], opp['card_number'])
        if key not in seen:
            seen.add(key)
            unique_opportunities.append(opp)
        else:
            print(f"   Removed duplicate: {opp['japanese_name']}")
    
    print(f"Removed {len(opportunities) - len(unique_opportunities)} duplicates")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"bulk_opportunities_{timestamp}.csv"
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'english_name', 'japanese_name', 'card_number', 'card_type',
            'buy_price_jpy', 'buy_price_usd', 'sell_price_usd', 'profit_usd',
            'profit_margin_percent', 'cardrush_url', 'source_page_url', 'ebay_search_url'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for opp in unique_opportunities:
            writer.writerow(opp)
    
    print(f"SUCCESS: {len(unique_opportunities)} unique opportunities exported to: {filename}")
    return filename

def log_progress(message, progress_file="bulk_progress.log"):
    """Log progress to a file with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(progress_file, 'a', encoding='utf-8') as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)  # Also print to console

def save_intermediate_results(all_opportunities, all_cards, progress_file="bulk_progress.log"):
    """Save current results to CSV files"""
    if all_opportunities:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"bulk_opportunities_partial_{timestamp}.csv"
        export_bulk_opportunities(all_opportunities)
        log_progress(f"Saved {len(all_opportunities)} opportunities to {filename}", progress_file)
    
    log_progress(f"Current totals: {len(all_cards)} cards, {len(all_opportunities)} opportunities", progress_file)

def main():
    progress_file = "bulk_progress.log"
    
    # Clear previous progress log
    with open(progress_file, 'w', encoding='utf-8') as f:
        f.write("")
    
    log_progress("BULK POKEMON CARD ARBITRAGE FINDER", progress_file)
    log_progress("=" * 50, progress_file)
    
    # Read input URLs
    urls = read_input_urls()
    if not urls:
        log_progress("ERROR: No URLs found in input.csv", progress_file)
        return
    
    log_progress(f"Starting analysis of {len(urls)} URLs", progress_file)
    
    all_opportunities = []
    all_cards = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for i, url in enumerate(urls, 1):
            log_progress(f"\nProcessing URL {i}/{len(urls)}", progress_file)
            log_progress(f"URL: {url}", progress_file)
            log_progress("-" * 50, progress_file)
            
            # Scrape cards from this URL
            cards = scrape_cards_from_url(browser, url)
            all_cards.extend(cards)
            
            if cards:
                log_progress(f"SUCCESS: Found {len(cards)} cards from this URL", progress_file)
                
                # Analyze first 2 cards from each URL for opportunities (reduced for speed)
                cards_to_analyze = cards[:2]
                log_progress(f"\nAnalyzing top {len(cards_to_analyze)} cards for opportunities...", progress_file)
                
                for j, card in enumerate(cards_to_analyze, 1):
                    log_progress(f"\n[{j}/{len(cards_to_analyze)}] Analyzing: {card['name']}", progress_file)
                    log_progress("-" * 40, progress_file)
                    
                    # Extract English name for CSV
                    english_name = get_english_name_for_csv(card['name'])
                    
                    # Get eBay market price and URL
                    market_price, ebay_url = get_ebay_price_improved(card['name'])
                    
                    if market_price and ebay_url:
                        profit = market_price - card['price_usd']
                        margin = (profit / card['price_usd']) * 100
                        
                        log_progress(f"CardRush: ¥{card['price_jpy']:,} (${card['price_usd']:.2f})", progress_file)
                        log_progress(f"eBay average: ${market_price:.2f}", progress_file)
                        log_progress(f"Profit: ${profit:.2f} ({margin:.1f}%)", progress_file)
                        
                        if margin > 20:  # 20% profit margin threshold
                            all_opportunities.append({
                                'japanese_name': card['name'],
                                'english_name': english_name,
                                'card_number': extract_card_number_for_csv(card['name']),
                                'card_type': extract_card_type_for_csv(card['name']),
                                'buy_price_jpy': card['price_jpy'],
                                'buy_price_usd': round(card['price_usd'], 2),
                                'sell_price_usd': round(market_price, 2),
                                'profit_usd': round(profit, 2),
                                'profit_margin_percent': round(margin, 1),
                                'cardrush_url': card['url'],
                                'source_page_url': card['source_url'],
                                'ebay_search_url': ebay_url
                            })
                            log_progress("OPPORTUNITY FOUND!", progress_file)
                        else:
                            log_progress("Not profitable enough", progress_file)
                    else:
                        log_progress("No market price found", progress_file)
                    
                    time.sleep(2)  # Rate limiting between eBay searches
            else:
                log_progress("ERROR: No cards found from this URL", progress_file)
            
            # Save intermediate results every 5 URLs
            if i % 5 == 0:
                save_intermediate_results(all_opportunities, all_cards, progress_file)
        
        browser.close()
    
    # Final results
    log_progress(f"\nBULK ANALYSIS COMPLETE", progress_file)
    log_progress("=" * 50, progress_file)
    log_progress(f"Total URLs processed: {len(urls)}", progress_file)
    log_progress(f"Total cards found: {len(all_cards)}", progress_file)
    log_progress(f"Total opportunities found: {len(all_opportunities)}", progress_file)
    
    if all_opportunities:
        # Sort by profit margin
        opportunities_sorted = sorted(all_opportunities, key=lambda x: x['profit_margin_percent'], reverse=True)
        
        log_progress(f"\nTOP OPPORTUNITIES:", progress_file)
        for i, opp in enumerate(opportunities_sorted[:10], 1):  # Show top 10
            log_progress(f"\n{i}. {opp['english_name']} ({opp['japanese_name']})", progress_file)
            log_progress(f"   Card: {opp['card_number']} [{opp['card_type']}]", progress_file)
            log_progress(f"   Buy: ¥{opp['buy_price_jpy']:,} (${opp['buy_price_usd']:.2f})", progress_file)
            log_progress(f"   Sell: ${opp['sell_price_usd']:.2f}", progress_file)
            log_progress(f"   Profit: ${opp['profit_usd']:.2f} ({opp['profit_margin_percent']:.1f}%)", progress_file)
        
        total_profit = sum(opp['profit_usd'] for opp in all_opportunities)
        log_progress(f"\nTotal potential profit: ${total_profit:.2f}", progress_file)
        
        # Export to CSV
        export_bulk_opportunities(all_opportunities)
    else:
        log_progress("\nNo profitable opportunities found", progress_file)
    
    log_progress(f"\nIMPORTANT NOTES:", progress_file)
    log_progress("• These are estimates based on recent eBay sold listings", progress_file)
    log_progress("• Consider eBay/PayPal fees (~13% total)", progress_file)
    log_progress("• Factor in shipping costs and time", progress_file)
    log_progress("• Card condition affects price significantly", progress_file)
    log_progress("• Market prices fluctuate - verify before buying", progress_file)

if __name__ == "__main__":
    main() 