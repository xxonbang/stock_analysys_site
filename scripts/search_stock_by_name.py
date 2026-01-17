#!/usr/bin/env python3.11
"""
종목명으로 실시간 검색하여 종목코드 찾기
네이버 금융 검색을 활용
"""

import sys
import json
import requests
from bs4 import BeautifulSoup

# UTF-8 인코딩 설정
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def search_stock_by_name(stock_name):
    """네이버 금융에서 종목명으로 검색하여 종목코드 찾기"""
    try:
        # 티커 코드로 직접 검색 시도 (6자리 숫자인 경우)
        if stock_name.isdigit() and len(stock_name) == 6:
            try:
                # 티커 코드로 직접 종목 상세 페이지 접근
                code_url = f'https://finance.naver.com/item/main.naver?code={stock_name}'
                response = requests.get(code_url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://finance.naver.com/'
                })
                response.encoding = 'euc-kr'
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 종목명 추출
                h2 = soup.find('h2', class_='wrap_company')
                if h2:
                    name = h2.get_text(strip=True)
                    if name:
                        return {
                            "success": True,
                            "data": [{
                                'Symbol': stock_name,
                                'Name': name,
                                'Market': 'KRX'
                            }],
                            "count": 1
                        }
            except Exception as e:
                pass  # 티커 코드 검색 실패 시 일반 검색으로 진행
        
        # 네이버 금융 종목 검색 URL (여러 방법 시도)
        search_urls = [
            f'https://finance.naver.com/search/searchList.naver?query={requests.utils.quote(stock_name)}',
            f'https://finance.naver.com/item/main.naver?code={stock_name}',  # 직접 코드로 시도 (만약 코드인 경우)
        ]
        
        results = []
        
        for search_url in search_urls:
            try:
                response = requests.get(search_url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://finance.naver.com/',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
                })
                # 인코딩 자동 감지
                if response.encoding.lower() in ['iso-2022-kr', 'euc-kr', 'cp949']:
                    response.encoding = 'euc-kr'
                else:
                    response.encoding = 'utf-8'
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 검색어 정규화 (공백 제거)
                normalized_search = stock_name.replace(' ', '').replace('\t', '').replace('\n', '')
                
                # 방법 1: 검색 결과 페이지에서 종목 링크 찾기
                # 다양한 선택자로 시도
                selectors = [
                    ('a', lambda x: x and '/item/main.naver?code=' in str(x)),
                    ('td', lambda x: x and x.find('a', href=lambda h: h and '/item/main.naver?code=' in str(h))),
                    ('div', lambda x: x and x.find('a', href=lambda h: h and '/item/main.naver?code=' in str(h))),
                ]
                
                for selector_type, selector_func in selectors:
                    elements = soup.find_all(selector_type, href=selector_func) if selector_type == 'a' else soup.find_all(selector_type)
                    
                    for element in elements[:30]:  # 상위 30개 결과 확인
                        # 링크 찾기
                        link = element if selector_type == 'a' else element.find('a', href=lambda x: x and '/item/main.naver?code=' in str(x))
                        if not link:
                            continue
                            
                        href = link.get('href', '')
                        if '/item/main.naver?code=' in href:
                            code = href.split('code=')[-1].split('&')[0].split('#')[0]
                            name = link.get_text(strip=True) or element.get_text(strip=True)
                            if code and code.isdigit() and len(code) == 6 and name:
                                # 중복 제거
                                if not any(r['Symbol'] == code for r in results):
                                    # 검색어와 종목명 매칭 확인 (정확한 매칭 우선)
                                    normalized_name = name.replace(' ', '').replace('\t', '').replace('\n', '').replace('㈜', '').replace('(주)', '')
                                    # 1. 정확한 매칭 (가장 우선)
                                    if normalized_search == normalized_name:
                                        # 정확한 매칭은 최우선으로 추가
                                        results.insert(0, {
                                            'Symbol': code,
                                            'Name': name,
                                            'Market': 'KRX'
                                        })
                                        break  # 정확한 매칭을 찾으면 즉시 중단
                                    # 2. 검색어가 종목명에 포함되는 경우 (부분 매칭)
                                    elif normalized_search in normalized_name:
                                        results.append({
                                            'Symbol': code,
                                            'Name': name,
                                            'Market': 'KRX'
                                        })
                                        if len(results) >= 5:  # 최대 5개만 반환
                                            break
                    if len(results) >= 5:
                        break
                
                # 방법 2: 테이블에서 종목 정보 찾기
                tables = soup.find_all('table')
                for table in tables:
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        for cell in cells:
                            links = cell.find_all('a', href=lambda x: x and '/item/main.naver?code=' in str(x))
                            for link in links:
                                href = link.get('href', '')
                                if '/item/main.naver?code=' in href:
                                    code = href.split('code=')[-1].split('&')[0].split('#')[0]
                                    name = link.get_text(strip=True)
                                    if code and code.isdigit() and len(code) == 6:
                                        if not any(r['Symbol'] == code for r in results):
                                            results.append({
                                                'Symbol': code,
                                                'Name': name,
                                                'Market': 'KRX'
                                            })
                
                # 방법 3: 종목 상세 페이지에서 직접 정보 추출 (코드로 직접 접근한 경우)
                if '/item/main.naver?code=' in search_url:
                    title = soup.find('title')
                    if title:
                        title_text = title.get_text(strip=True)
                        # 제목에서 종목명 추출 시도
                        code_from_url = search_url.split('code=')[-1].split('&')[0]
                        if code_from_url.isdigit() and len(code_from_url) == 6:
                            # 종목명 추출 시도
                            h2 = soup.find('h2', class_='wrap_company')
                            if h2:
                                name = h2.get_text(strip=True)
                                if name and not any(r['Symbol'] == code_from_url for r in results):
                                    results.append({
                                        'Symbol': code_from_url,
                                        'Name': name,
                                        'Market': 'KRX'
                                    })
                
                if results:
                    break  # 결과를 찾으면 중단
                    
            except Exception as e:
                continue  # 다음 URL 시도
        
        return {
            "success": True,
            "data": results,
            "count": len(results)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": [],
            "count": 0
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Stock name required"}, ensure_ascii=False))
        sys.exit(1)
    
    stock_name = sys.argv[1]
    result = search_stock_by_name(stock_name)
    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
