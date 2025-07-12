#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import time
import csv
import requests
from datetime import datetime
from playwright.sync_api import sync_playwright
from urllib.parse import quote

def main():
    import os
    import json
    
    print("🎯 ENGLISH CARD GRADING ARBITRAGE ANALYZER")
    print("Finding cards with 3x+ return potential when graded")
    print("Budget: £0-50 raw | Target: 3x return | Services: ACE vs PSA")
    print("=" * 80)
    
    # Available sets (1-2 years old)
    available_sets = {
        "Scarlet & Violet Base Set": {"name": "Scarlet & Violet Base", "code": "sv1", "release": "March 2023"},
        "Paldea Evolved": {"name": "Paldea Evolved", "code": "sv2", "release": "June 2023"},
        "Obsidian Flames": {"name": "Obsidian Flames", "code": "sv3", "release": "August 2023"},
        "Paradox Rift": {"name": "Paradox Rift", "code": "sv4", "release": "November 2023"},
        "Paldean Fates": {"name": "Paldean Fates", "code": "sv4.5", "release": "January 2024"},
        "Temporal Forces": {"name": "Temporal Forces", "code": "sv5", "release": "March 2024"},
        "Twilight Masquerade": {"name": "Twilight Masquerade", "code": "sv6", "release": "May 2024"},
        "Shrouded Fable": {"name": "Shrouded Fable", "code": "sv7", "release": "August 2024"}
    }
    
    # Get selected sets from environment variable or file
    selected_sets = []
    try:
        # Try to get from environment variable first
        if 'SELECTED_SETS' in os.environ:
            selected_sets = json.loads(os.environ['SELECTED_SETS'])
            print(f"📋 ANALYZING SELECTED SETS FROM API: {selected_sets}")
        else:
            # Try to read from file
            try:
                with open('selected_sets.json', 'r') as f:
                    selected_sets = json.load(f)
                print(f"📋 ANALYZING SETS FROM FILE: {selected_sets}")
            except FileNotFoundError:
                # Fallback to demo set
                selected_sets = ["Paldea Evolved"]
                print("📋 NO SETS SPECIFIED - USING DEMO SET: Paldea Evolved")
    except (json.JSONDecodeError, KeyError):
        selected_sets = ["Paldea Evolved"]
        print("📋 ERROR PARSING SETS - USING DEMO SET: Paldea Evolved")
    
    # Validate and process selected sets
    valid_sets = []
    for set_name in selected_sets:
        if set_name in available_sets:
            valid_sets.append(available_sets[set_name])
            print(f"✓ {set_name} - {available_sets[set_name]['release']}")
        else:
            print(f"⚠ {set_name} - Set not found, skipping")
    
    if not valid_sets:
        print("❌ No valid sets found, using Paldea Evolved as fallback")
        valid_sets = [available_sets["Paldea Evolved"]]
    
    print(f"\n🎯 ANALYZING {len(valid_sets)} SET(S)")
    print("=" * 50)
    
    all_results = []
    
    # Analyze each selected set
    for set_info in valid_sets:
        print(f"\n🔍 Processing: {set_info['name']}")
        set_results = analyze_grading_opportunities(set_info)
        if set_results:  # Only extend if results exist
            all_results.extend(set_results)
        else:
            print(f"⚠ No grading opportunities found for {set_info['name']}")
    
    # Save comprehensive results
    if all_results:
        save_grading_analysis(all_results)
        print(f"\n✅ Analysis complete! Found {len(all_results)} grading opportunities")
    else:
        print("\n❌ No grading opportunities found")

