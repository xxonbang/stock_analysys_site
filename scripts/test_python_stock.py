#!/usr/bin/env python3.11
# -*- coding: utf-8 -*-
"""
Python 스크립트 직접 테스트
Vercel Serverless Function과 동일한 로직을 테스트
"""

import sys
import json
import io

# UTF-8 인코딩 설정 (한글 처리)
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# yfinance-cache는 Python 3.9에서 타입 힌트 및 multiprocessing 문제로 실패할 수 있음
# 일반 yfinance로 fallback
yf = None
try:
    import yfinance_cache as yf
except Exception as e:
    # Python 3.9 호환성 문제로 yfinance-cache 실패 시 일반 yfinance 사용
    try:
        import yfinance as yf
        print("Using regular yfinance (yfinance-cache not compatible)", file=sys.stderr)
    except ImportError:
        print(f"ERROR: yfinance not installed: {e}", file=sys.stderr)
        sys.exit(1)

try:
    import FinanceDataReader as fdr
    import pandas as pd
    from datetime import datetime, timedelta
except ImportError as e:
    print(f"ERROR: Required packages not installed: {e}", file=sys.stderr)
    print("Install with: pip install yfinance finance-datareader pandas numpy", file=sys.stderr)
    sys.exit(1)

def is_korea_stock(symbol: str) -> bool:
    """한국 주식인지 확인"""
    # .KS로 끝나거나 6자리 숫자이거나 한글이 포함된 경우
    return symbol.endswith('.KS') or (len(symbol) == 6 and symbol.isdigit()) or bool([c for c in symbol if ord(c) >= 0xAC00 and ord(c) <= 0xD7A3])

def calculate_rsi(prices, period=14):
    """RSI 계산"""
    deltas = pd.Series(prices).diff()
    gains = deltas.where(deltas > 0, 0)
    losses = -deltas.where(deltas < 0, 0)
    
    avg_gain = gains.rolling(window=period).mean()
    avg_loss = losses.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50.0

def calculate_indicators(df):
    """기술적 지표 계산"""
    if len(df) < 5:
        latest_price = float(df['Close'].iloc[-1]) if len(df) > 0 else 0.0
        return {
            'rsi': 50.0,
            'ma5': latest_price,
            'ma20': latest_price,
            'ma60': latest_price,
            'ma120': latest_price,
        }
    
    closes = df['Close'].values
    latest_price = float(df['Close'].iloc[-1])
    
    # RSI
    rsi_value = calculate_rsi(closes, 14)
    
    # 이동평균선 (데이터가 부족하면 NaN 대신 현재가 사용)
    def safe_ma(window):
        if len(df) < window:
            return latest_price
        ma = df['Close'].rolling(window=window).mean().iloc[-1]
        return float(ma) if pd.notna(ma) else latest_price
    
    ma5 = safe_ma(5)
    ma20 = safe_ma(20)
    ma60 = safe_ma(60)
    ma120 = safe_ma(120)
    
    return {
        'rsi': round(rsi_value, 2),
        'ma5': round(ma5, 2),
        'ma20': round(ma20, 2),
        'ma60': round(ma60, 2),
        'ma120': round(ma120, 2),
    }

def period_to_days(period: str) -> int:
    """기간을 일수로 변환"""
    period_map = {
        '1d': 1,
        '1w': 7,
        '1m': 30,
        '3m': 90,
        '6m': 180,
        '1y': 365,
    }
    return period_map.get(period, 30)  # 기본값: 1달

