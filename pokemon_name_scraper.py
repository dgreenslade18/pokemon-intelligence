#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import time
from datetime import datetime
from playwright.sync_api import sync_playwright
from urllib.parse import urljoin

def main():
    print("🔍 POKEMON NAME MAPPING SCRAPER")
    print("Scraping comprehensive Japanese ↔ English Pokemon name mappings")
    print("=" * 80)
    
    # Scrape the Pokemon name mappings
    mappings = scrape_pokemon_name_mappings()
    
    if mappings:
        # Save to JSON file
        save_mappings_to_file(mappings)
        
        # Test the mappings with our problematic examples
        test_mappings(mappings)
        
        # Show how this improves our eBay searches
        demonstrate_improvement(mappings)
    else:
        print("❌ Failed to scrape mappings")

def scrape_pokemon_name_mappings():
    """Scrape Pokemon name mappings from the wiki"""
    
    base_url = "https://pokemonaventurine.fandom.com/wiki/List_of_Japanese_Pok%C3%A9mon_names"
    
    print(f"🌐 Accessing: {base_url}")
    
    mappings = {}
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Set user agent to avoid blocking
            page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            })
            
            page.goto(base_url, wait_until='load', timeout=30000)
            time.sleep(3)
            
            print("📋 Page loaded, extracting Pokemon name tables...")
            
            # Find all tables with Pokemon data
            tables = page.query_selector_all('table')
            print(f"Found {len(tables)} tables")
            
            total_pokemon = 0
            
            for table_idx, table in enumerate(tables):
                try:
                    rows = table.query_selector_all('tr')
                    
                    for row in rows[1:]:  # Skip header row
                        cells = row.query_selector_all('td')
                        
                        if len(cells) >= 5:  # Ensure we have all required columns
                            try:
                                # Extract data from table structure
                                # [Ndex, Image, English, Japanese Kana, Hepburn, Trademarked]
                                ndex = cells[0].inner_text().strip()
                                english_name = cells[2].inner_text().strip()
                                japanese_kana = cells[3].inner_text().strip()
                                hepburn = cells[4].inner_text().strip()
                                
                                # Skip if any critical data is missing
                                if not english_name or not japanese_kana or english_name == "English":
                                    continue
                                
                                # Clean up names
                                english_name = clean_pokemon_name(english_name)
                                japanese_kana = japanese_kana.strip()
                                
                                if english_name and japanese_kana:
                                    mappings[japanese_kana] = {
                                        'english': english_name,
                                        'hepburn': hepburn.strip(),
                                        'ndex': ndex
                                    }
                                    total_pokemon += 1
                                    
                                    if total_pokemon <= 10:  # Show first 10 for verification
                                        print(f"  {ndex:>3}: {japanese_kana} → {english_name}")
                            
                            except Exception as e:
                                continue
                                
                except Exception as e:
                    continue
            
            browser.close()
            
            print(f"\n✅ Successfully scraped {total_pokemon} Pokemon name mappings")
            return mappings
            
    except Exception as e:
        print(f"❌ Error scraping Pokemon names: {e}")
        return None

def clean_pokemon_name(name):
    """Clean up Pokemon name from table data"""
    
    # Remove common unwanted elements
    name = re.sub(r'\([^)]*\)', '', name)  # Remove parentheses content
    name = re.sub(r'\s+', ' ', name)       # Normalize whitespace
    name = name.strip()
    
    # Skip non-Pokemon entries
    skip_terms = ['English', 'Ndex', 'Japanese', 'Kana', 'Image', '']
    if name in skip_terms:
        return None
    
    return name

def save_mappings_to_file(mappings):
    """Save Pokemon name mappings to JSON file"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"pokemon_name_mappings_{timestamp}.json"
    
    # Also save a clean version without timestamp for easy access
    clean_filename = "pokemon_name_mappings.json"
    
    mapping_data = {
        'created': datetime.now().isoformat(),
        'total_pokemon': len(mappings),
        'mappings': mappings
    }
    
    # Save timestamped version
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, ensure_ascii=False, indent=2)
    
    # Save clean version
    with open(clean_filename, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Mappings saved to:")
    print(f"   📁 {filename}")
    print(f"   📁 {clean_filename}")

def test_mappings(mappings):
    """Test mappings with known examples"""
    
    print(f"\n🧪 TESTING MAPPINGS WITH KNOWN EXAMPLES:")
    print("=" * 50)
    
    test_cases = [
        ('リザードン', 'Charizard'),      # Should be Charizard, not Lizardon
        ('ラティアス', 'Latias'),         # Our current card
        ('ピカチュウ', 'Pikachu'),        # Popular example
        ('フシギダネ', 'Bulbasaur'),      # First Pokemon
        ('ミュウツー', 'Mewtwo'),         # Another popular one
    ]
    
    for japanese, expected_english in test_cases:
        if japanese in mappings:
            actual_english = mappings[japanese]['english']
            status = "✅" if actual_english == expected_english else "❌"
            print(f"  {status} {japanese} → {actual_english} (expected: {expected_english})")
        else:
            print(f"  ❓ {japanese} → NOT FOUND (expected: {expected_english})")

def demonstrate_improvement(mappings):
    """Show how this improves our eBay search quality"""
    
    print(f"\n🚀 SEARCH IMPROVEMENT DEMONSTRATION:")
    print("=" * 50)
    
    # Example card names from our scraping
    example_cards = [
        {
            'raw': 'ラティアスex【SAR】{087/064}',
            'pokemon_part': 'ラティアス',
            'description': 'Our current Latias ex SAR card'
        },
        {
            'raw': 'リザードンex【SAR】{123/456}',  
            'pokemon_part': 'リザードン',
            'description': 'Hypothetical Charizard ex SAR'
        },
        {
            'raw': 'ピカチュウVMAX【HR】{789/123}',
            'pokemon_part': 'ピカチュウ',
            'description': 'Hypothetical Pikachu VMAX'
        }
    ]
    
    for card in example_cards:
        print(f"\n📋 Card: {card['description']}")
        print(f"   Raw name: {card['raw']}")
        print(f"   Pokemon part: {card['pokemon_part']}")
        
        if card['pokemon_part'] in mappings:
            english_name = mappings[card['pokemon_part']]['english']
            print(f"   ✅ Mapped to: {english_name}")
            
            # Show search improvements
            old_search = f"japanese pokemon {card['pokemon_part'].lower()} 087/064"
            new_search = f"japanese pokemon {english_name.lower()} 087/064"
            
            print(f"   🔍 OLD eBay search: '{old_search}'")
            print(f"   🎯 NEW eBay search: '{new_search}'")
            print(f"   💡 Improvement: Much more likely to find actual listings!")
        else:
            print(f"   ❌ NOT FOUND in mappings")

def load_pokemon_mappings(filename="pokemon_name_mappings.json"):
    """Utility function to load saved mappings"""
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data['mappings']
    except Exception as e:
        print(f"❌ Error loading mappings: {e}")
        return {}

def lookup_pokemon_english_name(japanese_name, mappings=None):
    """Lookup English Pokemon name from Japanese name"""
    
    if mappings is None:
        mappings = load_pokemon_mappings()
    
    # Try exact match first
    if japanese_name in mappings:
        return mappings[japanese_name]['english']
    
    # Try removing common suffixes and retrying
    base_name = re.sub(r'(ex|EX|VMAX|V|GX)$', '', japanese_name).strip()
    if base_name in mappings:
        return mappings[base_name]['english']
    
    return None

if __name__ == "__main__":
    main() 