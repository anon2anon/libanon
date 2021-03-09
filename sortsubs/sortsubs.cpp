#include <algorithm>
#include <iostream>
#include <vector>

const size_t MERGE_LIMIT = 3;

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

using File = std::vector<Line>;
using Cell = std::vector<Line>;
using Box = std::vector<Cell>;

std::vector<Box> initPivotBoxes(const File& pivotFile, int totalFiles, int pivotIdx) {
    std::vector<Box> boxes;
    boxes.reserve(pivotFile.size());
    for (const auto& line : pivotFile) {
        Box box(totalFiles);
        box[pivotIdx].push_back(line);
        boxes.emplace_back(std::move(box));
    }
    return boxes;
}

std::vector<Box> boxLines(const std::vector<File>& files) {
    const int totalFiles = files.size();
    int pivotIdx;  // First non-empty file
    for (pivotIdx = 0; pivotIdx < totalFiles; ++pivotIdx) {
        if (!files[pivotIdx].empty()) {
            break;
        }
    }
    if (pivotIdx == totalFiles) {
        // All files empty
        return {};
    }

    const std::vector<Line>& pivotFile = files[pivotIdx];
    const int pivotSize = pivotFile.size();
    int currIdx;
    const Line* prev;
    const Line* curr;
    auto updatePointers = [&](){
        prev = currIdx > 0 ? &pivotFile[currIdx - 1] : nullptr;
        curr = currIdx < pivotSize ? &pivotFile[currIdx] : nullptr;
    };

    std::vector<Box> pivotBoxes = initPivotBoxes(pivotFile, totalFiles, pivotIdx);
    std::vector<Box> inBetween(pivotSize + 1);
    for (int iFile = pivotIdx + 1; iFile < totalFiles; ++iFile) {
        currIdx = 0;
        updatePointers();
        for (const auto& line : files[iFile]) {
            while (true) {
                const int dir = curr ? line.direction(*curr) : -1;
                if (dir == -1) {
                    if (prev && line.direction(*prev) != 1) {
                        Cell& cell = pivotBoxes[currIdx - 1][iFile];
                        cell.push_back(line);
                        if (cell.size() >= MERGE_LIMIT) {
                            prev = nullptr;
                        }
                    } else {
                        Box& box = inBetween[currIdx];
                        if (box.empty()) {
                            box.resize(totalFiles);
                        }
                        box[iFile].push_back(line);
                        prev = nullptr;
                    }
                    break;
                }
                if (dir == 0) {
                    pivotBoxes[currIdx][iFile].push_back(line);
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
        auto inb = boxLines(inBetween[iBox]);
        boxes.insert(boxes.end(), std::make_move_iterator(inb.begin()), std::make_move_iterator(inb.end()));
        if (iBox != pivotSize) {
            boxes.emplace_back(std::move(pivotBoxes[iBox]));
        }
    }
    return boxes;
}

std::pair<int, int> cellRange(const Cell& cell) {
    int minStart = cell[0].start;
    int maxEnd = cell[0].end;
    for (int iLine = 1; iLine < int(cell.size()); ++iLine) {
        minStart = std::min(minStart, cell[iLine].start);
        maxEnd = std::max(maxEnd, cell[iLine].end);
    }
    return std::make_pair(minStart, maxEnd);
}

int cellScore(const Box& box, int badCell) {
    int worst = 0;
    auto [badStart, badEnd] = cellRange(box[badCell]);
    for (int iCell = 0; iCell < int(box.size()); ++iCell) {
        if (iCell == badCell || box[iCell].empty()) {
            continue;
        }
        auto [cellStart, cellEnd] = cellRange(box[iCell]);
        worst = std::max(worst, std::abs(badStart - cellStart) + std::abs(badEnd - cellEnd));
    }
    return worst;
}

void tryMergeLastTwo(std::vector<Box>& boxes) {
    const int size = boxes.size();
    if (size < 2) {
        return;
    }
    Box& first = boxes[size - 2];
    Box& second = boxes[size - 1];
    const int totalFiles = first.size();
    std::vector<int> badCells;
    for (int iCell = 0; iCell < totalFiles; ++iCell) {
        if (first[iCell].size() + second[iCell].size() > MERGE_LIMIT) {
            return;
        }
        if(!first[iCell].empty() && second[iCell].empty()) {
            badCells.push_back(iCell);
        }
    }
    if (badCells.empty()) {
        return;
    }
    Box merged = first;
    for (int iCell = 0; iCell < totalFiles; ++iCell) {
        merged[iCell].insert(merged[iCell].end(), second[iCell].begin(), second[iCell].end());
    }
    for (int iCell : badCells) {
        if (cellScore(merged, iCell) > cellScore(first, iCell)) {
            return;
        }
    }
    first = merged;
    boxes.resize(size - 1);
}

std::vector<Box> mergeBoxes(std::vector<Box> oldBoxing) {
    std::vector<Box> newBoxing;
    auto it = std::make_move_iterator(oldBoxing.begin());
    const auto endIt = std::make_move_iterator(oldBoxing.end());
    for (; it != endIt; ++it) {
        newBoxing.emplace_back(*it);
        tryMergeLastTwo(newBoxing);
    }
    return newBoxing;
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

int main(int argc, char** argv) {
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
    if (argc > 1) {
        boxing = mergeBoxes(std::move(boxing));
    }
    printBoxing(boxing);
}
