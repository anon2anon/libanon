Новое поколение утилит для anon2anon!

## transcript.py

Простой скриптик для упрощения транскрибирования, превращает видео в куски аудио длиной по 2 минуты (захватывает по 4 секунды с обеих сторон от каждого двухминутного куска). Короткие куски аудио удобнее использовать в плеере, поскольку мышкой проще ткнуть в нужное место на полосе проигрывания. Для срабатывания должен быть установлен ffmpeg. Использование: `./transcript.py -i video_name.mkv -o output_directory` (расширение видео — любое, поддерживаемое ffmpeg), создаёт файлы `output_directory/video_name_00_02.ogg`, `output_directory/video_name_02_04.ogg` и т.д. до конца видео.

## timing_stub.ass

Простенький файлик субтитров, который удобно использовать для тайминга с нуля (без транскрипта). Предполагается, что сначала нужно затаймить реплики, а потом уже заменить каждую `z` на реальный транскрипт с именем актёра (напр., `TS: Hello!`).

## magic.html

Волшебный скрипт для переноса в падик и сравнения субтитров, продакшн-копия находится по адресу https://anon2anon.github.io/magic.html. Перетащите файлы субтитров в выделенную область, чтобы увидеть результат. Неочевидные особенности:
- Если стиль строки не `Default`, то имя стиля впишется в стиль падика. Если же стиль `Default`, то имя стиля берётся из поля субтиров "Актёр". Если при этом поле актёра пусто, то скрипт пытается вытащить имя из самой строки субтитров — когда она начинается на слово и двоеточие после него. (Например, `Twilight: Hello!` превратится в строку `Hello!`, а в стиль вытащится `Twilight`.) В оставшихся случаях в падик пойдёт стиль `Default`.
- При указании стиля в поле актёра или в начале строки автоматически раскрываются сокращения из обновляемого списка здесь: https://anon2anon.github.io/aliases.txt. Стили, указанные в поле стиля субтитра, копируются verbatim, без раскрытия сокращений.
- При переносе в пад плохие многоточия `...` автозаменяются на хорошие `…`; дефисы, окружённые пробелами, автозаменяются на тире `—`.
- По умолчанию скрипт удаляет теги вида `{\i1}` или `{\alpha FF}`, отметьте галку "Показывать теги", чтобы оставить их.
- Строки сортируются по времени начала субтитра (если совпадает — порядок из исходного файла сохраняется). Если в субтитрах остались черновые пустые строки или строки длины 1 с нулевым таймингом (то есть начало и конец оба `0:00:00.00`), такие строки удаляются, чтобы не оказаться вверху после сортировки при импорте.
- Алгоритм слияния строк при переносе в пад гарантирует сохранение разбиения на строки и тайминга у первого файла субтитров (оригинала). Это можно использовать, чтобы экспортировать англосаб и русаб из падика, перетаймить и переразбить англосаб, а потом вернуть оба файла в падик с помощью скрипта, который сохранит перетаймленные англосабы как есть (а перевод может слегка размазать в случае переразбивки).

## seamtress.user.js

Набор утилит для работы в падике. Устанавливать в [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)/[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) в зависимости от браузера. Также можно просто скопипастить в консоль по F12, но тогда это придётся делать при каждом заходе в падик или обновлении странички, когда нужно воспользоваться скриптовыми фичами:
- Выбеливание оригинала с сохранением цветов перевода по Ctrl+Shift+F
- Зашив с копипастой перевода из падика в Aegisub по Ctrl+C
- Простое копирование строчек из Aegisub в пад по Ctrl+V
- Переключение whitetext mode (копирование с сохранением белого) по Ctrl+Shift+Y

Далее идёт подробное описание каждой из этих фич. Под **отмеченными строками** ниже понимаются строки, в которых выделен _хотя бы один символ_, или же единственная строка, на которой стоит курсор — если выделение отсутствует.

### Выбеливание оригинала

