/**
 * Homeglance HACS panel plugin.
 *
 * Тонкая обёртка: регистрирует custom-element <homeglance-panel>, который
 * Home Assistant грузит как боковую панель. Внутри — полноэкранный iframe
 * с URL'ом запущенного Homeglance-инстанса (Docker / Add-on / standalone).
 *
 * Конфигурация через configuration.yaml → panel_custom.<entry>.config.url.
 *
 * Так Homeglance становится частью HA-сайдбара, при этом сам Next.js-сервер
 * крутится отдельно — никакой single-bundle-сборки, никаких ограничений.
 */
'use strict';

const PLUGIN_VERSION = '0.1.0-alpha.6';

class HomeglancePanel extends HTMLElement {
  // Properties, которые HA проставляет автоматически.
  set hass(value) { this._hass = value; }
  get hass() { return this._hass; }

  set narrow(value) { this._narrow = value; }
  set route(value) { this._route = value; }

  set panel(value) {
    this._panel = value;
    this._render();
  }
  get panel() { return this._panel; }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    const config = (this._panel && this._panel.config) || {};
    const url = config.url;

    if (!url) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; height: 100vh; background: #0a0e1a; color: #e8e9ee;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .wrap { max-width: 540px; margin: 0 auto; padding: 48px 24px; }
          h2 { font-size: 18px; margin: 0 0 12px; }
          p { font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.65); margin: 0 0 12px; }
          code { background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px;
            font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 13px; }
          pre { background: rgba(0,0,0,0.3); padding: 12px 14px; border-radius: 8px;
            overflow-x: auto; font-size: 12px; line-height: 1.5; margin: 12px 0 0; }
        </style>
        <div class="wrap">
          <h2>Homeglance: URL не задан</h2>
          <p>Чтобы плагин показал панель, добавьте URL в <code>configuration.yaml</code>:</p>
          <pre>panel_custom:
  - name: homeglance-panel
    sidebar_title: Homeglance
    sidebar_icon: mdi:view-dashboard-variant
    url_path: homeglance
    module_url: /hacsfiles/homeglance/homeglance.js
    config:
      url: "http://homeassistant.local:3040"</pre>
          <p>Не забудьте перезапустить Home Assistant.</p>
        </div>
      `;
      return;
    }

    // Если уже отрисован iframe с тем же URL — не пересоздавать (не сбрасывать
    // состояние внутри Homeglance: профиль, текущая страница).
    const existing = this.shadowRoot.querySelector('iframe');
    if (existing && existing.dataset.url === url) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; width: 100%; height: 100vh;
          background: #0a0e1a; }
        iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0;
          background: #0a0e1a; }
      </style>
      <iframe
        data-url="${url.replace(/"/g, '&quot;')}"
        src="${url.replace(/"/g, '&quot;')}"
        allow="autoplay; clipboard-read; clipboard-write; fullscreen; geolocation"
        referrerpolicy="strict-origin-when-cross-origin"
        loading="eager"
      ></iframe>
    `;
  }
}

if (!customElements.get('homeglance-panel')) {
  customElements.define('homeglance-panel', HomeglancePanel);
  // eslint-disable-next-line no-console
  console.info(`%cHomeglance%c plugin v${PLUGIN_VERSION}`,
    'background: #0a0e1a; color: #a5b4fc; padding: 2px 6px; border-radius: 4px;',
    'color: rgba(255,255,255,0.5);');
}