def fetch_stock(symbol: str, period: str = '1m'):
    """주식 데이터 수집"""
    print(f"Fetching data for {symbol} (period: {period})...", file=sys.stderr)
    
    # 지표 계산(MA120 등)을 위해 분석 기간보다 훨씬 긴 데이터를 기본적으로 수집 (최소 180일)
    days = max(period_to_days(period), 180)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 한국 주식인지 확인
    if is_korea_stock(symbol):
        print("Using FinanceDataReader for Korean stock", file=sys.stderr)
        korea_symbol = symbol.replace('.KS', '').replace('.KQ', '')
        
        # 한글 이름인지 확인 (6자리 숫자가 아니면 한글 이름으로 간주)
        is_korean_name = not korea_symbol.isdigit()
        
        if is_korean_name:
            # 한글 이름인 경우 먼저 티커로 변환 시도
            print(f"Korean name detected: {korea_symbol}, searching for ticker...", file=sys.stderr)
            ticker_found = False
            
            # 방법 1: StockListing을 사용하여 티커 찾기
            try:
                stock_list = fdr.StockListing('KRX')
                # 정확한 이름 매칭 시도
                matching = stock_list[stock_list['Name'] == korea_symbol]
                if matching.empty:
                    # 부분 매칭 시도
                    matching = stock_list[stock_list['Name'].str.contains(korea_symbol, na=False, case=False)]
                
                if not matching.empty:
                    korea_symbol = str(matching.iloc[0]['Symbol']).zfill(6)  # 6자리로 패딩
                    print(f"Found ticker {korea_symbol} for {symbol}", file=sys.stderr)
                    ticker_found = True
            except Exception as listing_error:
                error_msg = str(listing_error)
                print(f"StockListing failed (will try direct name lookup): {error_msg}", file=sys.stderr)
            
            # 방법 2: StockListing 실패 시 FinanceDataReader가 이름으로 직접 조회 시도
            if not ticker_found:
                print(f"Trying direct name lookup with FinanceDataReader...", file=sys.stderr)
                try:
                    # FinanceDataReader가 한글 이름을 직접 처리할 수 있는지 시도
                    df_test = fdr.DataReader(
                        korea_symbol,
                        start_date.strftime('%Y-%m-%d'),
                        end_date.strftime('%Y-%m-%d')
                    )
                    if not df_test.empty:
                        print(f"Direct name lookup succeeded for {korea_symbol}", file=sys.stderr)
                        df = df_test
                        ticker_found = True
                except Exception as direct_error:
                    error_msg = str(direct_error)
                    print(f"Direct name lookup failed: {error_msg}", file=sys.stderr)
            
            # 방법 3: 모두 실패한 경우
            if not ticker_found:
                raise ValueError(f"종목 '{korea_symbol}'을(를) 찾을 수 없습니다. 정확한 종목명 또는 종목코드(6자리 숫자)를 입력해주세요. 예: '삼성전자' 또는 '005930'")
        
        # 티커로 데이터 수집 시도
        try:
            df = fdr.DataReader(
                korea_symbol,
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
        except Exception as e:
            error_msg = str(e)
            print(f"DataReader failed for {korea_symbol}: {error_msg}", file=sys.stderr)
            raise ValueError(f"종목 '{korea_symbol}'의 데이터를 가져올 수 없습니다. 오류: {error_msg}")
    else:
        print("Using yfinance-cache for US stock", file=sys.stderr)
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date)
        except Exception as e:
            print(f"yfinance-cache error, trying regular yfinance: {e}", file=sys.stderr)
            # Fallback to regular yfinance
            import yfinance as yf_regular
            ticker = yf_regular.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date)
    
    if df.empty:
        raise ValueError(f"No data found for {symbol}")
    
    # 컬럼명 정규화
    df.columns = [col.replace(' ', '_') for col in df.columns]
    
    # 최신 데이터
    latest = df.iloc[-1]
    previous = df.iloc[-2] if len(df) > 1 else latest
    
    current_price = float(latest['Close'])
    change = current_price - float(previous['Close'])
    change_percent = (change / float(previous['Close'])) * 100 if previous['Close'] > 0 else 0.0
    volume = int(latest['Volume']) if 'Volume' in latest and pd.notna(latest['Volume']) else 0
    
    # 기술적 지표 계산
    indicators = calculate_indicators(df)
    
    # 이격도 계산
    disparity = (current_price / indicators['ma20']) * 100 if indicators['ma20'] > 0 else 100.0
    
    # Historical 데이터
    historical_data = []
    for idx, row in df.iterrows():
        date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)
        historical_data.append({
            'date': date_str,
            'close': float(row['Close']),
            'volume': int(row['Volume']) if 'Volume' in row and pd.notna(row['Volume']) else 0,
        })
    
    result = {
        'symbol': symbol,
        'price': round(current_price, 2),
        'change': round(change, 2),
        'changePercent': round(change_percent, 2),
        'volume': volume,
        'rsi': indicators['rsi'],
        'movingAverages': {
            'ma5': indicators['ma5'],
            'ma20': indicators['ma20'],
            'ma60': indicators['ma60'],
            'ma120': indicators['ma120'],
        },
        'disparity': round(disparity, 2),
        'historicalData': historical_data,  # 전체 historical 데이터 반환 (기술적 지표 계산에 필요)
    }
    
    return result

if __name__ == '__main__':
    symbol = sys.argv[1] if len(sys.argv) > 1 else 'AAPL'
    period = sys.argv[2] if len(sys.argv) > 2 else '1m'
    
    try:
        result = fetch_stock(symbol, period)
        # JSON만 stdout에 출력 (한 줄로)
        print(json.dumps(result), file=sys.stdout)
        sys.stdout.flush()
    except Exception as e:
        # 에러도 JSON 형식으로 stdout에 출력
        print(json.dumps({'error': str(e)}), file=sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
