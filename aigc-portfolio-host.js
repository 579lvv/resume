"use strict";
(() => {
  const frame = document.getElementById("aigc-portfolio-frame");
  if (!frame) return;
  const origin = new URL(frame.src, location.href).origin;
  let inView = false;
  const notify = () => {
    const visible = inView && document.visibilityState === "visible";
    document.body.classList.toggle("aigc-viewing", visible);
    frame.contentWindow?.postMessage({ type: "aigc-portfolio", action: "visibility", visible }, origin);
  };
  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow || event.origin !== origin) return;
    const message = event.data;
    if (!message || message.type !== "aigc-portfolio") return;
    if (message.action === "layout" && Number.isFinite(message.height) && message.height >= 200 && message.height <= 3000) {
      frame.style.height = `${Math.ceil(message.height)}px`;
    }
    if (message.action === "ready") notify();
  });
  frame.addEventListener("load", notify);
  document.addEventListener("visibilitychange", notify);
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    notify();
  }, { threshold: 0 });
  observer.observe(frame);
})();
