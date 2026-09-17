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
    child: <><circle {...common} cx="12" cy="9" r="4"/><path {...common} d="M5 21a7 7 0 0 1 14 0"/><path {...common} d="M8.5 5.5C9 3.8 10.3 3 12 3s3 .8 3.5 2.5"/></>,
    users: <><circle {...common} cx="9" cy="8" r="3"/><path {...common} d="M3 19a6 6 0 0 1 12 0"/><circle {...common} cx="17" cy="9" r="2.5"/><path {...common} d="M15 15.5a5 5 0 0 1 6 3.5"/></>,
    teacher: <><circle {...common} cx="8" cy="7" r="3"/><path {...common} d="M2.5 18a5.5 5.5 0 0 1 11 0"/><path {...common} d="M14 5h7v9h-7zM16 8h3M16 11h2"/></>,
    login: <><path {...common} d="M10 5H5v14h5"/><path {...common} d="M13 8l4 4-4 4M8 12h9"/></>,
    logout: <><path {...common} d="M14 5h5v14h-5"/><path {...common} d="m11 8-4 4 4 4M16 12H7"/></>,
    arrow: <path {...common} d="m14 7-5 5 5 5"/>,
    mosque: <><path {...common} d="M6 21V10h12v11M4 21h16M9 10V7.5A3 3 0 0 1 12 5a3 3 0 0 1 3 2.5V10"/><path {...common} d="M3 21V9M21 21V9M2 9h2M20 9h2M12 5V2M10.5 3.5h3"/></>,
    sparkle: <><path {...common} d="M12 2l1.3 4.2L17 8l-3.7 1.8L12 14l-1.3-4.2L7 8l3.7-1.8z"/><path {...common} d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z"/></>,
    brain: <><path {...common} d="M9.3 4.2A3 3 0 0 0 5 7a3.2 3.2 0 0 0-1 6 3.4 3.4 0 0 0 4 5.2"/><path {...common} d="M14.7 4.2A3 3 0 0 1 19 7a3.2 3.2 0 0 1 1 6 3.4 3.4 0 0 1-4 5.2M12 3v18M8 8.5c1.2 0 2 .7 2 1.8M16 8.5c-1.2 0-2 .7-2 1.8M8 14c1.2 0 2-.7 2-1.8M16 14c-1.2 0-2-.7-2-1.8"/></>,
    puzzle: <><path {...common} d="M4 4h6v3a2 2 0 1 0 4 0V4h6v6h-3a2 2 0 1 0 0 4h3v6h-6v-3a2 2 0 1 0-4 0v3H4v-6h3a2 2 0 1 0 0-4H4z"/></>,
    bolt: <path {...common} d="M13.5 2 5 13h6l-.5 9L19 10h-6z"/>,
    flame: <path {...common} d="M12 22c4 0 7-2.8 7-6.7 0-3.3-2.1-5.2-4.1-7.2-.3 2.4-1.7 3.5-2.9 4.2.1-4-2.3-6.8-4.2-8.3.1 3.6-2.8 5.7-2.8 9.5C5 18.4 8 22 12 22Z"/>,
    lock: <><rect {...common} x="5" y="10" width="14" height="11" rx="2"/><path {...common} d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    medal: <><circle {...common} cx="12" cy="14" r="5"/><path {...common} d="m8.5 10-3-7h4L12 8l2.5-5h4l-3 7M10 14l1.3 1.2L14 12.5"/></>,
    check: <path {...common} d="m5 12.5 4.3 4.3L19 7"/>,
    circleCheck: <><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="m7.5 12.5 3 3 6-7"/></>,
    search: <><circle {...common} cx="10.5" cy="10.5" r="6.5"/><path {...common} d="m15.5 15.5 5 5"/></>,
    copy: <><rect {...common} x="8" y="8" width="11" height="11" rx="2"/><path {...common} d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    books: <><path {...common} d="M4 4h4v16H4zM10 6h4v14h-4zM16 3h4v17h-4z"/><path {...common} d="M4 8h4M10 10h4M16 7h4"/></>,
    chart: <><path {...common} d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18"/></>,
    clock: <><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="M12 7v5l3 2"/></>,
    shield: <><path {...common} d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6z"/><path {...common} d="m8.5 12 2.2 2.2 4.8-5"/></>,
    rocket: <><path {...common} d="M14 4c2-1 4-1 6-1 0 2 0 4-1 6l-6 6-4-4z"/><path {...common} d="M9 11 5 10 2 13l5 2M13 15l1 4-3 3-2-5M15.5 7.5h.01"/></>,
    lightbulb: <><path {...common} d="M9 18h6M9.5 21h5"/><path {...common} d="M8 14.5a6 6 0 1 1 8 0c-.8.7-1 1.5-1 2.5H9c0-1-.2-1.8-1-2.5Z"/></>,
    list: <><path {...common} d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></>,
    menu: <><path {...common} d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path {...common} d="m6 6 12 12M18 6 6 18"/></>,
  }[name] || <circle {...common} cx="12" cy="12" r="8"/>;

  return <svg {...props}>{title ? <title>{title}</title> : null}{content}</svg>;
}
