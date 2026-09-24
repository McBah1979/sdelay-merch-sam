const exportButton = document.getElementById('exportBtn');

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, symbol => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[symbol]);
}

function garmentGeometry(kind, fit) {
  if (kind === 'bag') return {
    left: 127.5, top: 158, width: 245, height: 260,
    body: '<rect width="245" height="260" rx="9"/>',
    print: { x: 28, y: 30, width: 189, height: 196 }
  };
  if (kind === 'cap') return {
    left: 120, top: 208, width: 260, height: 150,
    body: '<path d="M 0 132 C 0 52 40 0 130 0 C 220 0 260 52 260 132 Q 130 151 0 132 Z"/>',
    print: { x: 47, y: 68, width: 166, height: 53 }
  };
  const female = fit === 'Женский';
  const shirt = female
    ? '75,13 110,0 128,29 162,29 180,0 215,13 278,75 241,127 220,94 215,172 229,325 61,325 75,172 70,94 49,127 12,75'
    : '61,16 102,0 125,29 165,29 188,0 229,16 290,78 244,136 223,101 223,325 67,325 67,101 46,136 0,78';
  const hoodie = female
    ? '70,21 90,0 113,35 177,35 200,0 220,21 267,63 241,130 220,105 215,189 226,350 64,350 75,189 70,105 49,130 23,63'
    : '61,25 84,0 110,35 180,35 206,0 229,25 273,63 244,133 220,109 220,350 70,350 70,109 46,133 17,63';
  return {
    left: 105, top: kind === 'hoodie' ? 105 : 118, width: 290,
    height: kind === 'hoodie' ? 350 : 325,
    body: `<polygon points="${kind === 'hoodie' ? hoodie : shirt}"/>`,
    print: { x: 68, y: 65, width: 154, height: kind === 'hoodie' ? 205 : 180 }
  };
}

function drawExportElement(element, area, pathId, kind) {
  const x = area.x + area.width * (0.5 + (element.x || 0) / 100);
  const y = area.y + area.height * (0.5 + (element.y || 0) / 100);
  const angle = element.rotation || 0;
  const color = escapeXml(element.textColor || '#171717');
  const font = element.font === 'serif' ? 'Georgia,serif' :
    element.font === 'rubik' ? 'Rubik,Arial,sans-serif' :
    element.font === 'manrope' ? 'Manrope,Arial,sans-serif' : 'Unbounded,Arial,sans-serif';
  const size = Math.max(12, Math.min(48, Number(element.size) || 27));
  const transform = `translate(${x} ${y}) rotate(${angle})`;
  if (element.type === 'image') {
    const width = kind === 'cap' ? 90 : kind === 'bag' ? 145 : 110;
    const height = kind === 'cap' ? 48 : kind === 'bag' ? 155 : 120;
    return `<g transform="${transform}"><image href="${escapeXml(element.value)}" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g>`;
  }
  if (element.type === 'shape') return `<g transform="${transform}"><circle r="27.5" fill="#9f8cff"/></g>`;
  if (element.type === 'sticker') return `<g transform="${transform}"><text text-anchor="middle" dominant-baseline="central" font-family="Segoe UI Emoji,Segoe UI Symbol,Arial,sans-serif" font-size="${kind === 'cap' ? 32 : 49}" fill="#141414">${escapeXml(element.value || '✦')}</text></g>`;
  if (element.type !== 'text') return '';
  if (element.curved) {
    const label = String(element.value).replace(/\s+/g, ' ').trim();
    const width = Math.min(kind === 'cap' ? 125 : 190, area.width);
    const height = kind === 'cap' ? 70 : 133;
    const stretch = [...label].length * size * .9 > 245 ? ' textLength="245" lengthAdjust="spacingAndGlyphs"' : '';
    return `<g transform="${transform}"><g transform="translate(${-width / 2} ${-height / 2}) scale(${width / 300} ${height / 210})"><path id="${pathId}" d="M 15 115 Q 150 ${115 - (element.bend ?? 55)} 285 115" fill="none"/><text text-anchor="middle" fill="${color}" font-family="${escapeXml(font)}" font-size="${size * 1.58}" font-weight="700"><textPath href="#${pathId}" startOffset="50%"${stretch}>${escapeXml(label)}</textPath></text></g></g>`;
  }
  const lines = String(element.value).split('\n');
  const start = -(lines.length - 1) * size * .55;
  const spans = lines.map((line, index) => `<tspan x="0" y="${start + index * size * 1.1}">${escapeXml(line)}</tspan>`).join('');
  return `<g transform="${transform}"><text text-anchor="middle" dominant-baseline="central" fill="${color}" font-family="${escapeXml(font)}" font-size="${size}" font-weight="700">${spans}</text></g>`;
}

