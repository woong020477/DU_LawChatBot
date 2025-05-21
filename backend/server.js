import express from 'express';                // express 웹 서버 모듈 불러오기
import fetch from 'node-fetch';              // fetch 함수로 외부 API 호출을 위해 사용
import dotenv from 'dotenv';                 // 환경 변수 사용을 위해 dotenv 모듈 불러오기
import cors from 'cors';                     // CORS 설정을 위한 모듈

dotenv.config();                             // .env 파일에 있는 환경변수를 불러와 적용

const app = express();                       // express 애플리케이션 생성
const PORT = process.env.PORT || 3000;       // 포트 설정 (환경변수 또는 3000번)

app.use(cors());                             // 모든 도메인에서 요청 허용
app.use(express.json());                     // 요청 본문을 JSON으로 파싱

/*
    서버 측 기능을 담당하는 Node.js Express 서버 파일
   사용자의 질문을 GPT에게 전달하고 응답을 받아 반환하며,
   판례 검색 요청을 받아 법제처 API를 호출한 뒤 JSON 결과를 반환함
*/

/* 사용자의 질문을 GPT에게 전달하고 요약 및 키워드를 응답받아 반환하는 엔드포인트 */
app.post('/sendMessage', async (req, res) => {
  const { userMessage } = req.body;                          // 클라이언트에서 보낸 사용자 메시지 추출

  if (!userMessage) {
    return res.status(400).json({ error: '메시지가 없습니다' });  // 메시지가 없으면 400 오류 반환
  }

  try {
    const prompt = `
    당신은 대한민국 법률 상담 AI입니다.

    다음 사용자 질문을 분석하여, 아래 3가지 중 하나의 JSON 형식으로 **정확히 하나만 출력**하십시오:

    ---

    1 질문이 구체적이고 법률적으로 충분한 경우:
    - 질문이 법률적 사건에 해당하는지 판단
    - 고소가 가능한 경우:
      - 고소 가능성을 설명하고
      - 필요한 증거/자료 준비 방법
      - 변호사와 상담 시 필요한 준비사항을 구체적으로 안내
    - 고소가 불가능한 경우:
      - 이유를 법적으로 설명하고
      - 가능한 대안 조치를 제안
    - 마지막 줄에 반드시 다음 문장을 추가하십시오:  
      "이와 유사한 상황의 판례입니다."
    - 핵심 키워드 1개를 추출하여 'keywords'에 포함 (문장이 아닌 단어, 쉼표 없이)

    {
      "status": "complete",
      "answer": "자세한 법률 조언 ... 마지막 줄: 이와 유사한 상황의 판례입니다.",
      "keywords": "한글키워드1"
    }

    ---

    2 질문이 법률적 가능성이 있으나 정보가 부족하거나 모호한 경우:
    - 질문에 사건, 사고, 피해, 분쟁 등 **법률적 사안일 가능성이 있는 진술**이 포함되어 있다면 이 범주로 처리하십시오.
    - followUp 항목에 전제 없이 열린 질문을 제시
    - followUp 문장에는 단정 표현이나 가정 포함 금지

    {
      "status": "incomplete",
      "followUp": "정확한 판단을 위해 언제, 어떤 상황에서 발생했는지 자세히 알려주세요."
    }

    ---

    3 질문이 명백히 법률과 무관한 경우 (예: 날씨, 음식, 게임, 연애, 감정 토로 등 단순 대화):
    - 법률적 조언이 불가능함을 분명히 안내하십시오
    - 이 범주는 매우 엄격하게 제한하여 사용하십시오

    {
      "status": "invalid",
      "answer": "법률적 상황에 대한 질문만 가능합니다. 다시 질문해주세요."
    }

    ---

     조건:
    - 반드시 위 세 가지 중 하나의 JSON만 출력
    - ‘교통사고를 당했다’, ‘부당하게 대우받았다’, ‘상대방이 때렸다’ 등 **사건 서술이 포함된 질문은 무조건 status: incomplete 이상으로 판단할 것**
    - keywords는 반드시 한글 단어 1개 (예: "계약", "명예훼손", "사기")
    - answer는 마지막 줄에 항상: "이와 유사한 상황의 판례입니다."
    - followUp은 열린 질문 형태로 작성하며, 반드시 **1~2개의 질문 문장**으로 구성할 것

    ---

    사용자 질문: "${userMessage}"
    `;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',                                   // POST 방식으로 GPT API 호출
      headers: {
        'Content-Type': 'application/json',             // 요청 본문은 JSON 형식
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`  // OpenAI API 키는 환경변수에서 불러옴
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',                         // 사용할 GPT 모델 지정
        messages: [{ role: 'user', content: prompt }],  // 사용자 역할로 프롬프트 전달
        temperature: 0.7                                // 생성 다양성 설정
      })
    });

    const gptData = await gptResponse.json();           // GPT 응답을 JSON으로 파싱
    const botMessage = gptData.choices?.[0]?.message?.content || '';  // 응답 본문에서 메시지 추출

    res.json({ botMessage });                           // 클라이언트에 응답 반환
  } catch (error) {
    console.error('GPT 호출 실패:', error);             // 오류 발생 시 서버 로그 출력
    res.status(500).json({ error: 'GPT 호출 중 오류가 발생했습니다' });  // 서버 오류 응답
  }
});

/* 클라이언트에서 판례 검색 요청을 받아 법제처 API에 요청하고 결과를 반환하는 엔드포인트 */
app.post('/getLawCases', async (req, res) => {
  const { query } = req.body;                                     // 클라이언트에서 전달한 검색어 추출
  const OC = process.env.LAW_API_OC;                              // .env에 저장된 사용자 인증 OC 값 사용

  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${OC}&target=prec&type=JSON&query=${encodeURIComponent(query)}&display=5`;

  console.log("법령 API 요청 URL:", url);                        // 실제 요청 URL 로그 출력

  try {
    const apiResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'                               // 브라우저처럼 보이도록 헤더 추가
      }
    });

    const text = await apiResponse.text();                        // 응답을 텍스트 형태로 받음

    if (text.startsWith('<')) {
      console.error("JSON이 아닌 HTML 응답을 받았습니다");       // HTML 응답일 경우 에러 로그 출력
      console.error(text.slice(0, 300));                          // 응답 앞부분 확인
      return res.status(500).json({ error: '법령 API에서 JSON이 아닌 HTML을 반환했습니다' });
    }

    const result = JSON.parse(text);                              // 텍스트를 JSON으로 파싱

    const items = result?.PrecSearch?.prec;                       // 판례 배열 추출
    if (!items || items.length === 0) {
      return res.json({ PrecSearch: { prec: [] } });              // 결과가 없을 경우 빈 배열 반환
    }

    const OC = process.env.LAW_API_OC;

    const enhancedItems = Array.isArray(items) ? items : [items];  // 단일 객체일 경우 배열로 변환

    // 각 판례에 상세 링크 추가
    const processed = enhancedItems.map(item => ({
      ...item,
      상세링크: `http://www.law.go.kr/DRF/lawService.do?OC=${OC}&target=prec&ID=${item.판례일련번호}&type=HTML`
    }));

    res.json({ PrecSearch: { prec: processed } });                // 가공된 결과를 클라이언트에 응답
  } catch (error) {
    console.error('법령 API 호출 실패:', error);                  // 서버 콘솔에 에러 출력
    res.status(500).json({ error: '판례 검색 중 오류 발생' });    // 클라이언트에 에러 응답
  }
});

/* 서버 실행 시작 */
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);          // 서버 실행 로그 출력
});