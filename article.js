/**
 * article.js
 * Loaded by article.html. Reads the date from query string parameters
 * (month, day, year), then:
 *   1. Fetches the devotional listing from the ODB search API to get the article path.
 *   2. Fetches the full article HTML page and parses window._model out of the
 *      first <script> tag using DOMParser to extract:
 *        - title           : the article title (pageModel.pageTitle)
 *        - bibleVerseText  : the scripture reference (pageModel.bibleVerseText)
 *        - bibleVerseUrl   : link to the passage (pageModel.bibleVerseLink.href)
 *        - devotionBody    : the devotional text (HTML string)
 *        - mandarinMp3Url  : the 華語 podcast MP3 URL
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
  const endDate = startDate; // range is inclusive, use the same as start date

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
// Fetch the article page HTML and extract title, devotionBody, and Mandarin MP3
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

  const title = pageModel.pageTitle || model.name || '';

  const bibleVerseText = pageModel.bibleVerseText || '';
  const bibleVerseUrl = pageModel.bibleVerseLink?.href || null;

  // Find the Mandarin (華語) podcast entry
  const audios = pageModel.podcastPlayerAudios || [];
  const mandarinEntry = audios.find(a => a.podcastLanguage === '華語');
  const mandarinMp3Url = mandarinEntry ? mandarinEntry.podcastUrl.trim() : null;

  // Extract devotional body text (HTML string)
  const devotionBody = pageModel.devotionBody || '';

  // Extract reflect body text (HTML string)
  const reflectBody = pageModel.reflectBody || '';

  // Extract prayer body text (HTML string)
  const prayerBody = pageModel.prayerBody || '';

  // Extract insights body text (HTML string)
  const insightsBody = pageModel.insightsBody || '';

  return { articleUrl, title, bibleVerseText, bibleVerseUrl, mandarinMp3Url, devotionBody, reflectBody, prayerBody, insightsBody };
}

// ---------------------------------------------------------------------------
// UI state helpers
// ---------------------------------------------------------------------------
function showLoading() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('articleBody').style.display = 'none';
}

function showError(message) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  document.getElementById('errorText').textContent = message;
  document.getElementById('articleBody').style.display = 'none';
}

function showArticle() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('articleBody').style.display = 'block';
}

function formatArticleDate(year, month, day) {
  return `${year}年${month}月${day}日`;
}

function populateSection(containerId, bodyId, html) {
  const container = document.getElementById(containerId);
  const body = document.getElementById(bodyId);
  if (html) {
    const bodyContent = sanitizeHtml(html);
    body.appendChild(bodyContent);
    container.style.display = 'block';
  } else {
    body.innerHTML = '';
    container.style.display = 'none';
  }
}

function renderArticle(content, { year, month, day }) {
  const shareBtn = document.getElementById('shareBtn');
  if (content.articleUrl) {
    const shareText = `${month} - ${day} - ${year}\n${content.articleUrl}`;
    const shareUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;
    shareBtn.href = shareUrl;
    shareBtn.style.display = 'inline-flex';
  } else {
    shareBtn.style.display = 'none';
  }

  document.getElementById('articleTitle').textContent = content.title;
  document.getElementById('articleDate').textContent = formatArticleDate(year, month, day);
  document.title = content.title || '靈修文章';

  const audioWrapper = document.getElementById('audioWrapper');
  const audioEl = document.getElementById('articleAudio');
  if (content.mandarinMp3Url) {
    audioEl.src = content.mandarinMp3Url;
    audioWrapper.style.display = 'block';
  } else {
    audioEl.removeAttribute('src');
    audioWrapper.style.display = 'none';
  }

  const bibleVerseContainer = document.getElementById('bibleVerseContainer');
  const bibleVerseEl = document.getElementById('bibleVerse');
  if (content.bibleVerseText) {
    if (content.bibleVerseUrl) {
      const bibleVerseContent = sanitizeHtml(`<a href="${content.bibleVerseUrl}" target="_blank" rel="noopener noreferrer">${content.bibleVerseText}</a>`);
      bibleVerseEl.appendChild(bibleVerseContent);
    } else {
      bibleVerseEl.textContent = content.bibleVerseText;
    }
    bibleVerseContainer.style.display = 'block';
  } else {
    bibleVerseEl.innerHTML = '';
    bibleVerseContainer.style.display = 'none';
  }

  populateSection('devotionBodyContainer', 'devotionBody', content.devotionBody);
  populateSection('reflectContainer', 'reflectBody', content.reflectBody);
  populateSection('prayerContainer', 'prayerBody', content.prayerBody);
  populateSection('insightsContainer', 'insightsBody', content.insightsBody);

  showArticle();
}

/**
 * Safely parses and sanitizes an HTML string using DOMParser.
 * Only allows safe text formatting, structural lists, headings, and dividers.
 * 
 * @param {string} untrustedHtml - The raw, untrusted HTML input string.
 * @returns {DocumentFragment} A safe DOM fragment ready to be appended to the page.
 */
