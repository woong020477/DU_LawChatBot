import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv'; // dotenv 모듈 불러오기
import path from 'path';

// .env 파일 로드 (현재 디렉토리에서 .env 파일을 불러옴)
dotenv.config();  // 기본 경로로 .env 파일을 로드합니다.

const app = express();
const port = 3000;

// Express.js가 JSON 요청을 파싱할 수 있도록 설정
app.use(bodyParser.json());
app.use(cors());  // CORS 설정

// API 키를 환경 변수에서 읽기
const apiKey = process.env.OPENAI_API_KEY;

// 사용자 메시지 받아서 GPT API로 전송하고 응답을 반환하는 API 엔드포인트
app.post('/sendMessage', async (req, res) => {
  const { userMessage } = req.body;

  // 법률적 문맥을 유도하는 프롬프트 설계
  const prompt = `
    사용자가 입력한 메시지는 법률과 관련이 있을 수 있습니다.
    사용자가 말한 상황을 파악하고, 그에 적합한 법률적 답변을 제공하십시오.
    만약 질문이 법률과 관련이 없다면, 이를 명확히 지적해 주십시오.

    사용자 질문: "${userMessage}"
    법률적인 답변:`;

  try {
    // OpenAI API 요청 보내기
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 200,
      })
    });

    const data = await response.json();

    // OpenAI API가 오류를 반환했을 경우
    if (!response.ok) {
      console.error('OpenAI API 호출 실패:', data);
      return res.status(500).json({ error: 'OpenAI API 호출 실패', details: data });
    }

    const botMessage = data.choices[0].message.content.trim();  // GPT 응답
    res.json({ botMessage });  // 클라이언트로 응답 반환
  } catch (error) {
    console.error('서버 처리 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류, 다시 시도해주세요.', details: error.message });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});