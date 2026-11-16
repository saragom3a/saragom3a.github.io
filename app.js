const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion');
let paused = reduced.matches;
function setMotion() {
  document.body.classList.toggle('paused', paused);
  motionButton.setAttribute('aria-pressed', String(paused));
  const isArabic = document.documentElement.lang === 'ar';
  motionButton.textContent = isArabic ? (paused ? 'تشغيل الحركة' : 'إيقاف الحركة') : (paused ? 'Enable motion' : 'Pause motion');
  motionButton.setAttribute('aria-label', motionButton.textContent);
}
setMotion();
document.addEventListener('languagechange', () => { setMotion(); updateProgress(); });
motionButton.addEventListener('click', () => { paused = !paused; setMotion(); updateProgress(); });
const progress = document.querySelector('.progress');
const line = document.querySelector('.story-line path');
let length = line.getTotalLength();
const character = document.querySelector('.character-motion');
const hero = document.querySelector('.hero');
line.style.strokeDasharray = length;
function updateProgress() {
  const total = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${total > 0 ? scrollY / total * 100 : 0}%`;
  const bounds = document.querySelector('.timeline').getBoundingClientRect();
  const fraction = Math.max(0, Math.min(1, (innerHeight * .8 - bounds.top) / bounds.height));
  line.style.strokeDashoffset = paused || reduced.matches ? 0 : length * (1 - fraction);
  const heroProgress = Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / hero.offsetHeight));
  character.style.setProperty('--scroll-tilt', `${paused ? 0 : heroProgress * -3}deg`);
  character.style.setProperty('--scroll-rise', `${paused ? 0 : heroProgress * -24}px`);
}
let scheduled = false;
addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { updateProgress(); scheduled = false; }); } }, { passive: true });
addEventListener('resize', updateProgress);
updateProgress();
const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: .1 });
document.querySelectorAll('.chapter,.project,.system-art,.teaching h2').forEach(element => { element.classList.add('reveal'); observer.observe(element); });
document.querySelector('#year').textContent = new Date().getFullYear();

// Stop character animations while the introduction is outside the viewport.
const characterVisibility = new IntersectionObserver(([entry]) => {
  character.classList.toggle('offscreen', !entry.isIntersecting);
});
characterVisibility.observe(character);
reduced.addEventListener('change', event => {
  paused = event.matches;
  setMotion();
  updateProgress();
});

// Draw the journey through the actual marker centers in either language.
const timeline = document.querySelector('.timeline');
const storySvg = document.querySelector('.story-line');
function alignStoryLine() {
  const points = [...timeline.querySelectorAll('.doodle')].map(marker => ({
    x: marker.offsetLeft + marker.offsetWidth / 2,
    y: marker.closest('.chapter').offsetTop + marker.offsetTop + marker.offsetHeight / 2
  }));
  storySvg.setAttribute('viewBox', `0 0 ${timeline.clientWidth} ${timeline.clientHeight}`);
  let path = `M ${points[0].x} ${Math.max(0, points[0].y - 30)} L ${points[0].x} ${points[0].y}`;
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    const bend = index % 2 ? -28 : 28;
    const distance = point.y - previous.y;
    path += ` C ${previous.x + bend} ${previous.y + distance / 3}, ${point.x + bend} ${point.y - distance / 3}, ${point.x} ${point.y}`;
  });
  const last = points[points.length - 1];
  path += ` Q ${last.x - 22} ${last.y + 65}, ${last.x} ${timeline.clientHeight}`;
  line.setAttribute('d', path);
  length = line.getTotalLength();
  line.style.strokeDasharray = length;
  updateProgress();
}
new ResizeObserver(alignStoryLine).observe(timeline);
document.fonts.ready.then(alignStoryLine);
document.addEventListener('languagechange', () => requestAnimationFrame(alignStoryLine));
alignStoryLine();

// A non-interactive hint follows the mouse over scrollable website previews.
const scrollHint = document.createElement('span');
scrollHint.className = 'scroll-hint';
scrollHint.setAttribute('aria-hidden', 'true');
scrollHint.hidden = true;
document.body.append(scrollHint);
function labelScrollHint() {
  scrollHint.textContent = document.documentElement.lang === 'ar' ? 'سكرول ↕' : 'Scroll ↕';
}
function hideScrollHint() { scrollHint.hidden = true; }
labelScrollHint();
document.addEventListener('languagechange', labelScrollHint);
document.querySelectorAll('.inline-project .website-viewport').forEach(viewport => {
  viewport.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    scrollHint.hidden = false;
    scrollHint.style.left = `${Math.max(8, Math.min(event.clientX + 16, innerWidth - scrollHint.offsetWidth - 8))}px`;
    scrollHint.style.top = `${Math.max(8, Math.min(event.clientY + 18, innerHeight - scrollHint.offsetHeight - 8))}px`;
  }, { passive: true });
  viewport.addEventListener('pointerleave', hideScrollHint);
  viewport.addEventListener('pointercancel', hideScrollHint);
});
window.addEventListener('blur', hideScrollHint);
window.addEventListener('scroll', hideScrollHint, { passive: true });


// A compact gallery with optional motion and an accessible full-design viewer.
const designGallery = document.querySelector('.design-gallery');
const designViewer = document.querySelector('#design-viewer');
const galleryPause = document.querySelector('#gallery-pause');
let galleryPaused = reduced.matches;
let galleryVisible = false;
let galleryInteracting = false;
function galleryLabels() {
  const ar = document.documentElement.lang === 'ar';
  galleryPause.textContent = galleryPaused ? '▶' : 'Ⅱ';
  galleryPause.setAttribute('aria-pressed', String(galleryPaused));
  galleryPause.setAttribute('aria-label', ar ? (galleryPaused ? 'تشغيل حركة الجاليري' : 'إيقاف حركة الجاليري') : (galleryPaused ? 'Play gallery' : 'Pause gallery'));
  document.querySelector('#gallery-prev').textContent = ar ? '→' : '←';
  document.querySelector('#gallery-next').textContent = ar ? '←' : '→';
}
function moveGallery(direction) {
  const rtl = getComputedStyle(designGallery).direction === 'rtl';
  const step = designGallery.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(designGallery).columnGap);
  const position = Math.abs(designGallery.scrollLeft);
  const maximum = designGallery.scrollWidth - designGallery.clientWidth;
  const target = direction > 0 ? (position >= maximum - 3 ? 0 : Math.min(maximum, position + step)) : (position <= 3 ? maximum : Math.max(0, position - step));
  designGallery.scrollTo({left: target * (rtl ? -1 : 1), behavior: reduced.matches || paused ? 'auto' : 'smooth'});
}
document.querySelector('#gallery-prev').addEventListener('click', () => moveGallery(-1));
document.querySelector('#gallery-next').addEventListener('click', () => moveGallery(1));
galleryPause.addEventListener('click', () => { galleryPaused = !galleryPaused; galleryLabels(); });
designGallery.addEventListener('pointerenter', () => { galleryInteracting = true; });
designGallery.addEventListener('pointerleave', () => { galleryInteracting = false; });
designGallery.addEventListener('touchstart', () => { galleryPaused = true; galleryLabels(); }, {passive:true});
new IntersectionObserver(([entry]) => { galleryVisible = entry.isIntersecting; }, {threshold:.25}).observe(designGallery);
setInterval(() => {
  if (galleryVisible && !galleryPaused && !paused && !reduced.matches && !galleryInteracting && !document.hidden && !designViewer.open && !document.querySelector('#web-design').contains(document.activeElement)) moveGallery(1);
}, 5000);
document.addEventListener('languagechange', () => { galleryLabels(); designGallery.scrollTo({left:0,behavior:'instant'}); });
designGallery.querySelectorAll('.gallery-preview').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const source = link.querySelector('img');
    const full = designViewer.querySelector('img');
    full.src = source.src;
    full.alt = source.alt;
    document.querySelector('#design-viewer-title').textContent = link.closest('article').querySelector('h3').textContent;
    designViewer.querySelector('.design-viewer-body').scrollTop = 0;
    designViewer.showModal();
    document.body.classList.add('design-viewer-open');
  });
});
designViewer.querySelector('.design-viewer-close').addEventListener('click', () => designViewer.close());
designViewer.addEventListener('click', event => { if(event.target === designViewer) { const r=designViewer.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) designViewer.close(); } });
designViewer.addEventListener('close', () => document.body.classList.remove('design-viewer-open'));
galleryLabels();