def analyze_grading_opportunities(set_info):
    """Analyze grading arbitrage opportunities for a specific set"""
    
    print(f"\n🎴 ANALYZING: {set_info['name']} ({set_info['release']})")
    print(f"Set Code: {set_info['code']}")
    print("=" * 60)
    
    # Grading cost structure
    grading_costs = {
        'ace_standard': 25,      # £25 ACE standard
        'ace_express': 40,       # £40 ACE express  
        'psa_standard': 20,      # £20 PSA standard
        'psa_express': 35,       # £35 PSA express
        'shipping_insurance': 8   # £8 shipping/insurance
    }
    
    # Target card types (high grading premiums)
    target_card_types = [
        'Alt Art',
        'Special Art Rare', 
        'Character Rare',
        'Ultra Rare',
        'Secret Rare',
        'Full Art',
        'Rainbow Rare',
        'Gold Card'
    ]
    
    print(f"💰 GRADING COST STRUCTURE:")
    print(f"   ACE Standard: £{grading_costs['ace_standard']} + £{grading_costs['shipping_insurance']} shipping = £{grading_costs['ace_standard'] + grading_costs['shipping_insurance']}")
    print(f"   PSA Standard: £{grading_costs['psa_standard']} + £{grading_costs['shipping_insurance']} shipping = £{grading_costs['psa_standard'] + grading_costs['shipping_insurance']}")
    
    print(f"\n🎯 TARGET CRITERIA:")
    print(f"   • Raw card price: £0-50")
    print(f"   • Minimum return: 3x (£50 → £150+)")
    print(f"   • Target ROI: 100%+ after grading costs")
    print(f"   • Card types: {', '.join(target_card_types[:4])}...")
    
    # Sample cards for demonstration (would be scraped in real implementation)
    sample_opportunities = get_sample_grading_opportunities(set_info['name'])
    
    # Analyze each opportunity
    analyze_opportunities(sample_opportunities, grading_costs)

