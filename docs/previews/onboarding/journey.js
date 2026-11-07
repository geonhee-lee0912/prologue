// Functional screen examples for review. No API, model, payment or notification is called.
const journey = {
  scene: 'first',
  letter: 'none',
  connected: false,
  established: false,
  ended: false,
  blocked: false,
  lightEnabled: false,
  paused: false,
  reportReady: false,
  feedbackDone: false,
  dateStatus: 'none',
  credits: 1,
  letterPhotos: [],
  drafts: {},
  memories: ['퇴근 후 걷는 시간을 좋아한다고 이야기했어요.', '처음에는 천천히 알아가는 만남이 편하다고 했어요.'],
};

const decisions = [
  ['갈피의 응답 방식', '고정형·모델·혼합 중 어떤 방식을 쓸지, 실제 운영 모델과 평가 기준을 함께 결정해요. 시안은 사용자 답장만 표시해요.'],
  ['갈피의 페르소나와 대화', '말투·첫 질문·프로필 질문 순서·먼저 말 걸기·대화 중단과 재개 방식을 의논해요.'],
  ['첫 프로필의 범위', '처음 받을 필수 항목, 건너뛰기, 소개 준비 완료 기준을 정해요. 현재 폼은 기존 설계표의 정보를 배치한 안이에요.'],
  ['본인·사진·조건 인증', '제공자, 사진 검수, 증빙 수단, 결과 표시와 실패·재시도를 결정해요.'],
  ['동의와 정보 처리', '최종 고지문, 거부·철회 시 이용 범위, 보관·삭제, AI 전송과 가명처리를 검토해요.'],
  ['주선과 상대 선호', '선호의 중요도·유연성, 확인한 제외 기준, 외형 정보의 개인별 활용을 상세 설계해요.'],
  ['연결권과 결제', '상품·가격, 대화 성립의 구체적 기준, 잔여가 없을 때 처리, 환불·복원을 결정해요. 수락과 대화방 개설에서는 차감하지 않아요.'],
  ['안전과 연결 종료', '신고 처리·이의 제기, 차단과 종료 후 보관 범위, 끝난 연결 신고 동선을 검토해요.'],
  ['만남과 연락처', '약속 제안·변경·취소의 양쪽 확인, 앱 내 통화, 연락처 교환의 동의와 공개 방식을 정해요.'],
  ['학습·기억·리포트', '대화에서 정리한 사실을 본인이 확인하는 방식, 기억 삭제의 영향, 리포트 갱신을 결정해요.'],
  ['알림·기기 권한', '푸시 문구·빈도, 사진·연락처·마이크 권한 요청 시점, 거부 시 동선을 정해요.'],
  ['편지 표시와 부가 기능', '선택 공개·인증 표시, 가벼운 소개의 상한, 취향 카드와 방 소품의 세부 범위를 정해요.'],
  ['만남 일정 외부 공유', '다른 앱의 사례에서 검토 후보로 남겨요. 상대 사진·이름을 외부로 전달하는 범위와 동의가 먼저 필요해요.'],
];

function page(id, title, group, back, body) {
  return { id, title, group, html: '<section class="screen" data-screen="' + id + '" hidden>' +
    '<a class="back" href="#' + back + '">‹ 돌아가기</a><h1 tabindex="-1">' + title + '</h1>' + body + '</section>' };
}

function row(title, subtitle, href) {
  return '<a class="list-row" href="#' + href + '"><span><strong>' + title + '</strong><small>' + subtitle + '</small></span><span aria-hidden="true">›</span></a>';
}

