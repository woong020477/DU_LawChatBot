/* 이 스크립트는 DOM이 로드된 후, GPT API와 판례 API를 통해 법률 상담 및 유사 판례를 제공하는 챗봇 기능을 수행함 */

let previousMessage = ''; // 이전 질문 저장

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
    console.error("필요한 HTML 요소가 없습니다"); // 필수 요소가 없을 경우 오류 출력 후 중단
    return;
  }

  /* 사용자 메시지를 서버로 전송하고 GPT의 응답 및 판례 검색 결과를 처리하는 함수 */
  async function sendMessage() {
    const message = messageInput.value.trim();  // 사용자 입력 값 가져오기
    if (!message) return; // 입력값 없으면 중단

    // 사용자 메시지 출력
    const userChat = document.createElement('div'); // 사용자 메시지 요소 생성
    userChat.className = 'chat-message user-message'; // 사용자 메시지 CSS 클래스 지정
    userChat.innerText = message; // 사용자 입력 텍스트 삽입
    chatLog.appendChild(userChat);  // 채팅 로그에 추가

    // 앞선 질문과 병합
    const finalMessage = previousMessage
      ? `${previousMessage}\n추가 정보: ${message}`
      : message;

    try {
      // 서버의 /sendMessage 엔드포인트에 사용자 질문을 POST로 전달
      const response = await fetch('http://localhost:3000/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: finalMessage }) // 사용자 메시지를 JSON으로 보냄
      });

      if (!response.ok) throw new Error('서버 요청 실패');  // 실패 시 오류 반환

      const data = await response.json(); // 서버 응답을 JSON으로 파싱
      const json = typeof data.botMessage === 'string' ? JSON.parse(data.botMessage) : data.botMessage; // botMessage가 문자열이면 파싱

      const casePanel = document.querySelector('.right-panel');
      casePanel.innerHTML = '<h3>유사한 판례</h3>';

      switch (json.status) {  // GPT 응답 JSON 파일에서 status변수의 상태에 따라 대처

        // 구체적인 법률적 상황이 입력된 경우 자세한 법률적 조언 및 유사한 판례 출력
        case 'complete':
          previousMessage = ''; // 초기화
          const answer = (json.answer || '응답 없음').replace(/([.])\s+/g, '$1<br>'); // 응답이 없으면 기본 메시지 출력, 있으면 마침표 단위로 줄바꿈 처리
          const botChat = document.createElement('div');  // GPT 응답 메세지 요소 설정
          botChat.className = 'chat-message bot-message'; // 봇 메세지 CSS 클래스 지정
          botChat.innerHTML = answer; // 응답 텍스트 삽입
          chatLog.appendChild(botChat); // 채팅 로그 추가
          chatLog.scrollTop = chatLog.scrollHeight; // 새로운 채팅이 오면 자동으로 스크롤 하단으로 이동

          // 판례 검색 실행
          const rawKeywords = json.keywords;  // GPT 응답 JSON 파일 속 키워드를 rawKeywords에 저장
          const keywordText = Array.isArray(rawKeywords)  
            ? rawKeywords.join(' ')
            : typeof rawKeywords === 'string'
              ? rawKeywords
              : '';
          //server.js에 keywordText를 전달(POST)해 getLawCases메소드 수행
          if (keywordText.trim()) {
            fetch('http://localhost:3000/getLawCases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: keywordText.trim() }) // 키워드 전송
            })
              .then(res => res.json())  // JSON으로 응답 파싱
              .then(result => {
                const items = result?.prec;
                if (!items || !items.length) return;

                items.forEach(item => {
                  const card = document.createElement('div');
                  card.className = 'case-card';

                  const detailButton = document.createElement('button');
                  detailButton.textContent = '자세히 보기';
                  detailButton.onclick = () => showModal(item); // 모달로 전체 JSON 표시

                  card.innerHTML = `
                    <strong>${item.사건명}</strong><br>
                    <span>판결유형: ${item.판결유형} / 선고일자: ${item.선고일자}</span><br>
                  `;
                  card.appendChild(detailButton);
                  casePanel.appendChild(card);
                });
              })
              .catch(err => console.error("판례 검색 실패:", err)); // 판례 오류 발생 시 출력
          }
          break;
        
          // 법률적 상황이지만 질문이 모호할 경우 추가 질문을 요구하는 메시지 출력
        case 'incomplete':
          previousMessage = finalMessage;
          const followUp = json.followUp || '질문이 부족합니다. 구체적인 상황을 알려주세요.';
          const followChat = document.createElement('div');
          followChat.className = 'chat-message bot-message';
          followChat.innerText = followUp;
          chatLog.appendChild(followChat);
          break;

        // 법률적 상황에 관한 질문이 아닐경우 "법률적 상황에 대한 답변만 가능합니다" 메세지 출력
        case 'invalid':
          previousMessage = '';
          const invalidChat = document.createElement('div');
          invalidChat.className = 'chat-message bot-message';
          invalidChat.innerText = json.answer || '법률적 질문만 가능합니다.';
          chatLog.appendChild(invalidChat);
          break;

        default:
          console.warn("알 수 없는 status 응답:", json);
          break;
      }

    } catch (err) {
      console.error('에러 발생:', err); // 전체 범위의 에러 발생 시 서버 로그 출력
      const botChat = document.createElement('div');
      botChat.className = 'chat-message bot-message';
      botChat.innerText = '서버 오류가 발생했습니다. 다시 시도해주세요.'; // 챗봇에 에러 발생 시 로그 출력
      chatLog.appendChild(botChat);
    }

    messageInput.value = '';
  }

  function showModal(data) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerText = '닫기';
    closeBtn.onclick = () => document.body.removeChild(modalOverlay);

    const content = document.createElement('div');
    content.className = 'modal-content';

    // 판례 항목 기반일 경우 (item.사건명 등 존재)
    if (data.사건명) {
      content.innerHTML = `
        <strong>사건명: ${data.사건명}</strong><br>
        사건번호: ${data.사건번호 || '없음'}<br>
        법정사건명: ${data.법정사건명 || '없음'}<br>
        판결유형: ${data.판결유형 || '없음'}<br>
        선고일자: ${data.선고일자 || '없음'}<br>
        사건분류: ${data.사건분류 || '없음'}<br>
        판시유형: ${data.판시유형 || '없음'}<br>
        <strong>요약: ${data.요약 || '없음'}</strong><br>
        참조조문: ${data.참조조문 || '없음'}<br>
      `;
    }

    // Help 또는 Documentation용 구조일 경우
    if (data.제목 || data.내용 || data.이미지들) {
      if (data.제목) {
        const title = document.createElement('h2');
        title.innerText = data.제목;
        content.appendChild(title);
      }

      if (data.내용) {
        const desc = document.createElement('pre');
        desc.innerText = data.내용.trim();
        content.appendChild(desc);
      }

      if (Array.isArray(data.이미지들)) {
        data.이미지들.forEach(img => {
          const wrapper = document.createElement('div');
          wrapper.style.marginTop = '12px';

          const label = document.createElement('div');
          label.innerText = img.label;
          label.style.fontWeight = 'bold';
          label.style.marginBottom = '4px';

          const image = document.createElement('img');
          image.src = img.src;
          image.alt = img.label;
          image.style.maxWidth = '100%';

          wrapper.appendChild(label);
          wrapper.appendChild(image);
          content.appendChild(wrapper);
        });
      }
    }

    modalBox.appendChild(closeBtn);
    modalBox.appendChild(content);

    modalOverlay.onclick = () => document.body.removeChild(modalOverlay);
    modalBox.onclick = e => e.stopPropagation();

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
  }

  function showHelpModal() {
    showModal({
      제목: '이용 안내 (Help)',
      내용: `
  하단의 채팅을 통해 챗봇과 법률적 상담이 가능합니다.
  법률과 상관없는 질문 시 재응답을 요청하는 답변이 반환되며,
  질문의 완성도에 따라 추가 정보를 요청할 수 있습니다.

  우측의 유사한 판례는 질문에서 핵심 키워드를 추출하여 자동으로 검색됩니다.
  '자세히 보기' 버튼을 클릭하면 판례 전문을 확인하실 수 있습니다.

  라이트/다크 모드는 [설정] 메뉴에서 전환하실 수 있습니다.
      `,
      이미지들: [
        { src: 'info_img1.png', label: 'Setting' },
        { src: 'info_img_light.png', label: '라이트모드' },
        { src: 'info_img_dark.png', label: '다크모드' }
      ]
    });
  }

  function showDocModal() {
    showModal({
      제목: '문서 (Documentation)',
      내용: `
  법률적인 상황에 대해 채팅을 통해 가이드라인을 제시하고,
  질문에 기반한 핵심 키워드를 추출하여 관련 판례를 제공합니다.

  문의: woong020477@gmail.com
      `
    });
  }

  // 전송 버튼 클릭 or Enter 키 클릭 시 메시지 전송
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
      messageInput.value = '';  // 입력 필드 초기화
    }
  });
  // 설정 팝업 열기
  window.openSettings = function () {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.classList.remove('hidden');
  };
  // 설정 팝업 닫기기
  window.closeSettings = function () {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.classList.add('hidden');
  };
  // 라이트 모드 or 다크 모드 설정
  window.setMode = function (mode) {
    if (mode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (mode === 'dark') {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  };
  // 설정 함수들을 전역으로 노출
  window.openSettings = openSettings;
  window.closeSettings = closeSettings;
  window.setMode = setMode;
  window.showDocModal = showDocModal;
  window.showHelpModal = showHelpModal;
});