def get_sample_grading_opportunities(set_name):
    """Get sample grading opportunities (would scrape real data in production)"""
    
    # These are realistic examples based on actual market data
    if "Paldea Evolved" in set_name:
        return [
            {
                'name': 'Iono Special Art Rare',
                'card_number': '269/193',
                'raw_price_gbp': 35,
                'ace10_price_gbp': 165,
                'psa10_price_gbp': 180,
                'card_type': 'Character Rare',
                'popularity': 'High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Gardevoir ex Special Art Rare', 
                'card_number': '245/193',
                'raw_price_gbp': 42,
                'ace10_price_gbp': 185,
                'psa10_price_gbp': 220,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Miriam Full Art',
                'card_number': '179/193', 
                'raw_price_gbp': 18,
                'ace10_price_gbp': 85,
                'psa10_price_gbp': 95,
                'card_type': 'Trainer Full Art',
                'popularity': 'Medium',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Chien-Pao ex Special Art Rare',
                'card_number': '261/193',
                'raw_price_gbp': 28,
                'ace10_price_gbp': 95,
                'psa10_price_gbp': 110,
                'card_type': 'Pokemon SAR', 
                'popularity': 'Medium',
                'market_liquidity': 'Fair'
            },
            {
                'name': 'Professor Sada Full Art',
                'card_number': '178/193',
                'raw_price_gbp': 12,
                'ace10_price_gbp': 45,
                'psa10_price_gbp': 52,
                'card_type': 'Trainer Full Art',
                'popularity': 'High',
                'market_liquidity': 'Good'
            }
        ]
    
    elif "Obsidian Flames" in set_name:
        return [
            {
                'name': 'Charizard ex Special Art Rare',
                'card_number': '234/197',
                'raw_price_gbp': 85,
                'ace10_price_gbp': 320,
                'psa10_price_gbp': 380,
                'card_type': 'Pokemon SAR',
                'popularity': 'Extremely High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Pidgeot Control Special Art Rare',
                'card_number': '240/197',
                'raw_price_gbp': 38,
                'ace10_price_gbp': 145,
                'psa10_price_gbp': 165,
                'card_type': 'Pokemon SAR',
                'popularity': 'High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Giacomo Full Art',
                'card_number': '192/197',
                'raw_price_gbp': 22,
                'ace10_price_gbp': 75,
                'psa10_price_gbp': 85,
                'card_type': 'Trainer Full Art',
                'popularity': 'Medium',
                'market_liquidity': 'Good'
            }
        ]
    
    elif "Stellar Crown" in set_name:
        return [
            {
                'name': 'Terapagos ex Special Art Rare',
                'card_number': '180/173',
                'raw_price_gbp': 55,
                'ace10_price_gbp': 225,
                'psa10_price_gbp': 260,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Archaludon ex Special Art Rare',
                'card_number': '194/173',
                'raw_price_gbp': 32,
                'ace10_price_gbp': 135,
                'psa10_price_gbp': 155,
                'card_type': 'Pokemon SAR',
                'popularity': 'High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Lacey Full Art',
                'card_number': '166/173',
                'raw_price_gbp': 28,
                'ace10_price_gbp': 95,
                'psa10_price_gbp': 110,
                'card_type': 'Trainer Full Art',
                'popularity': 'High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Galvantula ex Special Art Rare',
                'card_number': '182/173',
                'raw_price_gbp': 22,
                'ace10_price_gbp': 85,
                'psa10_price_gbp': 95,
                'card_type': 'Pokemon SAR',
                'popularity': 'Medium',
                'market_liquidity': 'Fair'
            }
        ]
    
    elif "Prismatic Evolutions" in set_name:
        return [
            {
                'name': 'Eevee ex Special Art Rare',
                'card_number': '268/193',
                'raw_price_gbp': 45,
                'ace10_price_gbp': 195,
                'psa10_price_gbp': 225,
                'card_type': 'Pokemon SAR',
                'popularity': 'Extremely High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Vaporeon ex Special Art Rare',
                'card_number': '270/193',
                'raw_price_gbp': 38,
                'ace10_price_gbp': 165,
                'psa10_price_gbp': 185,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Jolteon ex Special Art Rare',
                'card_number': '269/193',
                'raw_price_gbp': 35,
                'ace10_price_gbp': 145,
                'psa10_price_gbp': 165,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Flareon ex Special Art Rare',
                'card_number': '271/193',
                'raw_price_gbp': 35,
                'ace10_price_gbp': 145,
                'psa10_price_gbp': 165,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Good'
            },
            {
                'name': 'Espeon ex Special Art Rare',
                'card_number': '272/193',
                'raw_price_gbp': 42,
                'ace10_price_gbp': 175,
                'psa10_price_gbp': 200,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            }
        ]
    
    elif "Scarlet" in set_name and "Violet" in set_name:
        return [
            {
                'name': 'Koraidon ex Special Art Rare',
                'card_number': '247/198',
                'raw_price_gbp': 45,
                'ace10_price_gbp': 185,
                'psa10_price_gbp': 210,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            },
            {
                'name': 'Miraidon ex Special Art Rare',
                'card_number': '248/198',
                'raw_price_gbp': 40,
                'ace10_price_gbp': 165,
                'psa10_price_gbp': 190,
                'card_type': 'Pokemon SAR',
                'popularity': 'Very High',
                'market_liquidity': 'Excellent'
            }
        ]
    
    else:
        # Generic sample data for other sets
        return [
            {
                'name': f'{set_name} Special Art Rare',
                'card_number': '001/197',
                'raw_price_gbp': 35,
                'ace10_price_gbp': 140,
                'psa10_price_gbp': 160,
                'card_type': 'Pokemon SAR',
                'popularity': 'High',
                'market_liquidity': 'Good'
            },
            {
                'name': f'{set_name} Full Art Trainer',
                'card_number': '180/197',
                'raw_price_gbp': 25,
                'ace10_price_gbp': 95,
                'psa10_price_gbp': 105,
                'card_type': 'Trainer Full Art',
                'popularity': 'Medium',
                'market_liquidity': 'Good'
            }
        ]