const journeyPages = [
  page('profile-life', '생활과 만남', '프로필 준비', 'profile', `
    <form class="edit-form" data-draft="life" data-next="profile">
      <label for="smoking">흡연</label><select id="smoking" name="smoking"><option value="">선택해 주세요</option><option>피우지 않아요</option><option>가끔 피워요</option><option>피워요</option></select>
      <label for="drinking">음주</label><select id="drinking" name="drinking"><option value="">선택해 주세요</option><option>마시지 않아요</option><option>가끔 마셔요</option><option>즐겨 마셔요</option></select>
      <label for="rhythm">평소 생활 시간대</label><input id="rhythm" name="rhythm" placeholder="예) 평일 낮에 일하고 저녁에 쉬어요">
      <label for="meetTime">만나기 편한 요일·시간</label><input id="meetTime" name="meetTime" placeholder="예) 주말 오후, 약속에 맞춰 조율 가능">
      <footer class="screen-actions"><button>내용 반영하기</button></footer>
    </form>`),
  page('profile-relations', '관계에 대한 생각', '프로필 준비', 'profile', `
    <form class="edit-form" data-draft="relations" data-next="profile">
      <label for="relationship">원하는 관계</label><input id="relationship" name="relationship" placeholder="어떤 만남을 기대하는지 적어주세요">
      <label for="marriage">결혼에 대한 생각</label><select id="marriage" name="marriage"><option value="">선택해 주세요</option><option>생각이 있어요</option><option>아직 모르겠어요</option><option>생각이 없어요</option></select>
      <div id="marriagePlans" hidden><label for="marriageTiming">생각하는 시기</label><input id="marriageTiming" name="timing" placeholder="정해두지 않았어요도 괜찮아요"><label for="futureChildren">향후 자녀에 대한 생각</label><select id="futureChildren" name="futureChildren"><option value="">선택해 주세요</option><option>생각이 있어요</option><option>아직 모르겠어요</option><option>생각이 없어요</option></select></div>
      <label for="marital">혼인 경험</label><select id="marital" name="marital"><option value="">선택해 주세요</option><option>결혼한 적 없어요</option><option>이혼했어요</option><option>배우자와 사별했어요</option><option>현재 혼인 중이에요</option></select>
      <p id="maritalNotice" class="notice" hidden>혼인 관계가 끝난 뒤 새 소개를 시작할 수 있어요.</p><details><summary>추가로 알려줄 정보</summary><button type="button" id="addChildrenInfo" class="quiet">자녀 정보 직접 추가</button></details>
      <div id="childrenFields" hidden><label for="children">자녀가 있나요?</label><select id="children" name="children"><option value="">선택해 주세요</option><option>없어요</option><option>있어요</option></select><div id="parenting" hidden><label for="livingChildren">자녀와 함께 사나요?</label><select id="livingChildren" name="livingChildren"><option value="">선택해 주세요</option><option>함께 살아요</option><option>따로 살아요</option></select><label for="raisingChildren">직접 양육하나요?</label><select id="raisingChildren" name="raisingChildren"><option value="">선택해 주세요</option><option>직접 양육해요</option><option>공동으로 양육해요</option><option>직접 양육하지 않아요</option></select></div></div>
      <footer class="screen-actions"><button>내용 반영하기</button></footer>
    </form>`),
  page('preferences', '소개받을 상대', '프로필 준비', 'profile', `
    <p>갈피와 이야기한 내용을 확인하고 바꿀 수 있어요.</p>
    <form class="edit-form" data-draft="preferences" data-next="profile">
      <label for="partnerGender">소개받을 상대</label><select id="partnerGender" name="gender"><option value="">확인해 주세요</option><option>여성</option><option>남성</option><option>갈피와 이야기하며 정할게요</option></select>
      <div class="two-fields"><div><label for="minAge">최소 만 나이</label><input id="minAge" type="number" min="19" name="minAge"></div><div><label for="maxAge">최대 만 나이</label><input id="maxAge" type="number" min="19" name="maxAge"></div></div>
      <label class="check-line"><input name="ageFlexible" type="checkbox">나이는 크게 상관없어요</label>
      <label for="distance">장거리 연애</label><select id="distance" name="distance"><option value="">선택해 주세요</option><option>괜찮아요</option><option>조건에 따라 달라요</option><option>어려워요</option></select>
      <label for="partnerSmoking">상대의 흡연</label><input id="partnerSmoking" name="smoking" placeholder="어디까지 편한지 적어주세요">
      <p class="field-help">상대에 대한 선호는 갈피가 소개할 때 참고해요.</p><footer class="screen-actions"><button>확인한 내용 반영하기</button></footer>
    </form>`),
  page('profile-optional', '더 들려주고 싶은 나', '프로필 준비', 'profile', `
    <p>원하는 항목을 추가하고, 편지에 담을지는 따로 고를 수 있어요.</p>
    <form class="edit-form" data-draft="optional" data-next="profile">
      <label for="company">회사·직급</label><input id="company" name="company" placeholder="선택 입력">
      <label for="activities">다른 일·활동</label><textarea id="activities" name="activities" placeholder="여러 활동을 한 줄에 하나씩 적어도 좋아요"></textarea>
      <label for="education">학교·전공·학위·상태</label><input id="education" name="education" placeholder="선택 입력">
      <label for="contractIncome">계약 연봉</label><input id="contractIncome" name="contractIncome" placeholder="선택 입력 · 기준 시점과 구간">
      <label for="annualIncome">실제 연간 소득</label><input id="annualIncome" name="annualIncome" placeholder="선택 입력 · 해당 연도와 구간">
      <label for="living">현재 생활 형태</label><input id="living" name="living" placeholder="예) 혼자 살아요">
      <label for="housing">주거 보유·계약 형태</label><input id="housing" name="housing" placeholder="예) 전세로 살아요">
      <label for="hobbies">취미·관심사</label><input id="hobbies" name="hobbies" placeholder="여러 개를 적을 수 있어요">
      <label for="pride">자랑하고 싶은 경험</label><textarea id="pride" name="pride" placeholder="선택 입력"></textarea>
      <footer class="screen-actions"><button>내용 반영하기</button></footer>
    </form>`),
  page('profile-appearance', '외형과 나의 분위기', '프로필 준비', 'profile', `
    <p>원하는 항목만 적고, 편지에 담을지는 직접 골라요.</p><form class="edit-form" data-draft="appearance" data-next="profile"><label for="height">키 <small>선택</small></label><input type="number" id="height" name="height" min="1" placeholder="cm"><label for="bodyDescription">체형 <small>선택</small></label><input id="bodyDescription" name="body" placeholder="원하면 자기 말로 짧게 설명해 주세요"><label class="check-line"><input name="showHeight" type="checkbox">키를 편지에 담기</label><label class="check-line"><input name="showBody" type="checkbox">체형 설명을 편지에 담기</label><footer class="screen-actions"><button>내용 반영하기</button></footer></form>`),
  page('profile-values', '생활과 관계 이야기', '프로필 준비', 'profile', `
    <p>갈피와 알아갈 주제들이에요. 편한 내용부터 적거나 대화로 이야기할 수 있어요.</p><form class="edit-form" data-draft="values" data-next="profile"><label for="pets">함께 사는 반려동물</label><input id="pets" name="pets" placeholder="선택 입력"><label for="moneyValues">소비·저축에서 중요하게 생각하는 것</label><input id="moneyValues" name="money" placeholder="선택 입력"><label for="contactRhythm">편한 연락·만남 빈도</label><input id="contactRhythm" name="contact" placeholder="상황에 따라 조율할 수 있어요"><label for="personalTime">혼자·함께 보내는 시간</label><input id="personalTime" name="time" placeholder="선택 입력"><label for="social">친구·주변 사람들과 지내는 방식</label><input id="social" name="social" placeholder="선택 입력"><label for="conflict">서운하거나 의견이 다를 때</label><textarea id="conflict" name="conflict" placeholder="선택 입력"></textarea><label for="affection">표현하는 방식과 받고 싶은 관심</label><textarea id="affection" name="affection" placeholder="선택 입력"></textarea><label for="changes">생활에서 달라질 예정인 것</label><input id="changes" name="changes" placeholder="이사·학업·근무 변화 등 선택 입력"><footer class="screen-actions"><button>내용 반영하기</button><a class="button quiet" href="#first-chat">갈피와 이야기하기</a></footer></form>`),
  page('profile-religion', '종교에 대한 생각', '프로필 준비', 'profile', `
    <p>선택 제공 항목이에요. 처리 목적과 공개 범위를 확인한 뒤 등록할 수 있어요.</p><div class="neutral-panel"><h2>별도 동의 안내 자리</h2><p>종교 정보 처리와 공개에 관한 최종 동의 문안을 먼저 확인해요.</p></div><form class="edit-form" data-draft="religion" data-next="profile"><label class="check-line"><input type="checkbox" id="religionConsent">종교 정보 처리 안내를 확인하고 동의해요</label><fieldset id="religionFields" disabled><label for="religion">종교</label><input id="religion" name="religion" placeholder="선택 입력"><label for="religionImportance">일상에서의 중요도</label><input id="religionImportance" name="importance" placeholder="선택 입력"><label for="partnerReligion">상대의 종교·활동에 대한 생각</label><input id="partnerReligion" name="partner" placeholder="갈피가 소개할 때 참고해요"><label class="check-line"><input name="show" type="checkbox">종교를 편지에 담기</label></fieldset><footer class="screen-actions"><button>선택한 내용 반영하기</button></footer></form>`),
  page('visibility', '편지에 담을 정보', '프로필 준비', 'profile', `
    <p>선택 등록한 정보 중 편지에 담을 항목을 골라요.</p>
    <form class="edit-form" data-draft="visibility" data-next="profile-review">
      ${['company|회사·직급','activities|다른 일·활동','education|학교·전공·학위','contractIncome|계약 연봉','annualIncome|실제 연간 소득','living|현재 생활 형태','housing|주거 보유·계약 형태','hobbies|취미·관심사','pride|자랑하고 싶은 경험'].map(item => { const [key,label] = item.split('|'); return '<label class="check-line"><input type="checkbox" name="fields" value="' + key + '">' + label + '</label>'; }).join('')}
      <footer class="screen-actions"><button>선택한 내용으로 미리보기</button></footer>
    </form>`),
  page('verification-options', '추가 인증', '프로필 준비', 'profile', `
    <p>확인한 사실과 확인 범위를 표시해요. 원하는 인증을 선택할 수 있어요.</p>
    ${row('재직 확인','인증 수단·확인 범위 검토 중','verification-detail')}
    ${row('학력 확인','인증 수단·확인 범위 검토 중','verification-detail')}
    ${row('소득 확인','계약 연봉과 연간 소득을 구분해요','verification-detail')}
    ${row('혼인 상태 확인','선택 인증','verification-detail')}`),
  page('verification-detail', '인증 절차 안내', '프로필 준비', 'verification-options', `
    <div class="neutral-panel"><h2>확인할 정보</h2><p>선택한 항목 · 확인 방법 · 필요한 자료 · 보관 안내</p></div>
    <p>인증 서비스와 자료 제출 방식은 정한 뒤 안내해요.</p><footer class="screen-actions"><a class="button secondary" href="#verification-options">인증 목록으로</a></footer>`),
  page('letter-name', '편지에는 어떤 이름을 쓸까요?', '프로필 준비', 'profile', `
    <p>갈피가 추천한 닉네임을 쓰거나, 원하는 닉네임·본명을 직접 적을 수 있어요.</p>
    <div class="neutral-panel"><span class="muted">갈피의 닉네임 제안</span><div class="skeleton-line" aria-label="닉네임 추천이 들어갈 자리"></div></div>
    <form class="edit-form" data-draft="name" data-next="profile-review"><label for="letterName">편지에 쓸 이름</label><input id="letterName" name="name" placeholder="원하는 닉네임 또는 이름"><footer class="screen-actions"><button>이 이름으로 확인하기</button></footer></form>`),
  page('letter-attachments', '이번 편지에 더할 사진', '프로필 준비', 'profile', `
    <p>프로필 사진 전체에 더해, 이번 소개 편지에만 붙이고 싶은 사진을 고를 수 있어요.</p><div class="gallery" id="letterGallery"></div><input type="file" id="letterFiles" accept="image/*" multiple hidden><button class="secondary" id="pickLetterPhotos">사진 추가</button><p id="letterPhotoStatus" role="status"></p><footer class="screen-actions"><a class="button" href="#profile-review">편지 내용 확인하기</a></footer>`),
  page('profile-ready', '소개 준비 확인', '프로필 준비', 'profile-review', `
    <p>준비한 정보와 사진, 상대에게 전할 내용을 확인해요.</p>
    ${row('내 소개','이름·지역·일·사진','profile-review')}${row('소개받을 상대','나이·지역·생활에 대한 생각','preferences')}${row('공개할 선택 정보','내가 고른 항목','visibility')}
    <p class="notice">새 소개는 현재 배우자나 교제 중인 연인이 없는 분께 제공해요.</p>
    <footer class="screen-actions"><button data-action="ready">소개 준비 완료 화면 보기</button></footer>`),

  page('story-choice', '어떤 이야기가 궁금하세요?', '소개 편지', 'home', `
    <p>갈피가 소개하고 싶은 두 이야기 중 먼저 알고 싶은 이야기를 골라요.</p>
    <a class="story-choice" href="#letter"><span>쉬는 날의 이야기</span><h2>작은 책방을 찾아 걷는 주말</h2><p>익숙한 동네에서 새로운 길을 발견하는 시간이 좋대요.</p></a>
    <a class="story-choice" href="#letter"><span>함께하고 싶은 일상</span><h2>퇴근길에 나누는 짧은 안부</h2><p>하루 끝의 소소한 이야기를 편하게 나누고 싶대요.</p></a>`),
  page('letter', '소개하고 싶은 분이 있어요', '소개 편지', 'home', `
    <article class="profile-paper" id="activeLetter"><div class="photo-placeholder">프로필 사진 자리</div><h2>보리 · 29</h2><p>성동구 · 디자인 분야<br>비흡연 · 결혼 생각 있음</p><span class="trust-label">본인 확인 · 표시 예시</span><h3>두 분을 소개하고 싶은 이유</h3><p>새로운 장소에서 조용히 이야기를 나누는 시간을 좋아한다는 공통점이 있어요. 주말 산책 이야기를 나누며 서로 알아가면 좋겠어요.</p><div class="neutral-panel"><span class="muted">본인이 공개한 정보</span><p>취미 · 독립서점과 산책</p></div><p class="field-help">편지는 받은 날부터 7일 동안 열려 있어요.</p></article>
    <div id="letterUnavailable" class="empty-state" hidden><h2>지금은 열린 편지가 없어요</h2><a href="#home">홈으로</a></div>
    <footer class="screen-actions" id="letterActions"><button data-action="accept-letter">이야기 나눠볼래요</button><button class="quiet" data-action="pass-letter">이번 소개는 넘길게요</button><a class="small-link" href="#report-person">신고하기</a></footer>`),
  page('letter-pending', '마음을 전했어요', '소개 편지', 'home', `
    <div class="empty-state"><img src="intro-envelope.png" width="140" height="140" alt=""><p>서로 이야기 나눠보고 싶으면<br>대화가 열려요.</p></div><footer class="screen-actions"><a class="button" href="#home">홈으로</a></footer>`),
  page('letter-passed', '이번 편지를 닫았어요', '소개 편지', 'home', `
    <p>다음 소개를 위해 들려주고 싶은 점이 있나요? 갈피에게만 남겨요.</p><form class="edit-form" data-draft="pass" data-next="home"><label for="passReason">내 생각 <small>선택</small></label><textarea id="passReason" name="reason" placeholder="편하게 적어주세요"></textarea><footer class="screen-actions"><button>갈피에게 남기기</button><a class="button quiet" href="#home">그냥 돌아가기</a></footer></form>`),
  page('letter-closed', '열린 편지가 없어요', '소개 편지', 'home', `
    <div class="empty-state"><img src="intro-envelope.png" width="130" height="130" alt=""><p>소개하고 싶은 사람이 생기면<br>새 편지로 알려드려요.</p></div><footer class="screen-actions"><a class="button" href="#home">홈으로</a></footer>`),
  page('light-intro', '가벼운 소개', '소개 편지', 'home', `
    <div id="lightOff"><p>사진 중심의 가벼운 소개예요. 내 사진으로 소개되는 데 동의한 사람끼리 주고받아요.</p><footer class="screen-actions"><a class="button" href="#exposure">설정에서 확인하기</a></footer></div>
    <div id="lightOn" hidden><div class="photo-placeholder">동의한 상대의 사진 자리</div><h2>보리 · 29</h2><p>평온한 일상과 주말 산책을 좋아해요.</p><footer class="screen-actions"><button data-action="accept-light">이야기 나눠볼래요</button><button class="quiet" data-action="close-light">넘기기</button></footer></div>`),
  page('connected', '두 분의 대화가 열렸어요', '대화와 만남', 'home', `
    <div class="empty-state"><img src="intro-3.png" width="150" height="150" alt=""><h2>보리님도 이야기 나눠보고 싶대요</h2><p>서로 수락한 뒤 대화가 성립하면 연결권이 사용돼요.</p></div><footer class="screen-actions"><a class="button" href="#person-chat">대화하러 가기</a></footer>`),
  page('person-chat', '보리', '대화와 만남', 'conversations', `
    <div class="chat-tools"><a href="#connection-letter">첫 장</a><a href="#voice-call">앱 내 통화</a><a href="#connection-menu">메뉴</a></div>
    <p class="private-note">두 분만의 대화예요. 갈피는 읽지 않아요.</p><div id="personLive"><div class="conversation peer-conversation" id="personMessages" role="log" aria-label="상대와의 대화"><p class="message">안녕하세요. 소개 편지 잘 읽었어요.</p></div><a class="meeting-shortcut" href="#meeting">만남 약속 잡기 →</a><form class="composer" id="personReplyForm"><input id="personReply" aria-label="상대에게 보낼 메시지" placeholder="메시지 보내기" autocomplete="off"><button>보내기</button></form><a class="small-link" href="#end-connection">대화 끝내기</a></div>
    <div id="personEnded" class="empty-state" hidden><h2>연결이 끝났어요</h2><p>이 대화에서는 메시지를 보낼 수 없어요.</p><a href="#report-person">이 연결 신고하기</a></div>`),
  page('connection-letter', '대화의 첫 장', '대화와 만남', 'person-chat', `
    <div id="firstPageContent" class="profile-paper"><div class="photo-placeholder">소개 당시 사진 자리</div><h2>보리님의 소개 편지</h2><p>두 분을 소개하고 싶었던 이유와 본인이 공개한 소개 정보가 이곳에 담겨요.</p></div><p id="firstPageClosed" hidden>이 연결은 끝났어요. 사진과 프로필을 다시 열 수 없어요.</p>`),
  page('connection-menu', '대화 관리', '대화와 만남', 'person-chat', `
    ${row('만남 약속','날짜·시간·장소','meeting-detail')}${row('연결 끝내기','관계를 마무리할 수 있어요','end-connection')}${row('차단하기','이 연결의 연락을 멈춰요','block-person')}${row('신고하기','불편한 일이 있었다면 알려주세요','report-person')}${row('연락처 교환','각자의 동의가 필요해요','contact-exchange')}`),
  page('voice-call', '앱 내 음성통화', '대화와 만남', 'person-chat', `
    <div class="empty-state"><div class="call-avatar">보리</div><p id="callState">전화번호를 주고받지 않고 통화할 수 있어요.</p></div><footer class="screen-actions"><button data-action="start-call">통화 화면 미리보기</button><button class="quiet" data-action="end-call">통화 닫기</button></footer>`),
  page('meeting', '만남 약속 제안', '대화와 만남', 'person-chat', `
    <form class="edit-form" data-draft="meeting" data-next="meeting-detail"><label for="dateDay">날짜</label><input id="dateDay" type="date" name="day" required><label for="dateTime">시간</label><input id="dateTime" type="time" name="time" required><label for="datePlace">장소</label><input id="datePlace" name="place" placeholder="예) 성수역 근처 카페" required><label for="dateMemo">짧은 메모 <small>선택</small></label><input id="dateMemo" name="memo" placeholder="만나는 곳에 대한 안내"><footer class="screen-actions"><button>약속 제안하기</button></footer></form>`),
  page('meeting-detail', '만남 약속', '대화와 만남', 'person-chat', `
    <div class="neutral-panel"><span id="dateStatusLabel" class="eyebrow">아직 약속이 없어요</span><h2 id="dateSummary">날짜와 장소를 함께 정해요</h2><p id="datePlaceLabel"></p></div><a class="button secondary" href="#meeting">약속 제안·수정하기</a><button class="quiet" data-action="cancel-meeting">약속 취소하기</button>${row('만남 전 알아두기','공공장소·앱 내 연락·도움 요청','safety')}${row('통화하기','당일 연락은 앱 안에서','voice-call')}<p class="field-help">약속 확정은 두 사람의 확인을 거쳐요.</p>`),
  page('contact-exchange', '연락처 교환', '대화와 만남', 'connection-menu', `
    <p>각자 동의한 뒤 본인이 공유할 연락처를 직접 정해요.</p><form class="edit-form" data-draft="contact" data-next="connection-menu"><label class="check-line"><input type="checkbox" name="consent">연락처 교환에 동의해요</label><p class="field-help">공유할 연락처와 양쪽 동의 확인은 세부 설계에서 정해요.</p><footer class="screen-actions"><button>내 의향 반영하기</button></footer></form>`),
  page('end-connection', '연결을 끝낼까요?', '안전', 'person-chat', `
    <p>두 사람의 대화를 마무리해요. 끝난 연결에서 사진과 프로필을 다시 열 수 없어요.</p><footer class="screen-actions"><button data-action="end-connection">연결 종료 화면 보기</button><a class="button quiet" href="#person-chat">계속 이야기하기</a></footer>`),
  page('block-person', '이 연결을 차단할까요?', '안전', 'connection-menu', `
    <p>이 연결의 메시지와 통화를 멈춰요. 불편한 일이 있었다면 신고할 수 있어요.</p><footer class="screen-actions"><button data-action="block-person">차단 화면 미리보기</button><a class="button quiet" href="#report-person">신고하기</a></footer>`),
  page('report-person', '신고하기', '안전', 'connection-menu', `
    <p>신고 내용은 상대에게 전달하지 않아요.</p><form class="edit-form" data-draft="report" data-next="report-sent"><label for="reportCategory">어떤 일이 있었나요?</label><select id="reportCategory" name="category" required><option value="">선택해 주세요</option><option>허위 정보·사칭</option><option>불쾌한 메시지·괴롭힘</option><option>금전 요구·사기 의심</option><option>만남 중 불편한 일</option><option>기타</option></select><label for="reportText">자세한 내용</label><textarea id="reportText" name="detail" placeholder="검토에 필요한 상황을 적어주세요"></textarea><footer class="screen-actions"><button>신고 접수 화면 미리보기</button></footer></form>`),
  page('report-sent', '신고 접수 화면', '안전', 'safety', `
    <div class="neutral-panel"><h2>접수한 내용을 확인하는 자리예요</h2><p>처리 단계와 추가 자료 요청, 문의 동선이 이곳에 표시돼요.</p></div><footer class="screen-actions"><a class="button" href="#home">홈으로</a><a class="button quiet" href="#help">도움이 더 필요해요</a></footer>`),
  page('safety', '안전하게 만나기', '안전', 'settings', `
    <div class="reading"><h2>첫 만남은 편하게 머물 수 있는 곳에서</h2><p>사람이 있는 공개된 장소를 고르고, 불편하면 만남을 마무리해도 괜찮아요.</p><h2>연락은 앱 안에서도 가능해요</h2><p>실제 연락처를 알려주기 전에 앱 대화와 통화를 이용할 수 있어요.</p><h2>돈이나 외부 서비스 가입을 요구한다면</h2><p>대화를 멈추고 신고 기능으로 알려주세요.</p></div>${row('상대 신고하기','대화와 만남에서 있었던 일','report-person')}${row('차단 관리','차단한 연결·지인 차단','blocked')}${row('문의하기','도움이 필요할 때','support')}`),
  page('post-date', '만나 보니 어땠어요?', '만남 이후', 'home', `
    <p>이 이야기는 갈피에게만 남겨요. 상대에게 전달되지 않아요.</p><form class="edit-form" data-draft="feedback" data-next="feedback-confirm"><label for="dateExperience">내가 편했거나 아쉬웠던 순간</label><textarea id="dateExperience" name="experience" placeholder="사람을 평가하기보다 내 경험을 들려주세요"></textarea><label for="nextExperience">다음 소개에 참고했으면 하는 점 <small>선택</small></label><textarea id="nextExperience" name="next" placeholder="반영하고 싶은 내용만 적어주세요"></textarea><footer class="screen-actions"><button>내 이야기 확인하기</button><a class="button quiet" href="#home">지금은 넘어갈게요</a></footer></form>${row('불편한 일이 있었어요','안전 관련 도움·신고','safety')}`),
  page('feedback-confirm', '다음 소개에 참고할 이야기', '만남 이후', 'post-date', `
    <div class="neutral-panel"><p id="feedbackSummary">내가 선택한 이야기를 이곳에서 확인해요.</p></div><p>원하는 내용만 반영하고 언제든 갈피에게 다시 말할 수 있어요.</p><footer class="screen-actions"><button data-action="confirm-feedback">이 내용으로 남기기</button><a class="button quiet" href="#post-date">수정하기</a></footer>`),

  page('shelf', '나의 서고', '내 이야기', 'story', `
    <p>나를 알아가는 이야기를 주제별로 살펴봐요.</p>${row('요즘의 나','일상·쉬는 시간·요즘 마음','memory')}${row('사람들','가까운 사람과 지내는 방식','memory')}${row('바라는 관계','함께하고 싶은 일상','memory')}${row('취향 카드','내가 고른 장면들','taste')}`),
  page('memory', '갈피가 기억하는 것', '내 이야기', 'story', `
    <p>정리한 이야기를 확인하고, 원하지 않는 기억은 뺄 수 있어요.</p><div id="memoryList"></div><p class="notice">화면의 기억 예시는 프로필에 자동 공개되지 않아요.</p>`),
  page('memory-remove', '이 기억을 뺄까요?', '내 이야기', 'memory', `
    <p id="memoryToRemove"></p><p class="field-help">이 기억을 빼면 이후 소개에 참고하는 범위가 달라져요. 실제 삭제 범위는 세부 안내에서 확인해요.</p><footer class="screen-actions"><button data-action="remove-memory">기억 빼기 미리보기</button><a class="button quiet" href="#memory">그대로 두기</a></footer>`),
  page('self-report', '제가 읽은 당신', '내 이야기', 'story', `
    <div id="reportWaiting" class="empty-state"><img src="intro-3.png" width="140" height="140" alt=""><h2>이야기를 함께 정리하고 있어요</h2><p>리포트가 준비되면 알려드려요.</p><a href="#first-chat">갈피와 이야기하기</a></div><article id="reportContent" class="profile-paper" hidden><span class="eyebrow">리포트 내용 예시</span><h2>함께 있을 때 편안한 나</h2><p>조용히 걷거나 일상을 나누는 시간에 마음이 편해진다는 이야기를 들려주었어요.</p><h3>알아가고 싶은 것</h3><p>관계가 시작될 때 어떤 속도가 편한지 더 이야기해 볼 수 있어요.</p></article><footer class="screen-actions"><a class="button secondary" href="#first-chat">갈피에게 이야기하기</a></footer>`),
  page('findings', '갈피가 발견한 것', '내 이야기', 'story', `
    <div class="empty-state"><h2>이야기가 더 쌓이면 보여드려요</h2><p>내가 좋아한다고 생각한 것과 실제 만남에서 편했던 순간을 함께 살펴보는 자리예요.</p></div><a class="button secondary" href="#first-chat">갈피와 이야기하기</a>`),
  page('taste', '어떤 시간이 더 끌려요?', '내 이야기', 'story', `
    <p>사람 대신 함께할 장면을 골라봐요.</p><button class="taste-option" data-action="choose-taste" data-value="동네를 걸으며 이야기하기">동네를 걸으며 이야기하기</button><button class="taste-option" data-action="choose-taste" data-value="카페에 앉아 오래 이야기하기">카페에 앉아 오래 이야기하기</button><p id="tasteResult" role="status"></p><a class="button quiet" href="#story">오늘은 넘어가기</a>`),
  page('galpi-room', '갈피의 방', '갈피', 'home', `
    <div class="room-scene"><img src="intro-4.png" width="250" height="250" alt="의자 옆에 앉아 있는 갈피"></div><a class="button" href="#first-chat">대화하기</a>${row('함께한 순간','첫 편지·첫 연결·첫 만남','mementos')}${row('방 꾸미기','소품과 포인트의 자리','room-items')}`),
  page('mementos', '함께한 순간', '갈피', 'galpi-room', `
    <div class="neutral-panel"><h2>첫 편지</h2><p>소개 편지가 처음 도착한 순간</p></div><div class="neutral-panel"><h2>첫 연결</h2><p>서로 이야기 나누고 싶다고 답한 순간</p></div><div class="neutral-panel"><h2>첫 만남</h2><p>직접 만나 이야기를 나눈 순간</p></div>`),
  page('room-items', '방 꾸미기', '갈피', 'galpi-room', `
    <p>함께한 순간에 얻은 포인트로 방을 꾸미는 자리예요.</p><div class="neutral-panel"><h2>작은 화분 · 책 · 조명</h2><p>소품과 획득 기준은 세부 설계에서 정해요.</p></div><p class="field-help">방 꾸미기는 소개 자격이나 소개 속도에 영향을 주지 않아요.</p>`),

  page('notifications', '알림', '설정', 'settings', `
    <form class="edit-form" data-draft="notifications" data-next="settings"><label class="check-line"><input type="checkbox" name="letter" checked>소개 편지</label><label class="check-line"><input type="checkbox" name="messages" checked>대화 메시지</label><label class="check-line"><input type="checkbox" name="galpi" checked>갈피의 소식</label><label class="check-line"><input type="checkbox" name="date" checked>만남 약속</label><label class="check-line"><input type="checkbox" name="report" checked>리포트 도착</label><footer class="screen-actions"><button>설정 반영하기</button><a class="button quiet" href="#permission">기기 권한 안내</a></footer></form>`),
  page('exposure', '소개 설정', '설정', 'settings', `
    <form class="edit-form" id="exposureForm"><label class="check-line"><input id="pauseLetters" type="checkbox">새 편지 잠시 쉬기</label><p class="field-help">이미 연결된 사람과의 대화는 이어갈 수 있어요.</p><label class="check-line"><input id="lightExposure" type="checkbox">가벼운 소개에 나가기</label><p class="field-help">내 사진으로 소개되는 데 동의한 사람끼리만 주고받아요. 기본은 꺼져 있어요.</p><footer class="screen-actions"><button>설정 반영하기</button></footer></form>`),
  page('blocked', '차단 관리', '안전', 'settings', `
    <p>차단한 연결과 지인 차단을 관리해요.</p><div id="blockedSummary" class="neutral-panel">차단한 연결이 없어요.</div>${row('지인 차단','연락처 접근 범위와 차단 안내','contact-blocking')}${row('끝난 연결 신고','사진 없이 이전 연결을 확인해요','ended-connections')}`),
  page('contact-blocking', '지인 차단', '안전', 'blocked', `
    <p>연락처 접근과 차단에 사용할 정보의 범위를 확인한 뒤 이용해요.</p><div class="neutral-panel"><h2>연락처 접근 권한</h2><p>권한을 요청하기 전에 이용 목적과 저장 방식을 안내할 자리예요.</p></div><a class="button secondary" href="#permission">권한 안내 보기</a>`),
  page('ended-connections', '끝난 연결', '안전', 'blocked', `
    <p>안전 관련 문의와 신고를 위한 기록이에요.</p><div id="endedRecord"></div>`),
  page('credits', '연결권', '연결권', 'settings', `
    <div class="balance-card"><span>남은 연결권 · 시안</span><h2 id="creditBalance">1장</h2></div><p>서로 수락한 뒤 대화가 성립할 때 사용돼요. 소개 수락과 대화방 개설에서는 사용되지 않아요.</p>${row('연결권 구매','상품과 가격은 결정 예정','credit-checkout')}${row('사용·구매 내역','차감·결제·복원 확인','credit-history')}`),
  page('credit-checkout', '연결권 구매', '연결권', 'credits', `
    <div class="neutral-panel"><h2>상품 구성</h2><p>수량 · 금액 · 유효기간 · 구매 조건을 표시할 자리예요.</p></div><p>상품과 가격은 아직 정하지 않았어요.</p><footer class="screen-actions"><button data-action="mock-purchase">결제 완료 화면 미리보기</button><a class="button quiet" href="#credits">돌아가기</a></footer>`),
  page('credit-history', '연결권 내역', '연결권', 'credits', `
    <div id="creditHistory" class="neutral-panel"><p>사용·구매 내역이 표시될 자리예요.</p></div>${row('결제 문의','환불·구매 복원 안내','support')}`),
  page('purchase-result', '결제 완료 화면', '연결권', 'credits', `
    <p>구매한 상품과 수량, 결제 결과를 확인하는 자리예요.</p><footer class="screen-actions"><a class="button" href="#credits">연결권 확인하기</a></footer>`),
  page('account', '계정 관리', '설정', 'settings', `
    ${row('내 소개와 사진','수정·공개 내용 확인','profile')}${row('본인인증','인증 안내와 재시도','verify')}${row('동의 관리','동의 항목과 처리 목적','consents')}<footer class="screen-actions"><button class="secondary" data-action="logout">로그아웃 화면 미리보기</button><a class="button quiet danger" href="#delete-account">회원 탈퇴</a></footer>`),
  page('consents', '동의 관리', '설정', 'settings', `
    ${row('서비스 이용약관','내용 확인','policy')}${row('개인정보 처리 안내','수집·이용·보관·삭제','policy')}${row('민감정보 처리','갈피 대화에서의 처리','policy')}${row('개인정보 국외 이전','AI 처리와 이전 범위','policy')}${row('동의 철회 문의','철회 범위와 이용 안내','support')}`),
  page('policy', '약관과 개인정보 안내', '설정', 'consents', `
    <div class="reading"><h2>상세 고지문 자리</h2><p>확정한 문서의 버전·시행일·항목·목적·보관 기간·철회 방법을 표시해요.</p><p>최종 문안과 처리 절차는 별도 검토가 필요해요.</p></div>`),
  page('explanation', '소개에 대한 설명 요청', '설정', 'settings', `
    <p>소개 방식에 대한 설명이나 자동화된 판단에 대한 검토를 요청할 수 있어요.</p><form class="edit-form" data-draft="explanation" data-next="support-result"><label for="explanationText">궁금한 내용</label><textarea id="explanationText" name="detail" required placeholder="어떤 판단이 궁금한지 알려주세요"></textarea><footer class="screen-actions"><button>요청 접수 화면 미리보기</button></footer></form>`),
  page('help', '도움말', '설정', 'settings', `
    <details class="help-item"><summary>소개 편지는 언제 오나요?</summary><p>소개하고 싶은 사람이 생겼을 때 알려드려요. 정해진 소개 개수를 약속하지 않아요.</p></details><details class="help-item"><summary>대화는 어디까지 공개되나요?</summary><p>갈피와 나눈 깊은 이야기와 거절 이유는 상대에게 공개되지 않아요. 편지에 담을 정보는 직접 확인해요.</p></details><details class="help-item"><summary>연결권은 언제 사용되나요?</summary><p>양쪽이 수락하고 대화가 성립했을 때 사용돼요.</p></details>${row('문의하기','이용·결제·안전 문의','support')}${row('안전하게 만나기','불편한 상황의 대응','safety')}`),
  page('support', '문의하기', '설정', 'help', `
    <form class="edit-form" data-draft="support" data-next="support-result"><label for="supportType">문의 종류</label><select id="supportType" name="type"><option>이용 문의</option><option>결제 문의</option><option>인증 문의</option><option>개인정보 문의</option><option>안전 관련 문의</option></select><label for="supportText">문의 내용</label><textarea id="supportText" name="detail" required placeholder="어떤 도움이 필요한지 알려주세요"></textarea><footer class="screen-actions"><button>문의 접수 화면 미리보기</button></footer></form>`),
  page('support-result', '문의 접수 화면', '설정', 'help', `
    <p>문의 내용과 처리 상태, 답변을 확인하는 자리예요.</p><footer class="screen-actions"><a class="button" href="#settings">설정으로</a></footer>`),
  page('delete-account', '탈퇴 전 확인해 주세요', '설정', 'account', `
    <p>프로필·대화·사진·연결권과 법적으로 보관할 정보의 처리 안내를 확인한 뒤 진행해요.</p><form class="edit-form" id="deletePreviewForm"><label class="check-line"><input type="checkbox" required>탈퇴 안내를 확인했어요</label><footer class="screen-actions"><button>탈퇴 완료 화면 미리보기</button><a class="button quiet" href="#account">계정 유지하기</a></footer></form>`),
  page('deleted', '탈퇴 완료 화면', '설정', 'intro', `
    <p>계정 삭제와 보관되는 정보의 처리 결과를 안내하는 자리예요.</p><footer class="screen-actions"><a class="button" href="#">시작 화면으로</a></footer>`),
  page('permission', '기기 권한 안내', '기타 상태', 'settings', `
    <div class="reading"><h2>사진</h2><p>선택한 사진으로 프로필과 편지를 준비해요.</p><h2>마이크</h2><p>앱 내 통화를 시작할 때 요청해요.</p><h2>알림</h2><p>새 편지와 대화를 알려드려요.</p><h2>연락처</h2><p>지인 차단을 사용할 때 범위를 확인하고 요청해요.</p></div><a class="button secondary" href="#settings">설정으로</a>`),
  page('error', '잠시 연결이 원활하지 않아요', '기타 상태', 'home', `
    <p>작성한 내용을 확인하고 다시 시도할 수 있어요.</p><footer class="screen-actions"><a class="button" href="#home">다시 시도하기</a><a class="button quiet" href="#support">도움 요청하기</a></footer>`),
  page('verify-failed', '인증을 마치지 못했어요', '기타 상태', 'verify', `
    <p>취소되었거나 확인 시간이 지났을 수 있어요. 준비되면 다시 진행해 주세요.</p><footer class="screen-actions"><a class="button" href="#verify">다시 인증하기</a><a class="button quiet" href="#support">인증 문의하기</a></footer>`),
];

