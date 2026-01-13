import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  fetchStocksData,
  fetchExchangeRate,
  fetchVIX,
  fetchNews,
} from "@/lib/finance-adapter";
import { fetchKoreaSupplyDemand } from "@/lib/finance";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeResult,
} from "@/lib/types";
import { periodToKorean } from "@/lib/period-utils";

const getSystemPrompt = (
  period: string
) => `당신은 월스트리트와 여의도에서 20년 이상 활동한 **수석 투자 전략가(Chief Investment Strategist)**입니다.
당신의 분석 스타일은 **'데이터에 기반한 냉철한 통찰'**입니다. 단순히 '사라/팔아라'가 아니라, 거시 경제 상황과 기업의 펀더멘털, 그리고 기술적 위치를 종합하여 논리적인 시나리오를 제시합니다.

[분석 지침]
**중요: 사용자가 요청한 분석 기간은 [${period}]입니다.**
- '1일' 또는 '1주일'을 선택했다면 단기 트레이딩 관점에서 분석하십시오.
- '1달' 또는 '3개월'을 선택했다면 중기 투자 관점에서 분석하십시오.
- '6개월' 또는 '1년'을 선택했다면 펀더멘털과 장기 추세 관점에서 분석하십시오.

1. 기술적 분석: 제공된 RSI, 이평선, 이격도 데이터를 바탕으로 현재 주가의 위치(과열/침체)를 진단하십시오. 선택된 기간(${period})에 맞는 관점으로 해석하십시오.
2. 수급 분석: 기관/외국인 매매 동향을 통해 '스마트 머니'의 흐름을 해석하십시오.
3. 결론: 선택된 기간(${period})에 맞는 투자 의견을 명확하게 제시하십시오. 단기/장기 관점을 구분하여 설명하십시오.
4. 어조: 전문적이고 신뢰감 있게, 그러나 개인 투자자가 이해하기 쉽게 설명하십시오.

응답은 마크다운 형식으로 작성하되, 다음 구조를 따르세요:
## 현재 시장 상황
## 기술적 분석 (${period} 관점)
## 수급 분석
## 투자 의견
  - 단기 관점
  - 장기 관점
`;

/**
 * 여러 종목의 데이터를 기반으로 AI 분석 리포트를 한 번에 생성
 * @param stocksData 종목별 마켓 데이터 배열
 * @param period 분석 기간
 * @param genAI GoogleGenerativeAI 인스턴스
 * @returns 종목별 리포트 맵 (symbol -> report)
 */
