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
 */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  
  // 기본 키
  const primaryKey = process.env.GEMINI_API_KEY;
  if (primaryKey) {
    keys.push(primaryKey);
  }
  
  // Fallback 키들 (GEMINI_API_KEY_2, GEMINI_API_KEY_3 등)
  let index = 2;
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${index}`];
    if (!key) break;
    keys.push(key);
    index++;
  }
  
  return keys;
}

/**
 * Gemini API 호출을 여러 키로 시도 (fallback 지원)
 */
export async function callGeminiWithFallback<T>(
  operation: (genAI: GoogleGenerativeAI) => Promise<T>,
  options?: { model?: string }
): Promise<T> {
  const apiKeys = getGeminiApiKeys();
  
  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 최소 1개의 API 키가 필요합니다.");
  }
  
  let lastError: Error | null = null;
  
  // 각 키로 순차적으로 시도
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const isPrimary = i === 0;
    
    try {
      console.log(`[Gemini] ${isPrimary ? 'Primary' : `Fallback ${i}`} API key 사용 시도...`);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const result = await operation(genAI);
      
      if (!isPrimary) {
        console.log(`[Gemini] Fallback API key (${i + 1}번째)로 성공적으로 호출 완료`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      const statusCode = (error as any)?.status;
      
      console.error(
        `[Gemini] API key ${i + 1} (${isPrimary ? 'Primary' : `Fallback ${i}`}) 실패:`,
        errorMessage
      );
      
      // 재시도 가능한 오류인지 확인
      const isRetryableError = 
        errorCode === 429 || // Rate limit
        errorCode === 503 || // Service unavailable
        statusCode === 429 ||
        statusCode === 503 ||
        errorMessage.includes('429') ||
        errorMessage.includes('503') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit');
      
      lastError = error instanceof Error ? error : new Error(errorMessage);
      
      // 마지막 키가 아니고 재시도 가능한 오류인 경우 다음 키로 시도
      if (i < apiKeys.length - 1 && isRetryableError) {
        console.log(`[Gemini] 재시도 가능한 오류 감지, 다음 API key로 시도...`);
        continue;
      }
      
      // 재시도 불가능한 오류이거나 마지막 키인 경우
      if (!isRetryableError) {
        // 재시도 불가능한 오류는 즉시 throw
        throw lastError;
      }
    }
  }
  
  // 모든 키 실패
  throw new Error(
    `모든 Gemini API 키가 실패했습니다. 마지막 오류: ${lastError?.message || 'Unknown error'}`
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
