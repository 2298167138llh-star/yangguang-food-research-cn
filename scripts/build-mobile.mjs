import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const desktopPath = path.join(root, 'index.html');
const mobilePath = path.join(root, 'mobile.html');
const desktop = fs.readFileSync(desktopPath, 'utf8');

const notesStart = desktop.indexOf('const SPEAKER_NOTES = ');
const notesEnd = desktop.indexOf('\nwindow.__SPEAKER_NOTES__', notesStart);
if (notesStart < 0 || notesEnd < 0) throw new Error('SPEAKER_NOTES not found');
const notesJson = desktop.slice(notesStart + 'const SPEAKER_NOTES = '.length, notesEnd).trim().replace(/;$/, '');
const notes = JSON.parse(notesJson);

const decode = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/<[^>]+>/g, '')
  .trim();
const sources = [...desktop.matchAll(/<div class="source-line">([\s\S]*?)<\/div>/g)].map((match) => decode(match[1]));
if (notes.length !== 22 || sources.length !== 20) {
  throw new Error(`Unexpected source shape: ${notes.length} notes, ${sources.length} sources`);
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const slides = notes.map((note, index) => ({
  ...note,
  number: index + 1,
  image: `assets/slides/slide-${String(index + 1).padStart(2, '0')}.png`,
  source: index === 0
    ? '材料范围：第一次分工成品、公司简介、央厨年度总结与课程作业说明。'
    : index === notes.length - 1
      ? '本页为第一次分工的收束与后续讨论入口。'
      : sources[index - 1],
}));

const slideMarkup = slides.map((slide, index) => {
  const points = slide.talk.map((point) => `<li>${escapeHtml(point)}</li>`).join('');
  const theme = index === 0 ? ' cover' : index === slides.length - 1 ? ' closing' : '';
  const loading = index < 2 ? 'eager' : 'lazy';
  return `
    <section class="mobile-slide${theme}" id="${escapeHtml(slide.id)}" data-index="${index}" aria-labelledby="title-${index}">
      <div class="slide-shell">
        <header class="slide-meta">
          <span>${escapeHtml(slide.section)} · MOBILE READING</span>
          <span>${String(slide.number).padStart(2, '0')} / ${slides.length}</span>
        </header>
        <div class="slide-heading">
          <p class="eyebrow">本页目的</p>
          <h2 id="title-${index}">${escapeHtml(slide.title)}</h2>
          <p class="purpose">${escapeHtml(slide.purpose)}</p>
        </div>
        <button class="slide-preview" type="button" data-preview="${index}" aria-label="放大查看第${slide.number}页原稿">
          <img src="${slide.image}" alt="第${slide.number}页原稿：${escapeHtml(slide.title)}" loading="${loading}" decoding="async">
          <span>点击放大原稿</span>
        </button>
        <div class="reading-notes">
          <p class="eyebrow">讲解要点</p>
          <ol>${points}</ol>
        </div>
        <div class="traceability">
          <p><strong>来源与口径</strong>${escapeHtml(slide.source)}</p>
          <p><strong>衔接下页</strong>${escapeHtml(slide.transition)}</p>
        </div>
      </div>
    </section>`;
}).join('');

const document = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#002fa7">
  <meta name="description" content="杨光食品标的与行业共同底稿手机竖屏阅读版">
  <title>杨光食品·共同底稿｜手机竖屏版</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/fonts/fonts.css">
  <style>
    :root{--accent:#002fa7;--ink:#0a0a0a;--paper:#fff;--grey:#f2f2f2;--line:#d9d9d9;--muted:#676767;--safe-bottom:max(86px,calc(70px + env(safe-area-inset-bottom)))}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth;scroll-snap-type:y mandatory;background:var(--paper)}
    body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
    button,a{font:inherit}
    button:focus-visible,a:focus-visible{outline:3px solid #ffcf00;outline-offset:3px}
    .progress{position:fixed;inset:0 0 auto;z-index:20;height:4px;background:rgba(0,0,0,.12)}
    .progress span{display:block;width:var(--progress,4.55%);height:100%;background:var(--accent);transition:width .28s ease}
    .mobile-slide{min-height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:var(--paper);display:grid;align-items:start}
    .mobile-slide:nth-child(even){background:var(--grey)}
    .slide-shell{width:min(100%,680px);min-height:100svh;margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 22px var(--safe-bottom);display:flex;flex-direction:column;gap:20px}
    .slide-meta{display:flex;justify-content:space-between;gap:16px;padding-top:8px;padding-bottom:12px;border-bottom:1px solid var(--ink);font-size:12px;font-weight:600;line-height:1.3;letter-spacing:.08em;text-transform:uppercase}
    .slide-heading{display:grid;gap:9px}
    .eyebrow{margin:0;color:var(--accent);font-size:12px;font-weight:650;line-height:1.2;letter-spacing:.13em}
    h2{margin:0;font-size:clamp(30px,8.5vw,46px);font-weight:300;line-height:1.05;letter-spacing:-.045em;text-wrap:balance}
    .purpose{margin:0;max-width:40em;font-size:17px;font-weight:450;line-height:1.6;color:#303030}
    .slide-preview{position:relative;display:block;width:100%;padding:0;border:0;border-top:2px solid var(--accent);border-bottom:1px solid var(--line);background:transparent;color:inherit;text-align:left;cursor:zoom-in}
    .slide-preview img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#eee}
    .slide-preview span{display:block;padding:8px 0 7px;font-size:12px;font-weight:600;letter-spacing:.06em;color:var(--muted)}
    .reading-notes{display:grid;gap:10px}
    .reading-notes ol{counter-reset:point;margin:0;padding:0;list-style:none;border-top:1px solid var(--ink)}
    .reading-notes li{counter-increment:point;display:grid;grid-template-columns:32px 1fr;gap:10px;padding:11px 0;border-bottom:1px solid var(--line);font-size:16px;font-weight:450;line-height:1.55}
    .reading-notes li::before{content:counter(point,decimal-leading-zero);color:var(--accent);font-size:12px;font-weight:650;letter-spacing:.08em;padding-top:4px}
    .traceability{display:grid;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid var(--ink)}
    .traceability p{margin:0;font-size:12px;font-weight:500;line-height:1.6;color:var(--muted)}
    .traceability strong{display:inline-block;margin-right:8px;color:var(--ink);font-weight:700}
    .cover,.closing{color:#fff;background:var(--accent)!important}
    .cover .slide-shell,.closing .slide-shell{background-image:radial-gradient(circle at 82% 18%,rgba(255,255,255,.22) 0 1px,transparent 1.5px);background-size:18px 18px}
    .cover .slide-meta,.closing .slide-meta{border-color:rgba(255,255,255,.62)}
    .cover .eyebrow,.closing .eyebrow{color:rgba(255,255,255,.74)}
    .cover h2,.closing h2{font-size:clamp(42px,12vw,68px);font-weight:250}
    .cover .purpose,.closing .purpose{color:rgba(255,255,255,.9)}
    .cover .slide-preview,.closing .slide-preview{border-top-color:#fff;border-bottom-color:rgba(255,255,255,.35)}
    .cover .slide-preview span,.closing .slide-preview span,.cover .traceability p,.closing .traceability p{color:rgba(255,255,255,.76)}
    .cover .reading-notes ol,.closing .reading-notes ol,.cover .traceability,.closing .traceability{border-color:rgba(255,255,255,.72)}
    .cover .reading-notes li,.closing .reading-notes li{border-color:rgba(255,255,255,.28)}
    .cover .reading-notes li::before,.closing .reading-notes li::before,.cover .traceability strong,.closing .traceability strong{color:#fff}
    .bottom-nav{position:fixed;z-index:30;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 24px),520px);display:grid;grid-template-columns:58px 1fr 58px;align-items:center;background:rgba(10,10,10,.94);color:#fff;border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(12px)}
    .bottom-nav button,.bottom-nav a{min-height:48px;border:0;background:transparent;color:inherit;display:grid;place-items:center;text-decoration:none;cursor:pointer}
    .bottom-nav button[disabled]{opacity:.32;cursor:default}
    .nav-status{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:0 12px;border-inline:1px solid rgba(255,255,255,.18);font-size:12px;font-weight:650;letter-spacing:.06em}
    .nav-status span:nth-child(2){height:2px;background:rgba(255,255,255,.25)}
    .nav-status i{display:block;width:var(--progress,4.55%);height:100%;background:#fff}
    dialog{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:0;border:0;background:#090909;color:#fff}
    dialog::backdrop{background:#090909}
    .viewer{height:100%;display:grid;grid-template-rows:56px 1fr;overflow:hidden}
    .viewer-head{display:flex;justify-content:space-between;align-items:center;padding:0 16px;border-bottom:1px solid #333;font-size:13px;font-weight:600}
    .viewer-head button{min-width:48px;min-height:40px;border:1px solid #555;background:transparent;color:#fff;cursor:pointer}
    .viewer-stage{overflow:auto;display:grid;place-items:center;touch-action:pan-x pan-y pinch-zoom}
    .viewer-stage img{display:block;width:max(100vw,920px);height:auto;max-width:none}
    @media (min-width:700px){.slide-shell{padding-inline:34px}.bottom-nav{bottom:20px}}
    @media (max-height:720px){.slide-shell{gap:15px}.purpose{font-size:16px}.reading-notes li{padding:8px 0}.slide-preview span{padding-block:5px}}
    @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.progress span{transition:none}}
  </style>
</head>
<body>
  <div class="progress" aria-hidden="true"><span></span></div>
  <main>${slideMarkup}
  </main>
  <nav class="bottom-nav" aria-label="手机版翻页">
    <button id="prev" type="button" aria-label="上一页">↑</button>
    <a class="nav-status" href="index.html" aria-label="打开电脑横屏版">
      <span id="current">01</span><span><i></i></span><span>22 · 电脑版</span>
    </a>
    <button id="next" type="button" aria-label="下一页">↓</button>
  </nav>
  <dialog id="preview-dialog" aria-labelledby="preview-title">
    <div class="viewer">
      <div class="viewer-head"><span id="preview-title">原稿大图</span><button id="close-preview" type="button">关闭</button></div>
      <div class="viewer-stage"><img id="preview-image" alt=""></div>
    </div>
  </dialog>
  <script>
    const slides=[...document.querySelectorAll('.mobile-slide')];
    const prev=document.querySelector('#prev');
    const next=document.querySelector('#next');
    const current=document.querySelector('#current');
    const dialog=document.querySelector('#preview-dialog');
    const previewImage=document.querySelector('#preview-image');
    const previewTitle=document.querySelector('#preview-title');
    let active=0;
    const update=(index)=>{
      active=Math.max(0,Math.min(slides.length-1,index));
      document.documentElement.style.setProperty('--active',active);
      document.documentElement.style.setProperty('--progress',((active+1)/slides.length*100).toFixed(2)+'%');
      current.textContent=String(active+1).padStart(2,'0');
      prev.disabled=active===0;
      next.disabled=active===slides.length-1;
    };
    const go=(index)=>{update(index);slides[active].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})};
    const observer=new IntersectionObserver((entries)=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) update(Number(visible.target.dataset.index));
    },{threshold:[.35,.55,.75]});
    slides.forEach(slide=>observer.observe(slide));
    prev.addEventListener('click',()=>go(active-1));
    next.addEventListener('click',()=>go(active+1));
    addEventListener('keydown',(event)=>{
      if(dialog.open) return;
      if(['ArrowDown','ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();go(active+1)}
      if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(active-1)}
      if(event.key==='Home'){event.preventDefault();go(0)}
      if(event.key==='End'){event.preventDefault();go(slides.length-1)}
    });
    let touchX=0,touchY=0;
    addEventListener('touchstart',(event)=>{touchX=event.changedTouches[0].clientX;touchY=event.changedTouches[0].clientY},{passive:true});
    addEventListener('touchend',(event)=>{
      if(dialog.open) return;
      const dx=event.changedTouches[0].clientX-touchX;
      const dy=event.changedTouches[0].clientY-touchY;
      if(Math.abs(dx)>64&&Math.abs(dx)>Math.abs(dy)*1.25) go(active+(dx<0?1:-1));
    },{passive:true});
    document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
      const image=button.querySelector('img');
      previewImage.src=image.src;
      previewImage.alt=image.alt;
      previewTitle.textContent=image.alt;
      dialog.showModal();
    }));
    document.querySelector('#close-preview').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',(event)=>{if(event.target===dialog)dialog.close()});
    update(0);
  </script>
</body>
</html>`;

fs.writeFileSync(mobilePath, document);
console.log(`Built ${mobilePath} with ${slides.length} mobile slides.`);
