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
    (1) 법률적 조언 (answer)
    (2) 관련 키워드 3~5개 (keywords)
    (3) 유사 판례 검색에 적합한 문장형 쿼리 (query)

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
    - 판례와 법령 정보를 출력할 때 아래 사항을 지켜야 함:
      - 응답('answer') 내에 특정 조항이 언급된 경우(예: "근로기준법 제24조"), "근로기준법"만 'lawname'에 기재할 것
      - 'lawname' 필드는 법령명만을 포함하며, 조항 번호는 제외
      - 조항 번호는 반드시 'answer' 본문에 유지하여 사용자가 세부 내용을 확인할 수 있도록 함

    - 마지막 줄에 반드시 다음 문장을 추가하십시오:  
      "이와 유사한 상황의 판례입니다."

    - 사용자의 질문에서 법률적 판단에 중요한 단어(예: 죄명, 행위, 피해유형 등)를 뽑아 "keywords"에 포함하십시오.
    - 각 키워드는 검색 가능성이 높은 **2~5글자 중심의 명사**를 우선 추출하십시오. (예: "사기", "주거침입", "폭행", "재산분할")

    - 'query'는 사용자 질문을 1문장으로 요약한 것으로, UI 표기용이므로 반드시 자연어 문장으로 작성하십시오.
    - 'keywords'는 '"폭행"', '"모욕"', '"증거사진"' 등 개별 단어로, 쉼표 없이 배열 형태로 출력하십시오.

    {
      "status": "complete",
      "answer": "자세한 법률 조언을 해주십시오. 위 설명 내용 전체가 여기에 포함되어야 합니다. 법령 조항도 반드시 명시 해주십시오.",
      "keywords": ["핵심키워드1", "핵심키워드2"],
      "lawname": "관련법명", // 무조건 제공
      "query": "판례 검색을 위한 한국어 자연어 검색문장"
    }

    ---

    2. 질문이 법률적 가능성이 있으나 정보가 부족하거나 모호한 경우:

    - 질문자가 followUp에 응답하여 시간/장소/행동/증거 중 **2가지 이상**을 명시하면 'complete'로 분류하십시오. 단, '행동' 또는 '증거'가 반드시 포함되어야 합니다.
    - followUp 항목에 전제 없이 열린 질문을 제시
    - followUp 문장에는 단정 표현이나 가정 포함 금지

    {
      "status": "incomplete",
      "followUp": "정확한 판단을 위해, 가능한 한 육하원칙(언제, 어디서, 누가, 무엇을, 어떻게, 왜)에 따라 설명해 주세요. 특히 어떤 행동이 있었고, 이를 입증할 수 있는 증거가 있다면 꼭 알려주세요."
    }

    ---

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
      "answer": "상대방이 먼저 욕설을 하고 시비를 건 경우, 모욕죄(형법 제311조) 또는 경범죄처벌법 위반으로 고소할 수 있습니다. 다만, 쌍방 간 폭행 또는 모욕이 있었던 경우 귀하 또한 처벌 대상이 될 수 있습니다. 당시 상황에 대한 영상, 목격자 진술 등 증거를 확보해두는 것이 중요합니다. 변호사 상담 시 사건 시간, 장소, 상대방 언행을 정리하여 제시하십시오. 이와 유사한 상황의 판례입니다.",
      "keywords": ["모욕", "폭행"],
      "lawname": "형법",
      "query": "술집에서 모욕과 시비가 있었을 때 고소 가능한지 여부"
    }

    [예시 2]
    질문: 친구한테 돈 빌려줬는데 계속 안 갚아요. 고소할 수 있나요?
    사용자 followUp 응답: 올해 2월 초에 계좌이체로 300만 원 보냈고, 문자로 6개월 안에 갚겠다고 했어요.
    출력:
    {
      "status": "complete",
      "answer": "계좌이체 내역과 문자 메시지를 통해 '금전 소비대차' 계약이 존재했음을 입증할 수 있습니다. 변제기한(6개월)이 지났음에도 변제가 이루어지지 않았다면 민사소송을 제기할 수 있습니다. 이 경우, 민법 제598조에 근거한 청구가 가능합니다. 문자 및 계좌이체 내역은 소송 시 유효한 증거가 됩니다. 이와 유사한 상황의 판례입니다.",
      "keywords": ["채권", "금전", "소비대차"],
      "lawname": "민법",
      "query": "빌려준 돈을 갚지 않을 때 법적 대응 가능 여부"
    }

    [예시 3]
    질문: 회사에서 정당한 이유 없이 갑자기 해고당했어요. 이런 경우 부당해고로 소송 가능한가요?
    출력:
    {
      "status": "complete",
      "answer": "정당한 이유 없는 해고는 근로기준법 제23조 및 제24조에 따라 부당해고로 간주될 수 있습니다. 근로자는 해고일로부터 3개월 이내에 노동위원회에 부당해고 구제신청을 할 수 있으며, 사용자가 해고의 정당성을 입증해야 합니다. 해고 통보 시기, 사유, 근로계약서, 급여내역 등 관련 자료를 정리해두는 것이 좋습니다. 이와 유사한 상황의 판례입니다.",
      "keywords": ["해고", "근로자", "부당"],
      "lawname": "근로기준법",
      "query": "정당한 이유 없이 해고당한 경우 법적 구제 방법"
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
  const { keywords, query, label, target } = req.body;
  const OC = process.env.LAW_API_OC;

  // 유효성 검사
  if (!Array.isArray(keywords) || keywords.length === 0 || !query) {
    return res.status(400).json({ error: '검색 키워드 또는 쿼리가 없습니다.' });
  }

  let url = '';
  const encodedQuery = encodeURIComponent(query);
  if (target === 'prec'){
    url =`http://www.law.go.kr/DRF/lawSearch.do?OC=${OC}&target=${target}&type=JSON&search=2&query=${encodedQuery}&display=2`;
  }
  else if (target === 'law'){
    const exactQuery = `"${query}"`;  // 큰따옴표 추가
    const encodedQuery1 = encodeURIComponent(exactQuery);
    url =`http://www.law.go.kr/DRF/lawSearch.do?OC=${OC}&target=${target}&type=JSON&query=${encodedQuery1}&display=15`;
  }
  else {
    console.warn(`[${label}] query 값이 유효하지 않음:`, query);
    return res.status(400).json({ error: 'Invalid query value' });
  }
  console.log(`[${label}] 요청 URL:`, url);

  try {
    const apiResponse = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const text = await apiResponse.text();

    if (text.startsWith('<')) {
      console.error(`[${label}] HTML 응답 수신 (JSON 아님)`);
      return res.status(502).json({ error: '법제처 API에서 예상치 못한 HTML 형식 응답을 받았습니다.' });
    }

    const json = JSON.parse(text);
    let items;
    if (target === 'prec') {
      items = json?.PrecSearch?.prec;
    } else if (target === 'law') {
      items = json?.LawSearch?.law;
    }

    if (!items || (Array.isArray(items) && items.length === 0)) {
      console.log(`[${label}] 검색 결과 없음`);
      return res.json({ result: [] });
    }

    const normalizedItems = Array.isArray(items) ? items : [items];

  const processed = normalizedItems
    .filter(item => {
      // 법령 검색시에만 정확 일치 필터링
      return target === 'law' 
        ? item.법령명한글 === query  // 원본 쿼리 비교
        : true;  // 판례 검색시 필터링 없음
    })
    .map(item => ({
      ...item,
      상세링크: `http://www.law.go.kr/DRF/lawService.do?OC=${OC}&target=${target}&ID=${target === 'prec' ? item.판례일련번호 : item.법령ID}&type=HTML`
    }));

    res.json({ result: processed });
  } catch (error) {
    console.error(`[${label}] API 호출 실패:`, error);
    res.status(500).json({ error: '판례 검색 중 오류 발생' });
  }
});


/* 서버 실행 시작 */
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);          // 서버 실행 로그 출력
});