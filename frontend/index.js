document.addEventListener('DOMContentLoaded', () => {
  const chatLog = document.querySelector('#chat-log');
  const sendButton = document.querySelector('#send-button');
  const messageInput = document.querySelector('#message-input');

  // ☰ 메뉴 토글 기능 추가
  const menuToggle = document.getElementById('menu-toggle');
  const menubar = document.getElementById('menubar');

  if (menuToggle && menubar) {
    menuToggle.addEventListener('click', () => {
      menubar.classList.toggle('visible');
    });
  }

  // 요소가 없으면 에러 처리
  if (!chatLog || !sendButton || !messageInput) {
    console.error("필요한 HTML 요소가 없습니다.");
    return;
  }

  // 사용자 메시지를 보내고 GPT 응답을 받아오는 함수
  async function sendMessage() {
    const message = messageInput.value;
    if (!message) return;

    // 사용자 메시지 출력
    const userChat = document.createElement('div');
    userChat.className = 'chat-message user-message';
    userChat.innerText = message;
    chatLog.appendChild(userChat);

    try {
      // GPT API 요청
      const response = await fetch('http://localhost:3000/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: message })
      });

      if (!response.ok) throw new Error('서버 요청 실패');

      const data = await response.json();
      let json;

      try {
        // GPT 응답 파싱
        json = typeof data.botMessage === 'string' ? JSON.parse(data.botMessage) : data.botMessage;
      } catch (e) {
        console.error('GPT 응답 파싱 실패:', data.botMessage);
        return;
      }

      // GPT 답변 출력
      let answer = json.answer || '응답 없음';
      answer = answer.replace(/([.])\s+/g, '$1<br>'); // 마침표 단위로 줄바꿈
      const botChat = document.createElement('div');
      botChat.className = 'chat-message bot-message';
      botChat.innerHTML = answer;
      chatLog.appendChild(botChat);
      chatLog.scrollTop = chatLog.scrollHeight;

      // 유사 판례 영역 초기화
      const casePanel = document.querySelector('.right-panel');
      casePanel.innerHTML = '<h3>유사한 판례</h3>';

      // "법률적 상황에 대한 답변만 가능합니다"가 아닐 때만 판례 검색 수행
      if (!answer.includes('법률적 상황에 대한 답변만 가능합니다')) {
        const rawKeywords = json.keywords;

        // keywords가 배열이면 공백 문자열로 결합, 문자열이면 그대로 사용
        const keywordText = Array.isArray(rawKeywords)
          ? rawKeywords.join(' ')
          : typeof rawKeywords === 'string'
            ? rawKeywords
            : '';

        console.log("검색 키워드 문자열:", keywordText); // 디버깅 로그

        fetch('http://localhost:3000/getLawCases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: keywordText.trim() })
        })
          .then(res => {
            console.log("응답 상태:", res.status);
            return res.json();
          })
          .then(result => {
            console.log("응답 데이터:", result);
        
            const items = result?.PrecSearch?.prec;
            if (!items || !items.length) {
              console.warn("판례 없음");
              return;
            }
            items.forEach(item => {
              const link = item.상세링크; // 서버에서 전달된 링크 사용
              console.log("판례 링크:", link); // 디버깅 로그
            
              const card = document.createElement('div');
              card.style = 'margin-bottom: 12px; padding: 12px; background: #f3f3f3; border-radius: 8px;';
              card.innerHTML = `
                <strong>${item.사건명}</strong><br>
                <span>${item.판결유형 || '판결 유형 없음'} / ${item.선고일자}</span><br>
                <a href="${link}" target="_blank">자세히 보기</a>
              `;
              casePanel.appendChild(card);
            });            
          })
          .catch(err => {
            console.error("판례 검색 실패:", err);
          });        
      }
    } catch (err) {
      // 네트워크 또는 서버 오류
      console.error('에러 발생:', err);
      const botChat = document.createElement('div');
      botChat.className = 'chat-message bot-message';
      botChat.innerText = '서버 오류가 발생했습니다. 다시 시도해주세요.';
      chatLog.appendChild(botChat);
    }

    // 입력창 초기화
    messageInput.value = '';
  }

  // 전송 버튼 클릭 시 메시지 전송
  sendButton.addEventListener('click', () => {
    const message = messageInput.value;  // 사용자 입력값
    if (message) {
      sendMessage();  // 메시지 전송
      messageInput.value = '';  // 입력 필드 비우기
    }
  });

  // Enter 키를 눌렀을 때 메시지 전송
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // 기본 Enter 동작 방지 (줄바꿈 방지)
      const message = messageInput.value;  // 사용자 입력값
      if (message) {
        sendMessage();  // 메시지 전송
        messageInput.value = '';  // 입력 필드 비우기
      }
    }
  });

  // 설정 열기
  function openSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  // 설정 닫기
  function closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // 라이트 / 다크 모드 설정
  function setMode(mode) {
    if (mode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (mode === 'dark') {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  }
  
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.setMode = setMode;
});