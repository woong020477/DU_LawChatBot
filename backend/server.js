const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');  // CORS 설정 (필요한 경우)

const app = express();
const port = 3000;

// Express.js가 JSON 요청을 파싱할 수 있도록 설정
app.use(bodyParser.json());
app.use(cors());  // 클라이언트와 서버가 다른 포트에서 실행될 경우 필요

// API 키를 API-KEY.json 파일에서 읽기
const apiKeyPath = path.join(__dirname, 'API-KEY.json');  // API-KEY.json 경로
let apiKey;

// API-KEY.json 파일에서 API 키 읽기
fs.readFile(apiKeyPath, 'utf8', (err, data) => {
  if (err) {
    console.error('API 키 파일을 읽는 데 실패했습니다.', err);
    process.exit(1);  // 프로그램 종료
  }
  const jsonData = JSON.parse(data);
  apiKey = jsonData.openai_api_key;  // 파일에서 읽어온 API 키
  console.log('API 키 로딩 완료');
});

// 사용자 메시지 받아서 GPT API로 전송하고 응답을 반환하는 API 엔드포인트
app.post('/sendMessage', async (req, res) => {
  const { userMessage } = req.body;

  // OpenAI API 요청 보내기
  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`  // API 키를 헤더에 추가
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: userMessage,
        max_tokens: 150,
        n: 1,
        stop: null
      })
    });

    const data = await response.json();
    const botMessage = data.choices[0].text.trim(); // GPT 응답

    res.json({ botMessage }); // 클라이언트로 응답 반환
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: '서버 오류, 다시 시도해주세요.' });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});