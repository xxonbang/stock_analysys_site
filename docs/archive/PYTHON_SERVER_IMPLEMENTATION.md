# Python 서버 구현 가이드

## 개요

yfinance-cache와 FinanceDataReader를 사용하는 Python FastAPI 서버를 구축하여 주식 데이터를 제공합니다.

## 장점

1. **완전 무료**: 모든 기능 무료
2. **Rate Limit 해결**: 캐싱으로 문제 완전 해결
3. **한국/미국 주식**: 모두 완벽 지원
4. **안정성**: 캐싱 전략으로 안정적

## 구현

### 1. Python 서버 구조

```
backend/
├── main.py          # FastAPI 서버
├── requirements.txt # 의존성
└── Dockerfile       # Docker 설정 (선택)
```

### 2. requirements.txt

```txt
fastapi==0.104.1
uvicorn==0.24.0
yfinance-cache==0.2.0
FinanceDataReader==0.9.50
pandas==2.1.3
numpy==1.26.2
python-multipart==0.0.6
```

### 3. main.py

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import yfinance_cache as yf
import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime, timedelta

app = FastAPI(title="Stock Data API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_korea_stock(symbol: str) -> bool:
    """한국 주식인지 확인 (6자리 숫자 또는 .KS 포함)"""
    return symbol.endswith('.KS') or (len(symbol) == 6 and symbol.isdigit())

def calculate_indicators(df: pd.DataFrame) -> dict:
    """기술적 지표 계산"""
    if len(df) < 20:
        return {
            'rsi': 50,
            'ma5': df['Close'].iloc[-1] if len(df) > 0 else 0,
            'ma20': df['Close'].iloc[-1] if len(df) > 0 else 0,
            'ma60': df['Close'].iloc[-1] if len(df) > 0 else 0,
            'ma120': df['Close'].iloc[-1] if len(df) > 0 else 0,
        }
    
    closes = df['Close'].values
    
    # RSI 계산
    def calculate_rsi(prices, period=14):
        deltas = pd.Series(prices).diff()
        gains = deltas.where(deltas > 0, 0)
        losses = -deltas.where(deltas < 0, 0)
        
        avg_gain = gains.rolling(window=period).mean()
        avg_loss = losses.rolling(window=period).mean()
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50
    
    rsi = calculate_rsi(closes)
    
    # 이동평균선
    ma5 = df['Close'].rolling(window=5).mean().iloc[-1]
    ma20 = df['Close'].rolling(window=20).mean().iloc[-1]
    ma60 = df['Close'].rolling(window=60).mean().iloc[-1] if len(df) >= 60 else ma20
    ma120 = df['Close'].rolling(window=120).mean().iloc[-1] if len(df) >= 120 else ma60
    
    return {
        'rsi': round(float(rsi), 2),
        'ma5': round(float(ma5), 2),
        'ma20': round(float(ma20), 2),
        'ma60': round(float(ma60), 2),
        'ma120': round(float(ma120), 2),
    }

@app.get("/")
async def root():
    return {"message": "Stock Data API"}

@app.get("/stock/{symbol}")
async def get_stock_data(symbol: str):
    """주식 데이터 조회"""
    try:
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
            
            if df.empty:
                raise HTTPException(status_code=404, detail="No data found")
            
            # 컬럼명 정규화
            df.columns = [col.replace(' ', '_') for col in df.columns]
            
        else:
            # yfinance-cache 사용 (미국 주식)
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="120d")
            
            if df.empty:
                raise HTTPException(status_code=404, detail="No data found")
        
        # 최신 데이터
        latest = df.iloc[-1]
        previous = df.iloc[-2] if len(df) > 1 else latest
        
        current_price = float(latest['Close'])
        change = current_price - float(previous['Close'])
        change_percent = (change / float(previous['Close'])) * 100 if previous['Close'] > 0 else 0
        volume = int(latest['Volume']) if 'Volume' in latest else 0
        
        # 기술적 지표 계산
        indicators = calculate_indicators(df)
        
        # 이격도 계산
        disparity = (current_price / indicators['ma20']) * 100 if indicators['ma20'] > 0 else 100
        
        # Historical 데이터
        historical_data = []
        for idx, row in df.iterrows():
            date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)
            historical_data.append({
                'date': date_str,
                'close': float(row['Close']),
                'volume': int(row['Volume']) if 'Volume' in row else 0,
            })
        
        return {
            'symbol': symbol,
            'price': current_price,
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stocks/batch")
async def get_stocks_batch(symbols: List[str]):
    """여러 종목 데이터 배치 조회"""
    results = {}
    
    for symbol in symbols:
        try:
            data = await get_stock_data(symbol)
            results[symbol] = data
        except Exception as e:
            results[symbol] = {'error': str(e)}
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 4. Next.js에서 호출

```typescript
// lib/finance-python.ts
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function fetchStockDataPython(symbol: string) {
  const response = await fetch(`${PYTHON_API_URL}/stock/${symbol}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
  return await response.json();
}

export async function fetchStocksDataBatchPython(symbols: string[]) {
  const response = await fetch(`${PYTHON_API_URL}/stocks/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(symbols),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch batch data');
  }
  return await response.json();
}
```

## 실행 방법

### 로컬 개발

```bash
# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

### Docker 사용

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t stock-api .
docker run -p 8000:8000 stock-api
```

## 환경 변수

`.env.local`:
```env
PYTHON_API_URL=http://localhost:8000
```

## 장점 요약

1. **완전 무료**: 모든 기능 무료
2. **Rate Limit 해결**: yfinance-cache의 캐싱으로 해결
3. **한국 주식**: FinanceDataReader로 완벽 지원
4. **미국 주식**: yfinance-cache로 안정적 지원
5. **캐싱**: 자동으로 중복 요청 방지

## 주의사항

1. **Python 서버 필요**: 별도 서버 구축 필요
2. **포트 관리**: Next.js와 다른 포트 사용
3. **에러 처리**: Python 서버 에러 처리 필요