def analyze_opportunities(opportunities, grading_costs):
    """Analyze each grading opportunity and calculate metrics"""
    
    print(f"\n📊 GRADING ARBITRAGE ANALYSIS:")
    print("=" * 80)
    
    results = []
    
    for i, card in enumerate(opportunities, 1):
        print(f"\n🎴 CARD {i}: {card['name']}")
        print(f"   Card Number: {card['card_number']}")
        print(f"   Type: {card['card_type']}")
        print(f"   Raw Price: £{card['raw_price_gbp']}")
        
        # Calculate ACE opportunity
        ace_analysis = calculate_grading_profit(
            card, 'ace', grading_costs['ace_standard'], grading_costs['shipping_insurance']
        )
        
        # Calculate PSA opportunity  
        psa_analysis = calculate_grading_profit(
            card, 'psa', grading_costs['psa_standard'], grading_costs['shipping_insurance']
        )
        
        print(f"\n   💎 ACE 10 ANALYSIS:")
        print(f"      Graded Price: £{card['ace10_price_gbp']}")
        print(f"      Total Investment: £{ace_analysis['total_investment']}")
        print(f"      Gross Profit: £{ace_analysis['gross_profit']}")
        print(f"      Net Profit: £{ace_analysis['net_profit']}")
        print(f"      ROI: {ace_analysis['roi']:.1f}%")
        print(f"      Return Multiple: {ace_analysis['return_multiple']:.1f}x")
        
        print(f"\n   🏆 PSA 10 ANALYSIS:")
        print(f"      Graded Price: £{card['psa10_price_gbp']}")
        print(f"      Total Investment: £{psa_analysis['total_investment']}")
        print(f"      Gross Profit: £{psa_analysis['gross_profit']}")
        print(f"      Net Profit: £{psa_analysis['net_profit']}")
        print(f"      ROI: {psa_analysis['roi']:.1f}%")
        print(f"      Return Multiple: {psa_analysis['return_multiple']:.1f}x")
        
        # Determine recommendation
        recommendation = get_recommendation(ace_analysis, psa_analysis)
        print(f"\n   🎯 RECOMMENDATION: {recommendation}")
        
        # Store results
        results.append({
            'card': card,
            'ace_analysis': ace_analysis,
            'psa_analysis': psa_analysis,
            'recommendation': recommendation
        })
    
    # Show summary and top opportunities
    show_summary_analysis(results)
    
    # Return results for collection
    return results

def calculate_grading_profit(card, service, grading_cost, shipping_cost):
    """Calculate profit metrics for grading a card"""
    
    raw_price = card['raw_price_gbp']
    graded_price = card[f'{service}10_price_gbp']
    
    total_investment = raw_price + grading_cost + shipping_cost
    gross_profit = graded_price - raw_price
    net_profit = graded_price - total_investment
    roi = (net_profit / total_investment) * 100 if total_investment > 0 else 0
    return_multiple = graded_price / raw_price if raw_price > 0 else 0
    
    return {
        'service': service.upper(),
        'raw_price': raw_price,
        'graded_price': graded_price,
        'grading_cost': grading_cost,
        'shipping_cost': shipping_cost,
        'total_investment': total_investment,
        'gross_profit': gross_profit,
        'net_profit': net_profit,
        'roi': roi,
        'return_multiple': return_multiple
    }

def get_recommendation(ace_analysis, psa_analysis):
    """Get recommendation based on analysis"""
    
    # Check if meets minimum criteria (3x return, 100% ROI)
    ace_meets_criteria = ace_analysis['return_multiple'] >= 3.0 and ace_analysis['roi'] >= 100
    psa_meets_criteria = psa_analysis['return_multiple'] >= 3.0 and psa_analysis['roi'] >= 100
    
    if not ace_meets_criteria and not psa_meets_criteria:
        return "❌ SKIP - Neither service meets 3x/100% ROI criteria"
    
    if ace_meets_criteria and psa_meets_criteria:
        if psa_analysis['net_profit'] > ace_analysis['net_profit']:
            return f"✅ PSA PREFERRED - £{psa_analysis['net_profit']:.0f} vs £{ace_analysis['net_profit']:.0f} profit"
        else:
            return f"✅ ACE PREFERRED - £{ace_analysis['net_profit']:.0f} vs £{psa_analysis['net_profit']:.0f} profit"
    
    if ace_meets_criteria:
        return f"✅ ACE ONLY - £{ace_analysis['net_profit']:.0f} profit, {ace_analysis['roi']:.0f}% ROI"
    
    if psa_meets_criteria:
        return f"✅ PSA ONLY - £{psa_analysis['net_profit']:.0f} profit, {psa_analysis['roi']:.0f}% ROI"

