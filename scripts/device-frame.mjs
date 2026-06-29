// 로컬 전용 미리보기 베젤 래퍼. localhost:8081(Expo web)을 휴대폰 프레임 안에 iframe 으로 띄운다.
// preview 패널은 CSP 샌드박스가 아니라 실제 브라우저라 localhost iframe 이 허용된다.
import http from 'node:http';

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const PORT = Number(process.env.PORT) || 8090;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>프롤로그 — device frame</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: #ffffff;
    overflow: hidden;
    width: 100vw; height: 100vh; position: relative;
    font-family: -apple-system, system-ui, sans-serif;
  }
  .phone {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    transform-origin: center center;
    width: 402px; height: 858px;
    background: #0c0c0f;
    border-radius: 56px;
    padding: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.28), inset 0 0 2px 1px rgba(255,255,255,0.18);
  }
  .island {
    position: absolute; top: 26px; left: 50%; transform: translateX(-50%);
    width: 118px; height: 32px; background: #000; border-radius: 18px; z-index: 3;
  }
  .screen {
    width: 100%; height: 100%;
    border: none; border-radius: 44px; background: #fff; display: block;
  }
  /* side buttons */
  .btn { position: absolute; background: #1a1a1f; border-radius: 3px; }
  .btn.power { right: -3px; top: 188px; width: 3px; height: 92px; }
  .btn.volup { left: -3px; top: 168px; width: 3px; height: 56px; }
  .btn.voldn { left: -3px; top: 236px; width: 3px; height: 56px; }
  .btn.silent { left: -3px; top: 116px; width: 3px; height: 34px; }
</style>
</head>
<body>
  <div class="phone" id="phone">
    <div class="island"></div>
    <span class="btn silent"></span>
    <span class="btn volup"></span>
    <span class="btn voldn"></span>
    <span class="btn power"></span>
    <iframe class="screen" src="${APP_URL}" title="프롤로그 앱"></iframe>
  </div>
  <script>
    var NAT_W = 402, NAT_H = 858, MARGIN = 24;
    function fit() {
      var s = Math.min(1, (window.innerHeight - MARGIN) / NAT_H, (window.innerWidth - MARGIN) / NAT_W);
      document.getElementById('phone').style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    }
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    requestAnimationFrame(fit);
    fit();
  </script>
</body>
</html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
server.listen(PORT, () => {
  console.log(`device-frame wrapper listening on http://localhost:${PORT} (embeds ${APP_URL})`);
});
