import React, { useEffect, useState } from 'react';

export default function StartupScreen({ onFinish }: { onFinish: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeTimer = window.setTimeout(() => setFading(true), reduceMotion ? 350 : 950);
    const finishTimer = window.setTimeout(onFinish, reduceMotion ? 500 : 1300);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`startup-screen${fading ? ' startup-screen-leaving' : ''}`} role="status" aria-label="Opening StellarCare">
      <div className="startup-glow startup-glow-one" />
      <div className="startup-glow startup-glow-two" />
      <div className="startup-brand">
        <div className="startup-logo"><img src="/stellarcare-mark.png" alt="" /></div>
        <div className="startup-wordmark">stellar<span>care</span></div>
        <div className="startup-tagline">CARE, MADE CLOSER</div>
        <div className="startup-progress"><span /></div>
      </div>
      <style>{`
        .startup-screen { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; overflow: hidden; background: #f8f9f5; opacity: 1; transition: opacity .42s ease, visibility .42s ease; }
        .startup-screen-leaving { opacity: 0; visibility: hidden; }
        .startup-brand { position: relative; z-index: 1; text-align: center; animation: startupRise .6s cubic-bezier(.2,.75,.3,1) both; }
        .startup-logo { width: 74px; height: 74px; margin: 0 auto 14px; padding: 11px; border-radius: 23px; background: #edf4e9; box-shadow: 0 10px 30px rgba(73,113,81,.1); animation: startupPulse 1.8s ease-in-out infinite; }
        .startup-logo img { width: 100%; height: 100%; object-fit: contain; }
        .startup-wordmark { color: #29493b; font: 800 25px/1 Manrope, 'DM Sans', sans-serif; letter-spacing: -1px; }
        .startup-wordmark span { color: #749374; font-weight: 600; }
        .startup-tagline { margin-top: 8px; color: #96a396; font: 700 8px/1 'DM Sans', sans-serif; letter-spacing: 1.8px; }
        .startup-progress { width: 74px; height: 3px; overflow: hidden; margin: 25px auto 0; border-radius: 4px; background: #e9efe6; }
        .startup-progress span { display: block; width: 35%; height: 100%; border-radius: inherit; background: #82ad89; animation: startupLoad .9s ease-out forwards; }
        .startup-glow { position: absolute; width: 320px; height: 320px; border-radius: 50%; filter: blur(1px); }
        .startup-glow-one { top: -210px; left: -180px; background: radial-gradient(circle, rgba(220,239,224,.7), transparent 72%); }
        .startup-glow-two { right: -205px; bottom: -220px; background: radial-gradient(circle, rgba(240,231,207,.65), transparent 72%); }
        @keyframes startupRise { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes startupPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes startupLoad { to { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { .startup-brand, .startup-logo, .startup-progress span { animation-duration: .01ms; animation-iteration-count: 1; } }
      `}</style>
    </div>
  );
}
