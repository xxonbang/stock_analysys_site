import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { spawn } from 'child_process';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 로깅 유틸리티
 * 환경 변수로 로그 레벨 제어
 */
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'debug');

export const logger = {
  debug: (...args: unknown[]) => {
    if (LOG_LEVEL === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (LOG_LEVEL !== 'error') {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
};

/**
 * 에러 처리 유틸리티
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 에러를 AppError로 변환
 */
export function toAppError(error: unknown, defaultMessage = 'An error occurred'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message, undefined, undefined, error);
  }
  return new AppError(defaultMessage);
}

/**
 * Python 버전 체크 결과
 */
interface PythonVersionCheck {
  command: string;
  version: string | null;
  major: number;
  minor: number;
  isValid: boolean;
}

/**
 * Python 명령어의 버전을 체크
 */
function checkPythonVersion(command: string): Promise<PythonVersionCheck> {
  return new Promise((resolve) => {
    const pythonProcess = spawn(command, ['--version']);
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      const versionOutput = output || errorOutput;
      const versionMatch = versionOutput.match(/Python (\d+)\.(\d+)\.(\d+)/);
      
      if (code === 0 && versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        const minor = parseInt(versionMatch[2], 10);
        const isValid = major > 3 || (major === 3 && minor >= 10);
        
        resolve({
          command,
          version: versionMatch[0],
          major,
          minor,
          isValid,
        });
      } else {
        resolve({
          command,
          version: null,
          major: 0,
          minor: 0,
          isValid: false,
        });
      }
    });

    pythonProcess.on('error', () => {
      resolve({
        command,
        version: null,
        major: 0,
        minor: 0,
        isValid: false,
      });
    });
  });
}

/**
 * 사용 가능한 Python 명령어를 찾고 버전을 체크
 * 우선순위: PYTHON_PATH 환경 변수 > python3.11 > python3.10 > python3 > python
 * 
 * @returns 사용 가능한 Python 명령어와 버전 정보
 */
export async function findPythonCommand(): Promise<{ command: string; version: string }> {
  // 1. 환경 변수에서 Python 경로 확인
  const pythonPath = process.env.PYTHON_PATH?.trim();
  if (pythonPath) {
    const check = await checkPythonVersion(pythonPath);
    if (check.isValid) {
      logger.debug(`[Python] Using PYTHON_PATH: ${pythonPath} (${check.version})`);
      return { command: pythonPath, version: check.version || 'unknown' };
    } else {
      logger.warn(`[Python] PYTHON_PATH (${pythonPath}) is invalid or version is too old. Trying alternatives...`);
    }
  }

  // 2. python3.11 시도
  const python311Check = await checkPythonVersion('python3.11');
  if (python311Check.isValid) {
    logger.debug(`[Python] Using python3.11 (${python311Check.version})`);
    return { command: 'python3.11', version: python311Check.version || 'unknown' };
  }

  // 3. python3.10 시도
  const python310Check = await checkPythonVersion('python3.10');
  if (python310Check.isValid) {
    logger.debug(`[Python] Using python3.10 (${python310Check.version})`);
    return { command: 'python3.10', version: python310Check.version || 'unknown' };
  }

  // 4. python3 시도
  const python3Check = await checkPythonVersion('python3');
  if (python3Check.isValid) {
    logger.debug(`[Python] Using python3 (${python3Check.version})`);
    return { command: 'python3', version: python3Check.version || 'unknown' };
  }

  // 5. python 시도
  const pythonCheck = await checkPythonVersion('python');
  if (pythonCheck.isValid) {
    logger.debug(`[Python] Using python (${pythonCheck.version})`);
    return { command: 'python', version: pythonCheck.version || 'unknown' };
  }

  // 모든 시도 실패
  const errorMessage = `Python 3.10 이상이 필요합니다. 다음 중 하나를 설치하세요:
- Python 3.11.10 (권장): pyenv install 3.11.10
- Python 3.10 이상

또는 환경 변수 PYTHON_PATH에 Python 3.10 이상의 경로를 설정하세요.
예: PYTHON_PATH=/usr/local/bin/python3.11

현재 시도한 명령어:
${pythonPath ? `- PYTHON_PATH=${pythonPath} (실패)` : ''}
- python3.11 (${python311Check.version || '없음'})
- python3.10 (${python310Check.version || '없음'})
- python3 (${python3Check.version || '없음'})
- python (${pythonCheck.version || '없음'})`;

  throw new AppError(errorMessage, 'PYTHON_NOT_FOUND', 500);
}
