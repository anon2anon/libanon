// ==UserScript==
// @name        seamtress.user.js
// @author      Wolfram
// @namespace   wolframep@yandex.ru
// @include     http://pony.pad.sunnysubs.com/*
// @include     https://pony.pad.sunnysubs.com/*
// @exclude     http://pony.pad.sunnysubs.com/
// @exclude     https://pony.pad.sunnysubs.com/
// @exclude     http://pony.pad.sunnysubs.com/*/*
// @exclude     https://pony.pad.sunnysubs.com/*/*
// @version     0.3
// @run-at      document-end
// @grant       none
// ==/UserScript==

const MONKEY = true;
// This script is intended to be executed from Greasemonkey/Tampermonkey.
// However, you can use it from console with features requiring persistent storage disabled.
// Copy starting from here in this case:|const MONKEY = false;

// stolen from here https://stackoverflow.com/a/44902662/7208967
function DOMEval(code, doc) {
    doc = doc || document;
    let script = doc.createElement("script");
    script.text = code;
    doc.head.appendChild(script).parentNode.removeChild(script);
}

function whiteng(idoc) {
  let selection = idoc.getSelection();
  let lines = idoc.getElementsByTagName('div');
  let schedule = [];
  for (let iLine = 0; iLine < lines.length; ++iLine) {
    const line = lines[iLine];
    const english = line.children[2];
    if (!english || !selection.containsNode(english))
      continue;

    const slices = line.children;
    if (!slices[0] || !slices[0].classList.contains('pony_timing'))
      continue;

    let whiteElem = {lineIdx: iLine};
    for (let iSlice = 0; iSlice < slices.length; ++iSlice) {
      const text = slices[iSlice].textContent;
      const arrowIdx = text.indexOf('→');
      if (arrowIdx !== -1) {
        whiteElem.endSliceIdx = iSlice;
        whiteElem.endOffset = Math.min(arrowIdx + 2, text.length);
        break;
      }
    }
    if (whiteElem.endOffset)
      schedule.push(whiteElem);
  }
  for (let elem of schedule) {
    let slices = lines[elem.lineIdx].children;
    let range = idoc.createRange();
    range.setStart(slices[0].firstChild, 0);
    range.setEnd(slices[elem.endSliceIdx].firstChild, elem.endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
    // pad is not available from monkey extensions for security reasons
    // this is why this whole function is called via js injection
    pad.editbarClick('clearauthorship');
  }
  selection.removeAllRanges();
}

// alias expanding not supported yet
function expandAlias(actor) {
  return actor;
}

function getMagicDom(elem) {
  while (elem !== null) {
    if (elem.tagName === 'DIV' && typeof elem.id === 'string'
        && elem.id.indexOf('magicdom') === 0)
      return elem;
    elem = elem.parentNode;
  }
  return null;
}

function getTranslationDialogue(line) {
  const match = line.match(/^(\d{0,3}):(\d{2})\.(\d{2}),(\d{0,4}).(\d{2}) (\w+):[^→]*→(.*)$/);
  if (!match)
    return null;
  let dialogue = 'Dialogue: 0,';
  const totalMinutes = parseInt(match[1]);
  let seconds = parseInt(match[2]);
  if (seconds >= 60) {
    alert('seconds >= 60');
    return null;
  }
  let centiSeconds = parseInt(match[3]);
  let minutes = totalMinutes % 60;
  let hours = (totalMinutes - minutes) / 60;
  for (let i = 0;; ++i) {
    dialogue += (hours < 10 ? '0' : '') + hours + ':';
    dialogue += (minutes < 10 ? '0' : '') + minutes + ':';
    dialogue += (seconds < 10 ? '0' : '') + seconds + '.';
    dialogue += (centiSeconds < 10 ? '0' : '') + centiSeconds + ',';
    if (i == 1)
      break;
    let totalCentiSeconds = 360000 * hours + 6000 * minutes + 100 * seconds + centiSeconds;
    totalCentiSeconds += parseInt(match[4]) * 100 + parseInt(match[5]);
    centiSeconds = totalCentiSeconds % 100;
    let tmp = (totalCentiSeconds - centiSeconds) / 100;
    seconds = tmp % 60;
    tmp = (tmp - seconds) / 60;
    minutes = tmp % 60;
    hours = (tmp - minutes) / 60;
  }
  dialogue += match[6] + ',,0,0,0,,';
  dialogue += match[7].trim().replace(/\.\.\./g, '…').replace(/ [-‐‒–―]+/g, ' —').replace(/[-‐‒–―]+ /g, '— ');
  return dialogue;
}

function main() {
  try {
    let idocStr = 'document.getElementsByTagName(\'iframe\')[1].contentWindow.document.getElementsByTagName(\'iframe\')[0].contentWindow.document';
    let idoc = eval(idocStr);
    idoc.onkeydown = function(evt) {
      if (!evt.ctrlKey)
        return;
      if (evt.shiftKey && String.fromCharCode(evt.which).toLowerCase() == 'f') {
        DOMEval(whiteng.toString() + ';whiteng(' + idocStr + ');', null);
      }
    };
    idoc.onpaste = function(evt) {
      let paste = evt.clipboardData.getData('text');
      const aegipaste = paste.replace(/Dialogue: ?\d+,(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+),([^,]*),([^,]*),[^,]*,[^,]*,[^,]*,[^,]*,(([a-z]\w*: ?)?(.*))/gi,
        function(match, sh, sm, ss, scs, eh, em, es, ecs, style, actor, text, intextActor, remainingText) {
          const startMinutes = parseInt(sh) * 60 + parseInt(sm);
          const startTime = (startMinutes < 10 ? '0' : '') + startMinutes + ':' + ss + '.' + scs;

          const startCentiSec = startMinutes * 6000 + parseInt(ss) * 100 + parseInt(scs);
          const endCentiSec = parseInt(eh) * 360000 + parseInt(em) * 6000 + parseInt(es) * 100 + parseInt(ecs);
          const durationCentiSec = endCentiSec - startCentiSec;
          const durationFractional = durationCentiSec % 100;
          const timing = startTime + ',' + (durationCentiSec - durationFractional) / 100 + (durationFractional < 10 ? '.0' : '.') + durationFractional;
          if (style == 'Default') {
            if (actor != '') {
              style = expandAlias(actor);
            } else if (intextActor) {
              style = expandAlias(intextActor.slice(0, intextActor.indexOf(':')));
              text = remainingText;
            }
          }
          return timing + ' ' + style + ': ' + text + ' → ';
        });
      if (aegipaste == paste)
        return;

      const selection = idoc.getSelection();
      if (!selection.rangeCount) return false;
      selection.deleteFromDocument();
      let divElem = document.createElement("div");
      divElem.innerHTML = aegipaste.replace(/\n/g, '<br\>');
      selection.getRangeAt(0).insertNode(divElem);
      evt.preventDefault();
    };
    idoc.oncopy = function(evt) {
      const selection = idoc.getSelection();
      const selStr = selection.toString().trim();
      const arrowIdx = selStr.indexOf('→');
      if (arrowIdx == -1 || arrowIdx == 0 || arrowIdx == selStr.length - 1
          || selStr.match(/^\d{2}:\d+\.\d+,/))
        return;

      const range = selection.getRangeAt(0);
      const start = getMagicDom(range.startContainer);
      if (!start) {
        alert("aegicopy: can't find start line");
        return;
      }
      const end = getMagicDom(range.endContainer);
      if (!end) {
        alert("aegicopy: can't find end line");
        return;
      }

      let paste = '';
      for (let line = start;; line = line.nextSibling) {
        if (line === null) {
          alert("aegicopy: can't iterate line range properly");
          return;
        }
        const dialogue = getTranslationDialogue(line.innerText);
        if (dialogue === null) {
          alert("aegicopy: can't parse line\n" + line.innerText);
          return;
        }
        paste += dialogue;
        if (line === end)
          break;
        paste += '\r\n';
      }
      evt.clipboardData.setData('text/plain', paste);
      evt.preventDefault();
    };
    console.log('Successfully set events in seamtress.user.js');
  } catch (error) {
    console.log(error);
    setTimeout(main, 2000);
  }
}

main();
