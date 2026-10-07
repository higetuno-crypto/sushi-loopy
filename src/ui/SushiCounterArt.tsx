import { useId } from 'react';

/** Original, layered illustration. The hands and plated sushi remain separate for motion. */
export function SushiCounterArt({ working }: { working: boolean }) {
  const id = useId();
  return <svg className="shop-art" viewBox="0 0 560 280" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor="#e9dfca" /><stop offset="1" stopColor="#f4ecda" /></linearGradient>
      <linearGradient id={`${id}-wood`} x2="0" y2="1"><stop stopColor="#d3a76f" /><stop offset="1" stopColor="#bb8754" /></linearGradient>
      <linearGradient id={`${id}-face`} x2="0.7" y2="1"><stop stopColor="#ffe0b9" /><stop offset="1" stopColor="#edbb93" /></linearGradient>
      <linearGradient id={`${id}-glass`} x2="1" y2="1"><stop stopColor="#e8e9cc" /><stop offset="1" stopColor="#b9c8aa" /></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="#ffedb9" stopOpacity=".8" /><stop offset="1" stopColor="#ffedb9" stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-grain`} width="140" height="28" patternUnits="userSpaceOnUse"><path d="M-10 8Q30 1 80 8T160 6M-5 22Q60 15 95 22T155 22" fill="none" stroke="#795d3c" strokeOpacity=".13" /><path d="M24 9q24-4 47 0" fill="none" stroke="#fff2d3" strokeOpacity=".35" /></pattern>
      <pattern id={`${id}-paper`} width="12" height="14" patternUnits="userSpaceOnUse"><path d="M1 3h1M8 10h1" stroke="#75674b" strokeOpacity=".08" /></pattern>
      <pattern id={`${id}-cloth`} width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0h4M0 0v4" stroke="#f8f0d8" strokeOpacity=".06" /></pattern>
      <symbol id={`${id}-nigiri`} viewBox="0 0 48 30">
        <ellipse cx="24" cy="25" rx="21" ry="4" fill="#243e38" opacity=".14" />
        <path d="M7 15q1-8 17-8t17 8v7Q25 29 7 22Z" fill="#fff8e6" />
        <path d="M10 19v3m6-1v3m7-3v3m7-4v3m6-5v3" stroke="#d6ccae" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 12Q6 3 23 3T44 12l-3 5Q22 22 5 16Z" fill="#df7957" />
        <path d="m9 7 9 9m-1-12 10 13m-1-13 9 12m-1-10 6 8" fill="none" stroke="#ffe0bd" strokeWidth="2.2" opacity=".9" />
      </symbol>
    </defs>
    <rect width="560" height="280" fill={`url(#${id}-wall)`} />
    <rect width="560" height="280" fill={`url(#${id}-paper)`} />
    <path d="M0 151h560v8H0Z" fill="#cabc9f" />
    <path d="M0 160h560" stroke="#fff8df" strokeWidth="2" />
    <g>
      <rect x="30" y="61" width="127" height="91" rx="2" fill="#69756a" />
      <rect x="35" y="66" width="117" height="81" fill={`url(#${id}-glass)`} />
      <path d="M36 132q20-31 42-15t36-15q18-17 39-1v46H36Z" fill="#93a188" />
      <path d="M35 142q31-25 55-3t62-14v22H35Z" fill="#738d78" />
      <path d="M35 103h117M94 66v81" stroke="#69756a" strokeWidth="4" />
      <path d="M42 68v26m0-26h32" stroke="#fff9e4" strokeOpacity=".65" strokeWidth="2" />
      <path d="M27 153h133v6H27Z" fill="#9c8868" />
    </g>
    <g fill="none" stroke="#577d61" strokeWidth="3" strokeLinecap="round">
      <path d="M73 173v-22m0 12q-16-1-15-13 14 0 15 13m0-3q16-2 14-15-13 2-14 15m0-8q-8-10-1-18 9 9 1 18" />
    </g>
    <path d="M56 168h35l-5 29H61Z" fill="#b76d50" /><path d="M56 168h35v5H56Z" fill="#cf896b" />
    <g transform="rotate(-3 195 112)">
      <path d="M175 66h42v94h-42Z" fill="#fbf6e8" /><path d="M180 70h32v84h-32Z" fill="none" stroke="#d9cfb7" />
      <text x="196" y="92" textAnchor="middle" fill="#4a5848" fontSize="13" fontFamily="Yu Mincho, serif">一</text>
      <text x="196" y="112" textAnchor="middle" fill="#4a5848" fontSize="13" fontFamily="Yu Mincho, serif">貫</text>
      <text x="196" y="132" textAnchor="middle" fill="#4a5848" fontSize="13" fontFamily="Yu Mincho, serif">入魂</text>
      <rect x="195" y="141" width="12" height="9" fill="#b86047" opacity=".85" />
    </g>
    <circle className="shop-lamplight" cx="418" cy="122" r="111" fill={`url(#${id}-light)`} />
    <path d="M427 0v48" stroke="#596355" strokeWidth="2" />
    <path d="M407 45h40l10 14h-60Z" fill="#b29559" /><path d="M401 59h52" stroke="#f8db9d" strokeWidth="3" />
    <g className="shop-noren">
      <path d="M0 0h560v40Q504 46 454 40q-56 8-112 0-58 8-114 0-58 8-114 0Q55 46 0 40Z" fill="#29473f" />
      <path d="M0 0h560v43H0Z" fill={`url(#${id}-cloth)`} />
      <path d="M114 8v33m114-33v33m114-33v33m112-33v33" stroke="#e9dfca" strokeWidth="2" />
      <path d="M0 5h560" stroke="#142d27" strokeWidth="6" />
      <text x="285" y="30" textAnchor="middle" fill="#f6efdb" fontSize="17" fontFamily="Yu Mincho, serif" letterSpacing="5">すし るーぴー</text>
    </g>
    {working ? <g className="shop-chef">
      <g className="chef-entrance"><g className="chef-body">
        <ellipse cx="319" cy="192" rx="56" ry="8" fill="#684c32" opacity=".15" />
        <path d="M285 143q34-15 68 0l14 55h-98Z" fill="#fbf8e9" />
        <path d="m307 138 12 17 12-17" fill="#efe5ce" stroke="#d4c8af" />
        <path d="M300 153h38l8 49h-54Z" fill="#354e46" /><path d="M303 154v-15m32 15v-15" stroke="#354e46" strokeWidth="5" />
        <path d="M305 177h28v19h-28Z" fill="#476157" /><path d="M308 181h22" stroke="#8c9b81" strokeWidth="1" />
        <circle cx="289" cy="118" r="7" fill="#edbd98" /><circle cx="349" cy="118" r="7" fill="#edbd98" />
        <path d="M291 109q0-30 28-30t28 30v12q-3 29-28 29t-28-29Z" fill={`url(#${id}-face)`} />
        <path d="M290 109q-4-31 29-31 33 1 29 31l-8-8-10-4-22 4-10-2Z" fill="#39473b" />
        <path d="M289 95q31-10 60 0v10q-29-9-60 0Z" fill="#fcf9ed" /><path d="M291 103q30-8 55 0" fill="none" stroke="#d5d0bb" />
        <path d="M347 97q12 2 15 12l-11-2-4-6Z" fill="#fcf9ed" />
        <g className="chef-eyes" fill="none" stroke="#354438" strokeWidth="2.5" strokeLinecap="round"><path d="m303 118 6-2m20 0 6 2" /></g>
        <ellipse cx="300" cy="125" rx="5" ry="2.5" fill="#d88671" opacity=".4" /><ellipse cx="338" cy="125" rx="5" ry="2.5" fill="#d88671" opacity=".4" />
        <path d="M313 131q6 4 12 0" fill="none" stroke="#a66c51" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M279 150q-13 10-13 31l25 2 5-26" fill="#f5efdd" stroke="#d5c9af" /><path d="M358 150q14 10 14 31l-27 2-5-26" fill="#f5efdd" stroke="#d5c9af" />
      </g></g>
    </g> : <g opacity=".6"><path d="M323 111v12m-7-12q7-10 14 0" fill="none" stroke="#8e886d" strokeWidth="2" /><path d="m310 124-6 35h31l-6-35-9 5Z" fill="#758578" /><path d="M312 143h15v12h-15Z" fill="#8f9b87" /></g>}
    <path d="M0 196h560v84H0Z" fill={`url(#${id}-wood)`} />
    <path d="M0 202h560v78H0Z" fill={`url(#${id}-grain)`} />
    <path d="M0 196 24 176h512l24 20Z" fill="#ddba87" />
    <path d="M10 189h540m-526-9h512" stroke="#af8a57" strokeOpacity=".3" />
    <path d="M0 196h560v6H0Z" fill="#f1cc91" /><path d="M0 203h560" stroke="#90663e" strokeOpacity=".3" />
    <path d="M228 178h148l9 27H214Z" fill="#ba915c" /><path d="M231 179h142l7 22H219Z" fill="#ead1a4" /><path d="m243 183 106 11m-99-13 69 7" stroke="#ad8f61" strokeOpacity=".25" />
    <g>
      <ellipse cx="129" cy="201" rx="21" ry="6" fill="#526f63" opacity=".2" /><path d="M116 174h24l-2 25q-10 7-21 0Z" fill="#6c8875" /><ellipse cx="128" cy="174" rx="12" ry="4" fill="#dde5c9" /><ellipse cx="128" cy="174" rx="8" ry="2.5" fill="#6e8668" /><path d="M120 181v11" stroke="#d9dfbb" strokeWidth="2" opacity=".5" />
      <ellipse cx="453" cy="192" rx="26" ry="5" fill="#715135" opacity=".15" /><path d="M433 177h40l-4 14q-15 7-32 0Z" fill="#4b655d" /><ellipse cx="453" cy="177" rx="20" ry="5" fill="#7b9584" /><ellipse cx="453" cy="178" rx="13" ry="2" fill="#244239" />
      <path d="m478 176 30 18m-27-22 30 18" stroke="#7a5235" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    {working && <g className="chef-hands">
      <g className="chef-rice"><use href={`#${id}-nigiri`} x="296" y="172" width="45" height="28" /></g>
      <g className="chef-hand-left"><path d="M268 166q-1 18 14 23l26-1 3-9-23-7Z" fill="#f7f1df" stroke="#d2c6ac" /><path d="m298 178 15 1q8 4 4 10l-18 2-7-6Z" fill={`url(#${id}-face)`} stroke="#d4a47e" /><path d="m304 183 8 1m-9 3 8 1" stroke="#cc9e79" strokeLinecap="round" /></g>
      <g className="chef-hand-right"><path d="M367 166q2 18-14 23l-23-1-3-9 21-7Z" fill="#f7f1df" stroke="#d2c6ac" /><path d="m337 178-16 1q-8 4-4 10l19 2 7-6Z" fill={`url(#${id}-face)`} stroke="#d4a47e" /><path d="m331 183-8 1m9 3-8 1" stroke="#cc9e79" strokeLinecap="round" /></g>
      <g className="chef-serving"><ellipse cx="245" cy="219" rx="36" ry="8" fill="#735735" opacity=".16" /><ellipse cx="245" cy="214" rx="35" ry="11" fill="#809790" /><ellipse cx="245" cy="211" rx="35" ry="10" fill="#f7f4e3" /><ellipse cx="245" cy="211" rx="29" ry="7" fill="none" stroke="#68877c" strokeWidth="1.5" /><use href={`#${id}-nigiri`} x="222" y="185" width="47" height="30" /></g>
    </g>}
    <g opacity=".55" fill="none" stroke="#7b5636"><path d="M30 240q28-11 53 1t73 0m-120 7q36-8 57 0M392 246q38-12 72 0t65-2" /><ellipse cx="169" cy="258" rx="11" ry="3" /><ellipse cx="169" cy="258" rx="22" ry="6" strokeOpacity=".5" /></g>
    <g transform="rotate(-8 480 243)"><circle cx="480" cy="243" r="19" fill="#b66144" /><circle cx="480" cy="243" r="15" fill="none" stroke="#efcda0" strokeWidth="1" /><text x="480" y="247" textAnchor="middle" fill="#fff1d3" fontSize="12" fontFamily="Yu Mincho, serif">すし</text></g>
  </svg>;
}
