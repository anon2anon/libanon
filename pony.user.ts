// ==UserScript==
// @name        pony.user.js
// @author      Wolfram
// @namespace   wolframep@yandex.ru
// @include     http://pony.pad.sunnysubs.com/*
// @include     https://pony.pad.sunnysubs.com/*
// @exclude     http://pony.pad.sunnysubs.com/
// @exclude     https://pony.pad.sunnysubs.com/
// @exclude     http://pony.pad.sunnysubs.com/*/*
// @exclude     https://pony.pad.sunnysubs.com/*/*
// @version     0.5
// @run-at      document-end
// @grant       none
// ==/UserScript==
"use strict";

// This function is used to call code containing `pad.editbarClick('clearauthorship');`,
// which is not available from monkey extensions for security reasons.
function DOMEval(code: string) {
    let script = document.createElement('script');
    script.text = code;
    document.head.appendChild(script).parentNode!.removeChild(script);
}

type OptDoc = null | HTMLDocument;

var paddoc: OptDoc = null;
var pad: any;  // dummy variable for satisfying TypeScript in DOMEval'd functions

function getPadDoc(): OptDoc {
    try {
        return document.querySelectorAll('iframe')[1]!.contentWindow!.document
                       .querySelector('iframe')!.contentWindow!.document;
    } catch {}
    console.log('Pad document not found');
    return null;
}

function getMagicDom(elem: Node): null | Node {
    while (true) {
        const parent = elem.parentNode;
        if (!parent) {
            return null;
        }
        if ((elem as HTMLElement).tagName === 'DIV' &&
            (parent as HTMLElement).id === 'innerdocbody') {
            return elem;
        }
        elem = parent;
    }
}

function* iterateAllLines(doc: HTMLDocument) {
    for (let line of doc.querySelectorAll('#innerdocbody>div')) {
        yield line;
    }
}

function* iterateLineRange(range: Range) {
    const sc = range.startContainer;
    const start = (sc as HTMLElement).id == 'innerdocbody' ? sc.firstChild : getMagicDom(sc);
    if (!start) {
        alert("can't find start line");
        return;
    }
    const ec = range.endContainer;
    const end = (ec as HTMLElement).id == 'innerdocbody' ? sc.lastChild : getMagicDom(ec);
    if (!end) {
        alert("can't find end line");
        return;
    }
    let line: Node = start;
    while (true) {
        const next = line.nextSibling;
        yield line;
        if (line === end) {
            return;
        }
        if (!next) {
            alert("iterateLineRange: iteration failure");
            return;
        }
        line = next;
    }
}

function clearOriginal() {
    const doc = getPadDoc();
    if (doc === null) {
        alert('Unexpected failure on loading pad document in seamtress.user.js');
        return;
    }
    const sel = doc.getSelection();
    if (sel === null) {
        alert('iframe not loaded');
        return;
    }
    const iter = sel.isCollapsed ? iterateAllLines(doc)
        : iterateLineRange(sel.getRangeAt(0));
    sel.removeAllRanges();
    for (let line of iter) {
        if (!(line instanceof HTMLElement)) {
            continue;
        }
        const lineParts = line.children;
        if (!lineParts[0] || !lineParts[0].classList.contains('pony_timing')) {
            continue;
        }
        for (let iPart = 0; iPart < lineParts.length; ++iPart) {
            const part = lineParts[iPart];
            if (!(part instanceof HTMLElement)) {
                continue;
            }
            const text = part.innerText;
            let offset = text.indexOf('→');
            if (offset === -1) {
                continue;
            }
            ++offset;
            if (text[offset] === ' ' || text[offset] == String.fromCodePoint(0xa0)) {
                // clear color of space or non-breaking space after the arrow
                ++offset;
            }
            if (!part.firstChild) {
                continue;
            }
            sel.setBaseAndExtent(lineParts[0], 0, part.firstChild, offset);
            pad.editbarClick('clearauthorship');
            sel.removeAllRanges();
            break;
        }
    }
}

function main(attempts: number) {
    paddoc = getPadDoc();
    if (paddoc === null) {
        --attempts;
        if (attempts === 0) {
            alert('Failed to load pad document in seamtress.user.js');
            return;
        }
        setTimeout(main, 2000, attempts);
        return;
    }
    paddoc.addEventListener('keydown', event => {
        if (event.ctrlKey && event.shiftKey
              && String.fromCharCode(event.which).toLowerCase() == 'f') {
            DOMEval([getPadDoc, getMagicDom, iterateAllLines, iterateLineRange,
              clearOriginal].join(';') + ";clearOriginal();");
        }
    });
    console.log('Successfully set events in seamtress.user.js');
}

setTimeout(main, 2000, 5);