Выбеляет оригинал по нажатию **Ctrl+Shift+F** во всех отмеченных строках. Если отмеченную строку невозможно распарсить как строку с таймингом, оригиналом и переводом, она игнорируется. Таким образом, например, чтобы выбелить оригинал во всём падике, можно просто выполнить Ctrl+A Ctrl+Shift+F.

### Зашив с копипастой

Скрипт для вышивки. Чтобы зашить строку, кликните по ней дважды (она должна выделиться целиком) и нажмите **Ctrl+C**. Чтобы зашить группу строк, поставьте курсор куда-нибудь в середину первой строки группы; зажав мышку, проведите вниз до последней строки группы. Теперь отмеченные строки — это в точности строки группы; нажмите **Ctrl+C**, чтобы зашить их все. После этого вы можете вставить зашитые строки в Aegisub через **Ctrl+V** (если вы хотите добавить новые строки) или **Ctrl+Shift+V** (если вы хотите заменить текст в старых). Особенности:
- Отмеченные строки выбеляются целиком, вместе с оригиналом — даже когда вы выделили их не полностью при выделении группы.
- В буфере обмена оказываются строки перевода, отформатированные в формате `Dialogue` из `.ass`-файлов. Неправильные многоточия `...` автозаменяются на правильные `…`.
- Если вы выделили кусок строки (или даже всю строку), проводя мышкой (а не двойным кликом), он копируется как есть, а строка не выбеливается. Таким образом, скрипт не мешает копировать слова внутри одной строки или копировать стрелочку из одной строки в другую.
- Если вы выделили несколько строк падика, и начало выделения в точности совпадает с началом тайминга одной из строк, то выделение копируется как есть, а строки не выбеливаются. Таким образом, скрипт не мешает копировать строки целиком между падиками.
- Если скрипт не может распарсить одну из отмеченных строк, то выделение копируется как есть, и ничего не выбеливается.

### Перенос в пад

Это альтернатива скрипту [magic.html](#magichtml), которую удобно использовать в случае, когда в пад нужно вбросить 1-2 новые строки с таймингом или поменять тайминг у старой строки. Вы просто копируете строку или группу строк (выделенную с зажатием шифта) из Aegisub, нажав **Ctrl+C**, и вставляете в пад, нажав **Ctrl+V**. Если вы почему-то хотите вбросить строки в формате `Dialogue` (как есть), вставляйте в падик путём **Ctrl+Shift+V**. По сравнению с magic.html, этот скрипт не поддерживает автозамены и раскрытия сокращений актёров (однако поддерживает самих актёров, в т.ч. указанных внутри строки).

### Whitetext mode

Это костыль для копирования с сохранением белого цвета. Комбинация **Ctrl+Shift+Y** переключает между двумя режимами:
- Authorship mode (default)
  - Когда вы набираете текст в падике, он становится вашего авторства.
  - Когда вы копируете одноцветный текст, он перекрашивается и становится вашего авторства.
  - Когда вы копируете многоцветный текст, перекрашиваются только белые куски.
- Whitetext mode
  - Когда вы набираете текст, он становится белым.
  - Когда вы копируете одноцветный текст, он становится белым.
  - Когда вы копируете многоцветный текст, цвета в нём сохраняются.

Эту функциональность стоит использовать только в крайнем случае, поскольку "белый цвет", который используется в whitetext mode, на самом деле не настоящий белый, а является текстом несуществующего гостя с идентификатором `g.whitetext`, что может вызывать неожиданные побочные эффекты при дальнейшем взаимодействии с полученным "белым".

### seamtress.user.ts

Это исходники скрипта, написанные на TypeScript. Изменения вносить сюда. Чтобы перегенерировать `seamtress.user.js`, выполните:
```
npm install -g typescript
tsc --strict --target es2015 seamtress.user.ts
```

## stylish.py

Скриптик для вырезания лишних стилей из субтитров, просто передайте в качестве аргументов файлы, которые вы хотите почистить от лишних стилей. Можно использовать для постобработки перед релизом.
