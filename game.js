const products = [
  { name: 'Футболка', kind: 'tshirt', price: 1490, icon: '👕', printSize: '30 × 40 см', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], defaultSize: 'M', sizeHint: 'Размер одежды', fits: ['Женский', 'Мужской'] },
  { name: 'Худи', kind: 'hoodie', price: 2990, icon: '🧥', printSize: '30 × 35 см', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], defaultSize: 'M', sizeHint: 'Размер одежды', fits: ['Женский', 'Мужской'] },
  { name: 'Шоппер', kind: 'bag', price: 1190, icon: '🛍️', printSize: '25 × 30 см', sizes: ['Универсальный'], defaultSize: 'Универсальный', sizeHint: 'Подходит всем', fits: ['Универсальный'] },
  { name: 'Кепка', kind: 'cap', price: 990, icon: '🧢', printSize: '10 × 5 см', sizes: ['54–56', '56–58', '58–60'], defaultSize: '56–58', sizeHint: 'Обхват головы в сантиметрах', fits: ['Универсальный'] }
];
const colors = ['#ff6b35', '#171717', '#f8f5ef', '#bfdc82', '#c8b7ff', '#e8b7a5'];
const textColors = ['#171717', '#ffffff', '#ff4f9a', '#c9f53b', '#9f8cff', '#ff6b35'];
const textSymbols = [
  ['★', 'Звезда'], ['♥', 'Сердце'], ['☀', 'Солнце'], ['⚡', 'Молния'],
  ['♪', 'Нота'], ['☁', 'Облако'], ['☾', 'Луна'], ['✿', 'Цветок'],
  ['♡', 'Контур сердца'], ['✓', 'Галочка'], ['∞', 'Бесконечность'], ['✦', 'Искра']
];
const stickerVariants = [
  ['✦', 'Искра'], ['★', 'Звезда'], ['♥', 'Сердце'], ['⚡', 'Молния'],
  ['☀', 'Солнце'], ['✿', 'Цветок'], ['☾', 'Луна'], ['♫', 'Музыка'],
  ['🔥', 'Огонь'], ['🚀', 'Ракета'], ['🌈', 'Радуга'], ['🎮', 'Игра'],
  ['🦋', 'Бабочка'], ['🍀', 'Клевер'], ['☺', 'Улыбка'], ['◆', 'Ромб']
];
const fonts = {
  unbounded: '"Unbounded", Arial, sans-serif',
  manrope: '"Manrope", Arial, sans-serif',
  rubik: '"Rubik", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif'
};
let product = products[0], color = colors[0], colorSource = 'preset', side = 'front';
const selectedSizes = Object.fromEntries(products.map(item => [item.kind, item.defaultSize]));
const selectedFits = Object.fromEntries(products.map(item => [item.kind, item.fits[0]]));
let elements = [], cart = [], selectedElementId = null, editImageId = null;
const designsByProduct = Object.fromEntries(products.map(item => [item.kind, []]));
const colorsByProduct = Object.fromEntries(products.map(item => [item.kind, colors[0]]));
const colorSourcesByProduct = Object.fromEntries(products.map(item => [item.kind, 'preset']));
let curvedPathCounter = 0;
let stickerEditMode = false;
const $ = id => document.getElementById(id);
const selectedElement = () => elements.find(e => e.id === selectedElementId && e.side === side);
function markProjectChanged() { $('saveStatus').textContent = 'Есть несохранённые изменения'; }
function toast(message) {
  const notice = $('toast');
  notice.textContent = message;
  notice.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => notice.classList.remove('show'), 2200);
}
function projectSnapshot() {
  designsByProduct[product.kind] = elements;
  colorsByProduct[product.kind] = color;
  colorSourcesByProduct[product.kind] = colorSource;
  return {
    id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: $('projectName').value.trim() || `${product.name} · мой дизайн`,
    savedAt: new Date().toISOString(),
    version: 1, productKind: product.kind, side,
    designs: designsByProduct, colors: colorsByProduct, colorSources: colorSourcesByProduct,
    fits: selectedFits, sizes: selectedSizes
  };
}
function openProjectDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('merch-projects', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storedProject(action, payload) {
  const localVariants = () => {
    const variants = JSON.parse(localStorage.getItem('merch-project-variants') || '[]');
    const legacy = JSON.parse(localStorage.getItem('merch-project') || 'null');
    if (legacy && !variants.some(item => item.id === legacy.id)) variants.push(legacy);
    return variants;
  };
  if (window.indexedDB) {
    try {
      const database = await openProjectDatabase();
      try {
        const result = await new Promise((resolve, reject) => {
          const transaction = database.transaction('projects', ['read', 'list'].includes(action) ? 'readonly' : 'readwrite');
          const store = transaction.objectStore('projects');
          const request = action === 'list' ? store.getAll() : action === 'read' ? store.get(payload)
            : action === 'delete' ? store.delete(payload) : store.put(payload);
          transaction.oncomplete = () => resolve(request.result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
        if (action === 'delete') {
          try {
            const variants = localVariants().filter(item => item.id !== payload);
            localStorage.setItem('merch-project-variants', JSON.stringify(variants));
            if (JSON.parse(localStorage.getItem('merch-project') || 'null')?.id === payload) localStorage.removeItem('merch-project');
          } catch (error) { /* IndexedDB already removed the variant. */ }
        }
        if (action === 'list') {
          let local = [];
          try { local = localVariants(); } catch (error) { /* Local storage may be disabled. */ }
          return [...new Map([...local, ...result].map(item => [item.id, item])).values()];
        }
        if (action !== 'read' || result) return result;
      } finally {
        database.close();
      }
    } catch (error) {
      // Если хранилище браузера недоступно, попробуем локальное хранилище.
    }
  }
  const variants = localVariants();
  if (action === 'list') return variants;
  if (action === 'read') return variants.find(item => item.id === payload);
  const next = action === 'delete' ? variants.filter(item => item.id !== payload) : [...variants, payload];
  localStorage.setItem('merch-project-variants', JSON.stringify(next));
  if (action === 'delete' && JSON.parse(localStorage.getItem('merch-project') || 'null')?.id === payload) localStorage.removeItem('merch-project');
}
function restoreProject(snapshot) {
  if (snapshot?.version !== 1 || !products.some(item => item.kind === snapshot.productKind)) throw new Error('Сохранённый проект повреждён');
  products.forEach(item => {
    const kind = item.kind;
    designsByProduct[kind] = Array.isArray(snapshot.designs?.[kind]) ? snapshot.designs[kind] : [];
    colorsByProduct[kind] = /^#[0-9a-f]{6}$/i.test(snapshot.colors?.[kind]) ? snapshot.colors[kind] : colors[0];
    colorSourcesByProduct[kind] = snapshot.colorSources?.[kind] === 'custom' ? 'custom' : 'preset';
    if (item.fits.includes(snapshot.fits?.[kind])) selectedFits[kind] = snapshot.fits[kind];
    if (item.sizes.includes(snapshot.sizes?.[kind])) selectedSizes[kind] = snapshot.sizes[kind];
  });
  product = products.find(item => item.kind === snapshot.productKind);
  elements = designsByProduct[product.kind];
  color = colorsByProduct[product.kind];
  colorSource = colorSourcesByProduct[product.kind];
  side = snapshot.side === 'back' ? 'back' : 'front';
  selectedElementId = null;
  $('customColor').value = color;
  $('customColorValue').value = color.toUpperCase();
  $('projectName').value = snapshot.name || '';
  document.querySelectorAll('[data-side]').forEach(button => button.classList.toggle('selected', button.dataset.side === side));
  renderProducts();
  renderFits();
  renderSizes();
  renderColors();
  updateGarment();
  $('saveStatus').textContent = 'Проект сохранён';
}

function renderProducts() {
  $('productList').replaceChildren();
  products.forEach((item) => {
    const button = document.createElement('button');
    button.className = `product-card ${item === product ? 'selected' : ''}`;
    const thumb = document.createElement('span');
    thumb.className = 'product-thumb';
    thumb.textContent = item.icon;
    button.append(thumb, document.createTextNode(item.name));
    button.onclick = () => {
      designsByProduct[product.kind] = elements;
      colorsByProduct[product.kind] = color;
      colorSourcesByProduct[product.kind] = colorSource;
      product = item;
      elements = designsByProduct[product.kind];
      color = colorsByProduct[product.kind];
      colorSource = colorSourcesByProduct[product.kind];
      selectedElementId = null;
      $('customColor').value = color;
      $('customColorValue').value = color.toUpperCase();
      renderProducts();
      renderFits();
      renderSizes();
      renderColors();
      updateGarment();
      markProjectChanged();
    };
    $('productList').append(button);
  });
}
function renderFits() {
  $('fitOptions').replaceChildren();
  product.fits.forEach(fit => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `fit-option ${selectedFits[product.kind] === fit ? 'selected' : ''}`;
    button.textContent = fit;
    button.setAttribute('aria-pressed', selectedFits[product.kind] === fit);
    button.onclick = () => {
      selectedFits[product.kind] = fit;
      renderFits();
      updateGarment();
      markProjectChanged();
    };
    $('fitOptions').append(button);
  });
}
function renderSizes() {
  $('sizeOptions').replaceChildren();
  product.sizes.forEach(size => {
    const button = document.createElement('button');
    button.className = `size-option ${selectedSizes[product.kind] === size ? 'selected' : ''}`;
    button.textContent = size;
    button.type = 'button';
    button.setAttribute('aria-pressed', selectedSizes[product.kind] === size);
    button.onclick = () => {
      selectedSizes[product.kind] = size;
      renderSizes();
      updateGarment();
      markProjectChanged();
    };
    $('sizeOptions').append(button);
  });
  $('sizeHint').textContent = product.sizeHint;
}
function renderColors() {
  $('swatches').replaceChildren();
  colors.forEach(shade => {
    const button = document.createElement('button');
    button.className = `swatch ${shade === color && colorSource === 'preset' ? 'selected' : ''}`;
    button.style.background = shade;
    button.setAttribute('aria-label', 'Цвет изделия');
    button.onclick = () => {
      color = shade;
      colorSource = 'preset';
      $('customColor').value = shade;
      $('customColorValue').value = shade.toUpperCase();
      renderColors();
      updateGarment();
      markProjectChanged();
    };
    $('swatches').append(button);
  });
  document.querySelector('.custom-color').classList.toggle('selected', colorSource === 'custom');
}
function updateGarment() {
  $('garment').className = `garment ${product.kind}${selectedFits[product.kind] === 'Женский' ? ' female-fit' : ''}`;
  $('garment').style.background = color;
  $('garment').style.setProperty('--garment-color', color);
  $('stageLabel').textContent = `${product.name} · ${selectedFits[product.kind]} · ${selectedSizes[product.kind]} · ${side === 'front' ? 'передняя сторона' : 'задняя сторона'}`;
  $('printSize').textContent = `Размер печати: ${product.printSize}`;
  renderElements();
}
function renderTextPalette() {
  $('textPalette').replaceChildren();
  const selected = selectedElement();
  textColors.forEach(shade => {
    const button = document.createElement('button');
    button.className = `text-swatch ${selected?.textColor === shade ? 'selected' : ''}`;
    button.style.background = shade;
    button.setAttribute('aria-label', `Цвет текста ${shade}`);
    button.onclick = () => { $('textColor').value = shade; updateText('textColor', shade); };
    $('textPalette').append(button);
  });
}
function buildSymbolPalette() {
  const panel = document.createElement('div');
  panel.className = 'symbol-panel';
  const label = document.createElement('p');
  label.className = 'setting-label';
  label.textContent = 'Добавить значок в текст';
  const buttons = document.createElement('div');
  buttons.className = 'symbol-list';
  textSymbols.forEach(([symbol, name]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'symbol-button';
    button.textContent = symbol;
    button.title = name;
    button.setAttribute('aria-label', `Вставить значок: ${name}`);
    button.onmousedown = event => event.preventDefault();
    button.onclick = () => {
      if (selectedElement()?.type !== 'text') return;
      const field = $('textContent');
      const start = field.selectionStart ?? field.value.length;
      const end = field.selectionEnd ?? start;
      if (field.value.length - (end - start) + symbol.length > field.maxLength) {
        toast('Достигнут предел длины текста');
        return;
      }
      field.setRangeText(symbol, start, end, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.focus();
    };
    buttons.append(button);
  });
  panel.append(label, buttons);
  $('textContent').after(panel);
}
function buildStickerPalette() {
  const panel = document.createElement('div');
  panel.id = 'stickerPalette';
  panel.className = 'sticker-palette';
  panel.hidden = true;
  const heading = document.createElement('div');
  heading.className = 'sticker-palette-heading';
  const title = document.createElement('strong');
  title.textContent = 'Выбери стикер';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Закрыть выбор стикера');
  close.onclick = () => { panel.hidden = true; stickerEditMode = false; };
  heading.append(title, close);
  const choices = document.createElement('div');
  choices.className = 'sticker-choices';
  stickerVariants.forEach(([symbol, name]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = symbol;
    button.title = name;
    button.setAttribute('aria-label', `Стикер: ${name}`);
    button.onclick = () => {
      const selected = selectedElement();
      if (stickerEditMode && selected?.type === 'sticker') {
        selected.value = symbol;
        renderElements();
        markProjectChanged();
        toast('Стикер заменён');
      } else addElement('sticker', symbol);
      panel.hidden = true;
      stickerEditMode = false;
    };
    choices.append(button);
  });
  panel.append(heading, choices);
  document.querySelector('.tool-grid').after(panel);
}
function syncTextSettings() {
  const selected = selectedElement();
  $('editBtn').disabled = !selected || selected.type === 'shape';
  $('textSettings').hidden = selected?.type !== 'text';
  $('positionSettings').hidden = !['text', 'image', 'sticker'].includes(selected?.type);
  if (['text', 'image', 'sticker'].includes(selected?.type)) syncPositionControls(selected);
  if (selected?.type !== 'text') return;
  $('textContent').value = selected.value;
  $('textFont').value = selected.font || 'unbounded';
  $('textSize').value = selected.size || 27;
  $('textSizeValue').value = selected.size || 27;
  $('textColor').value = selected.textColor || '#171717';
  $('curveText').checked = Boolean(selected.curved);
  $('curveControl').hidden = !selected.curved;
  $('curveAmount').value = selected.bend ?? 55;
  $('curveAmountValue').value = selected.bend ?? 55;
  renderTextPalette();
}
function syncPositionControls(item) {
  for (const [input, value] of [['positionX', item.x || 0], ['positionY', item.y || 0], ['rotation', item.rotation || 0]]) {
    $(input).value = value;
    $(`${input}Value`).value = value;
  }
}
function applyPosition(node, item) {
  node.style.left = `${50 + (item.x || 0)}%`;
  node.style.top = `${50 + (item.y || 0)}%`;
  node.style.transform = `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`;
}
function moveSelected(key, value) {
  const item = selectedElement();
  if (!item || !['text', 'image', 'sticker'].includes(item.type)) return;
  item[key] = value;
  markProjectChanged();
  const node = [...$('printArea').children].find(child => Number(child.dataset.id) === item.id);
  if (node) applyPosition(node, item);
  syncPositionControls(item);
}
function startDragging(event, item) {
  if (!['text', 'image', 'sticker'].includes(item.type) || event.button !== 0) return;
  event.preventDefault();
  if (selectedElementId !== item.id) selectElement(item.id);
  const node = [...$('printArea').children].find(child => Number(child.dataset.id) === item.id);
  const bounds = $('printArea').getBoundingClientRect();
  const startX = event.clientX, startY = event.clientY;
  const originalX = item.x || 0, originalY = item.y || 0;
  node.setPointerCapture(event.pointerId);
  node.onpointermove = move => {
    if (!node.hasPointerCapture(move.pointerId)) return;
    item.x = Math.round(Math.max(-50, Math.min(50, originalX + (move.clientX - startX) / bounds.width * 100)));
    item.y = Math.round(Math.max(-50, Math.min(50, originalY + (move.clientY - startY) / bounds.height * 100)));
    applyPosition(node, item);
    syncPositionControls(item);
  };
  node.onpointerup = node.onpointercancel = () => { node.onpointermove = null; markProjectChanged(); };
}
function renderTextContent(node, item) {
  node.replaceChildren();
  node.classList.toggle('curved-text', Boolean(item.curved));
  if (!item.curved) {
    node.textContent = item.value;
    return;
  }
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 300 210');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(namespace, 'path');
  const pathId = `curve-path-${++curvedPathCounter}`;
  path.setAttribute('id', pathId);
  path.setAttribute('d', `M 15 115 Q 150 ${115 - (item.bend ?? 55)} 285 115`);
  path.setAttribute('fill', 'none');
  const text = document.createElementNS(namespace, 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'currentColor');
  text.style.fontFamily = fonts[item.font] || fonts.unbounded;
  text.style.fontWeight = '700';
  text.style.fontSize = `${(item.size || 27) * 1.58}px`;
  const textPath = document.createElementNS(namespace, 'textPath');
  textPath.setAttribute('href', `#${pathId}`);
  textPath.setAttribute('startOffset', '50%');
  const label = item.value.replace(/\s+/g, ' ').trim();
  if ([...label].length * (item.size || 27) * .9 > 245) {
    textPath.setAttribute('textLength', '245');
    textPath.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  textPath.textContent = label;
  text.append(textPath);
  svg.append(path, text);
  node.setAttribute('aria-label', label);
  node.append(svg);
}
function createDesignNode(item) {
  const node = document.createElement(item.type === 'image' ? 'img' : 'div');
  node.className = `design-element design-${item.type}`;
  node.dataset.id = item.id;
  if (item.type === 'image') {
    node.src = item.value;
    node.alt = 'Изображение на мерче';
    node.draggable = false;
  } else if (item.type === 'text') {
    node.style.color = item.textColor || '#171717';
    node.style.fontFamily = fonts[item.font] || fonts.unbounded;
    node.style.fontSize = `${item.size || 27}px`;
    renderTextContent(node, item);
  } else node.textContent = item.type === 'sticker' ? (item.value || '✦') : '';
  applyPosition(node, item);
  return node;
}
function renderElements() {
  $('printArea').replaceChildren();
  elements.filter(e => e.side === side).forEach(item => {
    const node = createDesignNode(item);
    node.classList.toggle('selected', item.id === selectedElementId);
    node.onpointerdown = event => startDragging(event, item);
    node.onclick = () => { if (selectedElementId !== item.id) selectElement(item.id); };
    $('printArea').append(node);
  });
  $('layers').replaceChildren();
  if (!elements.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-layers';
    empty.textContent = 'Добавьте элемент, чтобы увидеть его здесь';
    $('layers').append(empty);
  }
  elements.slice().reverse().forEach(item => {
    const row = document.createElement('div');
    row.className = `layer ${item.id === selectedElementId ? 'selected' : ''}`;
    const name = document.createElement('button');
    name.className = 'layer-name';
    name.textContent = item.type === 'text' ? `Т ${item.value}` : item.type === 'image' ? '▧ Изображение' : item.type === 'sticker' ? `${item.value || '✦'} Стикер` : '◯ Форма';
    name.onclick = () => {
      if (item.side !== side) document.querySelector(`[data-side="${item.side}"]`).click();
      selectElement(item.id);
    };
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Удалить слой');
    remove.onclick = () => {
      elements = elements.filter(e => e.id !== item.id);
      if (selectedElementId === item.id) selectedElementId = null;
      renderElements();
      markProjectChanged();
    };
    row.append(name, remove);
    $('layers').append(row);
  });
  syncTextSettings();
}
function selectElement(id) { selectedElementId = id; renderElements(); }
function addElement(type, value = '') {
  const count = elements.filter(e => e.side === side).length;
  const item = { id: Date.now() + Math.random(), type, value, side, x: count ? (count % 2 ? 17 : -17) : 0, y: count ? Math.min(35, count * 15) : 0, rotation: 0 };
  if (type === 'text') Object.assign(item, { font: 'unbounded', size: 27, textColor: '#171717', curved: false, bend: 55 });
  elements.push(item);
  selectElement(item.id);
  markProjectChanged();
  toast('Элемент добавлен на макет');
}
function updateText(key, value) {
  const selected = selectedElement();
  if (selected?.type !== 'text') return;
  const properties = { textContent: 'value', textFont: 'font', textSize: 'size', textColor: 'textColor', curveText: 'curved', curveAmount: 'bend' };
  selected[properties[key]] = value;
  markProjectChanged();
  const node = [...$('printArea').children].find(child => Number(child.dataset.id) === selected.id);
  if (node) {
    node.style.fontFamily = fonts[selected.font];
    node.style.fontSize = `${selected.size}px`;
    node.style.color = selected.textColor;
    renderTextContent(node, selected);
  }
  const name = $('layers').querySelector('.layer.selected .layer-name');
  if (name) name.textContent = `Т ${selected.value}`;
  $('textSizeValue').value = selected.size;
  $('curveControl').hidden = !selected.curved;
  $('curveAmountValue').value = selected.bend;
  if (key === 'textColor') renderTextPalette();
}
function createCartView(item, viewSide) {
  const view = document.createElement('div');
  view.className = 'cart-view';
  const garment = document.createElement('div');
  garment.className = `garment cart-garment ${item.kind}${item.fit === 'Женский' ? ' female-fit' : ''}`;
  garment.style.background = item.color;
  garment.style.setProperty('--garment-color', item.color);
  const neck = document.createElement('div');
  neck.className = 'garment-neck';
  const printArea = document.createElement('div');
  printArea.className = 'print-area';
  item.design.filter(element => element.side === viewSide).forEach(element => printArea.append(createDesignNode(element)));
  garment.append(neck, printArea);
  const caption = document.createElement('span');
  caption.className = 'cart-view-caption';
  caption.textContent = viewSide === 'front' ? 'Перед' : 'Спина';
  view.append(garment, caption);
  return view;
}
function showCart() {
  $('modalCount').textContent = cart.length;
  $('cartCount').textContent = cart.length;
  $('cartItems').replaceChildren();
  $('cartTotal').hidden = !cart.length;
  $('cartTotalPrice').textContent = `${cart.reduce((sum, item) => sum + item.price, 0).toLocaleString('ru-RU')} ₽`;
  if (!cart.length) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    empty.textContent = 'Корзина пока пуста. Соберите свой первый дизайн.';
    $('cartItems').append(empty);
  }
  cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-product';
    const previews = document.createElement('div');
    previews.className = 'cart-previews';
    previews.append(createCartView(item, 'front'), createCartView(item, 'back'));
    const details = document.createElement('div');
    details.className = 'cart-details';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = `Вариант: ${item.fit} · Размер: ${item.size}`;
    const colorLabel = document.createElement('p');
    colorLabel.className = 'cart-color';
    const swatch = document.createElement('span');
    swatch.className = 'cart-color-swatch';
    swatch.style.background = item.color;
    colorLabel.append(swatch, document.createTextNode(`Цвет: ${item.color.toUpperCase()}`));
    const designCount = document.createElement('p');
    designCount.textContent = `Элементов дизайна: ${item.design.length}`;
    const price = document.createElement('b');
    price.textContent = `${item.price.toLocaleString('ru-RU')} ₽`;
    const remove = document.createElement('button');
    remove.className = 'cart-remove';
    remove.textContent = 'Убрать из корзины';
    remove.onclick = () => { cart.splice(index, 1); showCart(); };
    details.append(title, description, colorLabel, designCount, price, remove);
    row.append(previews, details);
    $('cartItems').append(row);
  });
  $('modal').classList.add('open');
}
async function showSavedVariants() {
  const list = $('savedList');
  list.replaceChildren();
  const variants = (await storedProject('list')).filter(item => item.version === 1)
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  if (!variants.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Вариантов пока нет. Создай дизайн и нажми «Сохранить вариант».';
    list.append(empty);
  }
  variants.forEach(variant => {
    const kind = variant.productKind;
    const item = products.find(entry => entry.kind === kind);
    if (!item) return;
    const row = document.createElement('article');
    row.className = 'saved-variant';
    const preview = document.createElement('div');
    preview.className = 'saved-variant-preview';
    preview.append(createCartView({ kind, fit: variant.fits?.[kind], color: variant.colors?.[kind] || colors[0], design: variant.designs?.[kind] || [] }, variant.side || 'front'));
    const info = document.createElement('div');
    info.className = 'saved-variant-info';
    const title = document.createElement('strong');
    title.textContent = variant.name || `${item.name} · сохранённый проект`;
    const details = document.createElement('small');
    details.textContent = `${item.name} · ${variant.savedAt ? new Date(variant.savedAt).toLocaleString('ru-RU') : 'Сохранённый вариант'}`;
    const actions = document.createElement('div');
    actions.className = 'saved-variant-actions';
    const open = document.createElement('button');
    open.textContent = 'Открыть';
    open.onclick = () => {
      restoreProject(variant);
      $('savedModal').classList.remove('open');
      $('designer').scrollIntoView({ behavior: 'smooth' });
      toast('Вариант открыт');
    };
    const remove = document.createElement('button');
    remove.className = 'delete-variant';
    remove.textContent = 'Удалить';
    remove.onclick = async () => {
      try { await storedProject('delete', variant.id); await showSavedVariants(); }
      catch (error) { toast('Не удалось удалить вариант'); }
    };
    actions.append(open, remove);
    info.append(title, details, actions);
    row.append(preview, info);
    list.append(row);
  });
  $('savedModal').classList.add('open');
}

renderProducts();
renderFits();
renderSizes();
renderColors();
buildSymbolPalette();
buildStickerPalette();
$('customColor').oninput = event => {
  color = event.target.value;
  colorSource = 'custom';
  $('customColorValue').value = color.toUpperCase();
  renderColors();
  updateGarment();
  markProjectChanged();
};
$('uploadBtn').onclick = () => { editImageId = null; $('fileInput').click(); };
$('fileInput').onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    toast('Выберите изображение PNG, JPG, WEBP или SVG');
    event.target.value = '';
    return;
  }
  const replacementId = editImageId;
  const currentSide = side;
  const currentKind = product.kind;
  const targetDesign = elements;
  editImageId = null;
  const reader = new FileReader();
  reader.onload = () => {
    if (designsByProduct[currentKind] !== targetDesign && elements !== targetDesign) return;
    const design = targetDesign;
    if (replacementId !== null) {
      const image = design.find(item => item.id === replacementId);
      if (image) { image.value = reader.result; if (currentKind === product.kind) selectedElementId = image.id; toast('Изображение заменено'); }
    } else {
      const count = design.filter(e => e.side === currentSide).length;
      design.push({ id: Date.now() + Math.random(), type: 'image', value: reader.result, side: currentSide, x: count ? (count % 2 ? 17 : -17) : 0, y: count ? Math.min(35, count * 15) : 0, rotation: 0 });
      if (currentKind === product.kind) selectedElementId = design[design.length - 1].id;
      toast('Фото или картинка добавлена на мерч');
    }
    if (currentKind === product.kind && elements === design) renderElements();
    markProjectChanged();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};
$('editBtn').onclick = () => {
  const selected = selectedElement();
  if (selected?.type === 'text') $('textContent').focus();
  else if (selected?.type === 'image') { editImageId = selected.id; $('fileInput').click(); }
  else if (selected?.type === 'sticker') {
    stickerEditMode = true;
    $('stickerPalette').hidden = false;
  }
  else if (selected) toast('Выберите текст или фото для редактирования');
};
$('textContent').oninput = event => updateText('textContent', event.target.value);
$('textFont').onchange = event => updateText('textFont', event.target.value);
$('textSize').oninput = event => updateText('textSize', Number(event.target.value));
$('textColor').oninput = event => updateText('textColor', event.target.value);
$('curveText').onchange = event => updateText('curveText', event.target.checked);
$('curveAmount').oninput = event => updateText('curveAmount', Number(event.target.value));
for (const [id, property] of [['positionX', 'x'], ['positionY', 'y'], ['rotation', 'rotation']]) {
  $(id).oninput = event => moveSelected(property, Number(event.target.value));
}
$('resetPositionBtn').onclick = () => {
  const item = selectedElement();
  if (!item) return;
  item.x = 0;
  item.y = 0;
  moveSelected('rotation', 0);
};
$('textBtn').onclick = () => addElement('text', 'Твоя надпись');
$('stickerBtn').onclick = () => {
  stickerEditMode = false;
  $('stickerPalette').hidden = !$('stickerPalette').hidden;
};
$('shapeBtn').onclick = () => addElement('shape');
$('clearBtn').onclick = () => { elements = []; selectedElementId = null; renderElements(); markProjectChanged(); toast('Макет очищен'); };
document.querySelectorAll('[data-side]').forEach(button => button.onclick = () => {
  side = button.dataset.side;
  selectedElementId = null;
  document.querySelectorAll('[data-side]').forEach(item => item.classList.toggle('selected', item === button));
  updateGarment();
  markProjectChanged();
});
let aiGeneratorPromise;
function loadAiGenerator(onProgress) {
  if (!aiGeneratorPromise) {
    aiGeneratorPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
      .then(({ pipeline }) => pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
        device: 'wasm', dtype: 'int8', progress_callback: onProgress
      })).catch(error => { aiGeneratorPromise = null; throw error; });
  }
  return aiGeneratorPromise;
}
$('aiButton').onclick = async () => {
  const button = $('aiButton');
  const label = button.querySelector('b');
  const kind = product.kind;
  const productName = product.name;
  const targetSide = side;
  const design = elements;
  const selectedId = selectedElement()?.type === 'text' ? selectedElementId : null;
  const theme = $('aiTheme').value.trim();
  button.disabled = true;
  label.textContent = aiGeneratorPromise ? 'Придумываем…' : 'Загружаем ИИ…';
  try {
    const generator = await loadAiGenerator(progress => {
      if (progress.status === 'progress' && Number.isFinite(progress.progress)) {
        label.textContent = `Загрузка ИИ: ${Math.round(progress.progress)}%`;
      }
    });
    label.textContent = 'Придумываем…';
    const output = await generator([
      { role: 'system', content: 'Ты придумываешь запоминающиеся короткие надписи для молодёжного мерча. Отвечай только одной надписью на русском языке, без объяснений, кавычек и эмодзи.' },
      { role: 'user', content: `Изделие: ${productName}. Тема: ${theme || 'самовыражение и творчество'}. ${kind === 'cap' ? 'До 14 символов.' : 'До 32 символов.'} Придумай оригинальную надпись.` }
    ], { max_new_tokens: 48, do_sample: true, temperature: 0.85 });
    if (product.kind === kind ? elements !== design : designsByProduct[kind] !== design) return;
    const phrase = output?.[0]?.generated_text?.at(-1)?.content?.trim()
      ?.replace(/^["«“]+|["»”]+$/g, '').trim().slice(0, kind === 'cap' ? 14 : 32);
    if (!phrase) throw new Error('Пустой ответ');
    const selected = design.find(item => item.id === selectedId && item.side === targetSide && item.type === 'text');
    if (selected) selected.value = phrase;
    else {
      const count = design.filter(item => item.side === targetSide).length;
      design.push({ id: Date.now() + Math.random(), type: 'text', value: phrase, side: targetSide,
        x: count ? (count % 2 ? 17 : -17) : 0, y: count ? Math.min(35, count * 15) : 0,
        rotation: 0, font: 'unbounded', size: kind === 'cap' ? 16 : 27, textColor: '#171717', curved: false, bend: 55 });
    }
    if (product.kind === kind && elements === design && side === targetSide) {
      selectedElementId = selected?.id || design[design.length - 1].id;
      renderElements();
    }
    markProjectChanged();
    toast('Надпись от ИИ добавлена — её можно отредактировать');
  } catch (error) {
    toast('Не удалось запустить локальную ИИ-модель. Проверьте соединение, память браузера и попробуйте снова');
  } finally {
    button.disabled = false;
    label.textContent = 'Придумать за меня';
  }
};
$('addCartBtn').onclick = () => {
  cart.push({ name: product.name, kind: product.kind, fit: selectedFits[product.kind], size: selectedSizes[product.kind], color, price: product.price, design: elements.map(element => ({ ...element })) });
  $('cartCount').textContent = cart.length;
  toast('Товар добавлен в корзину');
};
$('cartBtn').onclick = showCart;
$('modalClose').onclick = () => $('modal').classList.remove('open');
$('modal').onclick = event => { if (event.target.id === 'modal') $('modal').classList.remove('open'); };
$('checkoutBtn').onclick = () => toast(cart.length ? 'Заказ почти оформлен. Скоро свяжемся!' : 'Сначала добавьте товар в корзину');
$('saveProjectBtn').onclick = async () => {
  const button = $('saveProjectBtn');
  button.disabled = true;
  button.textContent = 'Сохраняем…';
  try {
    await storedProject('write', projectSnapshot());
    $('saveStatus').textContent = 'Проект сохранён';
    toast('Вариант добавлен в «Сохранённые варианты»');
  } catch (error) {
    toast('Не удалось сохранить проект в браузере');
  } finally {
    button.disabled = false;
    button.textContent = '♡ Сохранить вариант';
  }
};
$('savedBtn').onclick = async () => {
  try { await showSavedVariants(); }
  catch (error) { toast('Не удалось открыть сохранённые варианты'); }
};
$('savedVariantsBtn').onclick = $('savedBtn').onclick;
$('savedClose').onclick = () => $('savedModal').classList.remove('open');
$('savedModal').onclick = event => { if (event.target.id === 'savedModal') $('savedModal').classList.remove('open'); };
$('menuBtn').onclick = () => document.querySelector('.main-nav').classList.toggle('mobile-open');
