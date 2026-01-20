# 서버 없이 Python 라이브러리 사용하기

## 개요

별도 Python 서버 없이 Next.js에서 yfinance-cache와 FinanceDataReader를 사용하는 방법들을 검토합니다.

---

## 🎯 옵션 1: Vercel Serverless Functions (Python Runtime) ⭐⭐⭐⭐⭐

### 특징

- **서버 없음**: Vercel이 Python 런타임 제공
- **자동 스케일링**: 서버리스 함수로 자동 확장
- **무료 플랜**: Vercel 무료 플랜 사용 가능
- **Python 3.12**: 최신 Python 버전 지원

### 구현 방법

#### 1. 프로젝트 구조

```
project-root/
├── api/
│   ├── stock/
│   │   └── [symbol].py          # 동적 라우트
│   └── stocks/
│       └── batch.py             # 배치 처리
├── requirements.txt
└── vercel.json
```

#### 2. vercel.json 설정

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "@vercel/python@3.12"
    }
  }
}
```

#### 3. API 함수 구현

**api/stock/[symbol].py:**
```python
from http.server import BaseHTTPRequestHandler
import json
import sys
import yfinance_cache as yf
import FinanceDataReader as fdr
from datetime import datetime, timedelta

def is_korea_stock(symbol: str) -> bool:
    """한국 주식인지 확인"""
    return symbol.endswith('.KS') or (len(symbol) == 6 and symbol.isdigit())

def calculate_indicators(df):
    """기술적 지표 계산"""
    import pandas as pd
    
    if len(df) < 20:
        return {
            'rsi': 50,
            'ma5': float(df['Close'].iloc[-1]) if len(df) > 0 else 0,
            'ma20': float(df['Close'].iloc[-1]) if len(df) > 0 else 0,
            'ma60': float(df['Close'].iloc[-1]) if len(df) > 0 else 0,
            'ma120': float(df['Close'].iloc[-1]) if len(df) > 0 else 0,
        }
    
    closes = df['Close'].values
    
    # RSI 계산
    deltas = pd.Series(closes).diff()
    gains = deltas.where(deltas > 0, 0)
    losses = -deltas.where(deltas < 0, 0)
    
    avg_gain = gains.rolling(window=14).mean()
    avg_loss = losses.rolling(window=14).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    rsi_value = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50
    
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
            path = self.path
            symbol = path.split('/')[-1]
            
            if not symbol:
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
            
            result = {
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
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
```

#### 4. requirements.txt

```txt
yfinance-cache==0.2.0
FinanceDataReader==0.9.50
pandas==2.1.3
numpy==1.26.2
```

#### 5. Next.js에서 호출

```typescript
// lib/finance-vercel.ts
export async function fetchStockDataVercel(symbol: string) {
  const response = await fetch(`/api/stock/${symbol}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
  return await response.json();
}
```

### 장점

- ✅ 별도 서버 불필요
- ✅ Vercel에 배포하면 자동으로 Python 런타임 제공
- ✅ 자동 스케일링
- ✅ 무료 플랜 사용 가능
- ✅ 서버 관리 불필요

### 단점

- ⚠️ Vercel 전용 (다른 플랫폼에서는 불가)
- ⚠️ 번들 크기 제한 (250MB)
- ⚠️ Cold start 시간 (첫 요청 시 느림)

### 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

---

## 🔧 옵션 2: Next.js API Route + child_process ⭐⭐⭐

### 특징

- **서버 없음**: Next.js API Route에서 Python 실행
- **범용성**: 모든 Node.js 환경에서 가능
- **제약**: 배포 환경에 Python 설치 필요

### 구현 방법

#### 1. Python 스크립트 생성

**scripts/fetch_stock.py:**
```python
import sys
import json
import yfinance_cache as yf
import FinanceDataReader as fdr
from datetime import datetime, timedelta

def is_korea_stock(symbol: str) -> bool:
    return symbol.endswith('.KS') or (len(symbol) == 6 and symbol.isdigit())

def fetch_stock(symbol: str):
    if is_korea_stock(symbol):
        korea_symbol = symbol.replace('.KS', '')
        end_date = datetime.now()
        start_date = end_date - timedelta(days=120)
        df = fdr.DataReader(korea_symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
    else:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="120d")
    
    # 데이터 처리 및 JSON 반환
    result = {
        'symbol': symbol,
        'data': df.to_dict('records')
    }
    print(json.dumps(result))

if __name__ == '__main__':
    symbol = sys.argv[1]
    fetch_stock(symbol)
```

#### 2. Next.js API Route

**app/api/stock/[symbol]/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;

  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'fetch_stock.py');
    const pythonProcess = spawn('python3', [scriptPath, symbol]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(
          NextResponse.json(
            { error: `Python script failed: ${errorOutput}` },
            { status: 500 }
          )
        );
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(NextResponse.json(result));
      } catch (e) {
        reject(
          NextResponse.json(
            { error: 'Failed to parse Python output' },
            { status: 500 }
          )
        );
      }
    });
  });
}
```

#### 3. python-shell 라이브러리 사용 (더 안전)

```bash
npm install python-shell
```

**app/api/stock/[symbol]/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;

  return new Promise((resolve, reject) => {
    const options = {
      mode: 'json' as const,
      pythonPath: 'python3',
      scriptPath: join(process.cwd(), 'scripts'),
      args: [symbol],
    };

    PythonShell.run('fetch_stock.py', options, (err, results) => {
      if (err) {
        reject(
          NextResponse.json(
            { error: err.message },
            { status: 500 }
          )
        );
        return;
      }

      if (results && results.length > 0) {
        resolve(NextResponse.json(results[0]));
      } else {
        reject(
          NextResponse.json(
            { error: 'No data returned' },
            { status: 500 }
          )
        );
      }
    });
  });
}
```

