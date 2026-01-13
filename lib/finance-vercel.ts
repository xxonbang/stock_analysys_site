/**
 * Python 스크립트를 사용한 주식 데이터 수집
 * 
 * Vercel 환경: Serverless Functions (Python Runtime)
 * 로컬 환경: child_process로 Python 스크립트 직접 실행
 * 
 * 장점:
 * - 별도 서버 불필요
 * - yfinance-cache + FinanceDataReader 사용
 * - Rate limit 문제 해결
 */

import type { StockData } from './finance';
import { spawn } from 'child_process';
import { join } from 'path';
import { normalizeStockSymbol } from './korea-stock-mapper';

/**
 * Python 스크립트를 실행하여 주식 데이터 수집
 * @param symbol 주식 티커 (예: "AAPL", "005930.KS")
 * @param period 분석 기간 (예: "1m", "3m", "1y")
 */
async function runPythonScript(symbol: string, period: string = '1m'): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'test_python_stock.py');
    const pythonProcess = spawn('python3', [scriptPath, symbol, period]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      // stderr는 무시 (경고 메시지 등)
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // stderr에 경고만 있고 실제 오류가 아닐 수 있으므로 JSON이 있으면 성공으로 처리
      const hasJson = output.includes('{') && output.includes('}');
      
      if (code !== 0 && !hasJson) {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput.substring(0, 500)}`));
        return;
      }

      try {
        // JSON 출력 찾기
        // Python 스크립트는 한 줄 JSON을 출력
        // 하지만 stderr 경고가 섞일 수 있으므로 { 부터 } 까지 추출
        
        // 모든 줄에서 JSON 찾기
        const lines = output.split('\n');
        let jsonText = '';
        
        // 뒤에서부터 찾기 (마지막에 출력된 JSON이 실제 결과)
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{')) {
            // 이 줄부터 시작해서 마지막 } 찾기
            const startIdx = output.lastIndexOf(line);
            const endIdx = output.lastIndexOf('}') + 1;
            if (startIdx !== -1 && endIdx > startIdx) {
              jsonText = output.substring(startIdx, endIdx);
              break;
            }
          }
        }

        // 위 방법이 실패하면 첫 { 부터 마지막 } 까지
        if (!jsonText) {
          const jsonStart = output.indexOf('{');
          const jsonEnd = output.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonText = output.substring(jsonStart, jsonEnd);
          }
        }

        if (!jsonText) {
          reject(new Error(`No JSON found in output. Output length: ${output.length}, Preview: ${output.substring(0, 500)}`));
          return;
        }

        // JSON 파싱
        const result = JSON.parse(jsonText);
        
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (e) {
        // 디버깅을 위해 전체 출력 포함
        const errorMsg = e instanceof Error ? e.message : String(e);
        reject(new Error(`Failed to parse Python output: ${errorMsg}. Output length: ${output.length}, Preview: ${output.substring(0, 1000)}`));
      }
    });
  });
}

/**
 * Vercel Serverless Function 또는 Python 스크립트를 통해 주식 데이터 수집
 * @param symbol 주식 티커 (예: "AAPL", "005930.KS")
 * @param period 분석 기간 (예: "1m", "3m", "1y")
 */
export async function fetchStockDataVercel(symbol: string, period: string = '1m'): Promise<StockData> {
  try {
    let data: any;

    // Vercel 환경에서는 Serverless Function 사용
    if (process.env.VERCEL) {
      const response = await fetch(`/api/stock/${symbol}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to fetch data for ${symbol}`);
      }
      
      data = await response.json();
    } else {
      // 로컬 환경에서는 Python 스크립트 직접 실행
      data = await runPythonScript(symbol, period);
    }
    
    // 응답을 StockData 형식으로 변환
    return {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      rsi: data.rsi,
      movingAverages: data.movingAverages,
      disparity: data.disparity,
      historicalData: data.historicalData,
    };
  } catch (error) {
    console.error(`Error fetching Python data for ${symbol}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch stock data for ${symbol}: ${errorMessage}`);
  }
}

/**
 * 여러 종목의 데이터를 배치로 수집
 * @param symbols 종목 리스트
 * @param period 분석 기간 (예: "1m", "3m", "1y")
 */
export async function fetchStocksDataBatchVercel(
  symbols: string[],
  period: string = '1m'
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();

  // 심볼 정규화 (한국 주식 이름을 티커로 변환)
  const normalizedSymbols = symbols.map(symbol => ({
    original: symbol,
    normalized: normalizeStockSymbol(symbol),
  }));

  // Vercel Serverless Functions는 병렬 처리 가능
  // 하지만 안정성을 위해 약간의 딜레이 추가
  for (let i = 0; i < normalizedSymbols.length; i++) {
    const { original, normalized } = normalizedSymbols[i];

    // 요청 간 딜레이 (첫 번째 제외)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      // 정규화된 티커로 데이터 수집
      const stockData = await fetchStockDataVercel(normalized, period);
      // 원본 심볼로 저장 (사용자가 입력한 이름 유지)
      results.set(original, stockData);
    } catch (error) {
      console.error(`Failed to fetch data for ${original} (${normalized}):`, error);
      // 실패해도 계속 진행
    }
  }

  return results;
}
