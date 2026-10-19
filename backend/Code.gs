var ARKUSZ_POLECENIA = "Polecenia";

var ARKUSZ_STAN = "Stan";

var NAGLOWKI = [
 "id",
 "czas",
 "dzial",
 "tresc",
 "priorytet",
 "status",
 "odpowiedz",
 "zrodlo",
];

var STREFA = "Europe/Berlin";

var PRIORYTETY = [
 "niski",
 "normalny",
 "wysoki",
 "pilne",
];

var STATUSY = [
 "nowe",
 "w toku",
 "zrobione",
 "odrzucone",
];

var MAKS_TRESC = 2e3;

var MAKS_LISTA = 50;

function przygotujArkusz() {
 var ss = arkusz_();
 var sh =
  ss.getSheetByName(ARKUSZ_POLECENIA) ||
  ss.insertSheet(ARKUSZ_POLECENIA);
 sh
  .getRange(1, 1, 1, NAGLOWKI.length)
  .setValues([NAGLOWKI])
  .setFontWeight("bold")
  .setBackground("#0b2a3a")
  .setFontColor("#ffffff");
 sh.setFrozenRows(1);
 sh.getRange("A:B").setNumberFormat("@");
 sh.getRange("D:D").setWrap(true);
 sh.setColumnWidth(1, 150);
 sh.setColumnWidth(2, 150);
 sh.setColumnWidth(3, 130);
 sh.setColumnWidth(4, 420);
 sh.setColumnWidth(7, 320);
 var st =
  ss.getSheetByName(ARKUSZ_STAN) ||
  ss.insertSheet(ARKUSZ_STAN);
 if (st.getLastRow() === 0) {
  st
   .getRange(1, 1, 1, 3)
   .setValues([["klucz", "wartosc", "zmieniono"]])
   .setFontWeight("bold");
  st.setFrozenRows(1);
 }
 Logger.log(
  "Gotowe: zakładki „%s” i „%s”.",
  ARKUSZ_POLECENIA,
  ARKUSZ_STAN,
 );
}

function ustawToken() {
 var token = "WPISZ-TUTAJ-DLUGIE-HASLO";
 if (!token || token === "WPISZ-TUTAJ-DLUGIE-HASLO") {
  token =
   Utilities.getUuid().replace(/-/g, "") +
   Utilities.getUuid().replace(/-/g, "").slice(0, 8);
 }
 if (token.length < 16)
  throw new Error("Token za krotki");
 PropertiesService.getScriptProperties().setProperty(
  "TOKEN",
  token,
 );
 Logger.log(
  "TOKEN: %s",
  token,
 );
}

function doGet(e) {
 try {
  var p = (e && e.parameter) || {};
  if (!tokenOk_(p.token))
   return json_({
    ok: false,
    blad: "brak dostępu (zły lub brak tokenu)",
   });
  var akcja = String(p.akcja || "lista");
  if (akcja === "ping")
   return json_({
    ok: true,
    pong: true,
    czas: teraz_(),
   });
  if (akcja !== "lista")
   return json_({
    ok: false,
    blad: "nieznana akcja: " + akcja,
   });
  var n = Math.max(
   1,
   Math.min(
    MAKS_LISTA,
    parseInt(p.n, 10) || MAKS_LISTA,
   ),
  );
  var wynik = {
   ok: true,
   czas: teraz_(),
   polecenia: lista_(n),
  };
  if (String(p.stan || "1") !== "0")
   wynik.stan = stan_();
  return json_(wynik);
 } catch (err) {
  return json_({
   ok: false,
   blad: String((err && err.message) || err),
  });
 }
}

function doPost(e) {
 try {
  var d = {};
  var surowe = e && e.postData && e.postData.contents;
  if (surowe) {
   try {
    d = JSON.parse(surowe);
   } catch (x) {
    return json_({
     ok: false,
     blad: "treść nie jest poprawnym JSON",
    });
   }
  } else if (e && e.parameter) {
   d = e.parameter;
  }
  if (!tokenOk_(d.token))
   return json_({
    ok: false,
    blad: "brak dostępu (zły lub brak tokenu)",
   });
  var akcja = String(d.akcja || "dodaj");
  if (akcja === "dodaj") return json_(dodaj_(d));
  if (akcja === "status")
   return json_(zmienStatus_(d));
  return json_({
   ok: false,
   blad: "nieznana akcja: " + akcja,
  });
 } catch (err) {
  return json_({
   ok: false,
   blad: String((err && err.message) || err),
  });
 }
}

