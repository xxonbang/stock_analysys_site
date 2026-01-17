#!/usr/bin/env python3.11
"""
종목 검색용 정적 symbols.json 파일 생성
한국 주식(KRX) + 미국 주식(US) 전체 종목 리스트를 JSON으로 저장

이 스크립트는 주기적으로 실행하여 최신 종목 리스트를 유지합니다.
생성된 JSON 파일은 public/data/symbols.json에 저장됩니다.
"""

import sys
import json
import os
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

try:
    import FinanceDataReader as fdr
    import pandas as pd
except ImportError as e:
    print(json.dumps({"error": f"Required packages not installed: {e}"}), file=sys.stderr)
    sys.exit(1)

def load_env_file(env_path: Path):
    """.env.local 또는 .env 파일에서 환경 변수 로드"""
    if not env_path.exists():
        return
    
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # 주석 무시
                if line.startswith('#') or not line:
                    continue
                # KEY=VALUE 형식 파싱
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    # 따옴표 제거
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    # 환경 변수에 설정 (이미 설정되어 있지 않은 경우만)
                    if key and value and key not in os.environ:
                        os.environ[key] = value
    except Exception as e:
        print(f"환경 변수 파일 로드 실패 (무시): {str(e)}", file=sys.stderr)

# .env.local 또는 .env 파일 로드
script_dir = Path(__file__).parent.parent
env_local = script_dir / '.env.local'
env_file = script_dir / '.env'

if env_local.exists():
    load_env_file(env_local)
elif env_file.exists():
    load_env_file(env_file)

def get_korea_stocks():
    """한국 주식 리스트 가져오기 (KRX + KOSDAQ + ETF)"""
    all_stocks = []
    
    # 1. GitHub CSV (가장 안정적)
    try:
        github_url = "https://raw.githubusercontent.com/corazzon/finance-data-analysis/main/krx.csv"
        df = pd.read_csv(github_url)
        
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
        
        if 'Symbol' in df.columns and 'Name' in df.columns:
            if 'Market' not in df.columns:
                df['Market'] = 'KRX'
            
            for _, row in df.iterrows():
                symbol = str(row.get('Symbol', '')).strip()
                name = str(row.get('Name', '')).strip()
                market = str(row.get('Market', 'KRX')).strip()
                
                if symbol and name and len(symbol) == 6 and symbol.isdigit():
                    all_stocks.append({
                        'code': symbol,
                        'name': name,
                        'market': market,
                        'country': 'KR'
                    })
        
        print(f"GitHub CSV에서 {len(all_stocks)}개 종목 가져옴", file=sys.stderr)
    except Exception as e:
        print(f"GitHub CSV 실패: {str(e)}", file=sys.stderr)
    
    # 2. FinanceDataReader 시도 (보완용)
    try:
        stock_list = fdr.StockListing('KRX')
        if stock_list is not None and not stock_list.empty:
            for _, row in stock_list.iterrows():
                symbol = str(row.get('Symbol', '')).strip()
                name = str(row.get('Name', '')).strip()
                market = str(row.get('Market', 'KRX')).strip()
                
                if symbol and name and len(symbol) == 6 and symbol.isdigit():
                    # 중복 제거
                    if not any(s['code'] == symbol for s in all_stocks):
                        all_stocks.append({
                            'code': symbol,
                            'name': name,
                            'market': market,
                            'country': 'KR'
                        })
        
        print(f"FinanceDataReader에서 추가로 {len(all_stocks)}개 종목 확보", file=sys.stderr)
    except Exception as e:
        print(f"FinanceDataReader 실패 (무시): {str(e)}", file=sys.stderr)
    
    return all_stocks

def get_us_stocks():
    """미국 주식 리스트 가져오기 (Finnhub API 사용)"""
    all_stocks = []
    
    # 환경 변수에서 API 키 확인 (.env.local에서 로드됨)
    finnhub_key = os.environ.get('FINNHUB_API_KEY') or os.environ.get('NEXT_PUBLIC_FINNHUB_API_KEY')
    
    if not finnhub_key:
        print("FINNHUB_API_KEY가 없어 미국 주식 리스트를 가져올 수 없습니다.", file=sys.stderr)
        print("힌트: .env.local 파일에 FINNHUB_API_KEY를 설정하세요.", file=sys.stderr)
        return all_stocks
    
    print(f"Finnhub API 키 확인됨 (길이: {len(finnhub_key)})", file=sys.stderr)
    
    try:
        import requests
        
        # US 거래소 전체 종목
        url = f'https://finnhub.io/api/v1/stock/symbol?exchange=US&token={finnhub_key}'
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                for item in data:
                    symbol = item.get('symbol', '').strip()
                    name = item.get('description', '').strip()
                    stock_type = item.get('type', '').strip()
                    
                    if symbol and name:
                        all_stocks.append({
                            'code': symbol,
                            'name': name,
                            'market': 'US',
                            'country': 'US',
                            'type': stock_type
                        })
                
                print(f"Finnhub에서 {len(all_stocks)}개 미국 종목 가져옴", file=sys.stderr)
        else:
            print(f"Finnhub API 오류: {response.status_code}", file=sys.stderr)
    except Exception as e:
        print(f"Finnhub API 실패: {str(e)}", file=sys.stderr)
    
    return all_stocks

def main():
    """메인 함수: symbols.json 생성"""
    print("종목 리스트 생성 시작...", file=sys.stderr)
    
    # 한국 주식 가져오기
    korea_stocks = get_korea_stocks()
    print(f"한국 주식: {len(korea_stocks)}개", file=sys.stderr)
    
    # 미국 주식 가져오기
    us_stocks = get_us_stocks()
    print(f"미국 주식: {len(us_stocks)}개", file=sys.stderr)
    
    # 통합
    all_symbols = {
        'version': '1.0',
        'generated_at': pd.Timestamp.now().isoformat(),
        'korea': {
            'count': len(korea_stocks),
            'stocks': korea_stocks
        },
        'us': {
            'count': len(us_stocks),
            'stocks': us_stocks
        },
        'total': len(korea_stocks) + len(us_stocks)
    }
    
    # public/data/symbols.json에 저장
    output_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / 'symbols.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_symbols, f, ensure_ascii=False, indent=2)
    
    print(f"symbols.json 생성 완료: {output_file}", file=sys.stderr)
    print(f"총 {all_symbols['total']}개 종목 저장됨", file=sys.stderr)
    
    # 성공 응답
    print(json.dumps({
        'success': True,
        'korea_count': len(korea_stocks),
        'us_count': len(us_stocks),
        'total_count': all_symbols['total'],
        'output_file': str(output_file)
    }, ensure_ascii=False))

if __name__ == '__main__':
    main()
