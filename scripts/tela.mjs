// Prepara um DOM e roda o teste de tela já empacotado.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import('../.tela/tela.js');