async function generateAIReportsBatch(
  stocksData: Array<{
    symbol: string;
    marketData: AnalyzeResult["marketData"];
  }>,
  period: string,
  genAI: GoogleGenerativeAI
): Promise<Map<string, string>> {
  // Gemini 모델명: gemini-2.5-flash 사용 (최신 모델)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = getSystemPrompt(period);

  // 모든 종목의 데이터를 하나의 프롬프트로 구성
  const stocksDataPrompt = stocksData
    .map(({ symbol, marketData }) => {
      return `
## 종목 ${symbol}

**현재가**: ${marketData.price.toLocaleString()}
**변동률**: ${
        marketData.changePercent >= 0 ? "+" : ""
      }${marketData.changePercent.toFixed(2)}%
**거래량**: ${marketData.volume.toLocaleString()}
${
  marketData.marketCap
    ? `**시가총액**: ${marketData.marketCap.toLocaleString()}`
    : ""
}

${marketData.rsi !== undefined ? `**RSI(14)**: ${marketData.rsi}` : ""}
${
  marketData.movingAverages
    ? `
**이동평균선**:
- 5일선: ${marketData.movingAverages.ma5.toLocaleString()}
- 20일선: ${marketData.movingAverages.ma20.toLocaleString()}
- 60일선: ${marketData.movingAverages.ma60.toLocaleString()}
- 120일선: ${marketData.movingAverages.ma120.toLocaleString()}
`
    : ""
}
${
  marketData.disparity !== undefined
    ? `**이격도(20일 기준)**: ${marketData.disparity}%`
    : ""
}
${
  marketData.supplyDemand
    ? `
**수급 데이터**:
- 기관: ${
        marketData.supplyDemand.institutional > 0 ? "+" : ""
      }${marketData.supplyDemand.institutional.toLocaleString()}
- 외국인: ${
        marketData.supplyDemand.foreign > 0 ? "+" : ""
      }${marketData.supplyDemand.foreign.toLocaleString()}
- 개인: ${
        marketData.supplyDemand.individual > 0 ? "+" : ""
      }${marketData.supplyDemand.individual.toLocaleString()}
`
    : ""
}
${marketData.vix !== undefined ? `**VIX 지수**: ${marketData.vix}` : ""}
${
  marketData.exchangeRate
    ? `**환율(USD/KRW)**: ${marketData.exchangeRate.toLocaleString()}`
    : ""
}
${
  marketData.news && marketData.news.length > 0
    ? `
**최근 뉴스**:
${marketData.news.map((n, i) => `${i + 1}. ${n.title}`).join("\n")}
`
    : ""
}
---`;
    })
    .join("\n");

  const symbolsList = stocksData.map(({ symbol }) => symbol).join(", ");

  // 응답 형식 예시 생성
  const formatExample = stocksData
    .map(({ symbol }, index) => {
      return `[종목: ${symbol}]
---
## ${symbol} 현재 시장 상황
[${symbol}의 현재 시장 상황 분석]

## ${symbol} 기술적 분석
[${symbol}의 기술적 분석]

## ${symbol} 수급 분석
[${symbol}의 수급 분석]

## ${symbol} 투자 의견
- 단기 관점: [의견]
- 장기 관점: [의견]

`;
    })
    .join("\n");

  const dataPrompt = `
다음 ${stocksData.length}개 종목(${symbolsList})의 데이터를 각각 분석해주세요:

${stocksDataPrompt}

**중요**: 각 종목에 대해 독립적인 분석 리포트를 작성하되, 응답 형식은 반드시 다음과 같이 해주세요:

${formatExample}

각 종목의 리포트는 위 형식을 정확히 따라주세요. 종목 심볼을 명확히 표시하고, 각 종목에 대해 완전한 분석 리포트를 작성해주세요.
`;

  try {
    const result = await model.generateContent(
      systemPrompt + "\n\n" + dataPrompt
    );
    const response = await result.response;
    const fullReport = response.text();

    // 응답을 종목별로 파싱
    const reportsMap = new Map<string, string>();

    // 각 종목별로 리포트 분리
    // 패턴: [종목: SYMBOL] 형식 우선, 그 외 다양한 형식 지원
    for (const { symbol } of stocksData) {
      // 여러 패턴 시도 (우선순위 순)
      const patterns = [
        // [종목: SYMBOL] --- 형식 (가장 명확)
        new RegExp(
          `\\[종목:\\s*${symbol}\\s*\\]\\s*\\n---\\s*\\n([\\s\\S]*?)(?=\\[종목:|$)`,
          "i"
        ),
        // [종목: SYMBOL] 형식 (--- 없음)
        new RegExp(
          `\\[종목:\\s*${symbol}\\s*\\]\\s*\\n([\\s\\S]*?)(?=\\[종목:|$)`,
          "i"
        ),
        // ## SYMBOL 현재 시장 상황 형식
        new RegExp(
          `##\\s*${symbol}\\s+현재 시장 상황[\\s\\S]*?([\\s\\S]*?)(?=##\\s*[A-Z0-9]+\\s+현재 시장 상황|\\[종목:|$)`,
          "i"
        ),
        // 종목: SYMBOL 형식
        new RegExp(
          `종목:\\s*${symbol}\\s*\\n---\\s*\\n([\\s\\S]*?)(?=종목:|$)`,
          "i"
        ),
        // ## SYMBOL 형식
        new RegExp(
          `##\\s*${symbol}[\\s\\S]*?\\n([\\s\\S]*?)(?=##\\s*[A-Z0-9]+|\\[종목:|종목:|$)`,
          "i"
        ),
      ];

      let found = false;
      for (const pattern of patterns) {
        const match = fullReport.match(pattern);
        if (match && match[1]) {
          const report = match[1].trim();
          // 최소 길이 체크 (너무 짧으면 무시)
          if (report.length > 100) {
            reportsMap.set(symbol, report);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // 패턴 매칭 실패 시, 전체 리포트를 첫 번째 종목에 할당
        if (reportsMap.size === 0) {
          reportsMap.set(symbol, fullReport);
        } else {
          reportsMap.set(
            symbol,
            `## ${symbol} 분석 리포트\n\n⚠️ AI 리포트 파싱 중 오류가 발생했습니다. 전체 리포트를 확인해주세요.`
          );
        }
      }
    }

    // 파싱 실패한 종목이 있으면 전체 리포트를 첫 번째 종목에 할당
    if (reportsMap.size === 0 && stocksData.length > 0) {
      reportsMap.set(stocksData[0].symbol, fullReport);
      for (let i = 1; i < stocksData.length; i++) {
        reportsMap.set(
          stocksData[i].symbol,
          `## ${stocksData[i].symbol} 분석 리포트\n\n⚠️ AI 리포트 파싱 중 오류가 발생했습니다.`
        );
      }
    }

    return reportsMap;
  } catch (error: any) {
    console.error("Error generating AI reports:", error);

    // Rate limit 오류 처리
    if (
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("quota")
    ) {
      throw new Error(
        "Gemini API 일일 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요. (무료 티어: 하루 20회)"
      );
    }

    // 기타 오류
    const errorMessage = error?.message || "알 수 없는 오류";
    throw new Error(`AI 리포트 생성에 실패했습니다: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { stocks, period, indicators } = body;

    // period 기본값 설정
    const analysisPeriod = period || "1m";
    const periodKorean = periodToKorean(analysisPeriod);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json(
        { error: "주식 종목이 필요합니다." },
        { status: 400 }
      );
    }

    if (stocks.length > 5) {
      return NextResponse.json(
        { error: "최대 5개 종목까지 분석 가능합니다." },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // 배치로 모든 종목 데이터 수집
    // Python 스크립트 사용 가능하면 우선 사용 (로컬 테스트용)
    console.log(`Fetching data for ${stocks.length} stocks...`);

    let stockDataMap: Map<string, any>;

    // Python 스크립트 직접 사용 (로컬 환경에서 테스트)
    // 환경 변수 확인 또는 강제 사용
    const usePython =
      process.env.USE_PYTHON_SCRIPT === "true" ||
      process.env.DATA_SOURCE === "vercel";

    if (usePython) {
      console.log(
        `Using Python script directly... (period: ${analysisPeriod})`
      );
      console.log(`Original symbols: ${stocks.join(", ")}`);
      try {
        const { fetchStocksDataBatchVercel } = await import(
          "@/lib/finance-vercel"
        );
        stockDataMap = await fetchStocksDataBatchVercel(stocks, analysisPeriod);
        console.log(
          `Fetched data for symbols: ${Array.from(stockDataMap.keys()).join(
            ", "
          )}`
        );

        // Python 스크립트가 실패하면 fallback
        if (stockDataMap.size === 0) {
          console.warn(
            "Python script returned no data, falling back to yahoo-finance2"
          );
          try {
            stockDataMap = await fetchStocksData(stocks);
          } catch (fallbackError) {
            console.error("Fallback to yahoo-finance2 also failed:", fallbackError);
            throw new Error(`모든 종목 데이터 수집에 실패했습니다: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          }
        }
      } catch (error) {
        console.error(
          "Python script failed, falling back to yahoo-finance2:",
          error
        );
        try {
          stockDataMap = await fetchStocksData(stocks);
        } catch (fallbackError) {
          console.error("Fallback to yahoo-finance2 also failed:", fallbackError);
          throw new Error(`모든 종목 데이터 수집에 실패했습니다: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }
    } else {
      stockDataMap = await fetchStocksData(stocks);
    }

    // 환율 및 VIX는 한 번만 조회
    const [exchangeRate, vix] = await Promise.all([
      indicators.exchangeRate
        ? fetchExchangeRate().catch(() => null)
        : Promise.resolve(null),
      indicators.fearGreed
        ? fetchVIX().catch(() => null)
        : Promise.resolve(null),
    ]);

    const results: AnalyzeResult[] = [];
    const stocksDataForAI: Array<{
      symbol: string;
      marketData: AnalyzeResult["marketData"];
    }> = [];

    // 각 종목별로 데이터 처리 (AI 리포트 생성 전에 모든 데이터 수집)
    for (const symbol of stocks) {
      const stockData = stockDataMap.get(symbol);

      if (!stockData) {
        console.error(`Failed to fetch data for ${symbol}`);
        continue;
      }
      const isKoreaStock = symbol.includes(".KS") || /^\d{6}$/.test(symbol);

      // 수급 데이터 수집 (한국 주식만)
      let supplyDemand = undefined;
      if (indicators.supplyDemand && isKoreaStock) {
        const koreaSymbol = symbol.replace(".KS", "");
        supplyDemand = await fetchKoreaSupplyDemand(koreaSymbol).catch(
          () => undefined
        );
      }

      // 뉴스 수집 (선택사항, 실패해도 계속 진행)
      const news = await fetchNews(symbol, 5).catch((err) => {
        console.warn(`Failed to fetch news for ${symbol}:`, err);
        return [];
      });

      // 마켓 데이터 구성
      const marketData: AnalyzeResult["marketData"] = {
        price: stockData.price,
        change: stockData.change,
        changePercent: stockData.changePercent,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
        ...(indicators.rsi && { rsi: stockData.rsi }),
        ...(indicators.movingAverages && {
          movingAverages: stockData.movingAverages,
        }),
        ...(indicators.disparity && { disparity: stockData.disparity }),
        ...(supplyDemand && { supplyDemand }),
        ...(indicators.fearGreed && vix !== null && { vix }),
        ...(indicators.exchangeRate &&
          exchangeRate !== null && { exchangeRate }),
        ...(news.length > 0 && { news }),
      };

      stocksDataForAI.push({ symbol, marketData });
    }

    // 모든 종목의 데이터를 모아서 한 번에 AI 리포트 생성 (단 1회 Gemini API 호출)
    let aiReportsMap = new Map<string, string>();

    if (stocksDataForAI.length > 0) {
      try {
        console.log(
          `Generating AI reports for ${stocksDataForAI.length} stocks in a single API call...`
        );
        aiReportsMap = await generateAIReportsBatch(
          stocksDataForAI,
          periodKorean,
          genAI
        );
      } catch (error) {
        console.error("Failed to generate AI reports:", error);

        // AI 리포트 생성 실패 시 에러 메시지로 채움
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        for (const { symbol } of stocksDataForAI) {
          aiReportsMap.set(
            symbol,
            `## ${symbol} 분석 리포트\n\n⚠️ AI 리포트 생성 중 오류가 발생했습니다: ${errorMessage}\n\n데이터 수집은 성공적으로 완료되었습니다.`
          );
        }
      }
    }

    // 결과 구성
    for (const { symbol, marketData } of stocksDataForAI) {
      const aiReport =
        aiReportsMap.get(symbol) ||
        `## ${symbol} 분석 리포트\n\n⚠️ AI 리포트를 생성할 수 없습니다.\n\n데이터 수집은 성공적으로 완료되었습니다.`;

      results.push({
        symbol,
        period: periodKorean,
        marketData,
        aiReport,
      });
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "모든 종목 데이터 수집에 실패했습니다." },
        { status: 500 }
      );
    }

    const response: AnalyzeResponse = { results };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
