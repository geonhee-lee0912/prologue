// Review-only prototype. All edits and messages live in this page's memory.
const screens = Array.from(document.querySelectorAll('[data-screen]'));
const viewport = document.querySelector('#viewport');
const tabbar = document.querySelector('#tabbar');
const goHome = document.querySelector('#goHome');
const login = document.querySelector('#login');
const previewMenu = document.querySelector('.preview-tools details');
const track = document.querySelector('#track');
const slides = Array.from(track.children);
const primary = document.querySelector('#primary');
const skip = document.querySelector('#skip');
const accountConsent = document.querySelector('#accountConsent');
const chatConsent = document.querySelector('#chatConsent');
const verify = document.querySelector('#verify');
const meet = document.querySelector('#meet');
const provider = document.querySelector('#providerPreview');
const identityStatus = document.querySelector('#identityStatus');
let introIndex = 0;
let currentScreen = '';

function syncIntro() {
  if (!track.clientWidth) return;
  introIndex = Math.round(track.scrollLeft / track.clientWidth);
  const last = introIndex === slides.length - 1;
  document.querySelector('#position').textContent = (introIndex + 1) + ' / ' + slides.length;
  primary.textContent = last ? '시작하기' : '다음';
  skip.hidden = last;
}

function moveIntro(by) {
  const index = Math.min(slides.length - 1, Math.max(0, introIndex + by));
  track.scrollTo({
    left: index * track.clientWidth,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}

primary.onclick = () => {
  if (introIndex === slides.length - 1) location.hash = 'signup';
  else moveIntro(1);
};
track.onkeydown = event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  moveIntro(event.key === 'ArrowRight' ? 1 : -1);
};
track.addEventListener('scroll', syncIntro, { passive: true });
new ResizeObserver(() => {
  if (currentScreen !== 'intro' || !track.clientWidth) return;
  track.scrollTo({ left: introIndex * track.clientWidth, behavior: 'instant' });
  syncIntro();
}).observe(track);

function completeConsent(form) {
  return Array.from(form.querySelectorAll('input')).every(input => input.checked);
}
accountConsent.onchange = () => { verify.disabled = !completeConsent(accountConsent); };
chatConsent.onchange = () => { meet.disabled = !completeConsent(chatConsent); };
accountConsent.onsubmit = event => {
  event.preventDefault();
  if (completeConsent(accountConsent)) location.hash = 'verify';
};
chatConsent.onsubmit = event => {
  event.preventDefault();
  if (completeConsent(chatConsent)) location.hash = 'first-chat';
};
document.querySelector('#startIdentity').onclick = () => {
  identityStatus.textContent = '';
  provider.returnValue = '';
  provider.showModal();
};
provider.onclose = () => {
  if (currentScreen !== 'verify') return;
  if (provider.returnValue === 'success') location.hash = 'chat-consent';
  else identityStatus.textContent = '인증을 마치지 않았어요. 준비되면 다시 시도해 주세요.';
};
document.querySelector('#loginPreview').onclick = () => { location.hash = 'home'; };

const conversation = document.querySelector('#conversation');
const reply = document.querySelector('#reply');
document.querySelector('#replyForm').onsubmit = event => {
  event.preventDefault();
  const message = reply.value.trim();
  if (!message) return;
  const bubble = document.createElement('p');
  bubble.className = 'message own';
  bubble.textContent = message;
  conversation.append(bubble);
  conversation.scrollTop = conversation.scrollHeight;
  document.querySelector('#chatSnippet').textContent = message;
  reply.value = '';
  reply.focus();
};

const profile = { area: '', work: '', coverUrl: '', extras: [] };
const coverFile = document.querySelector('#coverFile');
const extraFiles = document.querySelector('#extraFiles');
const photoNext = document.querySelector('#photoNext');
const coverImage = document.querySelector('#coverImage');
const reviewPhoto = document.querySelector('#reviewPhoto');
const photoStatus = document.querySelector('#photoStatus');
const gallery = document.querySelector('#gallery');
const pickCover = document.querySelector('#pickCover');
const pickExtra = document.querySelector('#pickExtra');

function refreshProfile() {
  document.querySelectorAll('[data-area]').forEach(node => {
    node.textContent = profile.area || '선택 전';
  });
  document.querySelectorAll('[data-work]').forEach(node => { node.textContent = profile.work || '입력 전'; });
  document.querySelector('#homeProfileStatus').textContent = profile.area || '편지에 담을 나를 준비해요';
  document.querySelector('[data-photo-count]').textContent = profile.coverUrl
    ? '대표 사진 등록 · 추가 사진 ' + profile.extras.length + '장'
    : '대표 사진 선택 전';
  photoNext.disabled = !profile.coverUrl;
  coverImage.hidden = reviewPhoto.hidden = !profile.coverUrl;
  if (profile.coverUrl) coverImage.src = reviewPhoto.src = profile.coverUrl;
  pickCover.textContent = profile.coverUrl ? '대표 사진 바꾸기' : '대표 사진 선택';
  document.querySelector('#reviewExtras').replaceChildren(...profile.extras.map(url => {
    const image = new Image();
    image.src = url;
    image.alt = '추가 프로필 사진';
    return image;
  }));
}

document.querySelector('#basicsForm').onsubmit = event => {
  event.preventDefault();
  const area = document.querySelector('#area');
  const work = document.querySelector('#work');
  profile.area = area.value = area.value.trim();
  profile.work = work.value = work.value.trim();
  refreshProfile();
  location.hash = 'profile';
};

async function previewFile(file) {
  const image = new Image();
  image.src = URL.createObjectURL(file);
  try {
    await image.decode();
    return image;
  } catch (error) {
    URL.revokeObjectURL(image.src);
    throw error;
  }
}
pickCover.onclick = () => coverFile.click();
pickExtra.onclick = () => extraFiles.click();
coverFile.onchange = async () => {
  const file = coverFile.files[0];
  if (!file) return;
  coverFile.value = '';
  pickCover.disabled = true;
  try {
    const image = await previewFile(file);
    const previous = profile.coverUrl;
    profile.coverUrl = image.src;
    refreshProfile();
    if (previous) URL.revokeObjectURL(previous);
    photoStatus.textContent = '';
  } catch {
    photoStatus.textContent = '사진을 열 수 없어요. 다른 사진을 골라주세요.';
  } finally {
    pickCover.disabled = false;
  }
};
extraFiles.onchange = async () => {
  const files = Array.from(extraFiles.files);
  extraFiles.value = '';
  photoStatus.textContent = '';
  pickExtra.disabled = true;
  try {
    for (const file of files) {
      try {
        const image = await previewFile(file);
        const item = document.createElement('figure');
        const remove = document.createElement('button');
        image.alt = '추가 프로필 사진';
        remove.className = 'quiet';
        remove.textContent = '삭제';
        profile.extras.push(image.src);
        remove.onclick = () => {
          profile.extras.splice(profile.extras.indexOf(image.src), 1);
          item.remove();
          refreshProfile();
          URL.revokeObjectURL(image.src);
        };
        item.append(image, remove);
        gallery.append(item);
      } catch {
        photoStatus.textContent = '열 수 없는 사진은 제외했어요.';
      }
    }
  } finally {
    pickExtra.disabled = false;
    refreshProfile();
  }
};
photoNext.onclick = () => { location.hash = 'profile'; };

function render() {
  const requested = location.hash.slice(1) || 'intro';
  const aliases = { basic: 'profile', 'intro-preparation': 'profile' };
  const route = aliases[requested] || requested;
  const target = screens.find(screen => screen.dataset.screen === route) || screens[0];
  currentScreen = target.dataset.screen;
  screens.forEach(screen => { screen.hidden = screen !== target; });
  const tabRoutes = ['home', 'conversations', 'story', 'settings'];
  tabbar.hidden = !tabRoutes.includes(currentScreen);
  tabbar.querySelectorAll('a').forEach(link => {
    if (link.hash === '#' + currentScreen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  goHome.hidden = !['first-chat', 'profile', 'profile-basics', 'profile-photo', 'profile-review'].includes(currentScreen);
  login.hidden = currentScreen !== 'intro';
  previewMenu.open = false;
  if (provider.open && currentScreen !== 'verify') provider.close();
  viewport.scrollTop = 0;
  document.querySelector('.app').dataset.route = currentScreen;
  if (currentScreen === 'intro') syncIntro();
  else target.querySelector('h1').focus({ preventScroll: true });
}

addEventListener('hashchange', render);
refreshProfile();
render();
