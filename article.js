/**
 * article.js
 * Loaded by article.html. Reads the date from query string parameters
 * (month, day, year), then:
 *   1. Fetches the devotional listing from the ODB search API to get the article path.
 *   2. Fetches the full article HTML page and parses window._model out of the
 *      first <script> tag using DOMParser to extract:
 *        - devotionBody   : the devotional text (HTML string)
 *        - mandarinMp3Url : the 華語 podcast MP3 URL
 */

// ---------------------------------------------------------------------------
// Helper: parse query string parameters from the current URL
// ---------------------------------------------------------------------------
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    month: parseInt(params.get('month'), 10),
    day: parseInt(params.get('day'), 10),
    year: parseInt(params.get('year'), 10),
  };
}

// ---------------------------------------------------------------------------
// Helper: format a JS Date as a zero-padded "YYYY-MM-DD" string
// ---------------------------------------------------------------------------
function toDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Main: fetch the devotional listing for the selected date
// sd = start date (the selected date itself)
// ed = end date   (the day after the selected date, to capture the article)
// ---------------------------------------------------------------------------
async function fetchDevotionalUrl({ year, month, day }) {
  // Build start and end date strings required by the API
  const startDate = new Date(year, month - 1, day);       // selected date
  const endDate = new Date(year, month - 1, day + 1);   // day after

  const sd = toDateString(startDate);
  const ed = toDateString(endDate);

  const apiUrl = `https://www.odbm.org/api/search/devotional?ed=${ed}&pg=1&sd=${sd}`;
  const targetUrl = buildProxyUrl(apiUrl, {
    reqHeaders: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-Hant',
      'user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  const response = await fetch(targetUrl, {
    referrer: 'https://www.odbm.org/tc/devotionals',
    method: 'GET',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

// Helper method from corsproxy.io to construct proxy url (including custom headers).
function buildProxyUrl(targetUrl, { reqHeaders = {}, resHeaders = {} } = {}) {
  const encodedUrl = encodeURIComponent(targetUrl);
  let proxyUrl = `https://corsproxy.io/?key=61ac1846&url=${encodedUrl}`;

  const applyHeaders = (param, headers) => {
    Object.entries(headers).forEach(([header, value]) => {
      const headerParam = value === null || value === ''
        ? `${header}:` // remove header
        : `${header}:${value}`;
      proxyUrl += `&${param}=${encodeURIComponent(headerParam)}`;
    });
  };

  applyHeaders('reqHeaders', reqHeaders);
  applyHeaders('resHeaders', resHeaders);
  return proxyUrl;
}

// ---------------------------------------------------------------------------
// Fetch the article page HTML and extract devotionBody + Mandarin MP3
// ---------------------------------------------------------------------------
async function fetchDevotionalContent(articleUrl) {
  const targetUrl = buildProxyUrl(articleUrl, {
    reqHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-Hant',
    },
  });

  const response = await fetch(targetUrl, {
    method: 'GET',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Article fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Use DOMParser to find the <script> that assigns window._model
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const scripts = doc.querySelectorAll('script:not([src])');

  let model = null;
  for (const script of scripts) {
    const src = script.textContent;
    if (src.includes('window._model')) {
      // Extract the JSON object literal assigned to window._model
      const match = src.match(/window\._model\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        try {
          model = JSON.parse(match[1]);
        } catch (e) {
          console.warn('[article.js] window._model JSON parse error:', e);
        }
        break;
      }
    }
  }

  if (!model) {
    throw new Error('Could not find or parse window._model in the article page.');
  }

  const pageModel = model.pageModel || {};

  // Extract devotional body text (HTML string)
  const devotionBody = pageModel.devotionBody || '';

  // Find the Mandarin (華語) podcast entry
  const audios = pageModel.podcastPlayerAudios || [];
  const mandarinEntry = audios.find(a => a.podcastLanguage === '華語');
  const mandarinMp3Url = mandarinEntry ? mandarinEntry.podcastUrl.trim() : null;

  return { devotionBody, mandarinMp3Url };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const { year, month, day } = getQueryParams();

  if (!year || !month || !day) {
    console.error('[article.js] Missing date query parameters. Expected ?month=X&day=Y&year=Z');
    return;
  }

  console.log(`[article.js] Fetching devotional for ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

  try {
    const data = await fetchDevotionalUrl({ year, month, day });

    // Log the full response as a JS object
    console.log('[article.js] API response:', data);

    // Log the full URL of the first item (prepend the ODB host)
    if (data.items && data.items.length > 0) {
      const ODB_HOST = 'https://www.odbm.org';
      const articlePath = data.items[0].url;
      const articleUrl = `${ODB_HOST}${articlePath}`;
      console.log('[article.js] First item URL:', articleUrl);

      // Step 2: fetch the article page and parse its content
      const content = await fetchDevotionalContent(articleUrl);
      console.log('[article.js] Devotional content:', content);
    } else {
      console.warn('[article.js] No items found in the response.');
    }
  } catch (err) {
    console.error('[article.js] Error fetching devotional:', err);
  }
});
