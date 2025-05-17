/* 이 스크립트는 DOM이 로드된 후, GPT API와 판례 API를 통해 법률 상담 및 유사 판례를 제공하는 챗봇 기능을 수행함 */

document.addEventListener('DOMContentLoaded', () => {
  const chatLog = document.querySelector('#chat-log');  // 채팅 메시지를 표시할 영역
  const sendButton = document.querySelector('#send-button');  // 전송 버튼 요소
  const messageInput = document.querySelector('#message-input');  // 사용자 입력 필드

  /* ☰ 메뉴를 여닫는 기능 */
  const menuToggle = document.getElementById('menu-toggle');  // 메뉴 토글 버튼
  const menubar = document.getElementById('menubar');  // 메뉴 전체 영역

  if (menuToggle && menubar) {
    menuToggle.addEventListener('click', () => {
      menubar.classList.toggle('visible');  // visible 클래스 토글로 메뉴 확장 또는 축소
    });
  }

  if (!chatLog || !sendButton || !messageInput) {
    console.error("필요한 HTML 요소가 없습니다");  // 필수 요소가 없을 경우 오류 출력 후 중단
    return;
  }

  /* 사용자 메시지를 서버로 전송하고 GPT의 응답 및 판례 검색 결과를 처리하는 함수 */
  async function sendMessage() {
    const message = messageInput.value;  // 사용자 입력값 가져오기
    if (!message) return;  // 입력값이 없으면 중단

    const userChat = document.createElement('div');  // 사용자 메시지 요소 생성
    userChat.className = 'chat-message user-message';  // 사용자 메시지 스타일 클래스 지정
    userChat.innerText = message;  // 사용자 입력 텍스트 삽입
    chatLog.appendChild(userChat);  // 채팅 로그에 추가

    try {
      // 서버의 /sendMessage 엔드포인트에 사용자 질문을 POST로 전달
      const response = await fetch('http://localhost:3000/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: message })  // 사용자 메시지를 JSON으로 보냄
      });

      if (!response.ok) throw new Error('서버 요청 실패');  // 실패 시 오류 발생

      const data = await response.json();  // 서버 응답을 JSON으로 파싱
      let json;

      try {
        json = typeof data.botMessage === 'string' ? JSON.parse(data.botMessage) : data.botMessage;  // botMessage가 문자열이면 파싱
      } catch (e) {
        console.error('GPT 응답 파싱 실패:', data.botMessage);  // 파싱 실패 시 로그 출력
        return;
      }

      let answer = json.answer || '응답 없음';  // 응답이 없으면 기본 메시지
      answer = answer.replace(/([.])\s+/g, '$1<br>');  // 마침표 단위로 줄바꿈 처리

      const botChat = document.createElement('div');  // GPT 응답 메시지 요소 생성
      botChat.className = 'chat-message bot-message';  // 봇 메시지 스타일 적용
      botChat.innerHTML = answer;  // 응답 텍스트 삽입
      chatLog.appendChild(botChat);  // 채팅 로그에 추가
      chatLog.scrollTop = chatLog.scrollHeight;  // 자동 스크롤 하단으로 이동

      const casePanel = document.querySelector('.right-panel');  // 판례 출력 패널 선택
      casePanel.innerHTML = '<h3>유사한 판례</h3>';  // 판례 영역 초기화

      // "법률적 상황에 대한 답변만 가능합니다" 메시지가 아닌 경우에만 판례 검색
      if (!answer.includes('법률적 상황에 대한 답변만 가능합니다')) {
        const rawKeywords = json.keywords;  // GPT 응답에서 키워드 추출

        const keywordText = Array.isArray(rawKeywords)
          ? rawKeywords.join(' ')  // 배열이면 공백으로 연결
          : typeof rawKeywords === 'string'
            ? rawKeywords
            : '';  // 없거나 이상한 값이면 빈 문자열

        console.log("검색 키워드 문자열:", keywordText);  // 검색어 로그 출력

        // 서버에 판례 검색 요청을 보냄
        fetch('http://localhost:3000/getLawCases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: keywordText.trim() })  // 검색어 전송
        })
          .then(res => {
            console.log("응답 상태:", res.status);  // HTTP 응답 코드 출력
            return res.json();  // JSON으로 응답 파싱
          })
          .then(result => {
            console.log("응답 데이터:", result);  // 전체 응답 로그 출력

            const items = result?.PrecSearch?.prec;  // 판례 목록 추출
            if (!items || !items.length) {
              console.warn("판례 없음");  // 판례가 없을 경우 경고 로그
              return;
            }

            // 각 판례마다 카드 생성
            items.forEach(item => {
              const link = item.상세링크;  // 서버에서 생성된 판례 상세 링크 사용
              console.log("판례 링크:", link);  // 링크 로그 출력

              const card = document.createElement('div');  // 카드 요소 생성
              card.className = 'case-card';  // 카드 스타일 클래스 지정
              card.innerHTML = `
                <strong>${item.사건명}</strong><br>
                <span>${item.판결유형 || '판결 유형 없음'} / ${item.선고일자}</span><br>
                <a href="${link}" target="_blank">자세히 보기</a>
              `;  // 카드 내용 구성
              casePanel.appendChild(card);  // 우측 패널에 카드 추가
            });
          })
          .catch(err => {
            console.error("판례 검색 실패:", err);  // 통신 실패 시 로그 출력
          });
      }
    } catch (err) {
      console.error('에러 발생:', err);  // 전체 오류 출력
      const botChat = document.createElement('div');  // 오류 메시지용 봇 말풍선
      botChat.className = 'chat-message bot-message';
      botChat.innerText = '서버 오류가 발생했습니다. 다시 시도해주세요.';
      chatLog.appendChild(botChat);
    }

    messageInput.value = '';  // 입력창 초기화
  }

  /* 전송 버튼 클릭 시 sendMessage 함수 실행 */
  sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
      sendMessage();  // 메시지 전송
      messageInput.value = '';  // 입력 필드 초기화
    }
  });

  /* 엔터 키 입력 시 메시지 전송 */
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();  // 줄바꿈 방지
      const message = messageInput.value;
      if (message) {
        sendMessage();
        messageInput.value = '';
      }
    }
  });

  /* 설정 팝업 열기 */
  function openSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');  // hidden 클래스 제거하여 보이도록 함
    }
  }

  /* 설정 팝업 닫기 */
  function closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.add('hidden');  // hidden 클래스 추가하여 숨김
    }
  }

  /* 라이트 모드 또는 다크 모드 설정 */
  function setMode(mode) {
    if (mode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (mode === 'dark') {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  }

  // 설정 함수들을 전역으로 노출
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.setMode = setMode;
});