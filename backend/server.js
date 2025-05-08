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

// 사용자 메시지 받아서 GPT API로 전송하고 응답을 반환하는 API 엔드포인트
app.post('/sendMessage', async (req, res) => {
  const { userMessage } = req.body;

  try {
    // 법률적 문맥을 유도하는 프롬프트 설계
    const prompt = `
    당신은 한국 법률 전문가 역할을 수행합니다. 아래 사용자의 메시지가 법률적 상황인지 판단하고, 
    그에 따라 간단하고 요약된 법률 조언을 제공하세요.

    - 법률적인 상황일 경우: 어떤 법적 문제인지 간단히 설명하고, 핵심 대응 방법을 요약해 주세요.
    - 법률적인 상황이 아닌 경우: "법률적 상황에 대한 답변만 가능합니다. 다시 질문해주세요."라고 답하세요.

    모든 문장은 **마침표(.) 기준으로 줄바꿈**해 주세요.  
    한 줄에 하나의 문장만 포함되도록 작성해 주세요.  
    불필요하게 길게 설명하지 말고 핵심만 3~4줄 이내로 간결하게 작성하세요.

    사용자 메시지:
    "${userMessage}"

    당신의 역할은 변호사이며, 법률 상담을 요약된 문장으로 제공하는 것입니다.
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

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});