function sanitizeHtml(untrustedHtml) {
  const parser = new DOMParser();
  // Parse inside an isolated, dead document context to prevent execution
  const virtualDoc = parser.parseFromString(untrustedHtml, 'text/html');

  // Explicitly allowed elements (No tables, forms, scripts, objects, or styles)
  const allowedTags = [
    'BR', 'P', 'STRONG', 'A', 'EM', 'CODE', 'PRE', 'SUB', 'SUP',
    'UL', 'OL', 'LI', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'
  ];

  // Explicitly allowed attributes per element (Avoid 'style' attributes entirely)
  const allowedAttributes = {
    'A': ['href', 'target', 'title', 'rel'],
    'SPAN': ['class'],
    'P': ['class'],
    'LI': ['class'],
    'UL': ['class'],
    'OL': ['class', 'type']
  };

  // Create a safe, blank container to hold the clean nodes
  const cleanFragment = document.createDocumentFragment();

  // Recursive function to process and filter elements
  function cleanNode(sourceNode, targetParent) {
    let currentNode = sourceNode.firstChild;

    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        // Text nodes are inherently safe; clone them directly
        targetParent.appendChild(currentNode.cloneNode(true));
      }
      else if (currentNode.nodeType === Node.ELEMENT_NODE && allowedTags.includes(currentNode.tagName)) {
        // Create a brand new clean element in the active window context
        const newElement = document.createElement(currentNode.tagName.toLowerCase());

        // Inspect and copy only whitelisted attributes
        const validAttrs = allowedAttributes[currentNode.tagName] || [];
        for (const attr of currentNode.attributes) {
          const attrName = attr.name.toLowerCase();

          if (validAttrs.includes(attrName)) {
            // Crucial Security Check: Block XSS via javascript: or data: URL links
            if (attrName === 'href') {
              const normalizedValue = attr.value.trim().toLowerCase();
              if (normalizedValue.startsWith('javascript:') || normalizedValue.startsWith('data:')) {
                continue; // Discard malicious link payload
              }
            }
            newElement.setAttribute(attr.name, attr.value);
          }
        }

        // Recurse down into the children of this node
        cleanNode(currentNode, newElement);
        targetParent.appendChild(newElement);
      }
      // Move to the next sibling element in the virtual tree
      currentNode = currentNode.nextSibling;
    }
  }

  // Run the sanitizer over the body of the virtual document
  cleanNode(virtualDoc.body, cleanFragment);
  return cleanFragment;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const { year, month, day } = getQueryParams();

  showLoading();

  if (!year || !month || !day) {
    showError('缺少日期參數，請從首頁選擇日期後再試。');
    return;
  }

  try {
    const data = await fetchDevotionalUrl({ year, month, day });

    if (!data.items || data.items.length === 0) {
      showError('找不到該日期的靈修文章，請選擇其他日期。');
      return;
    }

    const ODB_HOST = 'https://www.odbm.org';
    const articleUrl = `${ODB_HOST}${data.items[0].url}`;
    const content = await fetchDevotionalContent(articleUrl);
    renderArticle(content, { year, month, day });
  } catch (err) {
    console.error('[article.js] Error fetching devotional:', err);
    showError('無法載入文章，請稍後再試。');
  }
});