document.querySelector('#viewport').insertAdjacentHTML('beforeend', journeyPages.map(item => item.html).join('') +
  page('screen-map', '전체 화면과 흐름', '검토', 'home', '<div id="screenCatalog"></div>').html +
  page('decisions', '의사결정이 필요한 것', '검토', 'home', '<p>화면 배치를 먼저 검토하고 아래 항목은 함께 정해요.</p><div id="decisionList"></div>').html);

let previewNoticeTimer;
function previewNotice(message) {
  const output = document.querySelector('#previewNotice');
  clearTimeout(previewNoticeTimer);
  output.textContent = message;
  output.hidden = !message;
  previewNoticeTimer = setTimeout(() => { output.hidden = true; }, 4500);
}

function setScene(scene) {
  journey.scene = scene;
  journey.letter = ['letter', 'stories'].includes(scene) ? 'arrived' : scene === 'pending' ? 'pending' : scene === 'expired' ? 'closed' : 'none';
  journey.connected = ['connected', 'established', 'meeting', 'feedback'].includes(scene);
  journey.established = ['established', 'meeting', 'feedback'].includes(scene);
  journey.credits = journey.established ? 0 : 1;
  journey.dateStatus = ['meeting', 'feedback'].includes(scene) ? 'confirmed' : 'none';
  journey.reportReady = ['waiting', 'stories', 'letter', 'pending', 'connected', 'established', 'meeting', 'feedback'].includes(scene);
  journey.feedbackDone = false;
  journey.ended = false;
  journey.blocked = false;
  document.querySelector('#previewScene').value = scene;
  previewNotice('상태와 편지·상대·리포트는 화면 검토용 예시예요.');
  render();
}

