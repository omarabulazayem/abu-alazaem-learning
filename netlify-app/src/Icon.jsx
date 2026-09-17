import React from "react";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export default function Icon({ name, size = 28, className = "", title }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", className, role: title ? "img" : "presentation", "aria-hidden": title ? undefined : true };
  const content = {
    home: <><path {...common} d="M3 10.7 12 3l9 7.7"/><path {...common} d="M5.5 9.7V21h13V9.7"/><path {...common} d="M9.5 21v-6h5v6"/></>,
    quran: <><path {...common} d="M4 5.5C7.2 4.1 9.7 4.7 12 7v13c-2.3-2.2-4.8-2.8-8-1.4z"/><path {...common} d="M20 5.5c-3.2-1.4-5.7-.8-8 1.5v13c2.3-2.2 4.8-2.8 8-1.4z"/><path {...common} d="M8 8.5h2M14 8.5h2"/></>,
    star: <path {...common} d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>,
    review: <><path {...common} d="M20 7v5h-5"/><path {...common} d="M19 12a7 7 0 1 1-2-5"/></>,
    game: <><path {...common} d="M7.2 8h9.6a4.2 4.2 0 0 1 4 5.5l-1.2 3.6a2.3 2.3 0 0 1-3.7 1l-1.7-1.4H9.8l-1.7 1.4a2.3 2.3 0 0 1-3.7-1l-1.2-3.6A4.2 4.2 0 0 1 7.2 8Z"/><path {...common} d="M8 11v4M6 13h4M16.5 12h.01M18.5 14h.01"/></>,
    trophy: <><path {...common} d="M8 4h8v4a4 4 0 0 1-8 0z"/><path {...common} d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></>,
    target: <><circle {...common} cx="12" cy="12" r="8"/><circle {...common} cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></>,
    board: <><rect {...common} x="3" y="4" width="18" height="13" rx="2"/><path {...common} d="M8 21h8M12 17v4M7 8h4M7 12h7"/></>,
    room: <><path {...common} d="m3 11 9-7 9 7"/><path {...common} d="M5 10v10h14V10"/><path {...common} d="M9 20v-6h6v6"/></>,
    gift: <><rect {...common} x="3" y="9" width="18" height="11" rx="2"/><path {...common} d="M12 9v11M3 13h18M12 9H8.2A2.2 2.2 0 1 1 10 5.5c1 1.1 2 3.5 2 3.5ZM12 9h3.8A2.2 2.2 0 1 0 14 5.5c-1 1.1-2 3.5-2 3.5Z"/></>,
    user: <><circle {...common} cx="12" cy="8" r="4"/><path {...common} d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    teacher: <><circle {...common} cx="8" cy="7" r="3"/><path {...common} d="M2.5 18a5.5 5.5 0 0 1 11 0"/><path {...common} d="M14 5h7v9h-7zM16 8h3M16 11h2"/></>,
    login: <><path {...common} d="M10 5H5v14h5"/><path {...common} d="M13 8l4 4-4 4M8 12h9"/></>,
    logout: <><path {...common} d="M14 5h5v14h-5"/><path {...common} d="m11 8-4 4 4 4M16 12H7"/></>,
    arrow: <path {...common} d="m14 7-5 5 5 5"/>,
    mosque: <><path {...common} d="M6 21V10h12v11M4 21h16M9 10V7.5A3 3 0 0 1 12 5a3 3 0 0 1 3 2.5V10"/><path {...common} d="M3 21V9M21 21V9M2 9h2M20 9h2M12 5V2M10.5 3.5h3"/></>,
    sparkle: <><path {...common} d="M12 2l1.3 4.2L17 8l-3.7 1.8L12 14l-1.3-4.2L7 8l3.7-1.8z"/><path {...common} d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z"/></>,
    menu: <><path {...common} d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path {...common} d="m6 6 12 12M18 6 6 18"/></>,
  }[name] || <circle {...common} cx="12" cy="12" r="8"/>;

  return <svg {...props}>{title ? <title>{title}</title> : null}{content}</svg>;
}
