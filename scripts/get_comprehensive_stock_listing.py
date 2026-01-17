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

# JSON 모듈 import (파싱 오류 처리용)
import json as json_module

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

def get_stock_listing_from_naver_search(stock_name):
    """네이버 금융에서 종목명으로 검색하여 종목코드 찾기"""
    try:
        print(f"네이버 금융 종목 검색: {stock_name}...", file=sys.stderr)
        # 네이버 금융 종목 검색 API (AJAX 방식)
        search_url = f'https://finance.naver.com/api/search/search.naver?query={requests.utils.quote(stock_name)}'
        response = requests.get(search_url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://finance.naver.com/'
        })
        response.encoding = 'utf-8'
        
        results = []
        try:
            # JSON 응답 파싱 시도
            data = response.json()
            if 'items' in data:
                for item in data['items']:
                    if 'code' in item and 'name' in item:
                        code = str(item['code']).strip()
                        name = str(item['name']).strip()
                        if code.isdigit() and len(code) == 6:
                            results.append({
                                'Symbol': code,
                                'Name': name,
                                'Market': 'KRX'
                            })
        except (ValueError, KeyError):
            # JSON 파싱 실패 시 HTML 크롤링으로 대체
            response.encoding = 'euc-kr'
            soup = BeautifulSoup(response.text, 'html.parser')
            # 검색 결과에서 종목 링크 찾기
            stock_links = soup.find_all('a', href=lambda x: x and '/item/main.naver?code=' in x)
            
            for link in stock_links[:5]:  # 상위 5개 결과만
                href = link.get('href', '')
                code = href.split('code=')[-1].split('&')[0] if 'code=' in href else None
                name = link.get_text(strip=True)
                if code and code.isdigit() and len(code) == 6:
                    results.append({
                        'Symbol': code,
                        'Name': name,
                        'Market': 'KRX'
                    })
        
        if results:
            print(f"네이버 금융에서 {len(results)}개 종목 검색됨", file=sys.stderr)
        return results
    except Exception as e:
        print(f"네이버 금융 종목 검색 실패: {str(e)}", file=sys.stderr)
        return []

