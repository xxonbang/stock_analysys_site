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
 * - GOOGLE_API_KEY_01, GOOGLE_API_KEY_02, ... (01, 02 형식, 01이 default)
 * - GEMINI_API_KEY (하위 호환성, 있으면 사용하되 01보다 우선순위 낮음)
 * - GEMINI_API_KEY_01, GEMINI_API_KEY_02 (하위 호환성)
 */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const foundKeys: Map<string, string> = new Map();
  
  // 1. GOOGLE_API_KEY_* 패턴 찾기 (GOOGLE_API_KEY_01, GOOGLE_API_KEY_02 형식)
  // GOOGLE_API_KEY_01이 default 키
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (envKey.startsWith('GOOGLE_API_KEY_') && envValue && envValue.trim() !== '') {
      foundKeys.set(envKey, envValue.trim());
    }
  }
  
  // 2. 하위 호환성: GEMINI_API_KEY_* 패턴 찾기
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (envKey.startsWith('GEMINI_API_KEY_') && envValue && envValue.trim() !== '') {
      // GOOGLE_API_KEY_*가 없을 때만 사용
      const googleKey = `GOOGLE_API_KEY_${envKey.replace('GEMINI_API_KEY_', '')}`;
      if (!foundKeys.has(googleKey)) {
        foundKeys.set(envKey, envValue.trim());
      }
    }
  }
  
  // 3. 하위 호환성: GEMINI_API_KEY (단일 키)
  const legacyKey = process.env.GEMINI_API_KEY;
  if (legacyKey && legacyKey.trim() !== '' && foundKeys.size === 0) {
    // GOOGLE_API_KEY_*가 없을 때만 사용
    foundKeys.set('GEMINI_API_KEY', legacyKey.trim());
  }
  
  // 키를 정렬하여 순서대로 추가
  // 1. GOOGLE_API_KEY_* 키들을 숫자 순서대로 정렬 (GOOGLE_API_KEY_01, GOOGLE_API_KEY_02 순서)
  const googleKeys = Array.from(foundKeys.entries())
    .filter(([key]) => key.startsWith('GOOGLE_API_KEY_'))
    .sort(([keyA], [keyB]) => {
      // 숫자 추출하여 정렬 (01, 02 형식 올바르게 처리)
      const suffixA = keyA.replace('GOOGLE_API_KEY_', '');
      const suffixB = keyB.replace('GOOGLE_API_KEY_', '');
      const numA = parseInt(suffixA, 10) || 0;
      const numB = parseInt(suffixB, 10) || 0;
      return numA - numB;
    });
  
  // GOOGLE_API_KEY_01, GOOGLE_API_KEY_02 순서로 추가 (01이 default)
  for (const [, value] of googleKeys) {
    keys.push(value);
  }
  
  // 2. 하위 호환성: GEMINI_API_KEY_* 키들 추가 (GOOGLE_API_KEY_*가 없을 때만)
  if (googleKeys.length === 0) {
    const geminiKeys = Array.from(foundKeys.entries())
      .filter(([key]) => key.startsWith('GEMINI_API_KEY_'))
      .sort(([keyA], [keyB]) => {
        const suffixA = keyA.replace('GEMINI_API_KEY_', '');
        const suffixB = keyB.replace('GEMINI_API_KEY_', '');
        const numA = parseInt(suffixA, 10) || 0;
        const numB = parseInt(suffixB, 10) || 0;
        return numA - numB;
      });
    
    for (const [, value] of geminiKeys) {
      keys.push(value);
    }
    
    // 3. 하위 호환성: GEMINI_API_KEY (단일 키)
    if (foundKeys.has('GEMINI_API_KEY')) {
      keys.push(foundKeys.get('GEMINI_API_KEY')!);
    }
  }
  
  // 디버깅: 찾은 키 개수 및 순서 로그
  if (keys.length === 0) {
    console.warn('[Gemini] 환경 변수에서 API 키를 찾을 수 없습니다. 다음 형식을 확인하세요:');
    console.warn('  - GOOGLE_API_KEY_01 (default, 필수)');
    console.warn('  - GOOGLE_API_KEY_02, ... (fallback, 선택사항)');
    console.warn('[Gemini] 현재 환경 변수 (GOOGLE_API_KEY_*, GEMINI_API_KEY_*):', 
      Object.keys(process.env)
        .filter(k => k.startsWith('GOOGLE_API_KEY_') || k.startsWith('GEMINI_API_KEY'))
        .map(k => `${k}=${process.env[k] ? '***설정됨***' : 'undefined'}`)
    );
  } else {
    const keyNames = googleKeys.length > 0
      ? googleKeys.map(([key]) => key)
      : Array.from(foundKeys.keys()).filter(k => k.startsWith('GEMINI_API_KEY'));
    console.log(`[Gemini] ${keys.length}개의 API 키를 찾았습니다. 순서: ${keyNames.join(' → ')}`);
    console.log(`[Gemini] Default 키: ${keyNames[0] || '없음'}`);
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
    throw new Error("GOOGLE_API_KEY_01 또는 GEMINI_API_KEY가 설정되지 않았습니다. 최소 1개의 API 키가 필요합니다.");
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
        
        console.error(
          `[Gemini] API key ${i + 1} (${keyLabel}${roundLabel}) + ${modelName} 모델 실패:`,
          errorMessage
        );
        
        // 재시도 가능한 오류인지 확인
        const isRetryableError = 
          errorCode === 429 || // Rate limit
          errorCode === 503 || // Service unavailable
          statusCode === 429 ||
          statusCode === 503 ||
          errorMessage.toLowerCase().includes('429') ||
          errorMessage.toLowerCase().includes('503') ||
          errorMessage.toLowerCase().includes('quota') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('resource exhausted') ||
          errorMessage.toLowerCase().includes('exceeded') ||
          errorMessage.toLowerCase().includes('limit');
        
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
