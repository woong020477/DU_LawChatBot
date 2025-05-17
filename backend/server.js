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

다음 사용자 질문을 분석하여 질문 문장에서 핵심 법률 키워드 1개에서 3개를 추출하고, 간단한 법률적 조언을 제공합니다.

출력 형식은 반드시 아래 JSON 형식이어야 합니다:

{
  "answer": "질문에 대한 간단한 법률 조언",
  "keywords": "공백으로 구분된 핵심 키워드"
}

조건:
- 반드시 질문 문장에서만 핵심어를 추출할 것
- keywords는 쉼표나 따옴표 없이 한글 단어만 공백으로 구분한 문자열
- 법률적 상황이 아닐 경우 다음 형식만 반환

{
  "answer": "법률적 상황에 대한 답변만 가능합니다. 다시 질문해주세요."
}

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

  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${OC}&target=prec&type=JSON&query=${encodeURIComponent(query)}&display=3`;

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