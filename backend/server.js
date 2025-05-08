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
      사용자가 입력한 메시지에 법률적 상황이 포함되어 있는지 확인하고, 
      법률적인 상황이라면 그에 대한 적합한 대처법을 제공하십시오. 
      만약 사용자의 질문이 법률적인 상황과 관련이 없다면, 
      "법률적 상황에 대한 답변만 가능합니다. 다시 질문해주세요."라고 응답하십시오.

      사용자 질문: "${userMessage}"
      응답:
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