"use strict";
(() => {
  const films = [...document.querySelectorAll("video")];
  const note = document.querySelector(".viewing-note");
  let hostVisible = false;
  let filmsVisible = false;
  let active = false;
  let lastHeight = 0;
  const send = (action, details = {}) => parent.postMessage({ type: "aigc-portfolio", action, ...details }, location.origin);
  const layout = () => {
    const height = Math.ceil(document.querySelector(".page").getBoundingClientRect().height) + 2;
    if (height !== lastHeight) {
      lastHeight = height;
      send("layout", { height });
    }
  };
  const sync = () => {
    const visible = hostVisible && filmsVisible && document.visibilityState === "visible";
    if (visible === active) return;
    active = visible;
    films.forEach((video) => {
      if (!active) { video.pause(); return; }
      video.muted = true;
      if (video.ended) video.currentTime = 0;
      const playing = video.play();
      if (playing) playing.catch(() => {
        if (active) note.textContent = "点击播放 · 可在播放器中开启声音";
      });
    });
  };
  films.forEach((video) => {
    video.defaultMuted = true;
    video.muted = true;
    video.addEventListener("volumechange", () => {
      if (!video.muted && video.volume > 0) films.forEach((other) => { if (other !== video) other.muted = true; });
    });
    video.addEventListener("play", () => {
      video.closest(".film").querySelector(".playback-error").hidden = true;
    });
    video.addEventListener("error", () => {
      video.closest(".film").querySelector(".playback-error").hidden = false;
    });
  });
  window.addEventListener("message", (event) => {
    if (event.source !== parent || event.origin !== location.origin) return;
    if (event.data?.type !== "aigc-portfolio" || event.data.action !== "visibility") return;
    hostVisible = event.data.visible === true;
    layout();
    sync();
  });
  new IntersectionObserver(([entry]) => {
    filmsVisible = entry.isIntersecting;
    sync();
  }, { threshold: 0 }).observe(document.querySelector(".films"));
  document.addEventListener("visibilitychange", sync);
  new ResizeObserver(layout).observe(document.querySelector(".page"));
  window.addEventListener("load", layout);
  layout();
  send("ready");
})();
