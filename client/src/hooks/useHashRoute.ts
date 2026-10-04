import { useEffect, useLayoutEffect, useState } from 'react';

interface Route {
  path: string;
  query: string;
  key: string;
  restore?: { y: number; selector: string };
}
const positions = new Map<string, { y: number; selector: string }>();
function activeSelector() {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return '';
  if (element.id) return `#${CSS.escape(element.id)}`;
  for (const name of ['data-wish', 'data-add']) {
    const value = element.getAttribute(name);
    if (value) return `[${name}="${CSS.escape(value)}"]`;
  }
  const href = element.getAttribute('href');
  return href ? `a[href="${CSS.escape(href)}"]` : '';
}
function readRoute(): Route {
  const [path = '/', query = ''] = (window.location.hash.slice(1) || '/').split('?');
  const key =
    typeof history.state?.storeKey === 'string'
      ? (history.state.storeKey as string)
      : crypto.randomUUID();
  history.replaceState({ ...history.state, storeKey: key }, '', window.location.hash || '#/');
  return { path, query, key };
}
export function useHashRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    let currentKey = route.key;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const navigate = () => {
      positions.set(currentKey, {
        y: window.scrollY,
        selector: activeSelector(),
      });
      const next = readRoute();
      next.restore = positions.get(next.key);
      currentKey = next.key;
      setRoute(next);
    };
    window.addEventListener('hashchange', navigate);
    return () => {
      window.removeEventListener('hashchange', navigate);
      history.scrollRestoration = previousRestoration;
    };
  }, []);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const focus = route.restore?.selector
        ? document.querySelector<HTMLElement>(route.restore.selector)
        : null;
      (focus ?? document.getElementById('main-content'))?.focus({
        preventScroll: true,
      });
      window.scrollTo({ top: route.restore?.y ?? 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [route.key]);
  function replaceQuery(query: string) {
    history.replaceState(history.state, '', `#${route.path}${query ? `?${query}` : ''}`);
    setRoute((current) => ({ ...current, query }));
  }
  return { ...route, replaceQuery };
}
