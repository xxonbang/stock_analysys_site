/**
 * Gemini API 클라이언트 유틸리티
 * 여러 API 키에 대한 fallback 지원
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiClientOptions {
  apiKeys: string[];
  model?: string;
}

/**
 * Gemini API 키 목록 가져오기
 * 지원 형식:
 * - GEMINI_API_KEY_01, GEMINI_API_KEY_02 (01이 default)
 * - GEMINI_API_KEY (하위 호환성, GEMINI_API_KEY_*가 없을 때만 사용)
 */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  
  // GEMINI_API_KEY_01, GEMINI_API_KEY_02 찾기
  const key01 = process.env.GEMINI_API_KEY_01?.trim();
  const key02 = process.env.GEMINI_API_KEY_02?.trim();
  
  // 키를 재시도 순서대로 구성
  // 1번 키 사용 시 오류 발생 → 2번 키로 재시도
  // 2번 키 사용 시 오류 발생 → 1번 키로 재시도
  // 모든 키를 다 시도했는데도 오류 발생 → 오류 처리 (callGeminiWithFallback에서 처리)
  
  if (key01) {
    keys.push(key01);
    // 1번 키 실패 시 → 2번 키로 재시도
    if (key02) {
      keys.push(key02);
    }
  } else if (key02) {
    // 1번 키가 없고 2번 키만 있는 경우
    keys.push(key02);
  }
  
  // GEMINI_API_KEY_*가 없으면 GEMINI_API_KEY (단일 키) 사용
  if (keys.length === 0) {
    const legacyKey = process.env.GEMINI_API_KEY?.trim();
    if (legacyKey) {
      keys.push(legacyKey);
    }
  }
  
  // 디버깅: 찾은 키 개수 및 순서 로그
  if (keys.length === 0) {
    console.warn('[Gemini] 환경 변수에서 API 키를 찾을 수 없습니다. 다음 형식을 확인하세요:');
    console.warn('  - GEMINI_API_KEY_01 (default, 필수)');
    console.warn('  - GEMINI_API_KEY_02 (fallback, 선택사항)');
    console.warn('[Gemini] 현재 환경 변수 (GEMINI_API_KEY_*):', 
      Object.keys(process.env)
        .filter(k => k.startsWith('GEMINI_API_KEY'))
        .map(k => `${k}=${process.env[k] ? '***설정됨***' : 'undefined'}`)
    );
  } else {
    const keyNames: string[] = [];
    if (key01) keyNames.push('GEMINI_API_KEY_01');
    if (key02) keyNames.push('GEMINI_API_KEY_02');
    if (keyNames.length === 0 && process.env.GEMINI_API_KEY) {
      keyNames.push('GEMINI_API_KEY');
    }
    
    console.log(`[Gemini] ${keys.length}개의 API 키를 찾았습니다. 재시도 순서: ${keyNames.join(' → ')}`);
    console.log(`[Gemini] Primary 키: ${keyNames[0] || '없음'}`);
    if (keyNames.length > 1) {
      console.log(`[Gemini] Fallback 키: ${keyNames.slice(1).join(', ')}`);
    }
  }
  
  return keys;
}

/**
 * Gemini API 호출을 여러 키로 시도 (fallback 지원)
 * - API 키 fallback: 여러 키로 순차 시도
 * - 양방향 fallback: 모든 키 실패 시 처음부터 다시 시도 (키가 재활성화되었을 수 있음)
 */