function syncRelationFields() {
  const marriedPlans = document.querySelector('#marriagePlans');
  marriedPlans.hidden = document.querySelector('#marriage').value !== '생각이 있어요';
  marriedPlans.querySelectorAll('input,select').forEach(field => { field.disabled = marriedPlans.hidden; });
  const marital = document.querySelector('#marital').value;
  const children = document.querySelector('#childrenFields');
  children.hidden = (!marital || marital === '결혼한 적 없어요') && !journey.extraChildren;
  children.querySelectorAll('select').forEach(field => { field.disabled = children.hidden; });
  const parenting = document.querySelector('#parenting');
  parenting.hidden = children.hidden || document.querySelector('#children').value !== '있어요';
  parenting.querySelectorAll('select').forEach(field => { field.disabled = parenting.hidden; });
  document.querySelector('#maritalNotice').hidden = marital !== '현재 혼인 중이에요';
}

function syncSelectedInformation() {
  const name = journey.drafts.name?.name;
  const label = document.querySelector('#displayLetterName');
  label.textContent = name || '첫 편지를 준비할 때 정해요';
  document.querySelector('#selfProfileName').textContent = name || '내 프로필';
  const box = document.querySelector('#optionalSummary');
  box.replaceChildren();
  const fields = journey.drafts.visibility?.fields || [];
  const selected = Array.isArray(fields) ? fields : [fields];
  const labels = { company: '회사·직급', activities: '다른 일·활동', education: '학교·전공·학위', contractIncome: '계약 연봉', annualIncome: '실제 연간 소득', living: '생활 형태', housing: '주거 형태', hobbies: '취미·관심사', pride: '자랑하고 싶은 경험' };
  for (const key of selected) {
    const value = journey.drafts.optional?.[key];
    if (!value) continue;
    const title = document.createElement('dt');
    const content = document.createElement('dd');
    title.textContent = labels[key];
    content.textContent = value;
    box.append(title, content);
  }
  const appearance = journey.drafts.appearance;
  for (const [key, label, flag] of [['height','키','showHeight'],['body','체형','showBody']]) {
    if (!appearance?.[flag] || !appearance[key]) continue;
    const title = document.createElement('dt'); const content = document.createElement('dd');
    title.textContent = label; content.textContent = appearance[key] + (key === 'height' ? 'cm' : ''); box.append(title, content);
  }
  document.querySelector('#letterReviewPhotos').replaceChildren(...journey.letterPhotos.map(url => {
    const image = new Image(); image.src = url; image.alt = '이번 편지 전용 첨부 사진'; return image;
  }));
}

