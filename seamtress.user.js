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
// @version     0.8
// @run-at      document-end
// @grant       none
// ==/UserScript==
"use strict";
// This function is used to call code from pad internals via `pad` and `padeditor`,
// which are not available from monkey extensions for security reasons.
function DOMEval(code) {
    let script = document.createElement('script');
    script.text = code;
    document.head.appendChild(script).parentNode.removeChild(script);
}
function escapeHTML(str) {
    let elem = document.createElement('pre');
    elem.appendChild(document.createTextNode(str));
    return elem.innerHTML;
}
var paddoc = null;
var rawPaste = false;
var pad, padeditor; // dummy variables for DOMEval'd functions
function getPadDoc() {
    try {
        return document.querySelector('#editorcontainer iframe')
            .contentWindow.document.querySelector('iframe').contentWindow.document;
    }
    catch (_a) { }
    console.log('Pad document not found');
    return null;
}
function getMagicDom(elem) {
    while (true) {
        const parent = elem.parentNode;
        if (!parent) {
            return null;
        }
        if (elem.tagName === 'DIV' &&
            parent.id === 'innerdocbody') {
            return elem;
        }
        elem = parent;
    }
}
function* iterateLineRange(range) {
    const sc = range.startContainer;
    const start = sc.id === 'innerdocbody' ? sc.firstChild : getMagicDom(sc);
    if (!start) {
        alert("can't find start line");
        return;
    }
    const ec = range.endContainer;
    const end = ec.id === 'innerdocbody' ? ec.lastChild : getMagicDom(ec);
    if (!end) {
        alert("can't find end line");
        return;
    }
    let line = start;
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
function getArrowNode(line) {
    const children = line.childNodes;
    if (!children.length) {
        if (!(line instanceof Text) || !line.textContent
            || !line.textContent.match(/→/)) {
            return null;
        }
        return line;
    }
    for (let child of children) {
        const arrowNode = getArrowNode(child);
        if (arrowNode) {
            return arrowNode;
        }
    }
    return null;
}
function clearOriginal() {
    const doc = getPadDoc();
    if (doc === null) {
        alert('Unexpected failure on loading pad document in seamtress.user.js');
        return;
    }
    const sel = doc.getSelection();
    if (!sel || !sel.rangeCount) {
        return;
    }
    for (let line of iterateLineRange(sel.getRangeAt(0))) {
        if (!(line instanceof HTMLElement)) {
            continue;
        }
        if (!line.children[0] || !line.children[0].classList.contains('pony_timing')) {
            continue;
        }
        let arrowNode = getArrowNode(line);
        if (!arrowNode) {
            continue;
        }
        const text = arrowNode.textContent;
        let offset = text.indexOf('→');
        ++offset;
        if (text[offset] === ' ' || text[offset] == String.fromCodePoint(0xa0)) {
            // clear color of space or non-breaking space after the arrow
            ++offset;
        }
        sel.setBaseAndExtent(line.firstChild, 0, arrowNode, offset);
        pad.editbarClick('clearauthorship');
    }
    sel.removeAllRanges();
}
function toggleWhitetextMode() {
    padeditor.ace.callWithAce((ace) => {
        if (window.trueAuthor) {
            ace.editor.setProperty("userAuthor", window.trueAuthor);
            delete window.trueAuthor;
        }
        else {
            window.trueAuthor = ace.editor.getProperty("userAuthor");
            ace.editor.setProperty("userAuthor", "g.whitetext");
        }
    });
}
const ZERO_STYLE = 'Default';
const MAX_TIME_CS = 100 * 60 * 60 * 100 - 1;
function p0(num) {
    return (num < 10 ? '0' : '') + num;
}
function ftime(cs) {
    const pure_cs = cs % 100;
    let tmp = (cs - pure_cs) / 100;
    const pure_sec = tmp % 60;
    tmp = (tmp - pure_sec) / 60;
    const pure_min = tmp % 60;
    const hour = (tmp - pure_min) / 60;
    return `${p0(hour)}:${p0(pure_min)}:${p0(pure_sec)}.${p0(pure_cs)}`;
}
// not implemented
function expandAlias(alias) {
    return alias;
}
class PadLine {
    constructor(start, len, style, orig, trns) {
        this.start_cs = start;
        this.len_cs = len;
        this.style = style;
        this.original = orig;
        this.translation = trns ? trns : '';
    }
    toString() {
        const start_pure_cs = this.start_cs % 100;
        const start_sec = (this.start_cs - start_pure_cs) / 100;
        const start_pure_sec = start_sec % 60;
        const start_min = (start_sec - start_pure_sec) / 60;
        const len_pure_cs = this.len_cs % 100;
        const len_sec = (this.len_cs - len_pure_cs) / 100;
        return escapeHTML(`${p0(start_min)}:${p0(start_pure_sec)}.${p0(start_pure_cs)},` +
            `${len_sec}.${p0(len_pure_cs)} ${this.style}: ${this.original} → ${this.translation}`);
    }
    toAegi(out) {
        const end_cs = this.start_cs + this.len_cs;
        const style = this.style.replace(',', '');
        return `Dialogue: 0,${ftime(this.start_cs)},${ftime(end_cs)},${style},,0,0,0,,${this[out].replace(/\.\.\./g, '…')}`;
    }
}
function parseAssLine(line) {
    const match = line.match(/^Dialogue: ?\d+,(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+),([^,]*),([^,]*),[^,]*,[^,]*,[^,]*,[^,]*,(([a-z]\w*: ?)?(.*))$/i);
    if (!match) {
        return null;
    }
    let timing = [0, 0];
    for (let i = 0; i < 2; ++i) {
        timing[i] += parseInt(match[4 * i + 1], 10);
        timing[i] *= 60;
        timing[i] += parseInt(match[4 * i + 2], 10);
        timing[i] *= 60;
        timing[i] += parseInt(match[4 * i + 3], 10);
        timing[i] *= 100;
        timing[i] += parseInt(match[4 * i + 4], 10);
    }
    if (timing[0] > timing[1] || timing[1] > MAX_TIME_CS) {
        return null;
    }
    let l = new PadLine(timing[0], timing[1] - timing[0], match[9], match[11]);
    if (l.style === ZERO_STYLE) {
        const actor = match[10];
        const actorInText = match[12];
        if (actor.length) {
            l.style = expandAlias(actor);
        }
        else if (actorInText) {
            l.style = expandAlias(actorInText.slice(0, actorInText.indexOf(':')));
            l.original = match[13];
        }
    }
    return l;
}
function parsePadLine(line) {
    const match = line.match(/^(\d+):(\d{2}).(\d{2}),(\d+).(\d{2}) ([a-z]\w*):([^→]*)→(.*)$/i);
    if (!match) {
        return null;
    }
    let start = 0;
    start += parseInt(match[1], 10);
    start *= 60;
    const sec = parseInt(match[2], 10);
    if (sec >= 60) {
        alert('seconds >= 60');
        return null;
    }
    start += sec;
    start *= 100;
    start += parseInt(match[3], 10);
    let len = 0;
    len += parseInt(match[4], 10);
    len *= 100;
    len += parseInt(match[5], 10);
    if (start + len > MAX_TIME_CS) {
        return null;
    }
    return new PadLine(start, len, match[6], match[7].trim(), match[8].trim());
}
function isExportable(sel) {
    if (!sel.rangeCount) {
        return false;
    }
    const range = sel.getRangeAt(0);
    const sc = range.startContainer;
    if (sc === range.endContainer && sc.parentNode.id === 'innerdocbody' &&
        range.startOffset === 0 && range.endOffset === sc.childNodes.length) {
        // whole line selected by double click
        return true;
    }
    const selStr = sel.toString();
    if (selStr.indexOf('\n') === -1) {
        return false;
    }
    if (selStr.match(/^\d+:\d+\.\d+,/)) {
        return false;
    }
    return true;
}
function isCtrlShiftKey(event, symb) {
    return event.ctrlKey && event.shiftKey &&
        String.fromCharCode(event.which).toLowerCase() === symb;
}
function clearRange(start, end) {
    const sel = paddoc.getSelection();
    sel.setBaseAndExtent(start, 0, end, end.childNodes.length);
    DOMEval("pad.editbarClick('clearauthorship');");
    sel.collapseToEnd();
}
function main(attempts) {
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
        if (isCtrlShiftKey(event, 'f')) {
            DOMEval([getPadDoc, getMagicDom, iterateLineRange,
                getArrowNode, clearOriginal].join(';') + ";clearOriginal();");
        }
        if (isCtrlShiftKey(event, 'y')) {
            DOMEval([toggleWhitetextMode].join(';') + ";toggleWhitetextMode();");
        }
        if (isCtrlShiftKey(event, 'v')) {
            rawPaste = true;
        }
    });
    paddoc.addEventListener('paste', event => {
        if (rawPaste) {
            rawPaste = false;
            return;
        }
        if (!event.clipboardData) {
            alert('Clipboard not detected!');
            return;
        }
        const sel = paddoc.getSelection();
        if (!sel || !sel.rangeCount) {
            return;
        }
        const payloadLines = event.clipboardData.getData('text').split(/\r?\n/g);
        let padLines = [];
        for (let line of payloadLines) {
            if (!line.trim().length) {
                continue;
            }
            const parsed = parseAssLine(line);
            if (!parsed) {
                return;
            }
            padLines.push(parsed);
        }
        // Here we just insert lines, we need to rewrite this later
        sel.deleteFromDocument();
        let divElem = document.createElement('div');
        divElem.innerHTML = padLines.join('<br>');
        sel.getRangeAt(0).insertNode(divElem);
        event.preventDefault();
    });
    paddoc.addEventListener('copy', event => {
        const sel = paddoc.getSelection();
        if (!sel || !isExportable(sel)) {
            return;
        }
        let start = null;
        let end = null;
        let padLines = [];
        for (let line of iterateLineRange(sel.getRangeAt(0))) {
            if (!start) {
                start = line;
            }
            end = line;
            const text = line.textContent;
            const parsed = parsePadLine(text);
            if (!parsed) {
                alert("can't parse subtitle line\n" + text);
                return;
            }
            padLines.push(parsed);
        }
        if (start === null || end === null) {
            return;
        }
        event.clipboardData.setData('text/plain', padLines.map(l => l.toAegi('translation')).join('\r\n'));
        clearRange(start, end);
        event.preventDefault();
    });
    console.log('Successfully set events in seamtress.user.js');
}
setTimeout(main, 2000, 5);
