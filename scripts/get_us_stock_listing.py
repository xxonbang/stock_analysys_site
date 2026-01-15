#!/usr/bin/env python3.11
"""
미국 주식 전체 종목 리스트를 가져오기 (ETF 포함)
다중 데이터 소스를 활용하여 최대한 완전한 리스트 확보
"""

import sys
import json
import requests

try:
    import FinanceDataReader as fdr
    import pandas as pd
except ImportError as e:
    print(json.dumps({"error": f"Required packages not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

# GitHub 리소스 URL (US Stock Symbols)
GITHUB_US_STOCKS_URL = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/all/all_tickers.json"

def get_us_stocks_from_github():
    """GitHub에서 미국 주식 리스트 가져오기"""
    try:
        print("GitHub에서 미국 주식 리스트 가져오는 중...", file=sys.stderr)
        response = requests.get(GITHUB_US_STOCKS_URL, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        stocks = []
        
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    symbol = item.get('Symbol') or item.get('symbol') or item.get('ticker')
                    name = item.get('Name') or item.get('name') or item.get('company')
                    if symbol and name:
                        stocks.append({
                            'Symbol': symbol,
                            'Name': name,
                            'Market': 'US'
                        })
        elif isinstance(data, dict):
            # 딕셔너리 형태인 경우
            for symbol, name in data.items():
                if symbol and name:
                    stocks.append({
                        'Symbol': symbol,
                        'Name': name if isinstance(name, str) else str(name),
                        'Market': 'US'
                    })
        
        print(f"GitHub에서 {len(stocks)}개 미국 주식 가져옴", file=sys.stderr)
        return stocks
    except Exception as e:
        print(f"GitHub 미국 주식 리스트 가져오기 실패: {str(e)}", file=sys.stderr)
        return []

def get_us_stocks_from_financedatareader():
    """FinanceDataReader에서 미국 주식 리스트 가져오기"""
    try:
        print("FinanceDataReader에서 미국 주식 리스트 가져오는 중...", file=sys.stderr)
        # NASDAQ, NYSE 등 주요 거래소
        exchanges = ['NASDAQ', 'NYSE', 'AMEX']
        all_stocks = []
        
        for exchange in exchanges:
            try:
                stock_list = fdr.StockListing(exchange)
                if stock_list is not None and not stock_list.empty:
                    if 'Symbol' in stock_list.columns and 'Name' in stock_list.columns:
                        result_data = stock_list[['Symbol', 'Name']].to_dict('records')
                        for stock in result_data:
                            stock['Market'] = exchange
                        all_stocks.extend(result_data)
                        print(f"{exchange}에서 {len(result_data)}개 종목 가져옴", file=sys.stderr)
            except Exception as e:
                print(f"{exchange} 가져오기 실패: {str(e)}", file=sys.stderr)
                continue
        
        return all_stocks
    except Exception as e:
        print(f"FinanceDataReader 미국 주식 리스트 가져오기 실패: {str(e)}", file=sys.stderr)
        return []

def get_comprehensive_us_stock_listing():
    """종합적인 미국 주식 리스트 가져오기 (다중 데이터 소스 활용)"""
    all_stocks = []
    sources_used = []
    
    # 1. FinanceDataReader (주 데이터 소스)
    try:
        fdr_stocks = get_us_stocks_from_financedatareader()
        if fdr_stocks:
            all_stocks.extend(fdr_stocks)
            sources_used.append(f"FinanceDataReader ({len(fdr_stocks)} stocks)")
    except Exception as e:
        print(f"FinanceDataReader 실패: {str(e)}", file=sys.stderr)
    
    # 2. GitHub 리소스 (보조 데이터 소스)
    try:
        github_stocks = get_us_stocks_from_github()
        if github_stocks:
            all_stocks.extend(github_stocks)
            sources_used.append(f"GitHub ({len(github_stocks)} stocks)")
    except Exception as e:
        print(f"GitHub 리소스 실패: {str(e)}", file=sys.stderr)
    
    # 3. 중복 제거 (Symbol 기준, Name은 가장 긴 것 유지 - 정확한 종목명 보장)
    unique_stocks = {}
    for stock in all_stocks:
        if not stock.get('Symbol') or not stock.get('Name'):
            continue
        
        symbol = str(stock['Symbol']).strip().upper()
        name = str(stock['Name']).strip()
        
        if symbol not in unique_stocks:
            unique_stocks[symbol] = stock
        else:
            # 기존 종목보다 이름이 더 긴 경우 업데이트 (정확한 종목명 보장)
            existing_name = unique_stocks[symbol]['Name']
            if len(name) > len(existing_name):
                unique_stocks[symbol] = stock
    
    final_stocks = list(unique_stocks.values())
    
    return {
        "success": True,
        "data": final_stocks,
        "count": len(final_stocks),
        "sources": sources_used,
        "source": "comprehensive"
    }

if __name__ == '__main__':
    result = get_comprehensive_us_stock_listing()
    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
