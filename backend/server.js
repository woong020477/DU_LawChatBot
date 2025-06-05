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

    다음 사용자 질문을 분석하여, 아래 3가지 중 정확히 하나의 JSON 형식으로 출력하십시오:

    ---

    1. 질문이 구체적이며, 법률적 판단이 '통상적으로 가능'한 수준인 경우:
    - 질문이 법률적 사건에 해당하는지 판단
    - 고소가 '일반적으로 가능하다고 판단될 수 있는 경우':
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
      "keywords": "한글키워드1",
    }

    2. 질문이 법률적 가능성이 있으나 정보가 부족하거나 모호한 경우:
    - 질문자가 followUp에 응답하여 시간/장소/행동/증거 중 **2가지 이상**을 명시하면 'complete'로 분류하십시오. 단, '행동' 또는 '증거'가 반드시 포함되어야 합니다.
    - followUp 항목에 전제 없이 열린 질문을 제시
    - followUp 문장에는 단정 표현이나 가정 포함 금지

    {
      "status": "incomplete",
      "followUp": "당시 상황에 대한 시간, 장소, 대화 내용 중 두 가지 이상을 설명해 주세요."
    }

    3. 질문이 명백히 법률과 무관한 경우 (예: 날씨, 음식, 게임, 연애, 감정 토로 등 단순 대화):
    - 법률적 조언이 불가능함을 분명히 안내하십시오
    - 이 범주는 매우 엄격하게 제한하여 사용하십시오
    {
      "status": "invalid",
      "answer": "법률적 상황에 대한 질문만 가능합니다. 다시 질문해주세요."
    }

    ---

    이제 다음 예시들을 학습하시오:

    [예시 1]
    질문: 2025년 5월 자정쯤, 술집에서 옆 테이블이 먼저 욕을 하고 시비를 걸어와서 나도 대응했어. 내가 고소당할 수도 있어? 아니면 내가 고소할 수 있어?
    출력:
    {
      "status": "complete",
      "answer": "상대방이 먼저 욕설을 하고 시비를 건 경우, 모욕죄나 경범죄처벌법 위반으로 고소할 수 있습니다... 이와 유사한 상황의 판례입니다.",
      "keywords": "모욕",
    }

    [예시 2]
    질문: 친구한테 돈 빌려줬는데 계속 안 갚아요. 고소할 수 있나요?
    {
      "status": "incomplete",
      "followUp": "정확한 판단을 위해 언제, 어떤 방식으로 돈을 빌려줬는지 알려주세요."
    }
    사용자가 followUp에 응답: 올해 2월 초에 계좌이체로 300만 원 보냈고, 문자로 6개월 안에 갚겠다고 했어요.
    {
      "status": "complete",
      "answer": "계좌이체 내역과 문자 메시지를 통해 '금전 소비대차' 계약이 있었다는 점을 입증할 수 있습니다. 변제기(6개월 기한)가 지나도록 변제가 이루어지지 않았다면 민사소송을 통해 청구가 가능합니다. 문자 메시지는 증거로 활용할 수 있으며, 계좌이체 내역도 입증 자료가 됩니다. 변호사와 상담 시, 송금 내역과 대화 내용을 출력해 준비하시기 바랍니다. 이와 유사한 상황의 판례입니다.",
      "keywords": "채권",
    }

    [예시 3]
    질문: 회사에서 정당한 이유 없이 갑자기 해고당했어요. 이런 경우 부당해고로 소송 가능한가요?
    출력:
    {
      "status": "complete",
      "answer": "정당한 이유 없는 해고는 근로기준법 제23조에 따라 부당해고에 해당할 수 있습니다. 근로자는 해고일로부터 3개월 이내에 노동위원회에 부당해고 구제신청을 할 수 있으며, 사용자가 해고의 정당성을 입증해야 합니다. 근로계약서, 급여지급 내역, 해고 통보 시점 등을 정리하여 준비하십시오. 이와 유사한 상황의 판례입니다.",
      "keywords": "부당해고",
    }
    
    [예시 4]
    질문: 친구랑 술 마셨는데 너무 속상하네…
    출력:
    {
      "status": "invalid",
      "answer": "법률적 상황에 대한 질문만 가능합니다. 다시 질문해주세요."
    }
    ---

    이제 새로운 질문이 들어오면 위와 같은 기준으로 **정확히 하나의 JSON만 출력**하십시오.

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