### 장점

- ✅ 별도 서버 불필요
- ✅ 모든 Node.js 환경에서 가능
- ✅ 유연한 구현

### 단점

- ⚠️ 배포 환경에 Python 설치 필요
- ⚠️ Vercel/Netlify 등에서는 Python 미제공 (사용 불가)
- ⚠️ 보안 고려 필요 (입력 검증)

---

## 🌐 옵션 3: JSPyBridge (pythonia) ⭐⭐⭐⭐

### 특징

- **서버 없음**: Node.js에서 Python 직접 실행
- **양방향 통신**: Node.js ↔ Python
- **동기/비동기**: 모두 지원

### 구현 방법

#### 1. 설치

```bash
npm install pythonia
```

#### 2. Python 환경 설정

```bash
# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install yfinance-cache FinanceDataReader pandas numpy
```

#### 3. Next.js API Route

**app/api/stock/[symbol]/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { python } from 'pythonia';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;

  try {
    // Python 모듈 import
    const yf = await python('yfinance_cache');
    const fdr = await python('FinanceDataReader');
    const datetime = await python('datetime');
    
    // 한국 주식인지 확인
    const isKorea = symbol.endsWith('.KS') || (symbol.length === 6 && /^\d+$/.test(symbol));
    
    let df;
    if (isKorea) {
      const koreaSymbol = symbol.replace('.KS', '');
      const endDate = await datetime.datetime.now();
      const startDate = await endDate.__sub__(await datetime.timedelta({ days: 120 }));
      
      df = await fdr.DataReader(
        koreaSymbol,
        await startDate.strftime('%Y-%m-%d'),
        await endDate.strftime('%Y-%m-%d')
      );
    } else {
      const ticker = await yf.Ticker(symbol);
      df = await ticker.history({ period: '120d' });
    }
    
    // 데이터 처리
    const latest = await df.iloc[-1];
    const price = await latest.Close;
    
    // JSON 변환
    const result = {
      symbol,
      price: await price,
      // ... 추가 데이터 처리
    };
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### 장점

- ✅ 별도 서버 불필요
- ✅ Node.js에서 Python 직접 실행
- ✅ 양방향 통신

### 단점

- ⚠️ Python 환경 설정 필요
- ⚠️ 배포 환경에 Python 필요
- ⚠️ Vercel 등에서는 사용 불가

---

## 📊 옵션 비교

| 옵션 | 서버 필요 | 배포 환경 | 설정 난이도 | 추천도 |
|------|----------|----------|------------|--------|
| **Vercel Serverless** | ❌ | Vercel만 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **child_process** | ❌ | Python 설치 필요 | ⭐⭐⭐ | ⭐⭐⭐ |
| **python-shell** | ❌ | Python 설치 필요 | ⭐⭐ | ⭐⭐⭐ |
| **JSPyBridge** | ❌ | Python 설치 필요 | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 최종 추천

### Vercel 배포 시: **Vercel Serverless Functions (Python Runtime)**

**이유:**
- 별도 서버 불필요
- 자동 스케일링
- 서버 관리 불필요
- 무료 플랜 사용 가능

**구현:**
1. `api/` 디렉토리에 Python 파일 생성
2. `vercel.json` 설정
3. `requirements.txt` 작성
4. 배포

### 자체 서버 배포 시: **python-shell**

**이유:**
- 안전한 Python 실행
- 에러 처리 용이
- JSON 통신 간단

**구현:**
1. Python 스크립트 작성
2. `python-shell` 설치
3. Next.js API Route에서 호출

---

## ⚠️ 주의사항

### Vercel Serverless Functions

1. **번들 크기 제한**: 250MB
   - 필요한 패키지만 `requirements.txt`에 포함
   - 불필요한 파일 제외

2. **Cold Start**: 첫 요청 시 느림
   - 캐싱 전략 사용
   - Keep-alive 고려

3. **타임아웃**: 10초 (Hobby), 60초 (Pro)
   - 데이터 수집 시간 고려

### child_process / python-shell

1. **보안**: 입력 검증 필수
2. **에러 처리**: Python 스크립트 에러 처리
3. **성능**: 프로세스 생성 오버헤드

---

## 📝 구현 체크리스트

### Vercel Serverless Functions
- [ ] `api/` 디렉토리 생성
- [ ] Python 함수 파일 작성
- [ ] `requirements.txt` 작성
- [ ] `vercel.json` 설정
- [ ] 로컬 테스트 (`vercel dev`)
- [ ] 배포

### python-shell
- [ ] Python 스크립트 작성
- [ ] `python-shell` 설치
- [ ] Next.js API Route 구현
- [ ] 에러 처리
- [ ] 테스트
