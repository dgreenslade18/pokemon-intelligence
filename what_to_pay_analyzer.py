#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import time
import requests
from datetime import datetime
from playwright.sync_api import sync_playwright
from urllib.parse import quote
from bs4 import BeautifulSoup
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import sys
import gc
import os

# Memory monitoring for Railway deployment
try:
    from memory_monitor import check_memory_limit, get_memory_usage
    MEMORY_MONITORING = True
except ImportError:
    MEMORY_MONITORING = False
    def check_memory_limit(*args, **kwargs):
        return True
    def get_memory_usage():
        return 0

def emit_progress(stage, message):
    """Emit progress updates that can be captured by the API"""
    progress_data = {
        'stage': stage,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    print(f"PROGRESS:{json.dumps(progress_data)}", flush=True)

def search_ebay_uk_sold(card_name, max_results=4):
    """Search eBay UK for recently sold raw cards from auctions only (no Buy It Now)"""
    emit_progress("ebay", "Connecting to eBay UK...")
    print(f"🔍 Searching eBay UK for: {card_name}")
    
    prices = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-images',
                '--disable-plugins',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-web-security',
                '--no-first-run',
                # Additional memory optimization flags for Railway
                '--memory-pressure-off',
                '--max-old-space-size=256',
                '--disable-background-networking',
                '--disable-background-mode',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-first-run',
                '--disable-gpu',
                '--single-process'
            ]
        )
        
        # Use smaller viewport to save memory
        context = browser.new_context(
            viewport={'width': 800, 'height': 600},  # Reduced from 1280x720
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        page.set_extra_http_headers({'Accept-Language': 'en-US,en;q=0.9'})
        
        try:
            emit_progress("ebay", "Searching recent sold auctions...")
            
            # Search for SOLD AUCTIONS ONLY - matching exact parameters from manual search
            search_query = f"{card_name}"  # Simplified search - let eBay filters handle grading exclusion
            # Use exact URL parameters from manual search: UK only, non-graded, auctions only
            ebay_url = f"https://www.ebay.co.uk/sch/i.html?_nkw={quote(search_query)}&_sacat=0&_from=R40&Graded=No&_dcat=183454&LH_PrefLoc=1&LH_Sold=1&LH_Complete=1&rt=nc&LH_Auction=1&_ipg=50&_sop=13"
            
            print(f"   Searching: {ebay_url}")
            
            # Faster page loading with reduced timeout
            page.goto(ebay_url, timeout=15000, wait_until='domcontentloaded')
            # Reduced wait time for faster processing
            page.wait_for_timeout(1500)
            
            emit_progress("ebay", "Processing auction results...")
            
            # Don't save debug files in production to save memory
            content_length = len(page.content())
            print(f"   Page loaded, content length: {content_length}")
            
            # Try multiple possible selectors for eBay listings
            possible_selectors = [
                '.s-item',
                '[data-testid="item-card"]',
                '.srp-results .s-item',
                '.srp-item'
            ]
            
            listings = []
            for selector in possible_selectors:
                listings = page.query_selector_all(selector)
                if listings:
                    print(f"   Found {len(listings)} listings with selector: {selector}")
                    break
            
            if not listings:
                print("   ❌ No listings found with any selector")
                return prices
            
            count = 0
            processed = 0
            for i, listing in enumerate(listings):
                print(f"   📋 Processing listing {i+1} of {len(listings)}, count={count}, processed={processed}")
                
                if count >= max_results:
                    print(f"   🛑 Reached max_results limit ({max_results})")
                    break
                    
                try:
                    # Try multiple title selectors
                    title_elem = (listing.query_selector('.s-item__title') or
                                 listing.query_selector('[data-testid="item-title"]') or
                                 listing.query_selector('.it-ttl') or
                                 listing.query_selector('h3'))
                    
                    # Try multiple price selectors
                    price_elem = (listing.query_selector('.s-item__price') or
                                 listing.query_selector('[data-testid="item-price"]') or
                                 listing.query_selector('.notranslate') or
                                 listing.query_selector('.s-price'))
                    
                    if not title_elem:
                        print(f"   ❌ No title element found")
                        continue
                    if not price_elem:
                        print(f"   ❌ No price element found")
                        continue
                        
                    title = title_elem.inner_text().strip()
                    price_text = price_elem.inner_text().strip()
                    
                    print(f"   Raw data - Title: {title[:50]}..., Price: {price_text}")
                    
                    # Skip ads, shop listings, and active/unsold items
                    if ('shop on ebay' in title.lower() or 
                        'advertisement' in title.lower() or
                        'save this search' in title.lower() or
                        'more like this' in title.lower() or
                        len(title) < 15):
                        print(f"   ❌ Skipped non-listing: {title[:30]}...")
                        continue
                    
                    # Since we're using exact eBay filters (LH_Auction=1, Graded=No, LH_Sold=1), 
                    # we can trust the results more and do minimal additional filtering
                    print(f"   ✅ Processing auction result: {title[:50]}...")
                    
                    # eBay's Graded=No parameter should handle grading exclusion,
                    # but add minimal safety check for obvious graded terms
                    obvious_graded_terms = ['psa 10', 'psa 9', 'bgs 10', 'bgs 9', 'cgc 10', 'cgc 9']
                    title_lower = title.lower()
                    if any(term in title_lower for term in obvious_graded_terms):
                        print(f"   ❌ Skipped obviously graded card: {title[:50]}...")
                        continue
                        
                    # Extract price - try multiple patterns
                    price_patterns = [
                        r'£([\d,]+\.?\d*)',
                        r'GBP ([\d,]+\.?\d*)',
                        r'(\d+\.?\d*)',
                    ]
                    
                    price = None
                    for i, pattern in enumerate(price_patterns):
                        price_match = re.search(pattern, price_text)
                        if price_match:
                            try:
                                price = float(price_match.group(1).replace(',', ''))
                                print(f"   💰 Price extracted using pattern {i+1}: £{price}")
                                break
                            except Exception as e:
                                print(f"   ❌ Price pattern {i+1} failed: {e}")
                                continue
                    
                    if not price:
                        print(f"   ❌ No valid price extracted from: {price_text}")
                        continue
                    
                    if price and price > 0:
                        # Get the listing URL
                        listing_url = None
                        link_elem = (listing.query_selector('.s-item__link') or
                                   listing.query_selector('a[href*="/itm/"]') or
                                   listing.query_selector('a'))
                        
                        if link_elem:
                            href = link_elem.get_attribute('href')
                            if href:
                                # Clean the URL
                                if href.startswith('http'):
                                    listing_url = href
                                elif href.startswith('/'):
                                    listing_url = f"https://www.ebay.co.uk{href}"
                        
                        price_data = {
                            'title': title,
                            'price': price,
                            'source': 'eBay UK Sold Auction',
                            'url': listing_url
                        }
                        
                        prices.append(price_data)
                        count += 1
                        
                        emit_progress("ebay", f"Found {count} of {max_results} auction results...")
                        
                        print(f"   ✅ Added price: £{price} - {title[:30]}...")
                        if listing_url:
                            print(f"   🔗 URL: {listing_url}")
                            
                except Exception as e:
                    print(f"   ❌ Error processing listing {i}: {e}")
                    continue
        
        except Exception as e:
            print(f"   ❌ eBay search failed: {e}")
        finally:
            # Explicit cleanup for memory optimization
            try:
                context.close()
            except:
                pass
            try:
                browser.close()
            except:
                pass
    
    emit_progress("ebay", f"eBay search completed - found {len(prices)} auction results")
    return prices

def search_price_charting(card_name):
    """Search Price Charting for ungraded card price"""
    emit_progress("price_charting", "Connecting to Price Charting...")
    print(f"🔍 Searching Price Charting for: {card_name}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-images',
                '--disable-plugins',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--no-first-run',
                # Additional memory optimization flags for Railway
                '--memory-pressure-off',
                '--max-old-space-size=256',
                '--disable-background-networking',
                '--disable-background-mode',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-default-browser-check',
                '--disable-gpu',
                '--single-process'
            ]
        )
        context = browser.new_context(
            viewport={'width': 800, 'height': 600},  # Reduced for memory optimization
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        page.set_extra_http_headers({'Accept-Language': 'en-US,en;q=0.9'})
        
        try:
            emit_progress("price_charting", "Searching for card pricing data...")
            # Step 1: Try direct search on pricecharting.com
            search_url = f"https://www.pricecharting.com/search-products?q={quote(card_name)}&type=prices"
            print(f"   Step 1 - Searching: {search_url}")
            page.goto(search_url, timeout=15000, wait_until='domcontentloaded')
            page.wait_for_timeout(1500)
            
            # Don't save debug files in production to save memory
            content_length = len(page.content())
            print(f"   Search page loaded, content length: {content_length}")
            
            # Find the first result link - try broader selectors
            product_link = None
            
            # Method 1: Look for any links to game pages
            all_links = page.query_selector_all('a[href*="/game/"]')
            print(f"   Found {len(all_links)} game links")
            
            for link in all_links:
                href = link.get_attribute('href')
                text = link.inner_text().strip().lower()
                
                print(f"   Checking link: {text[:50]}... -> {href}")
                
                # Check if this link matches our card (very flexible matching)
                card_words = card_name.lower().replace('swsh284', '').split()
                matches = 0
                for word in card_words:
                    if len(word) > 2 and word in text:  # Skip very short words
                        matches += 1
                
                if matches >= 1 and 'pokemon' in href.lower():
                    if href.startswith('/'):
                        product_link = f"https://www.pricecharting.com{href}"
                    else:
                        product_link = href
                    print(f"   ✅ Found product link: {product_link}")
                    break
            
            # Method 2: If no direct link found, try alternative search
            if not product_link:
                print("   Method 2: Trying alternative search...")
                alt_search_url = f"https://www.pricecharting.com/search?q={quote(card_name)}"
                page.goto(alt_search_url, timeout=30000)
                page.wait_for_timeout(3000)
                
                # Look for links again
                all_links = page.query_selector_all('a[href*="/game/"]')
                print(f"   Found {len(all_links)} links in alternative search")
                
                for link in all_links:
                    href = link.get_attribute('href')
                    text = link.inner_text().strip().lower()
                    
                    # Very lenient matching for alternative search
                    if any(word in text for word in ['galarian', 'moltres']) and 'pokemon' in href.lower():
                        if href.startswith('/'):
                            product_link = f"https://www.pricecharting.com{href}"
                        else:
                            product_link = href
                        print(f"   ✅ Found product link (alt): {product_link}")
                        break
            
            # Method 3: Try constructing URL directly based on pattern
            if not product_link:
                print("   Method 3: Trying direct URL construction...")
                # Try common patterns for Pokemon cards
                possible_urls = [
                    f"https://www.pricecharting.com/game/pokemon-promo/{card_name.lower().replace(' ', '-')}",
                    f"https://www.pricecharting.com/game/pokemon-promo/galarian-moltres-swsh284",
                ]
                
                for test_url in possible_urls:
                    try:
                        print(f"   Testing URL: {test_url}")
                        response = page.goto(test_url, timeout=15000)
                        if response and response.status == 200:
                            page_title = page.title()
                            if 'error' not in page_title.lower() and '404' not in page_title.lower():
                                product_link = test_url
                                print(f"   ✅ Direct URL works: {product_link}")
                                break
                    except:
                        continue
            
            if not product_link:
                print("   ❌ No product page found with any method")
                return None
            
            # Step 2: Navigate to the product page (if not already there)
            if page.url != product_link:
                print(f"   Step 2 - Loading product page: {product_link}")
                page.goto(product_link, timeout=30000)
                page.wait_for_timeout(3000)
            
            # Debug page content
            content = page.content()
            print(f"   Product page loaded, content length: {len(content)}")
            
            # Step 3: Find the ungraded price in the pricing table
            # Try multiple selectors for the pricing table
            ungraded_price = None
            
            # Method 1: Look for "Ungraded" cell and adjacent price cell
            table_selectors = [
                'table tr',
                '.table tr',
                'tr'
            ]
            
            for table_selector in table_selectors:
                rows = page.query_selector_all(table_selector)
                if not rows:
                    continue
                    
                print(f"   Found {len(rows)} rows with selector: {table_selector}")
                
                for row in rows:
                    try:
                        cells = row.query_selector_all('td')
                        if len(cells) >= 2:
                            # Check if this row contains "Ungraded"
                            first_cell = cells[0].inner_text().strip()
                            second_cell = cells[1].inner_text().strip()
                            
                            print(f"   Row: '{first_cell}' | '{second_cell}'")
                            
                            if first_cell.lower() == 'ungraded':
                                # Extract price from second cell
                                price_patterns = [
                                    r'\$\s*([\d,]+\.?\d*)',
                                    r'([\d,]+\.\d{2})',
                                    r'(\d+\.?\d*)'
                                ]
                                
                                for pattern in price_patterns:
                                    price_match = re.search(pattern, second_cell)
                                    if price_match:
                                        try:
                                            price_usd = float(price_match.group(1).replace(',', ''))
                                            if price_usd > 0.50:
                                                ungraded_price = price_usd
                                                print(f"   ✅ Found ungraded price: ${price_usd}")
                                                break
                                        except:
                                            continue
                                
                                if ungraded_price:
                                    break
                    except Exception as e:
                        continue
                
                if ungraded_price:
                    break
            
            # Method 2: If not found, try looking for price table structure from actual page
            if not ungraded_price:
                print("   Method 2: Looking for price in table structure...")
                
                # Try to find the compare table structure like in the actual page
                price_selectors = [
                    'table td:contains("Ungraded") + td',
                    'tr td:first-child:contains("Ungraded") + td'
                ]
                
                # Manual approach - look for text patterns
                all_text = page.inner_text()
                lines = all_text.split('\n')
                
                for i, line in enumerate(lines):
                    if 'ungraded' in line.lower():
                        print(f"   Found 'ungraded' in line: {line.strip()}")
                        
                        # Look for price patterns in this line and next few lines
                        search_lines = lines[i:i+3]
                        for search_line in search_lines:
                            price_patterns = [
                                r'\$\s*([\d,]+\.?\d*)',
                                r'([\d,]+\.\d{2})',
                                r'(\d+\.?\d*)'
                            ]
                            
                            for pattern in price_patterns:
                                price_match = re.search(pattern, search_line)
                                if price_match:
                                    try:
                                        price_usd = float(price_match.group(1).replace(',', ''))
                                        if price_usd > 0.5:
                                            ungraded_price = price_usd
                                            print(f"   ✅ Found ungraded price in text: ${price_usd}")
                                            break
                                    except:
                                        continue
                            
                            if ungraded_price:
                                break
                        
                        if ungraded_price:
                            break
                
                # Fallback: look for any price-related lines if Price Trend not found
                if not ungraded_price:
                    print("   Fallback: Looking for average price lines...")
                    for i, line in enumerate(lines):
                        if ('average price' in line.lower() and i + 1 < len(lines)):
                            next_line = lines[i + 1].strip()
                            print(f"   Found average price line: {line.strip()}")
                            print(f"   Next line: {next_line}")
                            
                            price_patterns = [
                                r'([\d,]+\.?\d*)\s*€',
                                r'([\d]+,\d{2})'
                            ]
                            
                            for pattern in price_patterns:
                                price_match = re.search(pattern, next_line)
                                if price_match:
                                    try:
                                        price_str = price_match.group(1).replace(',', '.')
                                        test_price = float(price_str)
                                        if test_price > 0.5:
                                            ungraded_price = test_price
                                            print(f"   ✅ Found average price: €{ungraded_price}")
                                            break
                                    except:
                                        continue
                            
                            if ungraded_price:
                                break
            
            if ungraded_price:
                # Convert USD to GBP (approximate rate 1.27)
                price_gbp = round(ungraded_price / 1.27, 2)
                print(f"   ✅ Final result: ${ungraded_price} USD (£{price_gbp} GBP)")
                print(f"   🔗 Price Charting URL: {product_link}")
                
                emit_progress("price_charting", f"Found price data: £{price_gbp}")
                
                return {
                    'title': f"{card_name} (Price Charting)",
                    'price': price_gbp,
                    'source': 'Price Charting',
                    'url': product_link
                }
            else:
                print("   ❌ No ungraded price found on product page")
                emit_progress("price_charting", "No price data found")
                
        except Exception as e:
            print(f"   ❌ Price Charting search failed: {e}")
            emit_progress("price_charting", "Search failed")
        finally:
            # Explicit cleanup for memory optimization
            try:
                context.close()
            except:
                pass
            try:
                browser.close()
            except:
                pass
    
    print("   No matching prices found")
    emit_progress("price_charting", "Price Charting search completed")
    return None

def search_cardmarket(card_name):
    """Search Pokemon TCG API via RapidAPI for comprehensive card data including images and pricing"""
    emit_progress("cardmarket", "Connecting to Pokemon TCG API...")
    print(f"🔍 Searching Pokemon TCG API for: {card_name}")
    
    try:
        # RapidAPI Pokemon TCG API configuration
        api_host = "pokemon-tcg-api.p.rapidapi.com"
        api_key = "2390eefca8msh0b090b1b575b879p1c9090jsn0df6e6a47659"
        
        headers = {
            'X-RapidAPI-Key': api_key,
            'X-RapidAPI-Host': api_host
        }
        
        emit_progress("cardmarket", "Searching for card data...")
        
        # Search for the card using the API - the correct parameter is 'search', not 'q'
        # Format the search query - try different variations
        search_queries = [
            card_name,
            card_name.replace(" ex ", " "),
            card_name.replace(" EX ", " "),
            card_name.replace(" v ", " "),
            card_name.replace(" V ", " "),
            card_name.split()[0] if len(card_name.split()) > 1 else card_name  # First word only
        ]
        
        card_data = None
        for query in search_queries:
            print(f"   Trying search query: {query}")
            
            # Use the correct search parameter for this API
            search_url = f"https://{api_host}/cards"
            params = {
                'search': query,  # This API uses 'search', not 'q'
                'pageSize': 10
            }
            
            response = requests.get(search_url, headers=headers, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   API response received, status: {response.status_code}")
                
                if 'data' in data and data['data']:
                    cards = data['data']
                    print(f"   Found {len(cards)} cards")
                    
                    # Look for the best match
                    for card in cards:
                        card_name_lower = card_name.lower()
                        api_card_name_lower = card.get('name', '').lower()
                        tcgid = card.get('tcgid', '').lower()
                        
                        # Check for exact code match first (highest priority)
                        if any(code in card_name_lower for code in ['swsh050', 'swsh', 'sv', 'xy', 'sm']):
                            if any(code in tcgid for code in ['swsh050', 'swsh', 'sv', 'xy', 'sm']):
                                # Found a card with matching code - this is likely the right one
                                card_data = card
                                print(f"   ✅ Found matching card with code: {card.get('name', 'Unknown')} ({tcgid})")
                                break
                        
                        # Check for name-based match
                        card_terms = card_name_lower.split()
                        # Include important single letters for Pokemon cards
                        key_terms = [term for term in card_terms if len(term) > 2 or term in ['v', 'x', 'ex']]
                        
                        # Count matches in both name and ID
                        name_matches = sum(1 for term in key_terms if term in api_card_name_lower)
                        id_matches = sum(1 for term in key_terms if term in tcgid)
                        total_matches = name_matches + id_matches
                        
                        # Be more flexible with matching - require at least 1 significant match
                        required_matches = 1 if len(key_terms) <= 2 else min(2, len(key_terms))
                        
                        if total_matches >= required_matches:
                            card_data = card
                            print(f"   ✅ Found matching card: {card.get('name', 'Unknown')} ({tcgid}) - {total_matches} matches")
                            break
                    
                    if card_data:
                        break
                else:
                    print(f"   No cards found for query: {query}")
            else:
                print(f"   API request failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
        
        if not card_data:
            emit_progress("cardmarket", "No card data found")
            print("   ❌ No matching card found in API")
            return None
        
        emit_progress("cardmarket", "Processing comprehensive card data...")
        
        # Extract comprehensive card information using the actual API structure
        result = {
            'title': f"{card_data.get('name', card_name)} (Pokemon TCG API)",
            'card_info': {
                'name': card_data.get('name', card_name),
                'set': card_data.get('episode', {}).get('name', 'Unknown Set'),
                'number': str(card_data.get('card_number', 'Unknown')),
                'rarity': card_data.get('rarity', 'Unknown'),
                'artist': card_data.get('artist', {}).get('name', 'Unknown'),
                'hp': str(card_data.get('hp', '')) if card_data.get('hp') else None,
                'types': [],  # This API doesn't seem to have types in the structure we saw
                'supertype': card_data.get('supertype', 'Unknown')
            },
            'images': {},
            'tcgplayer_pricing': {},
            'cardmarket_pricing': {},
            'source': 'Pokemon TCG API',
            'url': None,
            'price': None  # Will be set to best available price
        }
        
        # Extract card images - this API has a single 'image' field
        if 'image' in card_data and card_data['image']:
            result['images'] = {
                'small': card_data['image'],
                'large': card_data['image']  # Same image for both, this API only provides one size
            }
            print(f"   📸 Card image found: {bool(result['images']['small'])}")
        
        # Extract pricing data - this API has a different structure
        if 'prices' in card_data:
            prices = card_data['prices']
            
            # Extract TCGPlayer pricing data (stored as 'tcg_player' in this API)
            if 'tcg_player' in prices:
                tcg_data = prices['tcg_player']
                
                # Create TCGPlayer pricing structure
                result['tcgplayer_pricing'] = {
                    'url': card_data.get('tcggo_url', ''),  # Use the card URL if available
                    'updated_at': '',  # This API doesn't provide update timestamps
                    'prices': {
                        'normal': {
                            'market': tcg_data.get('market_price'),
                            'mid': tcg_data.get('mid_price'),
                            'low': None,
                            'high': None,
                            'directLow': None
                        }
                    }
                }
                
                # Set the primary price from TCGPlayer (convert EUR to GBP)
                if tcg_data.get('market_price'):
                    result['price'] = round(float(tcg_data['market_price']) / 1.17, 2)  # Convert EUR to GBP
                    result['url'] = result['tcgplayer_pricing']['url']
                    print(f"   💰 TCGPlayer market price: €{tcg_data['market_price']} EUR (£{result['price']} GBP)")
                
                print(f"   🇺🇸 TCGPlayer data extracted")
            
            # Extract CardMarket pricing data
            if 'cardmarket' in prices:
                cm_data = prices['cardmarket']
                
                # Create CardMarket pricing structure
                result['cardmarket_pricing'] = {
                    'url': card_data.get('tcggo_url', ''),  # Use the card URL if available
                    'updated_at': '',  # This API doesn't provide update timestamps
                    'prices': {
                        'trendPrice': cm_data.get('30d_average'),
                        'averageSellPrice': cm_data.get('30d_average'),
                        'lowPrice': cm_data.get('lowest_near_mint'),
                        'avg7': cm_data.get('7d_average'),
                        'avg30': cm_data.get('30d_average'),
                        'germanProLow': None,
                        'suggestedPrice': None,
                        'reverseHoloSell': None,
                        'reverseHoloLow': None,
                        'reverseHoloTrend': None,
                        'lowPriceExPlus': None,
                        'avg1': None,
                        'reverseHoloAvg1': None,
                        'reverseHoloAvg7': None,
                        'reverseHoloAvg30': None
                    }
                }
                
                # If no TCGPlayer price, use CardMarket price
                if not result['price'] and cm_data.get('30d_average'):
                    result['price'] = round(float(cm_data['30d_average']) / 1.17, 2)  # Convert EUR to GBP
                    result['url'] = result['cardmarket_pricing']['url']
                    print(f"   💰 CardMarket 30d average: €{cm_data['30d_average']} EUR (£{result['price']} GBP)")
                
                print(f"   🇪🇺 CardMarket data extracted")
        
        # If no pricing data found, estimate from rarity
        if not result['price']:
            # Fallback: estimate based on rarity
            rarity = card_data.get('rarity', '').lower()
            
            # Basic price estimation based on rarity
            rarity_prices = {
                'common': 0.50,
                'uncommon': 1.00,
                'rare': 3.00,
                'rare holo': 8.00,
                'rare holo ex': 15.00,
                'ultra rare': 20.00
            }
            
            estimated_eur = None
            for rarity_key, base_price in rarity_prices.items():
                if rarity_key in rarity:
                    estimated_eur = base_price
                    break
            
            if estimated_eur:
                result['price'] = round(estimated_eur / 1.17, 2)  # Convert EUR to GBP
                print(f"   📊 Estimated price based on rarity '{rarity}': €{estimated_eur} EUR (£{result['price']} GBP)")
        
        if result['price']:
            emit_progress("cardmarket", f"Found comprehensive card data: £{result['price']}")
            
            # Set fallback URL if none provided
            if not result['url']:
                result['url'] = f"https://www.tcgplayer.com/search/pokemon/product?q={quote(card_name)}"
            
            print(f"   ✅ Comprehensive card data extracted:")
            print(f"      💳 Card: {result['card_info']['name']} ({result['card_info']['set']})")
            print(f"      📸 Images: {bool(result['images'].get('small', False))}")
            print(f"      🇺🇸 TCGPlayer: {bool(result['tcgplayer_pricing'].get('prices', {}))}")
            print(f"      🇪🇺 CardMarket: {bool(result['cardmarket_pricing'].get('prices', {}))}")
            print(f"      💰 Final price: £{result['price']} GBP")
            if result['url']:
                print(f"      🔗 URL: {result['url']}")
            
            return result
        else:
            emit_progress("cardmarket", "No pricing data found")
            print("   ❌ No pricing data found")
            return None
            
    except Exception as e:
        print(f"   ❌ Pokemon TCG API search failed: {e}")
        emit_progress("cardmarket", "API search failed")
        return None
    
    finally:
        emit_progress("cardmarket", "Pokemon TCG API search completed")

def analyze_what_to_pay(card_name):
    """Main function to analyze what to pay for a Pokemon card"""
    print("=" * 80)
    print(f"🎯 WHAT TO PAY ANALYZER: {card_name.upper()}")
    print("Raw cards only - auction data (no Buy It Now or graded cards)")
    print("=" * 80)
    
    # Memory monitoring for Railway deployment
    if MEMORY_MONITORING:
        initial_memory = get_memory_usage()
        print(f"💾 Initial memory usage: {initial_memory:.1f}MB")
        if not check_memory_limit(400):
            print("❌ Memory limit exceeded before starting analysis")
            return None
    
    results = {
        'card_name': card_name,
        'timestamp': datetime.now().isoformat(),
        'ebay_prices': [],
        'price_charting': None,
        'cardmarket': None,
        'analysis': {}
    }
    
    # Run all searches in parallel using ThreadPoolExecutor
    print("\n🚀 Running parallel searches...")
    emit_progress("analysis", "Starting price analysis...")
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all three searches to run concurrently
        ebay_future = executor.submit(search_ebay_uk_sold, card_name, 4)
        price_charting_future = executor.submit(search_price_charting, card_name)
        cardmarket_future = executor.submit(search_cardmarket, card_name)
        
        # Collect results as they complete
        print("🔍 STEP 1: eBay UK Finished Auctions (Recent 3) - RUNNING...")
        print("🔍 STEP 2: Price Charting Ungraded - RUNNING...")
        print("🔍 STEP 3: Pokemon TCG API Market Price - RUNNING...")
        
        # Wait for all to complete and get results
        emit_progress("analysis", "Collecting search results...")
        ebay_prices = ebay_future.result()
        price_charting = price_charting_future.result()
        cardmarket = cardmarket_future.result()
    
    elapsed_time = time.time() - start_time
    print(f"\n⚡ All searches completed in {elapsed_time:.1f} seconds")
    emit_progress("analysis", f"All searches completed in {elapsed_time:.1f}s")
    
    # Memory monitoring after searches
    if MEMORY_MONITORING:
        current_memory = get_memory_usage()
        print(f"💾 Memory after searches: {current_memory:.1f}MB")
        check_memory_limit(400)
        # Force garbage collection after intensive scraping
        gc.collect()
    
    results['ebay_prices'] = ebay_prices
    results['price_charting'] = price_charting
    results['cardmarket'] = cardmarket
    
    # 4. Calculate analysis
    print("\n📊 ANALYSIS")
    print("-" * 40)
    
    all_prices = []
    
    # eBay average
    if ebay_prices:
        ebay_total = sum(item['price'] for item in ebay_prices)
        ebay_avg = round(ebay_total / len(ebay_prices), 2)
        all_prices.append(ebay_avg)
        results['analysis']['ebay_average'] = ebay_avg
        print(f"eBay UK Average (last {len(ebay_prices)}): £{ebay_avg}")
    else:
        print("eBay UK Average: No data found")
        results['analysis']['ebay_average'] = None
    
    # Price Charting
    if price_charting:
        all_prices.append(price_charting['price'])
        results['analysis']['price_charting_price'] = price_charting['price']
        print(f"Price Charting: £{price_charting['price']}")
        if 'url' in price_charting:
            print(f"   🔗 URL: {price_charting['url']}")
    else:
        print("Price Charting: No data found")
        results['analysis']['price_charting_price'] = None
    
    # Pokemon TCG API
    if cardmarket:
        all_prices.append(cardmarket['price'])
        results['analysis']['cardmarket_price'] = cardmarket['price']
        print(f"Pokemon TCG API: £{cardmarket['price']}")
        if 'url' in cardmarket:
            print(f"   🔗 URL: {cardmarket['url']}")
    else:
        print("Pokemon TCG API: No data found")
        results['analysis']['cardmarket_price'] = None
    
    # Final recommendation
    if all_prices:
        final_average = round(sum(all_prices) / len(all_prices), 2)
        max_price = round(max(all_prices), 2)
        min_price = round(min(all_prices), 2)
        
        results['analysis']['final_average'] = final_average
        results['analysis']['price_range'] = f"£{min_price} - £{max_price}"
        results['analysis']['recommendation'] = f"£{round(final_average * 0.8, 2)} - £{round(final_average * 0.9, 2)}"
        
        print("\n" + "=" * 40)
        print(f"💰 FINAL ANALYSIS")
        print("=" * 40)
        print(f"Price Range: £{min_price} - £{max_price}")
        print(f"Market Average: £{final_average}")
        print(f"🎯 RECOMMENDED TO PAY: £{round(final_average * 0.8, 2)} - £{round(final_average * 0.9, 2)}")
        print(f"   (80-90% of market average for good deal)")
        print("=" * 40)
        emit_progress("analysis", f"Analysis complete - recommended: {results['analysis']['recommendation']}")
    else:
        results['analysis']['final_average'] = None
        results['analysis']['recommendation'] = "Insufficient data"
        print("\n❌ Insufficient data to make recommendation")
        emit_progress("analysis", "Analysis complete - insufficient data")
    
    return results

def main():
    import os
    
    # Get search term from command line argument or environment variable
    search_term = None
    
    if len(sys.argv) > 1:
        search_term = ' '.join(sys.argv[1:])
    elif os.getenv('SEARCH_TERM'):
        search_term = os.getenv('SEARCH_TERM')
    else:
        search_term = input("Enter Pokemon card name to analyze: ")
    
    if not search_term:
        print("❌ No search term provided")
        return
    
    # Run analysis
    results = analyze_what_to_pay(search_term)
    
    # Save results to JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"what_to_pay_analysis_{timestamp}.json"
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Results saved to: {output_file}")
    print(output_file)  # For the API to capture

if __name__ == "__main__":
    main() 