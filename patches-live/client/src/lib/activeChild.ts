const ACTIVE_CHILD_KEY = "abu-alazaem-active-child";
const ACTIVE_CHILD_EVENT = "abu-alazaem-active-child-change";

export function getActiveChildId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_CHILD_KEY);
}

export function setActiveChildId(childId: string | null) {
  if (typeof window === "undefined") return;
  if (childId) window.localStorage.setItem(ACTIVE_CHILD_KEY, childId);
  else window.localStorage.removeItem(ACTIVE_CHILD_KEY);
  window.dispatchEvent(new CustomEvent(ACTIVE_CHILD_EVENT));
}

export function onActiveChildChange(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const storage = (event: StorageEvent) => {
    if (event.key === ACTIVE_CHILD_KEY) callback();
  };
  const custom = () => callback();
  window.addEventListener("storage", storage);
  window.addEventListener(ACTIVE_CHILD_EVENT, custom);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(ACTIVE_CHILD_EVENT, custom);
  };
}