def get_comprehensive_stock_listing(max_retries=3, retry_delay=2):
    """종합적인 종목 리스트 가져오기 (다중 데이터 소스 활용)"""
    all_stocks = []
    sources_used = []
    fdr_success = False
    
    # 1. FinanceDataReader StockListing (주 데이터 소스)
    # 안정적인 JSON 파싱을 위한 개선된 로직
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = retry_delay * attempt
                print(f"FinanceDataReader KRX 재시도 {attempt + 1}/{max_retries} (대기 {wait_time}초)...", file=sys.stderr)
                time.sleep(wait_time)
            
            # FinanceDataReader 호출 시 예외 처리 강화
            try:
                stock_list = fdr.StockListing('KRX')
            except json_module.JSONDecodeError as json_err:
                # JSON 파싱 오류인 경우 상세 로깅 및 안정적 처리
                print(f"FinanceDataReader KRX JSON 파싱 오류: {json_err}", file=sys.stderr)
                print(f"  → KRX API 문서상 JSON을 반환하지만, 실제 응답이 HTML/빈 응답/인증 오류일 수 있음", file=sys.stderr)
                print(f"  → FinanceDataReader가 사용하는 URL/헤더/파라미터가 KRX API 요구사항과 불일치할 수 있음", file=sys.stderr)
                print(f"  → FinanceDataReader 내부 구현이 KRX API 변경사항을 반영하지 못했을 가능성", file=sys.stderr)
                if attempt == max_retries - 1:
                    print("FinanceDataReader KRX 최종 실패, 대체 소스로 전환...", file=sys.stderr)
                continue
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                
                # JSON 관련 오류인지 확인
                if 'JSON' in error_msg or 'json' in error_msg.lower() or 'Expecting value' in error_msg or 'JSONDecodeError' in error_type:
                    print(f"FinanceDataReader KRX JSON 관련 오류 ({error_type}): {error_msg}", file=sys.stderr)
                    print(f"  → KRX API 응답 형식 문제로 추정 (문서상 JSON이지만 실제 응답이 다를 수 있음)", file=sys.stderr)
                    print(f"  → FinanceDataReader 내부 구현이 KRX API 변경사항을 반영하지 못했을 가능성", file=sys.stderr)
                else:
                    print(f"FinanceDataReader KRX 오류 ({error_type}, 시도 {attempt + 1}/{max_retries}): {error_msg}", file=sys.stderr)
                
                if attempt == max_retries - 1:
                    print("FinanceDataReader KRX 최종 실패, 대체 소스로 전환...", file=sys.stderr)
                continue
            
            if stock_list is not None and not stock_list.empty:
                columns_to_include = ['Symbol', 'Name', 'Market']
                available_columns = [col for col in columns_to_include if col in stock_list.columns]
                
                if available_columns:
                    result_data = stock_list[available_columns].to_dict('records')
                    all_stocks.extend(result_data)
                    sources_used.append(f"FinanceDataReader KRX ({len(result_data)} stocks)")
                    print(f"FinanceDataReader KRX에서 {len(result_data)}개 종목 가져옴", file=sys.stderr)
                    fdr_success = True
                    break
        except Exception as e:
            print(f"FinanceDataReader KRX 예외 (시도 {attempt + 1}/{max_retries}): {str(e)}", file=sys.stderr)
            if attempt == max_retries - 1:
                print("FinanceDataReader KRX 최종 실패, 대체 소스로 전환...", file=sys.stderr)
    
    # KRX 실패 시 KOSDAQ 별도 시도 (지투지바이오는 코스닥 종목)
    # KRX가 성공했어도 KOSDAQ을 추가로 시도하여 누락된 종목 보완
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = retry_delay * attempt
                print(f"FinanceDataReader KOSDAQ 재시도 {attempt + 1}/{max_retries} (대기 {wait_time}초)...", file=sys.stderr)
                time.sleep(wait_time)
            
            try:
                stock_list = fdr.StockListing('KOSDAQ')
            except json_module.JSONDecodeError as json_err:
                # JSON 파싱 오류인 경우 상세 로깅 및 안정적 처리
                print(f"FinanceDataReader KOSDAQ JSON 파싱 오류: {json_err}", file=sys.stderr)
                print(f"  → KRX API 응답이 JSON이 아닐 수 있음 (HTML, 빈 응답, 또는 인증 오류 가능)", file=sys.stderr)
                if attempt == max_retries - 1 and not fdr_success:
                    print("FinanceDataReader KOSDAQ 최종 실패, 대체 소스로 전환...", file=sys.stderr)
                continue
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                
                # JSON 관련 오류인지 확인
                if 'JSON' in error_msg or 'json' in error_msg.lower() or 'Expecting value' in error_msg or 'JSONDecodeError' in error_type:
                    print(f"FinanceDataReader KOSDAQ JSON 관련 오류 ({error_type}): {error_msg}", file=sys.stderr)
                    print(f"  → KRX API 응답 형식 문제로 추정", file=sys.stderr)
                else:
                    print(f"FinanceDataReader KOSDAQ 오류 ({error_type}, 시도 {attempt + 1}/{max_retries}): {error_msg}", file=sys.stderr)
                
                if attempt == max_retries - 1 and not fdr_success:
                    print("FinanceDataReader KOSDAQ 최종 실패, 대체 소스로 전환...", file=sys.stderr)
                continue
            
            if stock_list is not None and not stock_list.empty:
                columns_to_include = ['Symbol', 'Name', 'Market']
                available_columns = [col for col in columns_to_include if col in stock_list.columns]
                
                if available_columns:
                    result_data = stock_list[available_columns].to_dict('records')
                    # 기존 리스트에 없는 종목만 추가 (중복 제거)
                    existing_symbols = {s.get('Symbol') for s in all_stocks}
                    new_stocks = [s for s in result_data if s.get('Symbol') not in existing_symbols]
                    if new_stocks:
                        all_stocks.extend(new_stocks)
                        sources_used.append(f"FinanceDataReader KOSDAQ ({len(new_stocks)} stocks)")
                        print(f"FinanceDataReader KOSDAQ에서 {len(new_stocks)}개 종목 추가 (기존 {len(existing_symbols)}개와 중복 제외)", file=sys.stderr)
                    else:
                        print(f"FinanceDataReader KOSDAQ에서 {len(result_data)}개 종목 가져왔으나 모두 중복", file=sys.stderr)
                    fdr_success = True
                    break
        except Exception as e:
            print(f"FinanceDataReader KOSDAQ 예외 (시도 {attempt + 1}/{max_retries}): {str(e)}", file=sys.stderr)
            if attempt == max_retries - 1 and not fdr_success:
                print("FinanceDataReader KOSDAQ 최종 실패, 대체 소스로 전환...", file=sys.stderr)
    
    # 2. KRX 공식 API 시도 (FinanceDataReader 실패 시)
    # 주의: KRX API는 인증이 필요할 수 있어 현재는 주석 처리
    # 필요시 KRX API 키를 환경변수로 설정하여 사용 가능
    # if not fdr_success:
    #     try:
    #         print("KRX 공식 API로 종목 리스트 가져오기 시도...", file=sys.stderr)
    #         import importlib.util
    #         spec = importlib.util.spec_from_file_location("get_krx_stock_listing", "scripts/get_krx_stock_listing.py")
    #         if spec and spec.loader:
    #             krx_module = importlib.util.module_from_spec(spec)
    #             spec.loader.exec_module(krx_module)
    #             krx_result = krx_module.get_krx_stock_listing_via_api()
    #             if krx_result.get("success") and krx_result.get("data"):
    #                 krx_data = krx_result["data"]
    #                 if krx_data and len(krx_data) > 0:
    #                     all_stocks.extend(krx_data)
    #                     sources_used.append(f"KRX API ({len(krx_data)} stocks)")
    #                     print(f"KRX API에서 {len(krx_data)}개 종목 가져옴", file=sys.stderr)
    #                     fdr_success = True
    #     except Exception as e:
    #         print(f"KRX API 호출 실패: {str(e)}", file=sys.stderr)
    
    # 3. GitHub CSV (항상 시도하여 누락된 종목 보완)
    # FinanceDataReader 또는 KRX API가 성공했어도 GitHub CSV를 병합하여 최신 종목 확보
    github_result = get_stock_listing_from_github()
    if github_result.get("success"):
        github_data = github_result["data"]
        print(f"GitHub CSV 데이터: {len(github_data)}개 종목", file=sys.stderr)
        if github_data and len(github_data) > 0:
            # 기존 리스트에 없는 종목만 추가
            existing_symbols = {s.get('Symbol') for s in all_stocks}
            new_stocks = [s for s in github_data if s.get('Symbol') not in existing_symbols]
            if new_stocks:
                all_stocks.extend(new_stocks)
                if not fdr_success:
                    sources_used.append(f"GitHub CSV ({len(new_stocks)} stocks)")
                else:
                    sources_used.append(f"GitHub CSV (complement, {len(new_stocks)} stocks)")
                print(f"GitHub CSV에서 {len(new_stocks)}개 종목 추가", file=sys.stderr)
        else:
            print("GitHub CSV 데이터가 비어있음", file=sys.stderr)
    
    # 4. 네이버 금융에서 ETF 리스트 가져오기 (보조 데이터 소스)
    try:
        naver_etf_list = get_stock_listing_from_naver()
        if naver_etf_list:
            all_stocks.extend(naver_etf_list)
            sources_used.append(f"Naver Finance ({len(naver_etf_list)} ETFs)")
    except Exception as e:
        print(f"네이버 금융 크롤링 실패: {str(e)}", file=sys.stderr)
    
    # 5. FinanceDataReader에서 종목명으로 직접 검색 (KOSDAQ 리스트에서)
    # 신규 상장 종목이 리스트에 포함되어 있을 수 있음
    if not fdr_success:
        try:
            # KOSDAQ 리스트에서 특정 종목명 검색 시도
            print("KOSDAQ 리스트에서 종목명 검색 시도...", file=sys.stderr)
            # 이 부분은 나중에 동적으로 검색할 때 사용
            # 현재는 리스트 전체를 가져오는 것이 목적이므로 스킵
        except Exception as e:
            print(f"종목명 검색 실패: {str(e)}", file=sys.stderr)
    
    print(f"중복 제거 전 종목 수: {len(all_stocks)}", file=sys.stderr)
    
    # 3. 중복 제거 (Symbol 기준, Name은 가장 긴 것 유지 - 정확한 종목명 보장)
    unique_stocks = {}
    skipped_count = 0
    for stock in all_stocks:
        symbol = stock.get('Symbol')
        name = stock.get('Name')
        
        # Symbol이나 Name이 없거나 빈 문자열인 경우 스킵
        if not symbol or not name or str(symbol).strip() == '' or str(name).strip() == '':
            skipped_count += 1
            continue
        
        symbol = str(symbol).strip()
        name = str(name).strip()
        
        if symbol not in unique_stocks:
            unique_stocks[symbol] = stock
        else:
            # 기존 종목보다 이름이 더 긴 경우 업데이트 (정확한 종목명 보장)
            existing_name = unique_stocks[symbol]['Name']
            if len(name) > len(existing_name):
                unique_stocks[symbol] = stock
    
    if skipped_count > 0:
        print(f"스킵된 종목 수 (Symbol/Name 없음): {skipped_count}", file=sys.stderr)
    
    final_stocks = list(unique_stocks.values())
    print(f"최종 종목 수: {len(final_stocks)}", file=sys.stderr)
    
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
