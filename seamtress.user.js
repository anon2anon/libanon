// ==UserScript==
// @name        seamtress.user.js
// @include     http://pony.pad.sunnysubs.com/*
// @include     https://pony.pad.sunnysubs.com/*
// @exclude     http://pony.pad.sunnysubs.com/
// @exclude     https://pony.pad.sunnysubs.com/
// @exclude     http://pony.pad.sunnysubs.com/*/*
// @exclude     https://pony.pad.sunnysubs.com/*/*
// @version     0.1
// @run-at      document-end
// @grant       none
// ==/UserScript==

const MONKEY = true;
// This script is intended to be executed from Greasemonkey/Tampermonkey.
// However, you can use it from console with features requiring persistent storage disabled.
// Copy starting from here in this case:|const MONKEY = false;

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
    pad.editbarClick('clearauthorship');
  }
  selection.removeAllRanges();
}

function main() {
  try {
    let idocStr = 'document.getElementsByTagName(\'iframe\')[1].contentWindow.document.getElementsByTagName(\'iframe\')[0].contentWindow.document';
    let idoc = eval(idocStr);
    idoc.onkeydown = function(evt) {
      try {
        if (evt.ctrlKey && evt.shiftKey && String.fromCharCode(evt.which).toLowerCase() == 'f') {
          DOMEval(whiteng.toString() + ';whiteng(' + idocStr + ');', null);
        } 
      } catch (error) {
        console.log('ACTION FAILED!');
        console.log(error);
        return;
      }
    };
    console.log('Successfully set keydown event in seamtress.user.js');
  } catch (error) {
    console.log(error);
    setTimeout(main, 2000);
  }
}

main();