function renderJourney(route) {
  if (!document.querySelector('#homeEvent')) return;
  const event = document.querySelector('#homeEvent');
  event.replaceChildren();
  let eventTitle = '';
  let eventText = '';
  let eventRoute = '';
  if (journey.scene === 'feedback' && !journey.feedbackDone) {
    eventTitle = '만남 이야기를 들려주세요'; eventText = '기억에 남은 순간을 갈피에게만'; eventRoute = 'post-date';
  } else if (journey.connected && !journey.ended) {
    eventTitle = journey.dateStatus === 'confirmed' ? '만남 약속이 있어요' : '두 분의 대화가 열렸어요';
    eventText = journey.dateStatus === 'confirmed' ? '날짜와 장소 확인하기' : '보리님과 이야기하기';
    eventRoute = journey.dateStatus === 'confirmed' ? 'meeting-detail' : 'person-chat';
  } else if (journey.letter === 'arrived') {
    eventTitle = '갈피가 편지를 썼어요'; eventText = '소개하고 싶은 이야기가 있어요'; eventRoute = journey.scene === 'stories' ? 'story-choice' : 'letter';
  } else if (journey.letter === 'pending') {
    eventTitle = '마음을 전한 편지'; eventText = '서로 수락하면 대화가 열려요'; eventRoute = 'letter-pending';
  }
  event.hidden = !eventTitle;
  document.querySelector('#homeImportant').hidden = event.hidden;
  if (eventTitle) event.innerHTML = row(eventTitle, eventText, eventRoute);
  document.querySelector('#galpiStatus').textContent = eventTitle || (journey.paused ? '새 편지를 쉬고 있어요' : journey.scene === 'waiting' ? '소개할 분을 찾고 있어요' : '소개를 도와주는 친구');
  document.querySelector('#homeNews').hidden = !journey.reportReady;
  document.querySelector('#homeNewsList').innerHTML = journey.reportReady ? row('나에 대한 리포트가 도착했어요','제가 읽은 당신','self-report') : '';
  document.querySelector('#peerConversationRow').hidden = !journey.connected || journey.ended;
  document.querySelector('#endedConversationLink').hidden = !journey.ended;
  const active = journey.letter === 'arrived';
  document.querySelector('[data-screen=report-person] > .back').href = '#' + (active ? 'letter' : journey.ended ? 'ended-connections' : journey.connected ? 'connection-menu' : 'safety');
  document.querySelector('#activeLetter').hidden = !active;
  document.querySelector('#letterActions').hidden = !active;
  document.querySelector('#letterUnavailable').hidden = active;
  document.querySelector('#lightOff').hidden = journey.lightEnabled;
  document.querySelector('#lightOn').hidden = !journey.lightEnabled;
  document.querySelector('#personLive').hidden = !journey.connected || journey.ended;
  document.querySelector('#personEnded').hidden = journey.connected && !journey.ended;
  document.querySelector('#personEnded h2').textContent = journey.ended ? '연결이 끝났어요' : '아직 연결된 대화가 없어요';
  document.querySelector('#firstPageContent').hidden = !journey.connected || journey.ended;
  document.querySelector('#firstPageClosed').hidden = journey.connected && !journey.ended;
  document.querySelector('#reportWaiting').hidden = journey.reportReady;
  document.querySelector('#reportContent').hidden = !journey.reportReady;
  document.querySelector('#storyEmpty').hidden = journey.reportReady;
  document.querySelector('#storyContent').hidden = !journey.reportReady;
  document.querySelector('#creditBalance').textContent = journey.credits + '장';
  document.querySelector('#creditHistory').textContent = journey.established ? '보리님과 대화 성립 · 연결권 1장 사용 · 예시 내역' : '아직 사용한 연결권이 없어요.';
  document.querySelector('#blockedSummary').textContent = journey.blocked ? '차단한 연결 · 보리' : '차단한 연결이 없어요.';
  document.querySelector('#endedRecord').innerHTML = journey.ended ? row('보리','끝난 연결 · 안전 관련 신고','report-person') : '<p class="empty-state">끝난 연결이 없어요.</p>';
  document.querySelector('#dateStatusLabel').textContent = journey.dateStatus === 'confirmed' ? '서로 확인한 약속' : journey.dateStatus === 'proposed' ? '상대 확인을 기다려요' : journey.dateStatus === 'canceled' ? '약속이 취소됐어요' : '아직 약속이 없어요';
  const meeting = journey.drafts.meeting;
  document.querySelector('#dateSummary').textContent = meeting ? (meeting.day + ' ' + meeting.time) : journey.dateStatus === 'confirmed' ? '토요일 오후 3시 · 예시 약속' : '날짜와 장소를 함께 정해요';
  document.querySelector('#datePlaceLabel').textContent = meeting?.place || (journey.dateStatus === 'confirmed' ? '성수역 근처 카페 · 예시 장소' : '');
  document.querySelector('#feedbackSummary').textContent = journey.drafts.feedback?.next || journey.drafts.feedback?.experience || '다음 소개에 참고하고 싶은 이야기를 확인해요.';
  const visibleMemories = journey.reportReady ? journey.memories : [];
  document.querySelector('#memoryList').replaceChildren(...visibleMemories.map((text, index) => {
    const item = document.createElement('div'); item.className = 'neutral-panel';
    const paragraph = document.createElement('p'); paragraph.textContent = text;
    const remove = document.createElement('button'); remove.className = 'quiet'; remove.textContent = '이 기억 빼기';
    remove.onclick = () => { journey.memoryIndex = index; document.querySelector('#memoryToRemove').textContent = text; location.hash = 'memory-remove'; };
    item.append(paragraph, remove); return item;
  }));
  if (!visibleMemories.length) document.querySelector('#memoryList').textContent = '아직 정리한 기억이 없어요.';
  document.querySelector('#pauseLetters').checked = journey.paused;
  document.querySelector('#lightExposure').checked = journey.lightEnabled;
  syncSelectedInformation();
  const galpiEvent = document.querySelector('#galpiEvent');
  galpiEvent.innerHTML = event.innerHTML;
  galpiEvent.hidden = event.hidden;
  document.querySelector('#passFeedbackCard').hidden = journey.letter !== 'closed' || journey.scene === 'expired';
  if (route === 'person-chat') document.querySelector('#personMessages').scrollTop = document.querySelector('#personMessages').scrollHeight;
}

