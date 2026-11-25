'use strict';
const first = document.querySelector('#first');
const last = document.querySelector('#last');
const videos = [first, last];
const play = document.querySelector('#toggle');
const playLabel = document.querySelector('#play-label');
const timeline = document.querySelector('#seek');
const clock = document.querySelector('#clock');
const transport = document.querySelector('#transport');
let generation = 0;
let fallback = false;

function render() {
  const t = first.currentTime;
  const duration = first.duration;
  if (!Number.isFinite(duration)) return;
  timeline.max = duration;
  timeline.value = t;
  clock.textContent = t.toFixed(1) + ' / ' + duration.toFixed(1) + ' s';
  timeline.setAttribute('aria-valuetext', t.toFixed(1) + ' seconds');
  const active = !first.paused && !first.ended;
  play.classList.toggle('playing', active);
  playLabel.textContent = active ? 'Pause both' : first.ended ? 'Replay both' : 'Play both';
}

function setTime(t) {
  for (const video of videos) {
    if (Number.isFinite(video.duration)) video.currentTime = Math.min(t, video.duration);
  }
  render();
}

function stop() {
  generation++;
  videos.forEach(v => v.pause());
  render();
}

function nativeControls() {
  fallback = true;
  stop();
  transport.hidden = true;
  videos.forEach(v => { v.controls = true; });
  const message = document.querySelector('#player-error');
  message.textContent = 'Use the individual video controls to play the recordings.';
  message.hidden = false;
}

async function start() {
  if (fallback) return;
  const run = ++generation;
  if (first.ended) setTime(0);
  const t = first.currentTime;
  last.currentTime = Math.min(t, last.duration);
  try {
    await Promise.all(videos.filter(v => v.duration > t).map(v => v.play()));
    if (run === generation) render();
  } catch (error) {
    if (run === generation) nativeControls();
  }
}

function ready() {
  if (fallback || videos.some(v => !Number.isFinite(v.duration))) return;
  transport.hidden = false;
  videos.forEach(v => { v.controls = false; });
  render();
}

play.addEventListener('click', () => first.paused ? start() : stop());
document.querySelector('#restart').addEventListener('click', () => { stop(); setTime(0); start(); });
timeline.addEventListener('input', () => {
  const t = Number(timeline.value);
  const resume = !first.paused;
  stop();
  setTime(t);
  if (resume) start();
});
first.addEventListener('timeupdate', () => {
  if (fallback) return;
  if (!first.paused && first.currentTime < last.duration && !last.seeking &&
      Math.abs(first.currentTime - last.currentTime) > 0.25) last.currentTime = first.currentTime;
  render();
});
first.addEventListener('ended', () => { if (!fallback) { last.pause(); render(); } });
videos.forEach(v => {
  v.addEventListener('loadedmetadata', ready);
  v.addEventListener('error', nativeControls);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && !fallback) stop(); });
ready();