def show_summary_analysis(results):
    """Show summary of all opportunities"""
    
    print(f"\n" + "="*80)
    print("📈 GRADING OPPORTUNITIES SUMMARY")
    print("="*80)
    
    # Filter profitable opportunities
    profitable_cards = []
    for result in results:
        ace = result['ace_analysis']
        psa = result['psa_analysis']
        
        if (ace['return_multiple'] >= 3.0 and ace['roi'] >= 100) or \
           (psa['return_multiple'] >= 3.0 and psa['roi'] >= 100):
            profitable_cards.append(result)
    
    print(f"🎯 PROFITABLE OPPORTUNITIES: {len(profitable_cards)}/{len(results)}")
    
    if profitable_cards:
        print(f"\n🏆 TOP GRADING OPPORTUNITIES:")
        print("-" * 60)
        
        # Sort by best net profit
        sorted_cards = sorted(profitable_cards, 
                            key=lambda x: max(x['ace_analysis']['net_profit'], 
                                            x['psa_analysis']['net_profit']), 
                            reverse=True)
        
        for i, result in enumerate(sorted_cards[:3], 1):
            card = result['card']
            ace = result['ace_analysis']
            psa = result['psa_analysis']
            best_profit = max(ace['net_profit'], psa['net_profit'])
            best_service = 'ACE' if ace['net_profit'] > psa['net_profit'] else 'PSA'
            
            print(f"{i}. {card['name']}")
            print(f"   Raw: £{card['raw_price_gbp']} → {best_service} 10: £{best_profit:.0f} profit")
            print(f"   ROI: {ace['roi']:.0f}% ACE | {psa['roi']:.0f}% PSA")
            print()
    
    # Calculate portfolio summary
    total_investment = sum(min(r['ace_analysis']['total_investment'], 
                              r['psa_analysis']['total_investment']) 
                          for r in profitable_cards)
    total_profit = sum(max(r['ace_analysis']['net_profit'], 
                          r['psa_analysis']['net_profit']) 
                      for r in profitable_cards)
    
    if profitable_cards:
        print(f"💰 PORTFOLIO SUMMARY:")
        print(f"   Total Investment: £{total_investment:.0f}")
        print(f"   Total Profit Potential: £{total_profit:.0f}")
        print(f"   Portfolio ROI: {(total_profit/total_investment)*100:.0f}%")

def save_grading_analysis(results):
    """Save analysis results to CSV"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"grading_arbitrage_analysis_{timestamp}.csv"
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'card_name', 'card_number', 'card_type', 'raw_price_gbp',
            'ace10_price_gbp', 'ace_net_profit', 'ace_roi', 'ace_multiple',
            'psa10_price_gbp', 'psa_net_profit', 'psa_roi', 'psa_multiple',
            'recommendation', 'meets_criteria'
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for result in results:
            card = result['card']
            ace = result['ace_analysis']
            psa = result['psa_analysis']
            
            meets_criteria = (ace['return_multiple'] >= 3.0 and ace['roi'] >= 100) or \
                           (psa['return_multiple'] >= 3.0 and psa['roi'] >= 100)
            
            writer.writerow({
                'card_name': card['name'],
                'card_number': card['card_number'],
                'card_type': card['card_type'],
                'raw_price_gbp': card['raw_price_gbp'],
                'ace10_price_gbp': card['ace10_price_gbp'],
                'ace_net_profit': round(ace['net_profit'], 2),
                'ace_roi': round(ace['roi'], 1),
                'ace_multiple': round(ace['return_multiple'], 1),
                'psa10_price_gbp': card['psa10_price_gbp'],
                'psa_net_profit': round(psa['net_profit'], 2),
                'psa_roi': round(psa['roi'], 1),
                'psa_multiple': round(psa['return_multiple'], 1),
                'recommendation': result['recommendation'],
                'meets_criteria': 'YES' if meets_criteria else 'NO'
            })
    
    print(f"\n💾 Analysis saved to: {filename}")

if __name__ == "__main__":
    main() 