function dodaj_(d) {
 var tresc = String(d.tresc || "").trim();
 if (!tresc)
  return {
   ok: false,
   blad: "pusta treść polecenia",
  };
 if (tresc.length > MAKS_TRESC)
  return {
   ok: false,
   blad:
    "treść za długa (max " + MAKS_TRESC + " znaków)",
  };
 var dzial = String(d.dzial || "Rovi")
  .trim()
  .slice(0, 60);
 var prio = String(d.priorytet || "normalny")
  .trim()
  .toLowerCase();
 if (PRIORYTETY.indexOf(prio) < 0) prio = "normalny";
 var zrodlo = String(d.zrodlo || "aplikacja")
  .trim()
  .slice(0, 80);
 var lock = LockService.getScriptLock();
 lock.waitLock(1e4);
 try {
  var sh = polecenia_();
  var id =
   "P-" +
   Utilities.formatDate(
    new Date(),
    STREFA,
    "yyMMdd-HHmmss",
   ) +
   "-" +
   Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase();
  var wiersz = [
   id,
   teraz_(),
   bezpieczny_(dzial),
   bezpieczny_(tresc),
   prio,
   "nowe",
   "",
   bezpieczny_(zrodlo),
  ];
  sh.appendRow(wiersz);
  return {
   ok: true,
   polecenie: obiekt_(wiersz),
  };
 } finally {
  lock.releaseLock();
 }
}

function zmienStatus_(d) {
 var id = String(d.id || "").trim();
 if (!id)
  return {
   ok: false,
   blad: "brak id",
  };
 var status =
  d.status != null
   ? String(d.status).trim().toLowerCase()
   : null;
 if (status !== null && STATUSY.indexOf(status) < 0)
  return {
   ok: false,
   blad:
    "status musi być jednym z: " + STATUSY.join(", "),
  };
 var lock = LockService.getScriptLock();
 lock.waitLock(1e4);
 try {
  var sh = polecenia_();
  var last = sh.getLastRow();
  if (last < 2)
   return {
    ok: false,
    blad: "brak poleceń",
   };
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
   if (String(ids[i][0]) === id) {
    var r = i + 2;
    if (status !== null)
     sh.getRange(r, 6).setValue(status);
    if (d.odpowiedz != null)
     sh
      .getRange(r, 7)
      .setValue(
       bezpieczny_(String(d.odpowiedz).slice(0, 4e3)),
      );
    return {
     ok: true,
     polecenie: obiekt_(
      sh
       .getRange(r, 1, 1, NAGLOWKI.length)
       .getValues()[0],
     ),
    };
   }
  }
  return {
   ok: false,
   blad: "nie znaleziono id " + id,
  };
 } finally {
  lock.releaseLock();
 }
}

function lista_(n) {
 var sh = polecenia_();
 var last = sh.getLastRow();
 if (last < 2) return [];
 var od = Math.max(2, last - n + 1);
 var w = sh
  .getRange(od, 1, last - od + 1, NAGLOWKI.length)
  .getDisplayValues();
 return w
  .filter(function (r) {
   return r[0];
  })
  .map(obiekt_)
  .reverse();
}

function stan_() {
 var st = arkusz_().getSheetByName(ARKUSZ_STAN);
 if (!st || st.getLastRow() < 2) return [];
 var w = st
  .getRange(
   1,
   1,
   st.getLastRow(),
   Math.max(1, st.getLastColumn()),
  )
  .getDisplayValues();
 var nag = w.shift();
 return w
  .filter(function (r) {
   return r.join("") !== "";
  })
  .map(function (r) {
   var o = {};
   nag.forEach(function (k, i) {
    o[k || "kol" + (i + 1)] = r[i];
   });
   return o;
  });
}

function arkusz_() {
 var ss = null;
 try {
  ss = SpreadsheetApp.getActiveSpreadsheet();
 } catch (x) {}
 if (ss) return ss;
 var sid =
  PropertiesService.getScriptProperties().getProperty(
   "SHEET_ID",
  ) || "1LSQPVi5ds5xFDsQBDO0xCjrDOQU9ZkgbqD1lR6MOioM";
 if (!sid)
  throw new Error(
   "Brak arkusza",
  );
 return SpreadsheetApp.openById(sid);
}

function polecenia_() {
 var sh = arkusz_().getSheetByName(ARKUSZ_POLECENIA);
 if (!sh) {
  przygotujArkusz();
  sh = arkusz_().getSheetByName(ARKUSZ_POLECENIA);
 }
 return sh;
}

function tokenOk_(t) {
 var wzor =
  PropertiesService.getScriptProperties().getProperty(
   "TOKEN",
  );
 if (!wzor) return false;
 t = String(t || "");
 if (t.length !== wzor.length) return false;
 var r = 0;
 for (var i = 0; i < t.length; i++)
  r |= t.charCodeAt(i) ^ wzor.charCodeAt(i);
 return r === 0;
}

function obiekt_(r) {
 var o = {};
 NAGLOWKI.forEach(function (k, i) {
  o[k] = r[i] == null ? "" : String(r[i]);
 });
 return o;
}

function bezpieczny_(s) {
 s = String(s);
 return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function teraz_() {
 return Utilities.formatDate(
  new Date(),
  STREFA,
  "yyyy-MM-dd HH:mm:ss",
 );
}

function json_(o) {
 return ContentService.createTextOutput(
  JSON.stringify(o),
 ).setMimeType(ContentService.MimeType.JSON);
}
