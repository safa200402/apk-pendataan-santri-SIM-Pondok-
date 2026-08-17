(function () {
  function sanitizePdfText(value) {
    var raw = String(value == null ? '' : value)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    var normalized = typeof raw.normalize === 'function'
      ? raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      : raw;
    return normalized.replace(/[^\x20-\x7E\n]/g, '?');
  }

  function escapePdfText(value) {
    return sanitizePdfText(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, ' ');
  }

  function wrapPdfTextLines(text, maxWidth, fontSize) {
    var safeText = sanitizePdfText(text);
    var approxCharWidth = Math.max(fontSize * 0.52, 4.5);
    var maxChars = Math.max(8, Math.floor(maxWidth / approxCharWidth));
    var lines = [];

    safeText.split('\n').forEach(function (paragraph) {
      var words = paragraph.split(/\s+/).filter(Boolean);
      var current;
      if (!words.length) {
        lines.push('');
        return;
      }
      current = words.shift();
      words.forEach(function (word) {
        var candidate = current + ' ' + word;
        var remaining;
        if (candidate.length <= maxChars) {
          current = candidate;
          return;
        }
        lines.push(current);
        if (word.length <= maxChars) {
          current = word;
          return;
        }
        remaining = word;
        while (remaining.length > maxChars) {
          lines.push(remaining.slice(0, maxChars));
          remaining = remaining.slice(maxChars);
        }
        current = remaining || '';
      });
      if (current) {
        lines.push(current);
      }
    });

    return lines.length ? lines : [''];
  }

  function normalizeColor(color, fallback) {
    var base = Array.isArray(color) && color.length === 3 ? color : fallback;
    return base.map(function (value) {
      var number = Number(value);
      if (!isFinite(number)) {
        return 0;
      }
      return Math.max(0, Math.min(255, Math.round(number)));
    });
  }

  function formatExportDateLabel(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return String(value || '-').replace('T', ' ');
    }
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(date);
  }

  function formatExportFileTimestamp(value) {
    return String(value || new Date().toISOString())
      .replace(/[^\d]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export';
  }

  function downloadBlobFile(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    var mountTarget = (window.PSUI && typeof window.PSUI.getLayerMountTarget === 'function')
      ? window.PSUI.getLayerMountTarget('page')
      : (document.getElementById('pageRoot') || document.body);
    link.href = url;
    link.download = filename;
    mountTarget.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function buildCardSummaryPdfBlob(options) {
    var pageWidth = 595.28;
    var pageHeight = 841.89;
    var marginX = 34;
    var marginBottom = 38;
    var contentWidth = pageWidth - (marginX * 2);
    var columnCount = Math.max(1, Math.min(4, parseInt(options && options.columns, 10) || 1));
    var cardGapX = columnCount > 1 ? 10 : 0;
    var cardGapY = 10;
    var cardWidth = columnCount > 1
      ? ((contentWidth - (cardGapX * (columnCount - 1))) / columnCount)
      : contentWidth;
    var title = sanitizePdfText(options && options.title || 'Ringkasan Data');
    var subtitle = sanitizePdfText(options && options.subtitle || '');
    var emptyText = sanitizePdfText(options && options.emptyText || 'Belum ada data untuk ditampilkan.');
    var exportedLabel = formatExportDateLabel(options && options.exportedAt);
    var summaryText = sanitizePdfText(options && options.summaryText || '');
    var items = Array.isArray(options && options.items) ? options.items : [];
    // Opsional: kalau diisi, tiap baris "Label: Value" otomatis dipecah — bagian sebelum ":"
    // tetap warna tinta biasa, bagian SETELAH ":" diwarnai valueColor (dipakai utk PDF detail
    // santri; tidak dipakai caller lain sehingga tidak mengubah tampilan PDF yang sudah ada).
    var valueColor = (options && Array.isArray(options.valueColor) && options.valueColor.length === 3) ? normalizeColor(options.valueColor, [16, 163, 74]) : null;
    // Opsional: default true (perilaku lama tetap jalan) — set eksplisit false utk sembunyikan
    // nomor urut otomatis "N. " di depan judul tiap kartu (dipakai PDF detail santri saja).
    var numberCards = !(options && options.numberCards === false);
    var encoder = new TextEncoder();
    var pages = [];
    var commands = [];
    var pageNumber = 0;
    var cursorTop = 0;

    function toRgb(color) {
      return color.map(function (value) {
        return (value / 255).toFixed(3);
      }).join(' ');
    }

    function push(command) {
      commands.push(command);
    }

    function drawRect(x, top, width, height, fillColor, strokeColor, lineWidth) {
      var pdfY = pageHeight - top - height;
      var lw = typeof lineWidth === 'number' ? lineWidth : 1;
      if (lw) {
        push(lw.toFixed(2) + ' w');
      }
      if (fillColor) {
        push(toRgb(fillColor) + ' rg');
      }
      if (strokeColor) {
        push(toRgb(strokeColor) + ' RG');
      }
      if (fillColor && strokeColor) {
        push(x.toFixed(2) + ' ' + pdfY.toFixed(2) + ' ' + width.toFixed(2) + ' ' + height.toFixed(2) + ' re B');
      } else if (fillColor) {
        push(x.toFixed(2) + ' ' + pdfY.toFixed(2) + ' ' + width.toFixed(2) + ' ' + height.toFixed(2) + ' re f');
      } else {
        push(x.toFixed(2) + ' ' + pdfY.toFixed(2) + ' ' + width.toFixed(2) + ' ' + height.toFixed(2) + ' re S');
      }
    }

    function drawText(x, top, text, size, fontName, color) {
      var pdfY = pageHeight - top - size;
      var font = fontName || 'F1';
      var ink = color || [42, 23, 18];
      push('BT /' + font + ' ' + size.toFixed(2) + ' Tf ' + toRgb(ink) + ' rg 1 0 0 1 ' + x.toFixed(2) + ' ' + pdfY.toFixed(2) + ' Tm (' + escapePdfText(text) + ') Tj ET');
    }

    function drawTextLines(x, top, lines, size, fontName, color, lineHeight) {
      var spacing = lineHeight || (size * 1.35);
      lines.forEach(function (line, index) {
        drawText(x, top + (index * spacing), line, size, fontName, color);
      });
      return lines.length * spacing;
    }

    // Estimasi lebar teks pakai formula perkiraan yang sama dgn wrapPdfTextLines (tidak ada
    // metrik font asli tersedia di sini), dipakai buat menaruh segmen berwarna berikutnya
    // tepat setelah segmen sebelumnya pada baris yang sama.
    function estimateTextWidth(text, size) {
      return sanitizePdfText(text).length * Math.max(size * 0.52, 4.5);
    }

    // Pecah tiap "Label: Value" jadi baris berlapis-warna kalau valueColor aktif — return array
    // of "line record" (tiap line record = array of {text, color}, dirender di baris yang sama
    // secara berurutan kiri-ke-kanan). Kalau valueColor tidak diisi (default), perilakunya
    // identik dengan wrap biasa (satu segmen per baris, warna null = pakai warna tinta biasa).
    function buildTextSegments(rawLines, availableTextWidth, fontSize) {
      var lineRecords = [];
      (Array.isArray(rawLines) ? rawLines : []).forEach(function (rawLine) {
        if (valueColor) {
          var idx = String(rawLine).indexOf(': ');
          if (idx !== -1) {
            var label = String(rawLine).slice(0, idx + 2);
            var value = String(rawLine).slice(idx + 2) || '-';
            var labelWidth = estimateTextWidth(label, fontSize);
            if (labelWidth < availableTextWidth - 20) {
              var valueLines = wrapPdfTextLines(value, availableTextWidth - labelWidth, fontSize);
              lineRecords.push([{ text: label, color: null }, { text: valueLines[0] || '', color: valueColor }]);
              for (var i = 1; i < valueLines.length; i++) {
                lineRecords.push([{ text: valueLines[i], color: valueColor }]);
              }
              return;
            }
          }
        }
        wrapPdfTextLines(rawLine, availableTextWidth, fontSize).forEach(function (wrapped) {
          lineRecords.push([{ text: wrapped, color: null }]);
        });
      });
      return lineRecords;
    }

    function drawSegmentedTextLines(x, top, lineRecords, size, fontName, inkColor, lineHeight) {
      var spacing = lineHeight || (size * 1.35);
      lineRecords.forEach(function (segments, index) {
        var cursorX = x;
        var y = top + (index * spacing);
        segments.forEach(function (seg) {
          drawText(cursorX, y, seg.text, size, fontName, seg.color || inkColor);
          cursorX += estimateTextWidth(seg.text, size);
        });
      });
      return lineRecords.length * spacing;
    }

    function drawFooter() {
      drawText(marginX, pageHeight - 24, 'Halaman ' + pageNumber, 9, 'F1', [123, 106, 88]);
    }

    function drawHeader(isContinuation) {
      if (isContinuation) {
        cursorTop = 28;
        return;
      }
      drawText(marginX, 28, title, 18, 'F2', [42, 23, 18]);
      if (subtitle) {
        drawText(marginX, 52, subtitle, 10, 'F1', [77, 64, 52]);
      }
      drawText(marginX, subtitle ? 68 : 52, 'Tanggal export: ' + exportedLabel, 10, 'F1', [77, 64, 52]);
      if (summaryText) {
        drawText(marginX, subtitle ? 84 : 68, summaryText, 10, 'F1', [77, 64, 52]);
      }
      cursorTop = subtitle ? 108 : 92;
      if (summaryText) {
        cursorTop += 16;
      }
    }

    function finishPage() {
      if (!commands.length) {
        return;
      }
      drawFooter();
      pages.push(commands.join('\n'));
      commands = [];
    }

    function startPage(isContinuation) {
      finishPage();
      pageNumber += 1;
      commands = [];
      drawHeader(!!isContinuation);
    }

    function ensureSpace(minHeight) {
      if (cursorTop + minHeight <= pageHeight - marginBottom) {
        return;
      }
      startPage(true);
    }

    function estimateBadgeRowHeight(badges, width) {
      var maxWidth = Math.max(68, width);
      var cursorLeft = 0;
      var rowTop = 0;
      var maxBottom = 0;

      (Array.isArray(badges) ? badges : []).filter(Boolean).forEach(function (badge) {
        var text = sanitizePdfText(badge);
        var badgeWidth = Math.min(maxWidth, Math.max(54, (text.length * 5.4) + 18));
        if (cursorLeft + badgeWidth > maxWidth) {
          cursorLeft = 0;
          rowTop = maxBottom + 6;
        }
        cursorLeft += badgeWidth + 6;
        if (rowTop + 18 > maxBottom) {
          maxBottom = rowTop + 18;
        }
      });

      return maxBottom;
    }

    function drawBadgeRow(left, top, badges, maxWidth) {
      var cursorLeft = left;
      var rowTop = top;
      var maxBottom = top;
      var width = Math.max(68, maxWidth || contentWidth - 24);
      (Array.isArray(badges) ? badges : []).filter(Boolean).forEach(function (badge) {
        var text = sanitizePdfText(badge);
        var badgeWidth = Math.min(width, Math.max(54, (text.length * 5.4) + 18));
        if (cursorLeft + badgeWidth > left + width) {
          cursorLeft = left;
          rowTop = maxBottom + 6;
        }
        drawRect(cursorLeft, rowTop, badgeWidth, 18, [248, 238, 225], [199, 165, 129], 0.8);
        drawText(cursorLeft + 8, rowTop + 5, text, 8.8, 'F1', [86, 62, 47]);
        cursorLeft += badgeWidth + 6;
        if (rowTop + 18 > maxBottom) {
          maxBottom = rowTop + 18;
        }
      });
      return maxBottom - top;
    }

    function buildCardLayout(item, width) {
      var accent = normalizeColor(item && item.accentColor, [151, 110, 77]);
      var titleText = sanitizePdfText(item && item.title || 'Tanpa judul');
      var lines = [];
      var lineHeight = width < 180 ? 11.4 : 12.5;
      var badges = Array.isArray(item && item.badges) ? item.badges : [];
      var availableTextWidth = Math.max(86, width - 28);
      var estimatedTextHeight;
      var estimatedBadgeHeight;
      var cardHeight;

      lines = buildTextSegments(Array.isArray(item && item.lines) ? item.lines : [], availableTextWidth, width < 180 ? 8.8 : 9.2);
      if (!lines.length) {
        lines.push([{ text: '-', color: null }]);
      }

      estimatedBadgeHeight = badges.length ? Math.max(20, estimateBadgeRowHeight(badges, width - 20)) : 0;
      estimatedTextHeight = lines.length * lineHeight;
      cardHeight = Math.max(78, 24 + estimatedBadgeHeight + estimatedTextHeight + 28);

      return {
        accent: accent,
        titleText: titleText,
        lines: lines,
        badges: badges,
        lineHeight: lineHeight,
        cardHeight: cardHeight
      };
    }

    function drawCard(layout, left, top, width, height, index) {
      var bodyStartTop;
      var usedBadgeHeight = 0;

      drawRect(left, top, width, height, [255, 251, 245], [214, 188, 159], 0.9);
      drawRect(left, top, 8, height, layout.accent, layout.accent, 0);
      drawText(left + 18, top + 12, (numberCards ? (index + 1) + '. ' : '') + layout.titleText, width < 180 ? 11.6 : 13.2, 'F2', [42, 23, 18]);

      bodyStartTop = top + 34;
      if (layout.badges.length) {
        usedBadgeHeight = drawBadgeRow(left + 18, bodyStartTop, layout.badges, width - 20);
        bodyStartTop += usedBadgeHeight + 10;
      }
      drawSegmentedTextLines(left + 18, bodyStartTop, layout.lines, width < 180 ? 8.8 : 9.2, 'F1', [76, 63, 52], layout.lineHeight);
    }

    function buildPdfBytes() {
      var objects = [];
      var offsets = [];
      var contentObjectIds = [];
      var pageObjectIds = [];
      var fontRegularId;
      var fontBoldId;
      var pagesId;
      var catalogId;
      var currentOffset;
      var chunks = [];

      function addObject(body) {
        objects.push(body);
        return objects.length;
      }

      fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
      fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

      pages.forEach(function (pageContent) {
        var contentId = addObject('<< /Length ' + encoder.encode(pageContent).length + ' >>\nstream\n' + pageContent + '\nendstream');
        var pageId = addObject('');
        contentObjectIds.push(contentId);
        pageObjectIds.push(pageId);
      });

      pagesId = addObject('');
      pageObjectIds.forEach(function (pageId, index) {
        objects[pageId - 1] = '<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + pageWidth.toFixed(2) + ' ' + pageHeight.toFixed(2) + '] /Resources << /Font << /F1 ' + fontRegularId + ' 0 R /F2 ' + fontBoldId + ' 0 R >> >> /Contents ' + contentObjectIds[index] + ' 0 R >>';
      });
      objects[pagesId - 1] = '<< /Type /Pages /Count ' + pageObjectIds.length + ' /Kids [' + pageObjectIds.map(function (pageId) { return pageId + ' 0 R'; }).join(' ') + '] >>';
      catalogId = addObject('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');

      chunks.push('%PDF-1.4\n');
      currentOffset = encoder.encode(chunks[0]).length;
      objects.forEach(function (body, index) {
        offsets.push(currentOffset);
        var objectText = (index + 1) + ' 0 obj\n' + body + '\nendobj\n';
        chunks.push(objectText);
        currentOffset += encoder.encode(objectText).length;
      });

      var xrefOffset = currentOffset;
      var xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
      offsets.forEach(function (offset) {
        xref += String(offset).padStart(10, '0') + ' 00000 n \n';
      });
      chunks.push(xref);
      chunks.push('trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF');
      return encoder.encode(chunks.join(''));
    }

    function buildSectionLayout(item) {
      var titleText = sanitizePdfText((item && item.title) || 'Bagian');
      var subtitleText = sanitizePdfText(
        Array.isArray(item && item.lines) && item.lines[0] ? item.lines[0] : ''
      );
      var cardHeight = subtitleText ? 54 : 38;
      return { titleText: titleText, subtitleText: subtitleText, cardHeight: cardHeight };
    }

    function drawSectionHeader(layout, left, top, width, height) {
      drawRect(left, top, width, height, [91, 57, 36], null, 0);
      drawText(left + 14, top + 11, layout.titleText, 13, 'F2', [255, 248, 236]);
      if (layout.subtitleText) {
        drawText(left + 14, top + 29, layout.subtitleText, 9.2, 'F1', [215, 190, 160]);
      }
    }

    startPage(false);
    if (!items.length) {
      ensureSpace(72);
      drawRect(marginX, cursorTop, contentWidth, 64, [255, 251, 243], [185, 118, 80], 0.8);
      drawText(marginX + 12, cursorTop + 18, emptyText, 11, 'F2', [42, 23, 18]);
      drawText(marginX + 12, cursorTop + 38, 'Ubah filter atau tambahkan data bila PDF ini perlu diisi.', 9.4, 'F1', [102, 89, 73]);
    } else {
      var renderIndex = 0;
      var dataCount = 0;
      while (renderIndex < items.length) {
        var currentItem = items[renderIndex];
        if (currentItem && currentItem.isSection) {
          var secLayout = buildSectionLayout(currentItem);
          ensureSpace(secLayout.cardHeight + cardGapY);
          drawSectionHeader(secLayout, marginX, cursorTop, contentWidth, secLayout.cardHeight);
          cursorTop += secLayout.cardHeight + cardGapY;
          renderIndex++;
        } else {
          var rowItems = [];
          var scanIndex = renderIndex;
          while (scanIndex < items.length && rowItems.length < columnCount && !(items[scanIndex] && items[scanIndex].isSection)) {
            rowItems.push(buildCardLayout(items[scanIndex], cardWidth));
            scanIndex++;
          }
          var rowHeight = rowItems.reduce(function (maxHeight, layout) {
            return Math.max(maxHeight, layout.cardHeight);
          }, 0);
          ensureSpace(rowHeight + cardGapY);
          rowItems.forEach(function (layout, columnIndex) {
            drawCard(
              layout,
              marginX + (columnIndex * (cardWidth + cardGapX)),
              cursorTop,
              cardWidth,
              rowHeight,
              dataCount + columnIndex
            );
          });
          dataCount += rowItems.length;
          cursorTop += rowHeight + cardGapY;
          renderIndex = scanIndex;
        }
      }
    }
    finishPage();

    return new Blob([buildPdfBytes()], { type: 'application/pdf' });
  }

  /* ── buildTablePdfBlob ─────────────────────────────────────────────────────
     Membuat PDF tabel landscape (A4).
     options: {
       title: string,
       subtitle: string,
       columns: [{ label, width }],   // width dalam pt, total harus <= 781
       rows: string[][],              // setiap baris = array string per kolom
       exportedAt: ISO string,
     }
  ─────────────────────────────────────────────────────────────────────────── */
  function buildTablePdfBlob(options) {
    var PAGE_W = 841.89, PAGE_H = 595.28;
    var MX = 30, MY_TOP = 26, MY_BOT = 26;
    var title     = sanitizePdfText((options && options.title)    || 'Laporan');
    var subtitle  = sanitizePdfText((options && options.subtitle) || '');
    var columns   = (options && options.columns) || [];
    var rows      = (options && options.rows)    || [];
    var exported  = formatExportDateLabel(options && options.exportedAt);
    var encoder   = new TextEncoder();
    var pages     = [];
    var cmds      = [];
    var pageNum   = 0;
    var curY      = 0;

    var HDR_H    = 18;
    var CELL_PAD = 4;
    var FONT_HDR = 7.5;
    var FONT_ROW = 8;
    var LINE_H   = FONT_ROW * 1.35;
    var HDR_BG   = [77, 64, 52];
    var ROW_BG1  = [255, 251, 245];
    var ROW_BG2  = [242, 235, 218];
    var MUTED    = [123, 106, 88];
    var INK      = [42, 23, 18];
    var WHITE    = [255, 255, 255];

    function toRgb(c) { return c.map(function(v) { return (v/255).toFixed(3); }).join(' '); }
    function p(s) { cmds.push(s); }
    function rect(x, y, w, h, fill, stroke, lw) {
      var py = PAGE_H - y - h;
      if (lw != null) p(lw.toFixed(2) + ' w');
      if (fill)   p(toRgb(fill)   + ' rg');
      if (stroke) p(toRgb(stroke) + ' RG');
      if (fill && stroke) p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re B');
      else if (fill)      p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
      else                p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re S');
    }
    function txt(x, y, s, sz, fn, col) {
      p('BT /'+fn+' '+sz.toFixed(2)+' Tf '+toRgb(col)+' rg 1 0 0 1 '+x.toFixed(2)+' '+(PAGE_H-y-sz).toFixed(2)+' Tm ('+escapePdfText(s)+') Tj ET');
    }
    function finishPage() {
      if (!cmds.length) return;
      txt(MX, PAGE_H - MY_BOT + 4, 'Halaman ' + pageNum, 8, 'F1', MUTED);
      pages.push(cmds.join('\n')); cmds = [];
    }
    function startPage(cont) {
      finishPage(); pageNum++;
      if (!cont) {
        txt(MX, MY_TOP, title, 14, 'F2', INK);
        var sub2 = subtitle ? subtitle + '  |  ' : '';
        txt(MX, MY_TOP + 18, sub2 + 'Dicetak: ' + exported, 8.5, 'F1', MUTED);
        curY = MY_TOP + 36;
      } else {
        curY = MY_TOP;
      }
    }
    function drawHeaderRow() {
      var x = MX;
      rect(MX, curY, PAGE_W - MX*2, HDR_H, HDR_BG, null, 0);
      columns.forEach(function(col) {
        txt(x + CELL_PAD, curY + 5, sanitizePdfText(col.label), FONT_HDR, 'F2', WHITE);
        x += col.width;
      });
      curY += HDR_H;
    }
    function cellLines(text, colWidth) {
      return wrapPdfTextLines(text, colWidth - CELL_PAD * 2, FONT_ROW);
    }
    function drawDataRow(rowArr, rowIdx) {
      var wrappedCells = columns.map(function(col, ci) { return cellLines(rowArr[ci] || '', col.width); });
      var maxLines = wrappedCells.reduce(function(m, ls) { return Math.max(m, ls.length); }, 1);
      var rowH = Math.max(HDR_H, maxLines * LINE_H + CELL_PAD * 2);
      if (curY + rowH > PAGE_H - MY_BOT - 14) { startPage(true); drawHeaderRow(); }
      var bg = rowIdx % 2 === 0 ? ROW_BG1 : ROW_BG2;
      rect(MX, curY, PAGE_W - MX*2, rowH, bg, null, 0);
      var x = MX;
      columns.forEach(function(col, ci) {
        var ls = wrappedCells[ci];
        ls.forEach(function(line, li) { txt(x + CELL_PAD, curY + CELL_PAD + li * LINE_H, line, FONT_ROW, 'F1', INK); });
        x += col.width;
      });
      /* vertical grid lines */
      x = MX;
      columns.forEach(function(col) { x += col.width; rect(x - 0.3, curY, 0.3, rowH, MUTED, null, 0); });
      curY += rowH;
    }

    startPage(false);
    if (!rows.length) {
      rect(MX, curY, PAGE_W - MX*2, 40, ROW_BG1, null, 0);
      txt(MX + 10, curY + 13, 'Tidak ada data untuk ditampilkan.', 10, 'F2', MUTED);
      curY += 40;
    } else {
      drawHeaderRow();
      rows.forEach(function(row, i) { drawDataRow(row, i); });
    }
    finishPage();

    /* build PDF bytes */
    var objs = [], offs = [], contIds = [], pageIds = [];
    function addObj(body) { objs.push(body); return objs.length; }
    var f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    var f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    pages.forEach(function(pc) {
      var cid = addObj('<< /Length '+encoder.encode(pc).length+' >>\nstream\n'+pc+'\nendstream');
      var pid = addObj(''); contIds.push(cid); pageIds.push(pid);
    });
    var pagesId = addObj('');
    pageIds.forEach(function(pid, i) {
      objs[pid-1] = '<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+PAGE_W.toFixed(2)+' '+PAGE_H.toFixed(2)+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+contIds[i]+' 0 R >>';
    });
    objs[pagesId-1] = '<< /Type /Pages /Count '+pageIds.length+' /Kids ['+pageIds.map(function(id){ return id+' 0 R'; }).join(' ')+'] >>';
    var catId = addObj('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
    var chunks = ['%PDF-1.4\n']; var off = encoder.encode(chunks[0]).length;
    objs.forEach(function(body, i) {
      offs.push(off);
      var t = (i+1)+' 0 obj\n'+body+'\nendobj\n'; chunks.push(t); off += encoder.encode(t).length;
    });
    var xrefOff = off;
    var xref = 'xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
    offs.forEach(function(o) { xref += String(o).padStart(10,'0')+' 00000 n \n'; });
    chunks.push(xref);
    chunks.push('trailer\n<< /Size '+(objs.length+1)+' /Root '+catId+' 0 R >>\nstartxref\n'+xrefOff+'\n%%EOF');
    return new Blob([encoder.encode(chunks.join(''))], { type: 'application/pdf' });
  }

  /* ── buildMultiTablePdfBlob ───────────────────────────────────────────────
     PDF LEBAR CUSTOM (bukan A4) berisi BEBERAPA tabel mentah dari DB, satu blok per tabel,
     tiap tabel bisa punya kolomnya sendiri-sendiri (beda dari buildTablePdfBlob yang cuma
     satu tabel). Dipakai utk tombol "Download Tabel Mentah" — tabel mengalir berurutan dlm
     satu file, pindah halaman otomatis kalau kurang muat, header tabel digambar ulang tiap
     pindah halaman di tengah tabel yang sama. Lebar halaman dihitung dari `options.pageWidth`
     (caller yang tentukan, biasanya = margin + kolom terbanyak x lebar-kolom tetap, supaya
     kolom DB yang banyak tetap lega, tidak diperas muat ke lebar A4) — kalau tidak diisi,
     fallback ke lebar landscape A4 lama.
     options: {
       title, subtitle, exportedAt, pageWidth,
       tables: [{ title, columns: [{label,width}], rows: string[][] }, ...]
     }
  ─────────────────────────────────────────────────────────────────────────── */
  function buildMultiTablePdfBlob(options) {
    var PAGE_W = (options && Number(options.pageWidth) > 0) ? Number(options.pageWidth) : 841.89;
    var PAGE_H = 595.28;
    var MX = 30, MY_TOP = 26, MY_BOT = 26;
    var title    = sanitizePdfText((options && options.title)    || 'Laporan');
    var subtitle = sanitizePdfText((options && options.subtitle) || '');
    var tables   = (options && options.tables) || [];
    var exported = formatExportDateLabel(options && options.exportedAt);
    var encoder  = new TextEncoder();
    var pages = [], cmds = [], pageNum = 0, curY = 0;

    var HDR_H = 18, CELL_PAD = 4, FONT_HDR = 7.5, FONT_ROW = 8, LINE_H = FONT_ROW * 1.35;
    var HDR_BG = [77, 64, 52], ROW_BG1 = [255, 251, 245], ROW_BG2 = [242, 235, 218];
    var MUTED = [123, 106, 88], INK = [42, 23, 18], WHITE = [255, 255, 255];
    var TABLE_TITLE_H = 22, TABLE_TITLE_BG = [91, 57, 36], TABLE_TITLE_INK = [255, 248, 236];
    var TABLE_GAP = 14;

    function toRgb(c) { return c.map(function (v) { return (v / 255).toFixed(3); }).join(' '); }
    function p(s) { cmds.push(s); }
    function rect(x, y, w, h, fill, stroke, lw) {
      var py = PAGE_H - y - h;
      if (lw != null) p(lw.toFixed(2) + ' w');
      if (fill)   p(toRgb(fill)   + ' rg');
      if (stroke) p(toRgb(stroke) + ' RG');
      if (fill && stroke) p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re B');
      else if (fill)      p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
      else                p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re S');
    }
    function txt(x, y, s, sz, fn, col) {
      p('BT /'+fn+' '+sz.toFixed(2)+' Tf '+toRgb(col)+' rg 1 0 0 1 '+x.toFixed(2)+' '+(PAGE_H-y-sz).toFixed(2)+' Tm ('+escapePdfText(s)+') Tj ET');
    }
    function finishPage() {
      if (!cmds.length) return;
      txt(MX, PAGE_H - MY_BOT + 4, 'Halaman ' + pageNum, 8, 'F1', MUTED);
      pages.push(cmds.join('\n')); cmds = [];
    }
    function startPage(cont) {
      finishPage(); pageNum++;
      if (!cont) {
        txt(MX, MY_TOP, title, 14, 'F2', INK);
        var sub2 = subtitle ? subtitle + '  |  ' : '';
        txt(MX, MY_TOP + 18, sub2 + 'Dicetak: ' + exported, 8.5, 'F1', MUTED);
        curY = MY_TOP + 36;
      } else {
        curY = MY_TOP;
      }
    }
    function ensureSpace(h) {
      if (curY + h > PAGE_H - MY_BOT - 14) startPage(true);
    }
    var currentColumns = [];
    function currentTableWidth() {
      return currentColumns.reduce(function (sum, col) { return sum + col.width; }, 0) || (PAGE_W - MX * 2);
    }
    function drawTableTitle(t, subt) {
      ensureSpace(TABLE_TITLE_H + 6);
      rect(MX, curY, PAGE_W - MX * 2, TABLE_TITLE_H, TABLE_TITLE_BG, null, 0);
      txt(MX + 10, curY + 6, sanitizePdfText(t), 10.5, 'F2', TABLE_TITLE_INK);
      if (subt) txt(MX + 10 + (t.length * 5.6) + 14, curY + 6.5, sanitizePdfText(subt), 8, 'F1', [222, 202, 178]);
      curY += TABLE_TITLE_H + 6;
    }
    function drawHeaderRow() {
      var x = MX;
      rect(MX, curY, currentTableWidth(), HDR_H, HDR_BG, null, 0);
      currentColumns.forEach(function (col) {
        txt(x + CELL_PAD, curY + 5, sanitizePdfText(col.label), FONT_HDR, 'F2', WHITE);
        x += col.width;
      });
      curY += HDR_H;
    }
    function cellLines(text, colWidth) {
      return wrapPdfTextLines(text, colWidth - CELL_PAD * 2, FONT_ROW);
    }
    function drawDataRow(rowArr, rowIdx) {
      var wrappedCells = currentColumns.map(function (col, ci) { return cellLines(rowArr[ci] || '', col.width); });
      var maxLines = wrappedCells.reduce(function (m, ls) { return Math.max(m, ls.length); }, 1);
      var rowH = Math.max(HDR_H, maxLines * LINE_H + CELL_PAD * 2);
      if (curY + rowH > PAGE_H - MY_BOT - 14) { startPage(true); drawHeaderRow(); }
      var bg = rowIdx % 2 === 0 ? ROW_BG1 : ROW_BG2;
      rect(MX, curY, currentTableWidth(), rowH, bg, null, 0);
      var x = MX;
      currentColumns.forEach(function (col, ci) {
        var ls = wrappedCells[ci];
        ls.forEach(function (line, li) { txt(x + CELL_PAD, curY + CELL_PAD + li * LINE_H, line, FONT_ROW, 'F1', INK); });
        x += col.width;
      });
      x = MX;
      currentColumns.forEach(function (col) { x += col.width; rect(x - 0.3, curY, 0.3, rowH, MUTED, null, 0); });
      curY += rowH;
    }

    startPage(false);
    if (!tables.length) {
      rect(MX, curY, PAGE_W - MX * 2, 40, ROW_BG1, null, 0);
      txt(MX + 10, curY + 13, 'Tidak ada tabel untuk ditampilkan.', 10, 'F2', MUTED);
      curY += 40;
    } else {
      tables.forEach(function (tbl) {
        var columns = Array.isArray(tbl && tbl.columns) ? tbl.columns : [];
        var rows = Array.isArray(tbl && tbl.rows) ? tbl.rows : [];
        currentColumns = columns;
        drawTableTitle((tbl && tbl.title) || 'Tabel', rows.length + ' baris');
        if (!rows.length || !columns.length) {
          rect(MX, curY, currentTableWidth(), 26, ROW_BG1, null, 0);
          txt(MX + 10, curY + 9, 'Tidak ada data pada tabel ini.', 9, 'F1', MUTED);
          curY += 26 + TABLE_GAP;
          return;
        }
        drawHeaderRow();
        rows.forEach(function (row, i) { drawDataRow(row, i); });
        curY += TABLE_GAP;
      });
    }
    finishPage();

    var objs = [], offs = [], contIds = [], pageIds = [];
    function addObj(body) { objs.push(body); return objs.length; }
    var f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    var f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    pages.forEach(function (pc) {
      var cid = addObj('<< /Length '+encoder.encode(pc).length+' >>\nstream\n'+pc+'\nendstream');
      var pid = addObj(''); contIds.push(cid); pageIds.push(pid);
    });
    var pagesId = addObj('');
    pageIds.forEach(function (pid, i) {
      objs[pid-1] = '<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+PAGE_W.toFixed(2)+' '+PAGE_H.toFixed(2)+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+contIds[i]+' 0 R >>';
    });
    objs[pagesId-1] = '<< /Type /Pages /Count '+pageIds.length+' /Kids ['+pageIds.map(function(id){ return id+' 0 R'; }).join(' ')+'] >>';
    var catId = addObj('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
    var chunks = ['%PDF-1.4\n']; var off = encoder.encode(chunks[0]).length;
    objs.forEach(function (body, i) {
      offs.push(off);
      var t = (i+1)+' 0 obj\n'+body+'\nendobj\n'; chunks.push(t); off += encoder.encode(t).length;
    });
    var xrefOff = off;
    var xref = 'xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
    offs.forEach(function (o) { xref += String(o).padStart(10,'0')+' 00000 n \n'; });
    chunks.push(xref);
    chunks.push('trailer\n<< /Size '+(objs.length+1)+' /Root '+catId+' 0 R >>\nstartxref\n'+xrefOff+'\n%%EOF');
    return new Blob([encoder.encode(chunks.join(''))], { type: 'application/pdf' });
  }

  /* ── buildRosterGridPdfBlob ────────────────────────────────────────────────
     Membuat PDF grid landscape (A4): tiap KOLOM = satu halaqoh.
     Header kolom = nama halaqoh, 3 baris berikutnya = pengampu (P1-P3),
     lalu baris-baris selanjutnya = nama santri. Jumlah kolom per halaman
     mengikuti columnsPerPage (default 10) agar minimal 10 halaqoh tampil
     sejajar dalam satu halaman.
     options: {
       title, subtitle, exportedAt, emptyText,
       columnsPerPage: number,
       groups: [{ name, pengampuSlots: string[3], santriLabels: string[] }]
     }
  ─────────────────────────────────────────────────────────────────────────── */
  function buildRosterGridPdfBlob(options) {
    var PAGE_W = 841.89, PAGE_H = 595.28;
    var MX = 30, MY_TOP = 26, MY_BOT = 22;
    var title    = sanitizePdfText((options && options.title)    || 'Roster Halaqoh');
    var subtitle = sanitizePdfText((options && options.subtitle) || '');
    var emptyText = sanitizePdfText((options && options.emptyText) || 'Tidak ada data untuk ditampilkan.');
    var groups   = Array.isArray(options && options.groups) ? options.groups : [];
    var columnsPerPage = Math.max(1, parseInt(options && options.columnsPerPage, 10) || 10);
    var exported = formatExportDateLabel(options && options.exportedAt);
    var encoder  = new TextEncoder();
    var pages = [], cmds = [], pageNum = 0, curY = 0;
    var isFirstPageOverall = true;

    var IDX_W = 22;
    var HDR_FONT = 8.2, PENGAMPU_FONT = 7.2, SANTRI_FONT = 7.2, IDX_FONT = 7;
    var HDR_LINE_H = HDR_FONT * 1.25;
    var PENGAMPU_ROW_H = 12.5, SANTRI_ROW_H = 11.5, CELL_PAD = 5;
    var HDR_BG = [77, 64, 52], PENGAMPU_BG = [238, 223, 201];
    var SANTRI_BG1 = [255, 251, 245], SANTRI_BG2 = [246, 240, 227];
    var INK = [42, 23, 18], MUTED = [123, 106, 88], WHITE = [255, 255, 255], BADAL_INK = [154, 90, 58];

    function toRgb(c) { return c.map(function (v) { return (v / 255).toFixed(3); }).join(' '); }
    function p(s) { cmds.push(s); }
    function rect(x, y, w, h, fill, stroke, lw) {
      var py = PAGE_H - y - h;
      if (lw != null) p(lw.toFixed(2) + ' w');
      if (fill)   p(toRgb(fill)   + ' rg');
      if (stroke) p(toRgb(stroke) + ' RG');
      if (fill && stroke) p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re B');
      else if (fill)      p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
      else                p(x.toFixed(2)+' '+py.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re S');
    }
    function txt(x, y, s, sz, fn, col) {
      p('BT /'+fn+' '+sz.toFixed(2)+' Tf '+toRgb(col)+' rg 1 0 0 1 '+x.toFixed(2)+' '+(PAGE_H-y-sz).toFixed(2)+' Tm ('+escapePdfText(s)+') Tj ET');
    }
    function firstLineForWidth(text, width, fontSize) {
      var lines = wrapPdfTextLines(text, width, fontSize);
      return lines.length ? lines[0] : '';
    }
    function finishPage() {
      if (!cmds.length) return;
      txt(MX, PAGE_H - 14, 'Halaman ' + pageNum, 8, 'F1', MUTED);
      pages.push(cmds.join('\n')); cmds = [];
    }
    function startPage() {
      finishPage(); pageNum++;
      if (isFirstPageOverall) {
        txt(MX, MY_TOP, title, 14, 'F2', INK);
        var sub2 = subtitle ? subtitle + '  |  ' : '';
        txt(MX, MY_TOP + 18, sub2 + 'Dicetak: ' + exported, 8.5, 'F1', MUTED);
        curY = MY_TOP + 34;
        isFirstPageOverall = false;
      } else {
        curY = MY_TOP;
      }
    }

    function drawGridHeader(batch, colWidth) {
      var wrapped = batch.map(function (g) {
        return wrapPdfTextLines(sanitizePdfText((g && g.name) || 'Tanpa nama'), colWidth - CELL_PAD * 2, HDR_FONT);
      });
      var maxLines = wrapped.reduce(function (m, ls) { return Math.max(m, ls.length); }, 1);
      var hdrH = Math.max(20, maxLines * HDR_LINE_H + CELL_PAD * 2);
      var blockTop = curY;

      rect(MX, curY, IDX_W, hdrH, HDR_BG, null, 0);
      txt(MX + 5, curY + CELL_PAD, 'No', HDR_FONT - 1, 'F2', WHITE);
      var x = MX + IDX_W;
      batch.forEach(function (g, i) {
        rect(x, curY, colWidth, hdrH, HDR_BG, null, 0);
        wrapped[i].forEach(function (line, li) {
          txt(x + CELL_PAD, curY + CELL_PAD + li * HDR_LINE_H, line, HDR_FONT, 'F2', WHITE);
        });
        x += colWidth;
      });
      curY += hdrH;

      for (var r = 0; r < 3; r += 1) {
        rect(MX, curY, IDX_W, PENGAMPU_ROW_H, PENGAMPU_BG, null, 0);
        txt(MX + 5, curY + 3, 'P' + (r + 1), IDX_FONT, 'F1', MUTED);
        var xx = MX + IDX_W;
        batch.forEach(function (g) {
          rect(xx, curY, colWidth, PENGAMPU_ROW_H, PENGAMPU_BG, null, 0);
          var slots = (g && g.pengampuSlots) || [];
          var val = slots[r] || '';
          if (val) {
            var isBadal = /^\(B\)/.test(val);
            txt(xx + CELL_PAD, curY + 3, firstLineForWidth(val, colWidth - CELL_PAD * 2, PENGAMPU_FONT), PENGAMPU_FONT, 'F1', isBadal ? BADAL_INK : INK);
          }
          xx += colWidth;
        });
        curY += PENGAMPU_ROW_H;
      }

      var blockH = curY - blockTop;
      var gx = MX + IDX_W;
      rect(gx - 0.3, blockTop, 0.3, blockH, MUTED, null, 0);
      batch.forEach(function () {
        gx += colWidth;
        rect(gx - 0.3, blockTop, 0.3, blockH, MUTED, null, 0);
      });
    }

    function drawSantriRow(batch, colWidth, rowIndex, displayIndex) {
      var bg = rowIndex % 2 === 0 ? SANTRI_BG1 : SANTRI_BG2;
      rect(MX, curY, IDX_W, SANTRI_ROW_H, bg, null, 0);
      txt(MX + 5, curY + 2.6, String(displayIndex), IDX_FONT, 'F1', MUTED);
      var x = MX + IDX_W;
      batch.forEach(function (g) {
        rect(x, curY, colWidth, SANTRI_ROW_H, bg, null, 0);
        var name = (g && g.santriLabels && g.santriLabels[rowIndex]) || '';
        if (name) {
          txt(x + CELL_PAD, curY + 2.6, firstLineForWidth(sanitizePdfText(name), colWidth - CELL_PAD * 2, SANTRI_FONT), SANTRI_FONT, 'F1', INK);
        }
        x += colWidth;
      });
      var gx = MX + IDX_W;
      rect(gx - 0.3, curY, 0.3, SANTRI_ROW_H, MUTED, null, 0);
      batch.forEach(function () { gx += colWidth; rect(gx - 0.3, curY, 0.3, SANTRI_ROW_H, MUTED, null, 0); });
      curY += SANTRI_ROW_H;
    }

    if (!groups.length) {
      startPage();
      rect(MX, curY, PAGE_W - MX * 2, 40, [255, 251, 245], null, 0);
      txt(MX + 10, curY + 13, emptyText, 10, 'F2', MUTED);
      curY += 40;
    } else {
      for (var b = 0; b < groups.length; b += columnsPerPage) {
        var batch = groups.slice(b, b + columnsPerPage);
        var colWidth = (PAGE_W - MX * 2 - IDX_W) / batch.length;
        startPage();
        drawGridHeader(batch, colWidth);
        var maxSantri = batch.reduce(function (m, g) { return Math.max(m, ((g && g.santriLabels) || []).length); }, 0);
        for (var s = 0; s < maxSantri; s += 1) {
          if (curY + SANTRI_ROW_H > PAGE_H - MY_BOT) {
            startPage();
            drawGridHeader(batch, colWidth);
          }
          drawSantriRow(batch, colWidth, s, s + 1);
        }
        if (!maxSantri) {
          rect(MX, curY, PAGE_W - MX * 2, 24, SANTRI_BG1, null, 0);
          txt(MX + 10, curY + 9, 'Belum ada santri terdaftar.', 8.5, 'F1', MUTED);
          curY += 24;
        }
      }
    }
    finishPage();

    var objs = [], offs = [], contIds = [], pageIds = [];
    function addObj(body) { objs.push(body); return objs.length; }
    var f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    var f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    pages.forEach(function (pc) {
      var cid = addObj('<< /Length '+encoder.encode(pc).length+' >>\nstream\n'+pc+'\nendstream');
      var pid = addObj(''); contIds.push(cid); pageIds.push(pid);
    });
    var pagesId = addObj('');
    pageIds.forEach(function (pid, i) {
      objs[pid-1] = '<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+PAGE_W.toFixed(2)+' '+PAGE_H.toFixed(2)+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+contIds[i]+' 0 R >>';
    });
    objs[pagesId-1] = '<< /Type /Pages /Count '+pageIds.length+' /Kids ['+pageIds.map(function(id){ return id+' 0 R'; }).join(' ')+'] >>';
    var catId = addObj('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');
    var chunks = ['%PDF-1.4\n']; var off = encoder.encode(chunks[0]).length;
    objs.forEach(function (body, i) {
      offs.push(off);
      var t = (i+1)+' 0 obj\n'+body+'\nendobj\n'; chunks.push(t); off += encoder.encode(t).length;
    });
    var xrefOff = off;
    var xref = 'xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
    offs.forEach(function (o) { xref += String(o).padStart(10,'0')+' 00000 n \n'; });
    chunks.push(xref);
    chunks.push('trailer\n<< /Size '+(objs.length+1)+' /Root '+catId+' 0 R >>\nstartxref\n'+xrefOff+'\n%%EOF');
    return new Blob([encoder.encode(chunks.join(''))], { type: 'application/pdf' });
  }

  window.PSExport = {
    buildCardSummaryPdfBlob: buildCardSummaryPdfBlob,
    buildTablePdfBlob: buildTablePdfBlob,
    buildMultiTablePdfBlob: buildMultiTablePdfBlob,
    buildRosterGridPdfBlob: buildRosterGridPdfBlob,
    downloadBlobFile: downloadBlobFile,
    formatExportDateLabel: formatExportDateLabel,
    formatExportFileTimestamp: formatExportFileTimestamp
  };
}());