function initJourney() {
  document.querySelector('[data-screen=conversations]').insertAdjacentHTML('beforeend', '<a id="peerConversationRow" class="conversation-row" href="#person-chat" hidden><span class="peer-avatar">보리</span><span><strong>보리</strong><small>두 분의 대화</small></span><span>›</span></a><a id="endedConversationLink" class="small-link" href="#ended-connections" hidden>끝난 연결의 안전 문의</a>');
  document.querySelector('[data-screen=profile] .row-list').insertAdjacentHTML('beforeend', row('생활과 관계','흡연·음주·관계에 대한 생각','profile-life') + row('결혼·혼인과 자녀','해당하는 내용만 확인해요','profile-relations') + row('소개받을 상대','연령·지역·생활 선호','preferences') + row('더 들려주고 싶은 나','학력·회사·소득·취미 등 선택 정보','profile-optional') + row('추가 인증','원하는 항목만 확인해요','verification-options') + row('편지에 담을 정보','선택 등록한 정보의 공개 관리','visibility'));
  document.querySelector('[data-screen=profile] .row-list').insertAdjacentHTML('beforeend', row('외형과 분위기','키·체형의 선택 입력과 공개','profile-appearance') + row('생활과 관계 이야기','반려동물·연락·소비·갈등·애정','profile-values') + row('종교에 대한 생각','별도 동의 후 선택 제공','profile-religion'));
  const nameRow = document.querySelector('[data-screen=profile] .row-list > div');
  nameRow.outerHTML = row('편지에 쓸 이름','첫 소개 편지를 준비할 때 정해요','letter-name');
  const reviewName = document.querySelector('[data-screen=profile-review] dl dd:last-child');
  reviewName.id = 'displayLetterName';
  document.querySelector('[data-screen=profile-review] dl').insertAdjacentHTML('afterend', '<dl id="optionalSummary"></dl>');
  document.querySelector('#reviewExtras').insertAdjacentHTML('afterend', '<div id="letterReviewPhotos" class="review-extras"></div>');
  document.querySelector('[data-screen=profile-review] .screen-actions').insertAdjacentHTML('afterbegin', '<a class="button secondary" href="#letter-attachments">이번 편지에 사진 더하기</a><a class="button" href="#profile-ready">소개 준비 확인하기</a>');
  document.querySelector('[data-screen=story] .empty-state').id = 'storyEmpty';
  document.querySelector('[data-screen=story] .empty-state').insertAdjacentHTML('afterend', '<div id="storyContent" hidden>' + row('나의 서고','요즘의 나 · 사람들 · 바라는 관계','shelf') + row('제가 읽은 당신','나에 대한 리포트','self-report') + row('갈피가 기억하는 것','확인·빼기','memory') + row('갈피가 발견한 것','선호와 경험을 함께 살펴봐요','findings') + '</div>' + row('취향 카드','어떤 장면이 더 끌리는지','taste'));
  document.querySelector('.settings-list').innerHTML = row('내 소개와 사진','수정·공개 범위','profile') + row('계정 관리','인증·로그아웃·탈퇴','account') + row('소개 설정','편지 쉬기·가벼운 소개 동의','exposure') + row('연결권','잔여·구매·사용 내역','credits') + row('알림','편지·대화·갈피 소식','notifications') + row('개인정보와 동의','정보 처리·동의 내역','consents') + row('차단 관리','지인 차단·끝난 연결 신고','blocked') + row('소개에 대한 설명 요청','자동화된 판단의 설명·검토','explanation') + row('안전하게 만나기','도움 요청과 신고','safety') + row('도움말·문의','이용 안내','help');
  document.querySelector('#previewScene').onchange = event => { setScene(event.target.value); location.hash = 'home'; };
  document.querySelector('#religionConsent').onchange = event => { document.querySelector('#religionFields').disabled = !event.target.checked; };
  conversation.insertAdjacentHTML('afterbegin', '<div id="galpiEvent" class="event-card" hidden></div>');
  conversation.insertAdjacentHTML('beforeend', '<div class="chat-card" id="passFeedbackCard" hidden><h2>넘긴 소개에 대한 내 생각</h2><p>원하면 갈피에게만 남길 수 있어요.</p><form class="edit-form" data-draft="pass" data-next="home"><label for="chatPassReason">내 생각 · 선택</label><textarea id="chatPassReason" name="reason"></textarea><button>갈피에게 남기기</button><a class="button quiet" href="#home">그냥 돌아가기</a></form></div>');
  ['marriage','marital','children'].forEach(id => { document.querySelector('#' + id).onchange = syncRelationFields; });
  document.querySelector('#addChildrenInfo').onclick = () => { journey.extraChildren = true; syncRelationFields(); document.querySelector('#children').focus(); };
  syncRelationFields();
  document.querySelector('#exposureForm').onsubmit = event => {
    event.preventDefault();
    journey.paused = document.querySelector('#pauseLetters').checked;
    journey.lightEnabled = document.querySelector('#lightExposure').checked;
    location.hash = 'settings';
  };
  document.querySelector('#personReplyForm').onsubmit = event => {
    event.preventDefault();
    if (!journey.connected || journey.ended) return;
    const field = document.querySelector('#personReply');
    if (!field.value.trim()) return;
    const bubble = document.createElement('p'); bubble.className = 'message own'; bubble.textContent = field.value.trim();
    document.querySelector('#personMessages').append(bubble); field.value = '';
    renderJourney('person-chat');
  };
  document.querySelector('#deletePreviewForm').onsubmit = event => { event.preventDefault(); location.hash = 'deleted'; };
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-draft]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.draft === 'preferences') {
      const min = document.querySelector('#minAge'); const max = document.querySelector('#maxAge');
      max.setCustomValidity(min.value && max.value && Number(max.value) < Number(min.value) ? '최대 나이는 최소 나이 이상으로 골라주세요.' : '');
      if (!max.reportValidity()) return;
    }
    if (form.dataset.draft === 'meeting' && (!journey.connected || journey.ended)) { previewNotice('서로 수락 상태를 선택하면 약속 제안을 미리볼 수 있어요.'); return; }
    const values = new FormData(form); const saved = {};
    for (const key of new Set(values.keys())) { const items = values.getAll(key); saved[key] = items.length === 1 ? String(items[0]).trim() : items.map(String); }
    journey.drafts[form.dataset.draft] = saved;
    if (form.dataset.draft === 'meeting') journey.dateStatus = 'proposed';
    location.hash = form.dataset.next;
    renderJourney(currentScreen);
  });
  document.querySelector('#maxAge').oninput = () => document.querySelector('#maxAge').setCustomValidity('');
  document.querySelector('#minAge').oninput = () => document.querySelector('#maxAge').setCustomValidity('');
  document.querySelector('[name=ageFlexible]').onchange = event => {
    document.querySelector('#minAge').disabled = document.querySelector('#maxAge').disabled = event.target.checked;
    document.querySelector('#maxAge').setCustomValidity('');
  };
  document.addEventListener('click', handleJourneyAction);
  initLetterPhotos();
  buildScreenCatalog();
}

function handleJourneyAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  switch (action) {
    case 'ready':
      if (journey.drafts.relations?.marital === '현재 혼인 중이에요') { location.hash = 'profile-relations'; break; }
      if (!profile.coverUrl) { previewNotice('소개 준비 전에 대표 사진 한 장을 선택하는 흐름이에요.'); location.hash = 'profile-photo'; break; }
      if (!journey.drafts.name?.name) { location.hash = 'letter-name'; break; }
      setScene('waiting'); location.hash = 'home'; break;
    case 'accept-letter':
      if (journey.letter !== 'arrived') return;
      journey.letter = 'pending'; location.hash = 'letter-pending'; break;
    case 'pass-letter':
      if (journey.letter !== 'arrived') return;
      journey.letter = 'closed'; location.hash = 'first-chat'; break;
    case 'accept-light': journey.letter = 'pending'; location.hash = 'letter-pending'; break;
    case 'close-light': location.hash = 'home'; break;
    case 'end-connection': journey.ended = true; location.hash = 'conversations'; break;
    case 'block-person': journey.ended = true; journey.blocked = true; location.hash = 'blocked'; break;
    case 'start-call':
      if (!journey.connected || journey.ended) { previewNotice('서로 수락 상태에서 통화를 미리볼 수 있어요.'); break; }
      document.querySelector('#callState').textContent = '통화 연결 화면 · 소리와 마이크는 사용하지 않아요'; break;
    case 'end-call': document.querySelector('#callState').textContent = '통화가 종료된 화면이에요.'; location.hash = 'person-chat'; break;
    case 'cancel-meeting': journey.dateStatus = 'canceled'; renderJourney('meeting-detail'); break;
    case 'confirm-feedback': journey.feedbackDone = true; location.hash = 'home'; break;
    case 'remove-memory':
      if (Number.isInteger(journey.memoryIndex)) journey.memories.splice(journey.memoryIndex, 1);
      journey.memoryIndex = null; location.hash = 'memory'; break;
    case 'choose-taste': document.querySelector('#tasteResult').textContent = '고른 장면 · ' + button.dataset.value; break;
    case 'mock-purchase': journey.credits += 1; location.hash = 'purchase-result'; break;
    case 'logout': location.hash = 'login'; break;
    case 'preview-scene': setScene(button.dataset.scene); location.hash = button.dataset.route; break;
  }
}

