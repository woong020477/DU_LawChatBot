import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드 (현재 디렉토리에서 .env 파일을 로드)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });


const app = express();
const port = 3000;

// Express.js가 JSON 요청을 파싱할 수 있도록 설정
app.use(bodyParser.json());
app.use(cors());  // CORS 설정

// API 키를 환경 변수에서 읽기
const apiKey = process.env.OPENAI_API_KEY;
console.log('Access Your GPT API KEY : ',process.env.OPENAI_API_KEY);
const OC = process.env.LAW_API_OC;
console.log('Access Your Law API KEY : ',process.env.LAW_API_OC);

// 사용자 메시지 받아서 GPT API로 전송하고 응답을 반환하는 API 엔드포인트
app.post('/sendMessage', async (req, res) => {
  const { userMessage } = req.body;

  try {
    // 법률적 문맥을 유도하는 프롬프트 설계
    const prompt = `
    너는 대한민국 법률 상담 AI다.
    
    다음 **사용자의 질문 문장 자체에서만 핵심 법률 키워드 3개를 추출**하고, 그에 대한 간단한 법률적 조언을 제공하라.
    
    반드시 아래 JSON 형식만 반환해야 한다:
    
    {
      "answer": "질문에 대한 간단한 법률 조언 (3~4문장)",
      "keywords": "사용자 질문 핵심단어1 사용자 질문 핵심단어2 사용자 질문 핵심단어3"
    }
    
    제약 조건:
    - **절대 답변 내용을 기준으로 키워드를 생성하지 말 것.**
    - keywords는 사용자 질문 문장에서 뽑아야 한다.
    - keywords는 쉼표 없이 공백으로 구분된 하나의 문자열이며, 1~3개의 법률 관련 명사로 구성하라.
    - 예시: 사용자 질문이 "내가 교통사고를 당했는데 상대방이 도망쳤어 이럴땐 법적으로 어떻게 처리해야해?"라면 → "교통사고 도주"
    - 질문이 법률과 무관하면 다음 형식만 반환:
    
    {
      "answer": "법률적 상황에 대한 답변만 가능합니다. 다시 질문해주세요."
    }
    
    사용자 질문: "${userMessage}"
    `;    

    // OpenAI API 요청 보내기
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '법률 상담을 제공합니다.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
      })
    });

    const gptData = await gptResponse.json();

    // GPT API 응답 확인
    if (gptData.choices && gptData.choices.length > 0) {
      const botMessage = gptData.choices[0].message.content.trim();  // GPT 응답

      res.json({
        botMessage: botMessage
      });
    } else {
      console.error('GPT 응답에 choices가 없습니다.', gptData);
      res.status(500).json({ error: '서버 오류: 유효한 응답을 받지 못했습니다.' });
    }

  } catch (error) {
    console.error('서버 처리 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류, 다시 시도해주세요.', details: error.message });
  }
});

// OC에 .env속의 아이디값을 담아 API 검색 후 전달
app.post('/getLawCases', async (req, res) => {
  const { query } = req.body;
  const OC = process.env.LAW_API_OC;

  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${OC}&target=prec&type=JSON&query=${encodeURIComponent(query)}&display=3`;

  try {
    const apiResponse = await fetch(url);
    const result = await apiResponse.json();

    // 상세 링크를 각 아이템에 추가
    if (result?.PrecSearch?.prec) {
      result.PrecSearch.prec = result.PrecSearch.prec.map(item => ({
        ...item,
        상세링크: `http://www.law.go.kr/DRF/lawService.do?OC=${OC}&target=prec&ID=${item.판례일련번호}&type=HTML`
      }));
    }

    res.json(result);
  } catch (error) {
    console.error('법령 API 호출 실패:', error);
    res.status(500).json({ error: '판례 검색 실패' });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});