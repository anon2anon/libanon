Новое поколение утилит для anon2anon!

# transcript.py

Простой скриптик для упрощения транскрибирования, превращает видео в куски аудио длиной по 2 минуты (захватывает по 4 секунды с обеих сторон от каждого двухминутного куска). Короткие куски аудио удобнее использовать в плеере, поскольку мышкой проще ткнуть в нужное место на полосе проигрывания. Для срабатывания должен быть установлен ffmpeg. Использование: `./transcript.py -i video_name.mkv -o output_directory`, создаёт файлы `output_directory/video_name_00_02.ogg`, `output_directory/video_name_02_04.ogg` и т.д. до конца видео.

# timing_stub.ass

Простенький файлик субтитров, который удобно использовать для тайминга с нуля (без транскрипта). Предполагается, что сначала нужно затаймить реплики, а потом уже заменить каждую `z` на реальный транскрипт с именем актёра (напр., `TS: Hello!`).

# magic.js

Волшебный скрипт для сбора блокнота, описание будет.