function initLetterPhotos() {
  document.querySelector('#pickLetterPhotos').onclick = () => document.querySelector('#letterFiles').click();
  document.querySelector('#letterFiles').onchange = async event => {
    const files = Array.from(event.target.files); event.target.value = '';
    const status = document.querySelector('#letterPhotoStatus'); status.textContent = '';
    for (const file of files) {
      try {
        const image = await previewFile(file); image.alt = '이번 소개 편지에만 첨부할 사진';
        journey.letterPhotos.push(image.src);
        const figure = document.createElement('figure'); const remove = document.createElement('button');
        remove.className = 'quiet'; remove.textContent = '삭제';
        remove.onclick = () => { journey.letterPhotos.splice(journey.letterPhotos.indexOf(image.src), 1); URL.revokeObjectURL(image.src); figure.remove(); syncSelectedInformation(); };
        figure.append(image, remove); document.querySelector('#letterGallery').append(figure);
      } catch { status.textContent = '열 수 없는 사진은 제외했어요.'; }
    }
  };
}

function buildScreenCatalog() {
  const base = [
    ['intro','서비스 소개','가입과 첫 만남'], ['signup','가입 동의','가입과 첫 만남'], ['verify','본인인증','가입과 첫 만남'], ['chat-consent','대화 동의','가입과 첫 만남'], ['login','로그인','가입과 첫 만남'], ['first-chat','갈피 첫 만남·대화','가입과 첫 만남'],
    ['home','친구 홈','앱 기본'], ['conversations','대화 탭','앱 기본'], ['story','내 이야기 탭','앱 기본'], ['settings','설정 탭','앱 기본'],
    ['profile','내 소개 준비','프로필 준비'], ['profile-basics','지역·일/활동','프로필 준비'], ['profile-photo','프로필 사진','프로필 준비'], ['profile-review','내 소개 확인','프로필 준비'],
  ].map(([id,title,group]) => ({id,title,group}));
  const catalog = [...base, ...journeyPages];
  const target = document.querySelector('#screenCatalog');
  target.innerHTML = '<p>기능별 화면을 열거나 아래 경로를 따라가 보세요. ' + catalog.length + '개 화면과 상태를 준비했어요.</p><div class="scenario-buttons">' +
    [['first','intro','가입부터'],['letter','home','편지 도착부터'],['connected','person-chat','연결 이후부터'],['feedback','home','만남 이후부터']].map(([scene,route,title]) => '<button class="secondary" data-action="preview-scene" data-scene="' + scene + '" data-route="' + route + '">' + title + '</button>').join('') + '</div>';
  const paths = [
    [['signup','가입 동의'],['verify','인증'],['chat-consent','대화 동의'],['first-chat','갈피 첫 만남'],['home','홈']],
    [['profile','내 소개 준비'],['profile-review','공개 내용 확인'],['profile-ready','소개 준비 확인']],
    [['letter','편지'],['letter-pending','내 수락'],['connected','서로 수락'],['person-chat','대화'],['meeting','약속']],
    [['post-date','만남 후 이야기'],['feedback-confirm','반영 내용 확인'],['self-report','리포트']],
  ];
  target.insertAdjacentHTML('beforeend', '<div class="flow-paths">' + paths.map(path => '<p>' + path.map(([id,title]) => '<a href="#' + id + '">' + title + '</a>').join(' → ') + '</p>').join('') + '</div>');
  for (const group of new Set(catalog.map(item => item.group))) {
    const heading = document.createElement('h2'); heading.className = 'section-heading'; heading.textContent = group; target.append(heading);
    const list = document.createElement('div');
    list.innerHTML = catalog.filter(item => item.group === group).map(item => '<a class="map-link" href="#' + item.id + '">' + item.title + '<span>›</span></a>').join('');
    target.append(list);
  }
  document.querySelector('#decisionList').innerHTML = decisions.map(([title,detail],index) => '<article class="decision-card"><span class="eyebrow">의사결정 필요 ' + (index + 1) + '</span><h2>' + title + '</h2><p>' + detail + '</p></article>').join('');
}
