#!/usr/bin/env node
/**
 * Generate de/fr/ja locale bundles from the English source (PLAN Section 21 /
 * 44). Translations are machine-generated and committed; there is no runtime
 * translation API.
 *
 * Strategy, in priority order per key:
 *   1. A curated override (stable, human-checked strings for the visible UI).
 *   2. Google Translate's free endpoint (best-effort; no key required).
 *   3. The English source string (guarantees key parity even offline).
 *
 * Because the overrides currently cover every source key, the bundles are
 * deterministic and network-independent; the machine path exists for any keys
 * added later. Quality caveat: machine-generated copy is illustrative only.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(HERE, '../src/i18n/locales');
const TARGETS = ['de', 'fr', 'ja'];

/** Curated, human-checked translations for the visible UI surface. */
const OVERRIDES = {
  de: {
    'app.title': 'Meridian Bank',
    'app.subtitle': 'Kunden-Bestandsübersicht',
    'banner.simulation': 'Nur Simulation — keine echten Transaktionen oder Anlageberatung.',
    'nav.home': 'Start',
    'nav.holdings': 'Bestände',
    'nav.transactions': 'Transaktionen',
    'nav.timeline': 'Zeitleiste',
    'nav.audit': 'Prüfpfad',
    'nav.graph': 'Graph',
    'nav.defi': 'DeFi',
    'nav.library': 'Bibliothek',
    'nav.styleguide': 'Styleguide',
    'language.label': 'Sprache',
    'language.en': 'Englisch',
    'language.de': 'Deutsch',
    'language.fr': 'Französisch',
    'language.ja': 'Japanisch',
    'home.heading': 'Kunden-Bestandsübersicht',
    'home.intro':
      'Wählen oder erstellen Sie eine Simulationssitzung, um Bestände, Zahlungen und Kontrollen über traditionelle und digitale Netzwerke hinweg zu erkunden.',
    'prices.live': 'Live-Preise',
    'prices.deterministic': 'Deterministische Preise',
    'prices.liveFailed': 'Live-Preise nicht verfügbar — deterministische Werte werden verwendet.',
  },
  fr: {
    'app.title': 'Meridian Bank',
    'app.subtitle': 'Hub des avoirs clients',
    'banner.simulation':
      'Simulation uniquement — aucune transaction réelle ni conseil en investissement.',
    'nav.home': 'Accueil',
    'nav.holdings': 'Avoirs',
    'nav.transactions': 'Transactions',
    'nav.timeline': 'Chronologie',
    'nav.audit': 'Audit',
    'nav.graph': 'Graphe',
    'nav.defi': 'DeFi',
    'nav.library': 'Bibliothèque',
    'nav.styleguide': 'Styleguide',
    'language.label': 'Langue',
    'language.en': 'Anglais',
    'language.de': 'Allemand',
    'language.fr': 'Français',
    'language.ja': 'Japonais',
    'home.heading': 'Hub des avoirs clients',
    'home.intro':
      'Sélectionnez ou créez une session de simulation pour explorer les avoirs, les paiements et les contrôles sur les réseaux traditionnels et numériques.',
    'prices.live': 'Prix en direct',
    'prices.deterministic': 'Prix déterministes',
    'prices.liveFailed': 'Prix en direct indisponibles — utilisation de valeurs déterministes.',
  },
  ja: {
    'app.title': 'Meridian Bank',
    'app.subtitle': '顧客保有資産ハブ',
    'banner.simulation': 'シミュレーションのみ — 実際の取引や投資助言はありません。',
    'nav.home': 'ホーム',
    'nav.holdings': '保有資産',
    'nav.transactions': '取引',
    'nav.timeline': 'タイムライン',
    'nav.audit': '監査',
    'nav.graph': 'グラフ',
    'nav.defi': 'DeFi',
    'nav.library': 'ライブラリ',
    'nav.styleguide': 'スタイルガイド',
    'language.label': '言語',
    'language.en': '英語',
    'language.de': 'ドイツ語',
    'language.fr': 'フランス語',
    'language.ja': '日本語',
    'home.heading': '顧客保有資産ハブ',
    'home.intro':
      'シミュレーションセッションを選択または作成して、従来型およびデジタルネットワーク全体の保有資産、支払い、コントロールを確認します。',
    'prices.live': 'ライブ価格',
    'prices.deterministic': '確定的価格',
    'prices.liveFailed': 'ライブ価格を利用できません — 確定的な値を使用します。',
  },
};

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = value;
      else node = node[part] ??= {};
    });
  }
  return out;
}

/** Best-effort machine translation via Google Translate's free endpoint. */
async function machineTranslate(text, target) {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
      encodeURIComponent(target) +
      '&dt=t&q=' +
      encodeURIComponent(text);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.[0];
    if (!Array.isArray(parts)) return null;
    return parts.map((p) => p?.[0] ?? '').join('');
  } catch {
    return null;
  }
}

async function build() {
  const en = JSON.parse(await readFile(resolve(LOCALES_DIR, 'en.json'), 'utf8'));
  const flatEn = flatten(en);
  await mkdir(LOCALES_DIR, { recursive: true });

  for (const target of TARGETS) {
    const overrides = OVERRIDES[target] ?? {};
    const flatOut = {};
    let machineCount = 0;
    let fallbackCount = 0;
    for (const [key, value] of Object.entries(flatEn)) {
      if (overrides[key] != null) {
        flatOut[key] = overrides[key];
        continue;
      }
      const machine = await machineTranslate(value, target);
      if (machine) {
        flatOut[key] = machine;
        machineCount += 1;
      } else {
        flatOut[key] = value;
        fallbackCount += 1;
      }
    }
    const outPath = resolve(LOCALES_DIR, `${target}.json`);
    await writeFile(outPath, JSON.stringify(unflatten(flatOut), null, 2) + '\n', 'utf8');
    console.log(
      `${target}: ${Object.keys(flatOut).length} keys ` +
        `(${Object.keys(overrides).length} curated, ${machineCount} machine, ${fallbackCount} English fallback)`,
    );
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
