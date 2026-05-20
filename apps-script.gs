const SPREADSHEET_ID = "COLOCAR_AQUI_EL_ID_DEL_GOOGLE_SHEET";

function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const p = e && e.parameter ? e.parameter : {};
    const callback = p.callback || "";
    const sheetName = p.hoja || "Resultados";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    const headers = ["fechaRegistro","idEnvio","nombre","curso","paralelo","tema","tipoActividad","numeroEjercicios","puntajeInicial","promedioInicial","recuperacionHabilitada","promedioRecuperacion","notaFinal","porcentajeFinal","nivel","estado","fechaLimite","observacion","detalleEjercicios","userAgent","urlOrigen","fechaCliente"];
    ensureHeaders_(sheet, headers);

    const idEnvio = p.idEnvio || "";
    if (idEnvio) {
      const existingRow = findExistingId_(sheet, headers, idEnvio);
      if (existingRow) return respond_({ ok: true, duplicado: true, hoja: sheetName, fila: existingRow, idEnvio }, callback);
    }

    sheet.appendRow([new Date(), idEnvio, p.nombre || "", p.curso || "", p.paralelo || "", p.tema || "", p.tipoActividad || "", p.numeroEjercicios || "", p.puntajeInicial || "", p.promedioInicial || "", p.recuperacionHabilitada || "", p.promedioRecuperacion || "", p.notaFinal || "", p.porcentajeFinal || "", p.nivel || "", p.estado || "", p.fechaLimite || "", p.observacion || "", p.detalleEjercicios || "", p.userAgent || "", p.urlOrigen || "", p.fechaCliente || ""]);
    return respond_({ ok: true, duplicado: false, hoja: sheetName, fila: sheet.getLastRow(), idEnvio }, callback);
  } catch (error) {
    return respond_({ ok: false, error: String(error) }, e && e.parameter ? e.parameter.callback : "");
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}
function ensureHeaders_(sheet, headers) { if (sheet.getLastRow() === 0) return void sheet.appendRow(headers); const current = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),headers.length)).getValues()[0]; if (!current.some((v)=>String(v||"").trim()!=="")) sheet.getRange(1,1,1,headers.length).setValues([headers]); }
function findExistingId_(sheet, headers, idEnvio) { const lastRow = sheet.getLastRow(); if (lastRow < 2) return null; const idCol = headers.indexOf("idEnvio") + 1; const values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues(); for (let i=0;i<values.length;i++) if (String(values[i][0])===String(idEnvio)) return i+2; return null; }
function respond_(obj, callback) { const json = JSON.stringify(obj); if (callback) return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT); return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON); }
