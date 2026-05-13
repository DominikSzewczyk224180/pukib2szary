/* PUKiB Admin Panel
   Edytowalne ceny, strefy i PDF formularza.
   Konfiguracja zapisywana w localStorage. Eksport do JSON dla wdrożenia. */
(function () {
  'use strict';

  const STORAGE_KEY = 'pukib_admin_config_v1';
  const SESSION_KEY = 'pukib_admin_session_v1';
  const PRICE_MODE_KEY = 'pukib_price_mode_v1';
  const ADMIN_PASSWORD = 'pukib2026@';
  const VAT_RATE = 0.08;

  // Pełna domyślna konfiguracja, zsynchronizowana z HTML
  const DEFAULT_CONFIG = {
    prices: {
      'gruz-7':  { value: 900,  label: 'Gruz · KP 7' },
      'mix-7':   { value: 1300, label: 'Odpady budowlane zmieszane · KP 7' },
      'mix-10':  { value: 1800, label: 'Odpady budowlane zmieszane · KP 10' },
      'mix-36':  { value: 3700, label: 'Odpady budowlane zmieszane · KP 36' },
      'rent-daily': { value: 25, label: 'Dzierżawa kontenera / dzień (powyżej 5 dni)' },
      'budowlane-segregacja-1': { value: 1200, label: 'Odpady budowlane do segregacji, do 1 Mg' },
      'budowlane-segregacja-n': { value: 1000, label: 'Odpady budowlane do segregacji, każda kolejna Mg' },
      'wielkogabarytowe-1':     { value: 1200, label: 'Odpady wielkogabarytowe, do 1 Mg' },
      'wielkogabarytowe-n':     { value: 1100, label: 'Odpady wielkogabarytowe, każda kolejna Mg' },
      'materialy-izolacyjne':   { value: 'do uzgodnienia', label: 'Materiały izolacyjne (styropian, wełna mineralna)' },
      'papa':                   { value: 'do uzgodnienia', label: 'Papa' },
      'pozostale':              { value: 'Indywidualna wycena', label: 'Pozostałe odpady (makulatura, tworzywa, szkło)' },
    },
    zones: {
      strefa1: {
        name: 'Strefa I',
        price: 100,
        cities: ['Jastrzębie-Zdrój','Mszana','Godów','Gorzyce','Świerklany','Wodzisław Śląski','Pawłowice','Rybnik','Żory','Suszec','Strumień','Zebrzydowice','Hażlach'],
      },
      strefa2: {
        name: 'Strefa II',
        price: 200,
        cities: ['Hażlach','Dębowiec','Skoczów','Chybie','Pszczyna','Goczałkowice-Zdrój','Orzesze','Radlin','Knurów','Czerwionka-Leszczyny','Pszów','Pilchowice','Gierałtowice'],
      },
      strefa3: {
        name: 'Strefa III',
        price: 300,
        cities: ['Cieszyn','Goleszów','Ustroń','Jasienica','Czechowice-Dziedzice','Bielsko-Biała','Miedźna','Bojszowy','Kobiór','Gliwice','Tychy','Mikołów','Ruda Śląska','Zabrze','Kornowac','Racibórz','Krzanowice','Nędza','Bieruń','Lędziny','Mysłowice','Wyry'],
      },
      strefa4: {
        name: 'Strefa IV',
        price: 400,
        cities: ['Katowice'],
      },
    },
    pdf: null, // jeśli ustawione: { name: 'filename.pdf', dataUrl: 'data:application/pdf;base64,...' }
  };

  /* ===== KONFIG, ŁADOWANIE I ZAPIS ===== */

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function mergeConfig(saved) {
    // Łączy zapisaną konfigurację z domyślną, żeby nowe pola dodane w kodzie się pojawiły
    const result = deepClone(DEFAULT_CONFIG);
    if (!saved) return result;
    if (saved.prices) {
      Object.keys(saved.prices).forEach(k => {
        if (result.prices[k]) result.prices[k].value = saved.prices[k].value;
      });
    }
    if (saved.zones) {
      Object.keys(saved.zones).forEach(k => {
        if (result.zones[k]) {
          if (saved.zones[k].name)  result.zones[k].name = saved.zones[k].name;
          if (saved.zones[k].price !== undefined) result.zones[k].price = saved.zones[k].price;
          if (Array.isArray(saved.zones[k].cities)) result.zones[k].cities = saved.zones[k].cities.slice();
        }
      });
    }
    if (saved.pdf && saved.pdf.dataUrl) result.pdf = saved.pdf;
    return result;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return mergeConfig(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.error('PUKiB admin: nie udało się odczytać konfiguracji', e);
      return deepClone(DEFAULT_CONFIG);
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (e) {
      alert('Zapis konfiguracji nie powiódł się: ' + (e && e.message ? e.message : e));
      return false;
    }
  }

  // Eksponuj konfigurację globalnie, żeby main.js mógł z niej skorzystać
  window.PUKiB_CONFIG = loadConfig();

  /* ===== FORMATERY ===== */

  const fmtNum = (n) => new Intl.NumberFormat('pl-PL').format(n);

  function formatPrice(price, suffix) {
    // price.value może być liczbą lub stringiem
    if (typeof price.value === 'number') {
      return fmtNum(price.value) + ' zł' + (suffix || '');
    }
    return String(price.value);
  }

  /* ===== TRYB CEN NETTO / BRUTTO ===== */

  function getPriceMode() {
    return localStorage.getItem(PRICE_MODE_KEY) === 'brutto' ? 'brutto' : 'netto';
  }

  function setPriceMode(mode) {
    if (mode !== 'netto' && mode !== 'brutto') return;
    localStorage.setItem(PRICE_MODE_KEY, mode);
    applyConfig();
  }

  /* ===== STOSOWANIE KONFIGURACJI DO DOM ===== */

  function applyConfig() {
    const cfg = window.PUKiB_CONFIG;
    const mode = getPriceMode();
    const factor = mode === 'brutto' ? (1 + VAT_RATE) : 1;

    // Ceny ogólne
    document.querySelectorAll('[data-pukib-price]').forEach(el => {
      const key = el.dataset.pukibPrice;
      const price = cfg.prices[key];
      if (!price) return;
      const suffix = el.dataset.pukibSuffix || '';
      if (typeof price.value === 'number') {
        const v = Math.round(price.value * factor);
        el.textContent = fmtNum(v) + ' zł' + suffix;
      } else {
        el.textContent = String(price.value);
      }
    });

    // Nagłówki kolumn cen, klikalne
    document.querySelectorAll('[data-pukib-price-header]').forEach(el => {
      const isBrutto = mode === 'brutto';
      el.innerHTML = (isBrutto ? 'Cena brutto' : 'Cena netto') +
        ' <span class="price-header-mode" aria-hidden="true">' +
        (isBrutto ? '(z VAT)' : '') + '</span>' +
        '<span class="price-header-swap" aria-hidden="true">⇄</span>';
      el.title = isBrutto ? 'Przełącz na ceny netto' : 'Przełącz na ceny brutto (z VAT 8%)';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
    });

    // Ceny stref
    document.querySelectorAll('[data-pukib-zone-price]').forEach(el => {
      const key = el.dataset.pukibZonePrice;
      const zone = cfg.zones[key];
      if (!zone) return;
      el.textContent = fmtNum(zone.price) + ' zł';
    });

    // Nazwy stref
    document.querySelectorAll('[data-pukib-zone-name]').forEach(el => {
      const key = el.dataset.pukibZoneName;
      const zone = cfg.zones[key];
      if (!zone) return;
      const isUpper = el.textContent === el.textContent.toUpperCase() && el.textContent.length > 0;
      el.textContent = isUpper ? zone.name.toUpperCase() : zone.name;
    });

    // Miasta stref (zone-cities, lista <span>)
    document.querySelectorAll('[data-pukib-zone-cities]').forEach(el => {
      const key = el.dataset.pukibZoneCities;
      const zone = cfg.zones[key];
      if (!zone) return;
      el.innerHTML = zone.cities.map(c => `<span>${escapeHtml(c)}</span>`).join('');
    });

    // PDF formularz
    document.querySelectorAll('[data-pukib-pdf]').forEach(el => {
      if (cfg.pdf && cfg.pdf.dataUrl) {
        el.setAttribute('href', cfg.pdf.dataUrl);
        el.setAttribute('download', cfg.pdf.name || 'formularz-zamowienia.pdf');
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ===== UI PANELU ADMINA ===== */

  let modalEl = null;

  function buildModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'admin-modal';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="admin-overlay" data-admin-close></div>
      <div class="admin-shell" role="dialog" aria-label="Panel administratora">
        <button class="admin-close-x" data-admin-close aria-label="Zamknij">×</button>

        <div class="admin-login" data-admin-screen="login">
          <div class="admin-kicker">/ Tylko dla administratora</div>
          <h2 class="admin-h">Panel <em>admina</em>.</h2>
          <p class="admin-intro">Edycja cen, stref i formularza PDF. Wymagane hasło.</p>
          <form class="admin-login-form" data-admin-login-form>
            <label class="admin-field">
              <span>Hasło</span>
              <input type="password" data-admin-pw autocomplete="current-password" required>
            </label>
            <button type="submit" class="admin-btn admin-btn-primary">Zaloguj</button>
          </form>
          <p class="admin-error" data-admin-error hidden>Nieprawidłowe hasło.</p>
        </div>

        <div class="admin-content" data-admin-screen="content" hidden>
          <div class="admin-kicker">/ Panel administratora</div>
          <h2 class="admin-h">Panel <em>admina</em>.</h2>

          <div class="admin-tabs" role="tablist">
            <button data-admin-tab="prices" class="active" role="tab">Ceny</button>
            <button data-admin-tab="zones" role="tab">Strefy</button>
            <button data-admin-tab="pdf" role="tab">Formularz PDF</button>
            <button data-admin-tab="data" role="tab">Dane</button>
          </div>

          <div class="admin-panel" data-admin-panel="prices"></div>
          <div class="admin-panel" data-admin-panel="zones" hidden></div>
          <div class="admin-panel" data-admin-panel="pdf" hidden></div>
          <div class="admin-panel" data-admin-panel="data" hidden></div>

          <div class="admin-status" data-admin-status></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Zamykanie
    modalEl.querySelectorAll('[data-admin-close]').forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) closeModal();
    });

    // Login form
    const loginForm = modalEl.querySelector('[data-admin-login-form]');
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = modalEl.querySelector('[data-admin-pw]').value;
      if (pw === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        showContent();
      } else {
        const err = modalEl.querySelector('[data-admin-error]');
        err.hidden = false;
        setTimeout(() => { err.hidden = true; }, 3000);
      }
    });

    // Taby
    modalEl.querySelectorAll('[data-admin-tab]').forEach(t => {
      t.addEventListener('click', () => {
        const name = t.dataset.adminTab;
        modalEl.querySelectorAll('[data-admin-tab]').forEach(x => x.classList.toggle('active', x === t));
        modalEl.querySelectorAll('[data-admin-panel]').forEach(p => {
          p.hidden = p.dataset.adminPanel !== name;
        });
      });
    });

    return modalEl;
  }

  function openModal() {
    const m = buildModal();
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      showContent();
    } else {
      showLogin();
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showLogin() {
    modalEl.querySelector('[data-admin-screen="login"]').hidden = false;
    modalEl.querySelector('[data-admin-screen="content"]').hidden = true;
    setTimeout(() => modalEl.querySelector('[data-admin-pw]').focus(), 50);
  }

  function showContent() {
    modalEl.querySelector('[data-admin-screen="login"]').hidden = true;
    modalEl.querySelector('[data-admin-screen="content"]').hidden = false;
    renderPanels();
  }

  /* ===== RENDEROWANIE PANELI ===== */

  function renderPanels() {
    renderPricesPanel();
    renderZonesPanel();
    renderPdfPanel();
    renderDataPanel();
  }

  function renderPricesPanel() {
    const root = modalEl.querySelector('[data-admin-panel="prices"]');
    const cfg = window.PUKiB_CONFIG;
    const rows = Object.keys(cfg.prices).map(key => {
      const p = cfg.prices[key];
      const val = p.value;
      const isText = typeof val !== 'number';
      return `
        <div class="admin-row">
          <label class="admin-row-label">${escapeHtml(p.label)}</label>
          <div class="admin-row-input">
            <input type="text" data-price-key="${key}" value="${escapeHtml(String(val))}">
            <span class="admin-input-hint">${isText ? 'tekst (np. „do uzgodnienia")' : 'liczba w zł (np. 900)'}</span>
          </div>
        </div>
      `;
    }).join('');
    root.innerHTML = `
      <p class="admin-panel-intro">Wpisz liczbę (cena w złotych) lub tekst (np. „do uzgodnienia"). Zmiany pojawiają się na stronie po zapisaniu.</p>
      <div class="admin-rows">${rows}</div>
      <div class="admin-actions">
        <button class="admin-btn admin-btn-primary" data-save-prices>Zapisz ceny</button>
      </div>
    `;
    root.querySelector('[data-save-prices]').addEventListener('click', savePrices);
  }

  function savePrices() {
    const root = modalEl.querySelector('[data-admin-panel="prices"]');
    const cfg = window.PUKiB_CONFIG;
    root.querySelectorAll('[data-price-key]').forEach(input => {
      const key = input.dataset.priceKey;
      const raw = input.value.trim();
      const asNum = Number(raw.replace(/\s/g, '').replace(',', '.'));
      if (raw !== '' && !isNaN(asNum) && /^[\d\s.,]+$/.test(raw)) {
        cfg.prices[key].value = asNum;
      } else {
        cfg.prices[key].value = raw;
      }
    });
    if (saveConfig(cfg)) {
      applyConfig();
      flashStatus('Ceny zapisane. Strona zaktualizowana.');
    }
  }

  function renderZonesPanel() {
    const root = modalEl.querySelector('[data-admin-panel="zones"]');
    const cfg = window.PUKiB_CONFIG;
    const zoneIds = Object.keys(cfg.zones);
    const cards = zoneIds.map(zid => {
      const z = cfg.zones[zid];
      return `
        <div class="admin-zone-card" data-zone-id="${zid}">
          <div class="admin-zone-head">
            <strong>${escapeHtml(zid).toUpperCase()}</strong>
          </div>
          <div class="admin-row">
            <label class="admin-row-label">Nazwa</label>
            <div class="admin-row-input">
              <input type="text" data-zone-field="name" value="${escapeHtml(z.name)}">
            </div>
          </div>
          <div class="admin-row">
            <label class="admin-row-label">Cena netto (zł)</label>
            <div class="admin-row-input">
              <input type="number" data-zone-field="price" value="${z.price}" min="0" step="10">
            </div>
          </div>
          <div class="admin-row">
            <label class="admin-row-label">Miasta (jedno w wierszu)</label>
            <div class="admin-row-input">
              <textarea data-zone-field="cities" rows="8">${escapeHtml(z.cities.join('\n'))}</textarea>
            </div>
          </div>
        </div>
      `;
    }).join('');
    root.innerHTML = `
      <p class="admin-panel-intro">Każda strefa ma nazwę, cenę transportu i listę miast (jedno miasto w wierszu).</p>
      <div class="admin-zones-grid">${cards}</div>
      <div class="admin-actions">
        <button class="admin-btn admin-btn-primary" data-save-zones>Zapisz strefy</button>
      </div>
    `;
    root.querySelector('[data-save-zones]').addEventListener('click', saveZones);
  }

  function saveZones() {
    const root = modalEl.querySelector('[data-admin-panel="zones"]');
    const cfg = window.PUKiB_CONFIG;
    root.querySelectorAll('[data-zone-id]').forEach(card => {
      const zid = card.dataset.zoneId;
      const z = cfg.zones[zid];
      const name = card.querySelector('[data-zone-field="name"]').value.trim();
      const price = Number(card.querySelector('[data-zone-field="price"]').value);
      const citiesText = card.querySelector('[data-zone-field="cities"]').value;
      const cities = citiesText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (name) z.name = name;
      if (!isNaN(price)) z.price = price;
      z.cities = cities;
    });
    if (saveConfig(cfg)) {
      applyConfig();
      flashStatus('Strefy zapisane. Strona zaktualizowana.');
    }
  }

  function renderPdfPanel() {
    const root = modalEl.querySelector('[data-admin-panel="pdf"]');
    const cfg = window.PUKiB_CONFIG;
    const current = cfg.pdf
      ? `Aktualny przesłany plik: <strong>${escapeHtml(cfg.pdf.name)}</strong> (${Math.round(cfg.pdf.dataUrl.length / 1024)} KB)`
      : 'Używany jest domyślny formularz: <strong>assets/forms/formularz-zamowienia.pdf</strong>';
    root.innerHTML = `
      <p class="admin-panel-intro">Wgraj nowy plik PDF, który zastąpi domyślny formularz do pobrania.</p>
      <p class="admin-current">${current}</p>
      <div class="admin-pdf-actions">
        <label class="admin-btn admin-btn-secondary">
          Wybierz plik PDF
          <input type="file" accept="application/pdf,.pdf" data-pdf-upload hidden>
        </label>
        ${cfg.pdf ? '<button class="admin-btn admin-btn-ghost" data-pdf-reset>Przywróć domyślny PDF</button>' : ''}
      </div>
      <p class="admin-warn">Uwaga: plik jest przechowywany lokalnie w przeglądarce (limit ~5 MB). Dla wdrożenia produkcyjnego pobierz konfigurację z zakładki „Dane" i zapisz plik PDF na serwerze.</p>
    `;
    root.querySelector('[data-pdf-upload]').addEventListener('change', uploadPdf);
    const reset = root.querySelector('[data-pdf-reset]');
    if (reset) reset.addEventListener('click', resetPdf);
  }

  function uploadPdf(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Plik musi być w formacie PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Plik za duży, maksymalnie 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const cfg = window.PUKiB_CONFIG;
      cfg.pdf = { name: file.name, dataUrl: reader.result };
      if (saveConfig(cfg)) {
        applyConfig();
        renderPdfPanel();
        flashStatus('Nowy PDF zapisany i podpięty pod przycisk pobierania.');
      }
    };
    reader.readAsDataURL(file);
  }

  function resetPdf() {
    const cfg = window.PUKiB_CONFIG;
    cfg.pdf = null;
    if (saveConfig(cfg)) {
      // Przywróć oryginalny href
      document.querySelectorAll('[data-pukib-pdf]').forEach(el => {
        el.setAttribute('href', 'assets/forms/formularz-zamowienia.pdf');
        el.setAttribute('download', 'formularz-zamowienia.pdf');
      });
      renderPdfPanel();
      flashStatus('Przywrócono domyślny formularz PDF.');
    }
  }

  function renderDataPanel() {
    const root = modalEl.querySelector('[data-admin-panel="data"]');
    root.innerHTML = `
      <p class="admin-panel-intro">Eksportuj konfigurację, żeby zachować zmiany lub wgraj wcześniej zapisany plik.</p>
      <div class="admin-data-actions">
        <button class="admin-btn admin-btn-secondary" data-export>Pobierz konfigurację (JSON)</button>
        <label class="admin-btn admin-btn-secondary">
          Wgraj konfigurację (JSON)
          <input type="file" accept="application/json,.json" data-import hidden>
        </label>
        <button class="admin-btn admin-btn-ghost" data-reset>Reset do domyślnych</button>
        <button class="admin-btn admin-btn-ghost" data-logout>Wyloguj</button>
      </div>
      <p class="admin-warn">Zmiany trzymane są w przeglądarce admina (localStorage). Żeby były widoczne dla wszystkich odwiedzających serwis, wyeksportuj konfigurację i wgraj plik na serwer (lub przekaż deweloperowi do umieszczenia w repozytorium).</p>
    `;
    root.querySelector('[data-export]').addEventListener('click', exportConfig);
    root.querySelector('[data-import]').addEventListener('change', importConfig);
    root.querySelector('[data-reset]').addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz przywrócić wszystkie domyślne wartości? Zmiany cen, stref i PDF zostaną usunięte.')) {
        localStorage.removeItem(STORAGE_KEY);
        window.PUKiB_CONFIG = loadConfig();
        applyConfig();
        renderPanels();
        flashStatus('Konfiguracja przywrócona do domyślnych.');
      }
    });
    root.querySelector('[data-logout]').addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      closeModal();
    });
  }

  function exportConfig() {
    const cfg = window.PUKiB_CONFIG;
    // Wersja eksportowa bez PDF (PDF eksportujemy oddzielnie, jest osobnym plikiem)
    const exportData = {
      prices: Object.fromEntries(Object.entries(cfg.prices).map(([k, v]) => [k, { value: v.value }])),
      zones: Object.fromEntries(Object.entries(cfg.zones).map(([k, v]) => [k, { name: v.name, price: v.price, cities: v.cities }])),
      pdf_info: cfg.pdf ? { name: cfg.pdf.name, note: 'Plik PDF zapisany lokalnie, zapisz osobno na serwer.' } : null,
      _meta: { exported_at: new Date().toISOString(), version: 'v1' },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pukib-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashStatus('Konfiguracja pobrana jako JSON.');
  }

  function importConfig(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        // Scal z istniejącym, ostrożnie
        const cfg = window.PUKiB_CONFIG;
        if (data.prices) {
          Object.keys(data.prices).forEach(k => {
            if (cfg.prices[k] && data.prices[k] && data.prices[k].value !== undefined) {
              cfg.prices[k].value = data.prices[k].value;
            }
          });
        }
        if (data.zones) {
          Object.keys(data.zones).forEach(k => {
            if (cfg.zones[k] && data.zones[k]) {
              if (data.zones[k].name) cfg.zones[k].name = data.zones[k].name;
              if (typeof data.zones[k].price === 'number') cfg.zones[k].price = data.zones[k].price;
              if (Array.isArray(data.zones[k].cities)) cfg.zones[k].cities = data.zones[k].cities.slice();
            }
          });
        }
        if (saveConfig(cfg)) {
          applyConfig();
          renderPanels();
          flashStatus('Konfiguracja wgrana i zastosowana.');
        }
      } catch (err) {
        alert('Nieprawidłowy plik JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function flashStatus(msg) {
    const el = modalEl.querySelector('[data-admin-status]');
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(flashStatus._t);
    flashStatus._t = setTimeout(() => el.classList.remove('visible'), 3500);
  }

  /* ===== INICJALIZACJA ===== */

  function init() {
    applyConfig();
    document.querySelectorAll('[data-admin-trigger]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
    });
    // Klik w nagłówek "Cena netto / brutto" przełącza tryb wszystkich tabel
    document.querySelectorAll('[data-pukib-price-header]').forEach(el => {
      const toggle = () => {
        const current = getPriceMode();
        setPriceMode(current === 'brutto' ? 'netto' : 'brutto');
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
