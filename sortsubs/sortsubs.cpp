#include <algorithm>
#include <iostream>
#include <vector>

const size_t MERGE_LIMIT = 4;

struct Line {
    int start = 0;
    int end = 0;
    int num = 0;

    bool operator<(Line other) const {
        if (start < other.start) {
            return true;
        }
        if (start > other.start) {
            return false;
        }
        return num < other.num;
    }

    int length() const {
        return end - start;
    }

    int direction(Line other) const {
        if (end <= other.start) {
            // before
            return -1;
        }
        if (start >= other.end) {
            // after
            return 1;
        }
        // intersecting
        int commonLength = std::min(end, other.end) - std::max(start, other.start);
        if (2 * commonLength >= length()) {
            // strongly intersecting
            return 0;
        }
        if (2 * commonLength >= other.length()) {
            // strongly intersecting
            return 0;
        }
        // weakly intersecting
        if (start < other.start) {
            // before
            return -1;
        }
        // after
        return 1;
    }
};

using Cell = std::vector<Line>;
using Box = std::vector<Cell>;

std::vector<Box> initPivotBoxes(const std::vector<Line>& pivot, int totalFiles, int pivotFile) {
    std::vector<Box> boxes;
    boxes.reserve(pivot.size());
    for (const auto& line : pivot) {
        Box box(totalFiles);
        box[pivotFile].push_back(line);
        boxes.emplace_back(std::move(box));
    }
    return boxes;
}

std::vector<Box> boxLines(const std::vector<std::vector<Line>>& files, int depth = 0) {
    const int totalFiles = files.size();
    int pivotFile;  // First non-empty file
    for (pivotFile = 0; pivotFile < totalFiles; ++pivotFile) {
        if (!files[pivotFile].empty()) {
            break;
        }
    }
    if (pivotFile == totalFiles) {
        // All files empty
        return {};
    }

    const std::vector<Line>& pivot = files[pivotFile];
    const int pivotSize = pivot.size();
    int currIdx = 0;
    const Line* prev;
    const Line* curr;
    const Line* next;
    auto updatePointers = [&](){
        prev = currIdx > 0             ? &pivot[currIdx - 1] : nullptr;
        curr = currIdx < pivotSize     ? &pivot[currIdx    ] : nullptr;
        next = currIdx + 1 < pivotSize ? &pivot[currIdx + 1] : nullptr;
    };

    std::vector<Box> pivotBoxes = initPivotBoxes(pivot, totalFiles, pivotFile);
    std::vector<Box> inBetween(pivotSize + 1);
    for (int iFile = pivotFile + 1; iFile < totalFiles; ++iFile) {
        auto setBetween = [&](int iBox, const Line& line) {
            Box& box = inBetween[iBox];
            if (box.empty()) {
                box.resize(totalFiles);
            }
            box[iFile].push_back(line);
        };
        auto setPivot = [&](int iBox, const Line& line) {
            auto& cell = pivotBoxes[iBox][iFile];
            cell.push_back(line);
            if (cell.size() >= MERGE_LIMIT) {
                prev = nullptr;
            }
        };
        currIdx = 0;
        updatePointers();
        for (const auto& line : files[iFile]) {
            while (true) {
                int dir = curr ? line.direction(*curr) : -1;
                if (dir == -1) {
                    if (prev && !line.direction(*prev)) {
                        setPivot(currIdx - 1, line);
                    } else {
                        prev = nullptr;
                        setBetween(currIdx, line);
                    }
                    break;
                }
                if (dir == 0) {
                    setPivot(currIdx, line);
                    ++currIdx;
                    updatePointers();
                    break;
                }
                // dir == 1
                ++currIdx;
                updatePointers();
            }
        }
    }

    std::vector<Box> boxes;
    for (int iBox = 0; iBox <= pivotSize; ++iBox) {
        auto inb = boxLines(inBetween[iBox], depth + 1);
        boxes.insert(boxes.end(), std::make_move_iterator(inb.begin()), std::make_move_iterator(inb.end()));
        if (iBox != pivotSize) {
            boxes.emplace_back(std::move(pivotBoxes[iBox]));
        }
    }
    return boxes;
}

void printBoxing(const std::vector<Box>& boxes) {
    for (const auto& box : boxes) {
        const int boxSize = box.size();
        for (int iCell = 0; iCell < boxSize; ++iCell) {
            const auto& cell = box[iCell];
            const int cellSize = cell.size();
            for (int iLine = 0; iLine < cellSize; ++iLine) {
                std::cout << cell[iLine].num;
                if (iLine != cellSize - 1) {
                    std::cout << "|";
                }
            }
            if (iCell != boxSize - 1) {
                std::cout << " @ ";
            }
        }
        std::cout << '\n';
    }
    std::cout << std::flush;
}

int main() {
    int numFiles;
    std::cin >> numFiles;
    std::vector<std::vector<Line>> files;
    files.reserve(numFiles);
    for (int iFile = 0; iFile < numFiles; ++iFile) {
        int numLines;
        std::cin >> numLines;
        std::vector<Line> lines;
        lines.reserve(numLines);
        for (int iLine = 0; iLine < numLines; ++iLine) {
            Line line;
            std::cin >> line.start >> line.end;
            line.num = iLine;
            lines.push_back(line);
        }
        std::sort(lines.begin(), lines.end());
        files.emplace_back(std::move(lines));
    }
    auto boxing = boxLines(files);
    printBoxing(boxing);
}
