#!/usr/bin/env python3.11
"""
KRX 전체 종목 리스트를 가져와서 JSON으로 출력
재시도 로직 및 오류 처리 포함
FinanceDataReader 실패 시 GitHub 백업 CSV 사용
"""

import sys
import json
import time

try:
    import FinanceDataReader as fdr
    import pandas as pd
    import requests
except ImportError as e:
    print(json.dumps({"error": f"Required packages not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

# GitHub 백업 CSV URL (FinanceDataReader 커뮤니티에서 관리)
GITHUB_CSV_URL = "https://raw.githubusercontent.com/corazzon/finance-data-analysis/main/krx.csv"

def get_stock_listing_from_github():
    """GitHub 백업 CSV에서 종목 리스트 가져오기 (Fallback)"""
    try:
        print("GitHub 백업 CSV 사용 중...", file=sys.stderr)
        df = pd.read_csv(GITHUB_CSV_URL)
        
        # 컬럼명 정규화 (Symbol, Name, Market)
        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower()
            if 'symbol' in col_lower or 'code' in col_lower or 'ticker' in col_lower:
                column_mapping[col] = 'Symbol'
            elif 'name' in col_lower or '종목명' in col_lower:
                column_mapping[col] = 'Name'
            elif 'market' in col_lower or '시장' in col_lower:
                column_mapping[col] = 'Market'
        
        # 컬럼명 변경
        df = df.rename(columns=column_mapping)
        
        # 필요한 컬럼만 선택
        required_cols = ['Symbol', 'Name']
        available_cols = [col for col in required_cols if col in df.columns]
        
        if 'Market' not in df.columns:
            # Market 컬럼이 없으면 기본값 설정
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

def get_stock_listing(max_retries=3, retry_delay=2):
    """KRX 전체 종목 리스트 가져오기 (재시도 로직 + Fallback 포함)"""
    last_error = None
    
    # 1차: FinanceDataReader StockListing 시도
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = retry_delay * attempt
                print(f"재시도 {attempt + 1}/{max_retries} (대기 {wait_time}초)...", file=sys.stderr)
                time.sleep(wait_time)
            
            # KRX 전체 종목 리스트 (코스피 + 코스닥)
            stock_list = fdr.StockListing('KRX')
            
            if stock_list is None or stock_list.empty:
                raise ValueError("StockListing returned empty result")
            
            # DataFrame을 JSON으로 변환
            # 필요한 컬럼만 선택 (Symbol, Name, Market)
            columns_to_include = ['Symbol', 'Name', 'Market']
            available_columns = [col for col in columns_to_include if col in stock_list.columns]
            
            if not available_columns:
                raise ValueError("Required columns not found in StockListing result")
            
            result_data = stock_list[available_columns].to_dict('records')
            
            return {
                "success": True,
                "data": result_data,
                "count": len(result_data),
                "source": "fdr_stocklisting"
            }
            
        except json.JSONDecodeError as e:
            last_error = f"JSONDecodeError: {str(e)}"
            print(f"JSON 파싱 오류 (시도 {attempt + 1}/{max_retries}): {last_error}", file=sys.stderr)
            # KRX API 일시적 오류일 수 있으므로 재시도
            continue
            
        except Exception as e:
            last_error = f"{type(e).__name__}: {str(e)}"
            print(f"오류 발생 (시도 {attempt + 1}/{max_retries}): {last_error}", file=sys.stderr)
            
            # 재시도 가능한 오류인지 확인
            if attempt < max_retries - 1:
                continue
            else:
                break
    
    # 2차: FinanceDataReader 실패 시 GitHub CSV 사용 (Fallback)
    print("FinanceDataReader 실패, GitHub 백업 CSV 사용...", file=sys.stderr)
    github_result = get_stock_listing_from_github()
    if github_result.get("success"):
        return github_result
    
    # 모든 방법 실패
    return {
        "success": False,
        "error": last_error or "Unknown error",
        "error_type": "StockListingAPIError",
        "fallback_error": github_result.get("error")
    }

if __name__ == '__main__':
    result = get_stock_listing()
    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