function renderExportSide(viewSide, offset, index, draft) {
  const geometry = garmentGeometry(draft.kind, draft.fit);
  const { left, top, body } = geometry;
  const paint = escapeXml(draft.color);
  const area = {
    x: left + geometry.print.x,
    y: top + geometry.print.y,
    width: geometry.print.width,
    height: geometry.print.height
  };
  let accessories = '';
  if (draft.kind === 'bag') {
    accessories = `<path d="M ${left + 62} ${top + 11} V ${top - 30} Q ${left + 62} ${top - 45} ${left + 80} ${top - 45} H ${left + 165} Q ${left + 183} ${top - 45} ${left + 183} ${top - 30} V ${top + 11}" fill="none" stroke="${paint}" stroke-width="14"/>`;
  } else if (draft.kind === 'cap') {
    accessories = `<path d="M ${left - 12} ${top + 126} Q ${left + 138} ${top + 118} ${left + 278} ${top + 116} L ${left + 291} ${top + 148} Q ${left + 131} ${top + 165} ${left - 12} ${top + 145} Z" fill="${paint}" stroke="rgba(0,0,0,.15)" stroke-width="3"/>`;
  }
  const neck = ['tshirt', 'hoodie'].includes(draft.kind)
    ? `<ellipse cx="${left + 145}" cy="${top}" rx="29" ry="12" fill="#f7f3ef"/>` : '';
  const designs = draft.elements.filter(element => element.side === viewSide)
    .map((element, elementIndex) => drawExportElement(element, area, `export-curve-${index}-${elementIndex}`, draft.kind)).join('');
  const variant = `${draft.name} · ${draft.fit} · ${draft.size}`;
  return `<g transform="translate(${offset} 0)">
    <rect width="500" height="580" fill="#f7f3ef"/>
    <text x="25" y="41" fill="#171717" font-family="Arial,sans-serif" font-size="18" font-weight="700">${escapeXml(variant)}</text>
    <text x="25" y="555" fill="#5a5650" font-family="Arial,sans-serif" font-size="15">${viewSide === 'front' ? 'Передняя сторона' : 'Задняя сторона'}</text>
    ${accessories}
    <g transform="translate(${left} ${top})" fill="${paint}">${body}</g>
    ${neck}
    <g class="export-design">${designs}</g>
  </g>`;
}

function makeExportSvg(sides) {
  const draft = {
    kind: product.kind, name: product.name, fit: selectedFits[product.kind],
    size: selectedSizes[product.kind], color,
    elements: elements.map(element => ({ ...element }))
  };
  const selectedSides = sides === 'both' ? ['front', 'back'] : [sides];
  const width = selectedSides.length * 500;
  const content = selectedSides.map((viewSide, index) => renderExportSide(viewSide, index * 500, index, draft)).join('');
  return {
    width,
    height: 580,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="580" viewBox="0 0 ${width} 580">${content}</svg>`
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
let previewUrl;
function closePreview() {
  $('previewModal').classList.remove('open');
  $('previewImage').removeAttribute('src');
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}
$('previewBtn').onclick = () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(new Blob([makeExportSvg('both').svg], { type: 'image/svg+xml;charset=utf-8' }));
  $('previewImage').src = previewUrl;
  $('previewModal').classList.add('open');
};
$('previewClose').onclick = closePreview;
$('previewModal').onclick = event => { if (event.target.id === 'previewModal') closePreview(); };

exportButton.onclick = async () => {
  if (exportButton.disabled) return;
  const format = document.getElementById('exportFormat').value;
  const sides = document.getElementById('exportSides').value;
  if (sides !== 'both' && elements.length && !elements.some(element => element.side === sides)) {
    toast('На выбранной стороне нет дизайна. Выберите другую сторону или обе сразу');
    return;
  }
  const { svg, width, height } = makeExportSvg(sides);
  const filename = `мерч-${product.kind}-${sides === 'both' ? 'обе-стороны' : sides === 'front' ? 'перед' : 'спина'}`;
  exportButton.disabled = true;
  exportButton.textContent = 'Подготавливаем файл…';
  try {
    if (new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')) {
      throw new Error('Не удалось собрать файл с дизайном');
    }
    const vector = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    if (format === 'svg') {
      downloadBlob(vector, `${filename}.svg`);
    } else {
      const url = URL.createObjectURL(vector);
      const image = new Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('Не удалось подготовить изображение'));
          image.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Сохранение изображений не поддерживается браузером');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
        const file = await new Promise(resolve => canvas.toBlob(resolve, mime, .94));
        if (!file || file.type !== mime) throw new Error('Этот формат не поддерживается браузером');
        downloadBlob(file, `${filename}.${format === 'jpeg' ? 'jpg' : format}`);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    toast('Макет сохранён на устройство');
  } catch (error) {
    toast(error.message || 'Не удалось сохранить макет');
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = '↓ Скачать макет';
  }
};
