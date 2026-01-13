from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# 환경 변수에서 경로 확인
sys.path.insert(0, os.path.dirname(__file__))

try:
    import yfinance_cache as yf
    import FinanceDataReader as fdr
    import pandas as pd
    from datetime import datetime, timedelta
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)

def is_korea_stock(symbol: str) -> bool:
    """한국 주식인지 확인"""
    return symbol.endswith('.KS') or (len(symbol) == 6 and symbol.isdigit())

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
    
    # RSI
    rsi_value = calculate_rsi(closes, 14)
    
    # 이동평균선
    ma5 = float(df['Close'].rolling(window=5).mean().iloc[-1])
    ma20 = float(df['Close'].rolling(window=20).mean().iloc[-1])
    ma60 = float(df['Close'].rolling(window=60).mean().iloc[-1]) if len(df) >= 60 else ma20
    ma120 = float(df['Close'].rolling(window=120).mean().iloc[-1]) if len(df) >= 120 else ma60
    
    return {
        'rsi': round(rsi_value, 2),
        'ma5': round(ma5, 2),
        'ma20': round(ma20, 2),
        'ma60': round(ma60, 2),
        'ma120': round(ma120, 2),
    }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # URL에서 심볼 추출
            # Vercel 동적 라우트: /api/stock/[symbol]
            # 실제 경로: /api/stock/AAPL
            path = self.path
            parts = [p for p in path.split('/') if p]
            
            # /api/stock/AAPL -> ['api', 'stock', 'AAPL']
            # symbol은 마지막 부분
            symbol = parts[-1] if len(parts) > 0 else ''
            
            # 빈 심볼이나 'stock'인 경우 에러
            if not symbol or symbol == 'stock' or symbol == 'api':
                self.send_error(400, "Symbol required")
                return
            
            # 한국 주식인지 확인
            if is_korea_stock(symbol):
                # FinanceDataReader 사용
                korea_symbol = symbol.replace('.KS', '')
                end_date = datetime.now()
                start_date = end_date - timedelta(days=120)
                
                df = fdr.DataReader(
                    korea_symbol,
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d')
                )
            else:
                # yfinance-cache 사용
                ticker = yf.Ticker(symbol)
                df = ticker.history(period="120d")
            
            if df.empty:
                self.send_error(404, "No data found")
                return
            
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
                'historicalData': historical_data,
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': error_msg}).encode('utf-8'))
