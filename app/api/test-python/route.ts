import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Python 스크립트를 직접 실행하는 테스트 API
 * child_process를 사용하여 서버 없이 Python 실행
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || 'AAPL';

  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), 'scripts', 'test_python_stock.py');
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
        resolve(
          NextResponse.json(
            { 
              error: `Python script failed with code ${code}`,
              stderr: errorOutput,
            },
            { status: 500 }
          )
        );
        return;
      }

      try {
        // JSON 출력 찾기 (에러 메시지 제외)
        const lines = output.split('\n');
        let jsonLine = '';
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
            jsonLine = line.trim();
            break;
          }
        }

        if (!jsonLine) {
          // 여러 줄 JSON인 경우
          const jsonStart = output.indexOf('{');
          const jsonEnd = output.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonLine = output.substring(jsonStart, jsonEnd);
          }
        }

        if (!jsonLine) {
          throw new Error('No JSON output found');
        }

        const result = JSON.parse(jsonLine);
        
        if (result.error) {
          resolve(
            NextResponse.json(
              { error: result.error, stderr: errorOutput },
              { status: 500 }
            )
          );
        } else {
          resolve(NextResponse.json(result));
        }
      } catch (e) {
        resolve(
          NextResponse.json(
            { 
              error: 'Failed to parse Python output',
              output: output,
              stderr: errorOutput,
            },
            { status: 500 }
          )
        );
      }
    });
  });
}