export async function callGeminiWithFallback<T>(
  operation: (genAI: GoogleGenerativeAI, modelName?: string) => Promise<T>,
  options?: { model?: string; maxRetryRounds?: number }
): Promise<T> {
  const apiKeys = getGeminiApiKeys();
  const modelName = options?.model || "gemini-2.5-flash";
  const maxRetryRounds = options?.maxRetryRounds || 2; // 최대 2라운드 시도 (기본값)
  
  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY_01 또는 GEMINI_API_KEY가 설정되지 않았습니다. 최소 1개의 API 키가 필요합니다.");
  }
  
  let lastError: Error | null = null;
  
  // 여러 라운드로 시도 (키가 재활성화되었을 수 있으므로)
  for (let round = 0; round < maxRetryRounds; round++) {
    const isFirstRound = round === 0;
    
    if (!isFirstRound) {
      console.log(`[Gemini] 모든 키 실패, ${round + 1}라운드 재시도 시작 (키가 재활성화되었을 수 있음)...`);
    }
    
    // 각 키로 순차적으로 시도
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const isPrimaryKey = i === 0;
      const keyLabel = isPrimaryKey ? 'Primary' : `Fallback ${i}`;
      const roundLabel = isFirstRound ? '' : ` (라운드 ${round + 1})`;
      
      try {
        console.log(`[Gemini] ${keyLabel} API key${roundLabel} + ${modelName} 모델 사용 시도...`);
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const result = await operation(genAI, modelName);
        
        if (!isPrimaryKey || !isFirstRound) {
          const successLabel = !isFirstRound 
            ? `${keyLabel} API key (라운드 ${round + 1})로 성공적으로 호출 완료`
            : `Fallback API key (${i + 1}번째)로 성공적으로 호출 완료`;
          console.log(`[Gemini] ${successLabel}`);
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as any)?.code;
        const statusCode = (error as any)?.status;
        const statusCodeAlt = (error as any)?.statusCode; // 일부 라이브러리는 statusCode 사용
        
        // 상세 오류 정보 로깅
        console.error(
          `[Gemini] API key ${i + 1} (${keyLabel}${roundLabel}) + ${modelName} 모델 실패:`,
          errorMessage
        );
        console.error(`[Gemini] 오류 상세 정보:`, {
          errorCode,
          statusCode,
          statusCodeAlt,
          errorMessage,
          errorType: error?.constructor?.name,
          hasStatus: (error as any)?.status !== undefined,
          hasCode: (error as any)?.code !== undefined,
          hasStatusCode: (error as any)?.statusCode !== undefined,
        });
        
        // 재시도 가능한 오류인지 확인 (더 많은 케이스 커버)
        const finalStatusCode = statusCode || statusCodeAlt;
        const isRetryableError = 
          errorCode === 429 || // Rate limit
          errorCode === 503 || // Service unavailable
          finalStatusCode === 429 ||
          finalStatusCode === 503 ||
          errorMessage.toLowerCase().includes('429') ||
          errorMessage.toLowerCase().includes('503') ||
          errorMessage.toLowerCase().includes('quota') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('resource exhausted') ||
          errorMessage.toLowerCase().includes('exceeded') ||
          errorMessage.toLowerCase().includes('limit') ||
          errorMessage.toLowerCase().includes('daily limit') ||
          errorMessage.toLowerCase().includes('usage limit');
        
        lastError = error instanceof Error ? error : new Error(errorMessage);
        
        // 재시도 불가능한 오류는 즉시 throw (인증 오류 등)
        if (!isRetryableError) {
          throw lastError;
        }
        
        // 재시도 가능한 오류인 경우:
        // 1. 마지막 키가 아니면 다음 키로 계속 시도
        // 2. 마지막 키면 다음 라운드로 진행 (또는 모든 라운드 완료 시 실패)
        if (i < apiKeys.length - 1) {
          console.log(`[Gemini] 재시도 가능한 오류 감지, 다음 API key로 시도...`);
          continue;
        }
        // 마지막 키 실패 시 다음 라운드로 진행 (또는 모든 라운드 완료)
      }
    }
    
    // 현재 라운드에서 모든 키 실패
    // 마지막 라운드가 아니면 다음 라운드로 진행
    if (round < maxRetryRounds - 1) {
      console.log(`[Gemini] ${round + 1}라운드에서 모든 키 실패, 다음 라운드로 진행...`);
      // 다음 라운드로 진행 (키가 재활성화되었을 수 있으므로)
      continue;
    }
  }
  
  // 모든 라운드에서 모든 키 실패
  throw new Error(
    `모든 Gemini API 키가 ${maxRetryRounds}라운드 시도 후 실패했습니다. 마지막 오류: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Gemini 모델 인스턴스 생성 (fallback 지원)
 */
export async function createGeminiModel(
  modelName: string = "gemini-2.5-flash"
): Promise<{ genAI: GoogleGenerativeAI; model: any }> {
  const apiKeys = getGeminiApiKeys();
  
  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  
  // 첫 번째 키로 모델 생성 (실제 호출 시 fallback 처리)
  const genAI = new GoogleGenerativeAI(apiKeys[0]);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  return { genAI, model };
}
