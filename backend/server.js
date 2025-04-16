import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

// __dirname 대신 import.meta.url 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express.js가 JSON 요청을 파싱할 수 있도록 설정
app.use(bodyParser.json());
app.use(cors());  // CORS 설정

// API 키를 API-KEY.json 파일에서 읽기
const apiKeyPath = path.join(__dirname, 'API-KEY.json');
let apiKey;

// API-KEY.json 파일에서 API 키 읽기
fs.readFile(apiKeyPath, 'utf8', (err, data) => {
  if (err) {
    console.error('API 키 파일을 읽는 데 실패했습니다.', err);
    process.exit(1);
  }
  const jsonData = JSON.parse(data);
  apiKey = jsonData.openai_api_key;
  console.log('API 키 로딩 완료');
});

// 사용자 메시지 받아서 GPT API로 전송하고 응답을 반환하는 API 엔드포인트
app.post('/sendMessage', async (req, res) => {
    const { userMessage } = req.body;
  
    try {
      console.log('Received message from client:', userMessage);  // 클라이언트 메시지 출력
  
      // OpenAI API 요청 보내기
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`  // API 키
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',  // 사용할 모델
          messages: [{ role: 'user', content: userMessage }],  // 메시지 형식 변경
          max_tokens: 150,
          n: 1,
          stop: null
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