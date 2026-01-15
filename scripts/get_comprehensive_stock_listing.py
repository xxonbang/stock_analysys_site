#!/usr/bin/env python3.11
"""
한국 주식 전체 종목 리스트를 가져오기 (ETF 포함)
다중 데이터 소스를 활용하여 최대한 완전한 리스트 확보
"""

import sys
import json
import time
import requests
from bs4 import BeautifulSoup

try:
    import FinanceDataReader as fdr
    import pandas as pd
except ImportError as e:
    print(json.dumps({"error": f"Required packages not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

# GitHub 백업 CSV URL
GITHUB_CSV_URL = "https://raw.githubusercontent.com/corazzon/finance-data-analysis/main/krx.csv"

def get_stock_listing_from_naver():
    """네이버 금융에서 ETF 리스트 가져오기 (보조 데이터 소스)"""
    try:
        print("네이버 금융 ETF 리스트 가져오는 중...", file=sys.stderr)
        url = 'https://finance.naver.com/sise/etf.naver'
        response = requests.get(url, timeout=10)
        response.encoding = 'euc-kr'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', {'class': 'type_1'})
        
        etf_list = []
        if table:
            for row in table.find_all('tr')[1:]:  # 헤더 제외
                columns = row.find_all('td')
                if len(columns) >= 2:
                    # 종목명과 종목코드 추출
                    name = columns[0].get_text(strip=True)
                    code = columns[1].get_text(strip=True)
                    if name and code and code.isdigit():
                        etf_list.append({
                            'Symbol': code,
                            'Name': name,
                            'Market': 'ETF'
                        })
        
        print(f"네이버 금융에서 {len(etf_list)}개 ETF 가져옴", file=sys.stderr)
        return etf_list
    except Exception as e:
        print(f"네이버 금융 크롤링 실패: {str(e)}", file=sys.stderr)
        return []

def get_stock_listing_from_github():
    """GitHub 백업 CSV에서 종목 리스트 가져오기 (Fallback)"""
    try:
        print("GitHub 백업 CSV 사용 중...", file=sys.stderr)
        df = pd.read_csv(GITHUB_CSV_URL)
        
        # 컬럼명 정규화
        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower()
            if 'symbol' in col_lower or 'code' in col_lower or 'ticker' in col_lower:
                column_mapping[col] = 'Symbol'
            elif 'name' in col_lower or '종목명' in col_lower:
                column_mapping[col] = 'Name'
            elif 'market' in col_lower or '시장' in col_lower:
                column_mapping[col] = 'Market'
        
        df = df.rename(columns=column_mapping)
        
        required_cols = ['Symbol', 'Name']
        available_cols = [col for col in required_cols if col in df.columns]
        
        if 'Market' not in df.columns:
            df['Market'] = 'KRX'
        
        result_data = df[available_cols + ['Market']].to_dict('records')
        
        return {
            "success": True,
            "data": result_data,
            "count": len(result_data),
            "source": "github_csv"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"GitHub CSV failed: {str(e)}",
            "error_type": "GitHubCSVError"
        }

def get_comprehensive_stock_listing(max_retries=3, retry_delay=2):
    """종합적인 종목 리스트 가져오기 (다중 데이터 소스 활용)"""
    all_stocks = []
    sources_used = []
    
    # 1. FinanceDataReader StockListing (주 데이터 소스)
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = retry_delay * attempt
                print(f"FinanceDataReader 재시도 {attempt + 1}/{max_retries} (대기 {wait_time}초)...", file=sys.stderr)
                time.sleep(wait_time)
            
            stock_list = fdr.StockListing('KRX')
            
            if stock_list is not None and not stock_list.empty:
                columns_to_include = ['Symbol', 'Name', 'Market']
                available_columns = [col for col in columns_to_include if col in stock_list.columns]
                
                if available_columns:
                    result_data = stock_list[available_columns].to_dict('records')
                    all_stocks.extend(result_data)
                    sources_used.append(f"FinanceDataReader ({len(result_data)} stocks)")
                    print(f"FinanceDataReader에서 {len(result_data)}개 종목 가져옴", file=sys.stderr)
                    break
        except Exception as e:
            print(f"FinanceDataReader 오류 (시도 {attempt + 1}/{max_retries}): {str(e)}", file=sys.stderr)
            if attempt == max_retries - 1:
                # FinanceDataReader 실패 시 GitHub CSV 사용
                github_result = get_stock_listing_from_github()
                if github_result.get("success"):
                    all_stocks.extend(github_result["data"])
                    sources_used.append(f"GitHub CSV ({len(github_result['data'])} stocks)")
    
    # 2. 네이버 금융에서 ETF 리스트 가져오기 (보조 데이터 소스)
    try:
        naver_etf_list = get_stock_listing_from_naver()
        if naver_etf_list:
            all_stocks.extend(naver_etf_list)
            sources_used.append(f"Naver Finance ({len(naver_etf_list)} ETFs)")
    except Exception as e:
        print(f"네이버 금융 크롤링 실패: {str(e)}", file=sys.stderr)
    
    # 3. 중복 제거 (Symbol 기준, Name은 가장 긴 것 유지 - 정확한 종목명 보장)
    unique_stocks = {}
    for stock in all_stocks:
        if not stock.get('Symbol') or not stock.get('Name'):
            continue
        
        symbol = str(stock['Symbol']).strip()
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
    result = get_comprehensive_stock_listing()
    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
