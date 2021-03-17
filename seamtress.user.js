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
// @version     0.2
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
      const aegipaste = paste.replace(/Dialogue: ?\d+,(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+),([^,]*),([^,]*),[^,]*,[^,]*,[^,]*,[^,]*,(([a-z]\w*:)?(.*))/g,
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
              style = expandAlias(intextActor.slice(0, -1));
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
    console.log('Successfully set events in seamtress.user.js');
  } catch (error) {
    console.log(error);
    setTimeout(main, 2000);
  }
}

main();
