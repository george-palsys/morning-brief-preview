document.documentElement.classList.add('js');
// Native details remains useful without JavaScript. Desktop expands the same DOM.
const wide = matchMedia('(min-width:1380px)');
function adaptTables() {
 document.querySelectorAll('.table-scroll,.table-stack').forEach(el => {
  const hint = el.previousElementSibling;
  if (hint?.classList?.contains('scroll-hint')) hint.hidden = el.scrollWidth <= el.clientWidth || matchMedia('(max-width:680px)').matches;
 });
}
function adaptTabs() {
 document.querySelectorAll('.tabs-scroll').forEach(el => { el.tabIndex = el.scrollWidth > el.clientWidth ? 0 : -1; });
 adaptTables();
}
function adapt() { document.querySelectorAll('.page-toc').forEach(el => { el.open = wide.matches; }); adaptTabs(); }
adapt();
wide.addEventListener('change', adapt);
window.addEventListener('resize', adaptTabs);
if (typeof ResizeObserver === 'function') {
 const observer = new ResizeObserver(adaptTabs);
 document.querySelectorAll('.tabs-scroll').forEach(el => observer.observe(el));
 document.querySelectorAll('.table-scroll,.table-stack').forEach(el => { if (el.previousElementSibling?.classList?.contains('scroll-hint')) observer.observe(el); });
}

const menu = document.querySelector?.('.menu');
if (menu) {
 const summary = menu.querySelector('summary');
 document.addEventListener('click', event => {
  if (menu.open && !menu.contains(event.target)) {
   if (menu.contains(document.activeElement)) summary.focus();
   menu.open = false;
  }
 });
 document.addEventListener('keydown', event => {
  if (!menu.open || event.key !== 'Escape') return;
  event.preventDefault();
  menu.open = false;
  summary.focus();
 });
}

const attention = document.querySelector?.('.attention details');
if (attention) {
 const desktop = matchMedia('(min-width:640px)');
 const setAttentionDefault = () => { attention.open = desktop.matches; };
 setAttentionDefault();
 desktop.addEventListener('change', setAttentionDefault);
}


const bar = document.querySelector('#filterbar');
if (bar) {
  const items = [...document.querySelectorAll('.directory tbody tr[data-status]')];
  const chips = [...bar.querySelectorAll('[data-filter]')];
  const input = bar.querySelector('#product-search');
  const count = document.querySelector('#results-count');
  const empty = document.querySelector('#empty-state');
  let state = 'all';
  const apply = () => {
    const q = input.value.normalize('NFKC').trim().toLowerCase();
    let shown = 0;
    for (const li of items) {
      const ok = (state === 'all' || li.dataset.status === state) && (!q || li.textContent.normalize('NFKC').toLowerCase().includes(q));
      li.hidden = !ok; if (ok) shown++;
    }
    count.textContent = `目前顯示 ${shown} / ${items.length} 項`;
    empty.hidden = shown !== 0;
  };
  chips.forEach(c => c.addEventListener('click', () => { state = c.dataset.filter; chips.forEach(x => x.setAttribute('aria-pressed', String(x === c))); apply(); }));
  input.addEventListener('input', apply);
  apply();
}


if (document.querySelector('#search-ui')) {
const ui = document.querySelector('#search-ui');
const query = document.querySelector('#query');
const status = document.querySelector('#search-status');
const results = document.querySelector('#results');
const normalize = value => String(value).normalize('NFKC').toLowerCase();
let manifest, entries = [], pending;
const loaded = new Set();
ui.hidden = false;
async function json(file) {
 const response = await fetch(file, { credentials:'omit' });
 if (!response.ok) throw Error('index');
 return response.json();
}
async function load(all = false) {
 if (pending) await pending;
 pending = (async () => {
  if (!manifest) { manifest = await json('index.json'); entries.push(...manifest.products); }
  const months = all ? manifest.months : manifest.months.slice(0,3);
  for (const month of months) if (!loaded.has(month)) { entries.push(...await json(month)); loaded.add(month); }
 })();
 try { await pending; } finally { pending = undefined; }
}
function render() {
 results.replaceChildren();
 results.hidden = true;
 const empty = document.querySelector('#search-empty');
 if (empty) empty.hidden = true;
 const terms = normalize(query.value).trim().split(/\s+/).filter(Boolean);
 if (!terms.length) { status.textContent = '輸入關鍵字搜尋，預設載入最近 3 個月。'; return; }
 const categories = [...ui.querySelectorAll('[name=category]:checked')].map(el => el.value);
 const recent = document.querySelector('#range').value === '30';
 const cutoff = new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA', { timeZone:'Asia/Taipei' });
 const matches = entries.filter(item => categories.includes(item.category) && (!recent || item.date && item.date >= cutoff) && terms.every(term => normalize([item.title,item.summary,...item.products,...item.cve_ids].join(' ')).includes(term)));
 const exact = item => terms.some(term => [...item.products,...item.cve_ids].some(v => normalize(v) === term)) ? 1 : 0;
 matches.sort((a,b) => exact(b)-exact(a) || b.date.localeCompare(a.date));
 for (const item of matches.slice(0,50)) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  // Only builder-produced relative page paths can become result destinations.
  if (!/^(?:daily|products)\/[a-zA-Z0-9/_-]+\.html(?:#item-\d+)?$/.test(item.file)) continue;
  a.href = '../' + item.file; a.textContent = item.title;
  const meta = document.createElement('p');
  meta.className = 'search-meta';
  const category = document.createElement('span');
  category.className = 'tag';
  category.textContent = {cve:'CVE','taiwan-it':'台灣 IT',ai:'AI',product:'產品',knowledge:'新知識'}[item.category];
  const date = document.createElement('span');
  date.textContent = `${item.date} · ${item.products.join('、')}`;
  meta.append(category,date);
  li.append(a,meta);
  if (item.summary) {
   const excerpt = document.createElement('p');
   excerpt.className = 'search-excerpt'; excerpt.textContent = item.summary; li.append(excerpt);
  }
  results.append(li);
 }
 results.hidden = results.childElementCount === 0;
 if (empty) empty.hidden = matches.length !== 0;
 status.textContent = matches.length ? `找到 ${matches.length} 筆${matches.length > 50 ? `，還有 ${matches.length-50} 筆，請縮小條件` : ''}` : `沒有符合『${query.value}』的結果；請換關鍵字或取消類別篩選。`;
}
async function update(all = false) {
 try { await load(all); render(); } catch { results.replaceChildren(); results.hidden = true; status.textContent = '搜尋索引載入失敗，請重新整理'; }
}
query.addEventListener('focus', () => update(), { once:true });
query.addEventListener('input', () => update());
ui.querySelectorAll('input[type=checkbox],select').forEach(el => el.addEventListener('change', () => update()));
document.querySelector('#all').addEventListener('click', () => update(true));

}
/* Visual preview motion */
if (document.querySelector('.mb-motion-art')) {
  for (const image of document.querySelectorAll('.mb-art img')) {
    const hide = () => { image.closest('picture').hidden = true; };
    image.addEventListener('error', hide, { once: true });
    if (image.complete && image.naturalWidth === 0) hide();
  }
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('mb-in-view');
        observer.unobserve(entry.target);
      }
    });
    document.querySelectorAll('.mb-motion-art').forEach(art => observer.observe(art));
  }
}
