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
