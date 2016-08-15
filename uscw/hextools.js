/**
 * Created by HDA3014 on 24/01/2016.
 */
var Memento = require("../memento").Memento;

exports.Hex = function(svg) {

    var MARGIN = 30;
    var REDUCTION_FACTOR = 2 / 3;
    var SECOND_REDUCTION_FACTOR = 9 / 10;
    var LINE_ENLARGE_FACTOR = 0.3;
    var LINE_CONTROL_FACTOR = 0.5;
    var HEX_WIDTH = 51;
    var ALL_DIRECTIONS = ["ne", "e", "se", "sw", "w", "nw"];

    function makeOrdered(ordered) {
        ordered = ordered || [];
        var order = {};
        for (var i = 0; i < ordered.length; i++) {
            order[ordered[i]] = i;
        }
        return order;
    }

    function rotate(x, y, angle) {
        angle = angle / 180 * Math.PI;
        return {
            x: Math.round(x * Math.cos(angle) - y * Math.sin(angle)),
            y: Math.round(x * Math.sin(angle) + y * Math.cos(angle))
        }
    }

    function inverseDirection(direction) {
        switch (direction) {
            case "ne":
                return "sw";
            case "e":
                return "w";
            case "se":
                return "nw";
            case "sw":
                return "ne";
            case "w":
                return "e";
            case "nw":
                return "se";
        }
    }

    function isEmpty(coll) {
        var result = true;
        for (var d in ALL_DIRECTIONS) {
            result &= coll[ALL_DIRECTIONS[d]] === undefined;
        }
        return result;
    }

    class Map {

        constructor(rowOffset, colCount, rowCount, hexWidth, ordered, baseSurface, backgroundColor) {
            this.minColCount = Map.MIN_COLS;
            this.maxColCount = Map.MAX_COLS;
            this.minRowCount = Map.MIN_ROWS;
            this.maxRowCount = Map.MAX_ROWS;
            this.rowOffset = rowOffset;
            this.hexWidth = hexWidth;
            this.rowCount = 0;
            this.colCount = colCount;
            this.ordered = ordered;
            this.rows = [];
            this.hexes = [];
            this.hexSupport = new svg.Translation();
            this.itemSupport = new svg.Translation();
            this.component = new svg.Translation();
            this.baseSurface = baseSurface;
            this.background = new svg.Rect(0, 0).color(backgroundColor);
            this.component.width = (colCount * 2 + 1) * svg.Hexagon.height(this.hexWidth) + MARGIN * 2;
            this.component.height = (rowCount * 3 + 1) / 2 * this.hexWidth + MARGIN * 2;
            this.component
                .add(this.background)
                .add(this.hexSupport).add(this.itemSupport);
            this.component.onResize = (handler)=>{
                this.background.onResize(handler);
            };
            this.createHexes(rowCount);
        }

        bounds(minColCount, maxColCount, minRowCount, maxRowCount) {
            this.minColCount = minColCount;
            this.maxColCount = maxColCount;
            this.minRowCount = minRowCount;
            this.maxRowCount = maxRowCount;
            return this;
        }

        _updateSize() {
            this.component.width = (this.colCount * 2 + 1) * svg.Hexagon.height(this.hexWidth) + MARGIN * 2;
            this.component.height = (this.rows.length * 3 + 1) / 2 * this.hexWidth + MARGIN * 2;
            this.background
                .dimension(this.component.width, this.component.height)
                .position(this.component.width / 2, this.component.height / 2);
        }

        setBaseSurface(baseSurface) {
            this.baseSurface = baseSurface;
            this.hexes.forEach(hex=>hex.setBaseSurface(this.baseSurface));
            return this;
        }

        createHexes(rowCount) {
            for (let i = 0; i < rowCount; i++) {
                this.createBottomRow();
            }
        }

        createHex(x, y) {
            let hex = new Hex(x, y, this.hexWidth, this.ordered, this.baseSurface);
            if (this.hexCallback) {
                hex.addGlass(this.hexCallback);
            }
            hex.map = this;
            this.hexes.push(hex);
            this.hexSupport.add(hex.component);
            this.itemSupport.add(hex.itemSupport);
            return hex;
        }

        removeHex(hex) {
            this.hexes.remove(hex);
            this.hexSupport.remove(hex.component);
            this.itemSupport.remove(hex.itemSupport);
        }

        createBottomRow() {
            console.log("Create bottom row");
            Memento.register(this);
            if (this.rows.length < this.maxRowCount) {
                this.rowCount++;
                let row = [];
                this.rows.push(row);
                if ((this.rows.length + this.rowOffset - 1) % 2 === 1) {
                    row.push(null);
                }
                for (let c = 0; c < this.colCount; c++) {
                    let x = c * 2 + ((this.rows.length - 1 + this.rowOffset) % 2);
                    let y = this.rows.length - 1;
                    var hex = this.createHex(x, y);
                    row.push(hex, hex);
                }
                this.linkRow(this.rows.length - 1);
                if (this.rows.length > 1) {
                    this.linkRow(this.rows.length - 2);
                    this.refreshSurfacesInRow(this.rows.length - 2);
                }
                this.refreshLinesInRow(this.rows.length - 1);
                this.refreshBordersInRow(this.rows.length - 1);
                this._updateSize();
            }
        }

        removeBottomRow() {
            console.log("Delete bottom row");
            Memento.register(this);
            if (this.rows.length > this.minRowCount) {
                this.rowCount--;
                let row = this.rows[this.rows.length - 1];
                let index = (this.rows.length - 1 + this.rowOffset) % 2;
                for (let c = 0; c < this.colCount; c++) {
                    let hex = row[index + c * 2];
                    this.removeHex(hex);
                }
                this.rows.remove(row);
                this.linkRow(this.rows.length - 1);
                this.refreshSurfacesInRow(this.rows.length - 1);
                this._updateSize();
            }
        }

        createTopRow() {
            console.log("Create top row");
            Memento.register(this);
            if (this.rows.length < this.maxRowCount) {
                this.rowCount++;
                this.hexes.forEach(hex=>hex.position(hex.x, hex.y + 1));
                let row = [];
                this.rows.unshift(row);
                this.rowOffset = this.rowOffset ? 0 : 1;
                if ((this.rows.length + this.rowOffset - 1) % 2 === 1) {
                    row.push(null);
                }
                for (let c = 0; c < this.colCount; c++) {
                    let x = c * 2 + this.rowOffset;
                    let hex = this.createHex(x, 0);
                    row.push(hex, hex);
                }
                this.linkRow(0);
                if (this.rows.length > 1) {
                    this.linkRow(1);
                    this.refreshSurfacesInRow(1);
                }
                this.refreshLinesInRow(0);
                this.refreshBordersInRow(0);
                this._updateSize();
            }
        }

        removeTopRow() {
            console.log("Delete top row");
            Memento.register(this);
            if (this.rows.length > this.minRowCount) {
                this.rowCount--;
                let row = this.rows[0];
                let index = this.rowOffset;
                for (let c = 0; c < this.colCount; c++) {
                    let hex = row[index + c * 2];
                    this.removeHex(hex);
                }
                this.rows.remove(row);
                this.rowOffset = this.rowOffset ? 0 : 1;
                this.hexes.forEach(hex=>hex.position(hex.x, hex.y - 1));
                this.linkRow(0);
                this.refreshSurfacesInRow(0);
                this._updateSize();
            }
        }

        createRightColumn() {
            console.log("Create right column");
            Memento.register(this);
            if (this.colCount < this.maxColCount) {
                this.colCount++;
                let offset = this.rowOffset;
                for (let r = 0; r < this.rows.length; r++) {
                    let x = (this.colCount - 1) * 2 + offset;
                    offset = offset ? 0 : 1;
                    let hex = this.createHex(x, r);
                    this.rows[r].push(hex, hex);
                }
                this.linkColumn(this.colCount - 1);
                if (this.colCount > 1) {
                    this.linkColumn(this.colCount - 2);
                    this.refreshSurfacesInColumn(this.colCount - 2);
                }
                this.refreshLinesInColumn(this.colCount - 1);
                this.refreshBordersInColumn(this.colCount - 1);
                this._updateSize();
            }
        }

        removeRightColumn() {
            console.log("Remove right column");
            Memento.register(this);
            if (this.colCount > this.minColCount) {
                for (let r = 0; r < this.rows.length; r++) {
                    let hex = this.rows[r].pop();
                    this.rows[r].pop();
                    this.removeHex(hex);
                }
                this.colCount--;
                this.linkColumn(this.colCount - 1);
                this.refreshLinesInColumn(this.colCount - 1);
                this.refreshBordersInColumn(this.colCount - 1);
                this._updateSize();
            }
        }

        createLeftColumn() {
            console.log("Create left column");
            Memento.register(this);
            if (this.colCount < this.maxColCount) {
                this.colCount++;
                let offset = this.rowOffset;
                this.hexes.forEach(hex=>hex.position(hex.x + 2, hex.y));
                for (let r = 0; r < this.rows.length; r++) {
                    let hex = this.createHex(offset, r);
                    this.rows[r].splice(offset, 0, hex, hex);
                    offset = offset ? 0 : 1;
                }
                this.linkColumn(0);
                if (this.colCount > 1) {
                    this.linkColumn(1);
                    this.refreshSurfacesInColumn(1);
                }
                this.refreshLinesInColumn(0);
                this.refreshBordersInColumn(0);
                this._updateSize();
            }
        }

        removeLeftColumn() {
            console.log("Remove left column");
            Memento.register(this);
            if (this.colCount > this.minColCount) {
                let offset = this.rowOffset;
                for (let r = 0; r < this.rows.length; r++) {
                    let hex = this.rows[r][offset];
                    this.rows[r].splice(offset, 2);
                    offset = offset ? 0 : 1;
                    this.removeHex(hex);
                }
                this.hexes.forEach(hex=>hex.position(hex.x - 2, hex.y));
                this.colCount--;
                this.linkColumn(0);
                this.refreshLinesInColumn(0);
                this.refreshBordersInColumn(0);
                this._updateSize();
            }
        }

        memorize() {
            let memento = {};
            memento.hexes = Memento.registerArray(this.hexes);
            memento.hexSupport = Memento.registerSVGTranslation(this.hexSupport);
            memento.itemSupport = Memento.registerSVGTranslation(this.itemSupport);
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.rowOffset = this.rowOffset;
            memento.colCount = this.colCount;
            memento.rowCount = this.rowCount;
            memento.baseSurface = this.baseSurface;
            memento.minColCount = this.minColCount;
            memento.maxColCount = this.maxColCount;
            memento.minRowCount = this.minRowCount;
            memento.maxRowCount = this.maxRowCount;
            memento.hexWidth = this.hexWidth;
            memento.ordered = Memento.registerArray(this.ordered);
            memento.rows = Memento.registerArrayOfArrays(this.rows);
            return memento;
        }

        revert(memento) {
            Memento.revertArray(memento.hexes, this.hexes);
            Memento.revertSVGTranslation(memento.hexSupport, this.hexSupport);
            Memento.revertSVGTranslation(memento.itemSupport, this.itemSupport);
            Memento.revertSVGTranslation(memento.component, this.component);
            this.rowOffset = memento.rowOffset;
            this.colCount = memento.colCount;
            this.rowCount = memento.rowCount;
            this.baseSurface = memento.baseSurface;
            this.minColCount = memento.minColCount;
            this.maxColCount = memento.maxColCount;
            this.minRowCount = memento.minRowCount;
            this.maxRowCount = memento.maxRowCount;
            this.hexWidth = memento.hexWidth;
            Memento.revertArray(memento.ordered, this.ordered);
            Memento.revertArrayOfArrays(memento.rows, this.rows);
            this._updateSize();
        }

        forEachHex(handler) {
            for (let i = 0; i < this.hexes.length; i++) {
                handler(this.hexes[i]);
            }
        }

        forEachHexInRow(rowIndex, handler) {
            let row = this.rows[rowIndex];
            let offset = (rowIndex+this.rowOffset)%2;
            for (let c = 0; c < this.colCount; c++) {
                let hex = row[offset+c*2];
                handler(c, hex);
            }
        }

        forEachHexInColumn(colIndex, handler) {
            for (let r = 0; r < this.rows.length; r++) {
                let row = this.rows[r];
                let offset = (r+this.rowOffset)%2;
                let hex = row[offset+colIndex*2];
                handler(r, hex);
            }
        }

        linkHex(col, row) {
            let hex = this.rows[row][col * 2 + 1];
            Memento.register(hex);
            if (row > 0) {
                if ((row+this.rowOffset) % 2 === 1) {
                    hex.nw = this.rows[row - 1][col * 2];
                    if (col * 2 < this.colCount * 2 - 1) {
                        hex.ne = this.rows[row - 1][col * 2 + 2];
                    }
                    else {
                        hex.ne && delete hex.ne;
                    }
                }
                else {
                    hex.ne = this.rows[row - 1][col * 2 + 1];
                    if (col > 0) {
                        hex.nw = this.rows[row - 1][col * 2 - 1];
                    }
                    else {
                        hex.nw && delete hex.nw;
                    }
                }
            }
            else {
                hex.nw && delete hex.nw;
                hex.ne && delete hex.ne;
            }
            if (row < this.rows.length-1) {
                if ((row+this.rowOffset) % 2 === 1) {
                    hex.sw = this.rows[row + 1][col * 2];
                    if (col * 2 < this.colCount * 2 - 1) {
                        hex.se = this.rows[row + 1][col * 2 + 2];
                    }
                    else {
                        hex.se && delete hex.se;
                    }
                }
                else {
                    hex.se = this.rows[row + 1][col * 2 + 1];
                    if (col > 0) {
                        hex.sw = this.rows[row + 1][col * 2 - 1];
                    }
                    else {
                        hex.sw && delete hex.sw;
                    }
                }
            }
            else {
                hex.sw && delete hex.sw;
                hex.se && delete hex.se;
            }
            if ((row+this.rowOffset) % 2 === 1) {
                if (col > 0) {
                    hex.w = this.rows[row][col * 2 - 1];
                }
                else {
                    hex.w && delete hex.w;
                }
                if (col * 2 < this.colCount * 2 - 1) {
                    hex.e = this.rows[row][col * 2 + 3];
                }
                else {
                    hex.e && delete hex.e;
                }
            }
            else {
                if (col > 0) {
                    hex.w = this.rows[row][col * 2 - 2];
                }
                else {
                    hex.w && delete hex.w;
                }
                if (col * 2 < this.colCount * 2 - 1) {
                    hex.e = this.rows[row][col * 2 + 2];
                }
                else {
                    hex.e && delete hex.e;
                }
            }
        }

        showLink(hex, link) {
            let targetHex = hex[link];
            if (targetHex) {
                console.log("Link : hex["+hex.x+","+hex.y+"] -"+link+"-> hex["+targetHex.x+","+targetHex.y+"]");
            }
            else {
                console.log("Link : hex["+hex.x+","+hex.y+"] -"+link+"-> null");
            }
        }

        linkRow(row) {
            this.forEachHexInRow(row, (col, hex)=>{
                this.linkHex(col, row);
            });
        }

        refreshSurfacesInRow(row) {
            this.forEachHexInRow(row, (col, hex)=>{
                hex.refreshSurfaces();
            });
        }

        refreshLinesInRow(row) {
            this.forEachHexInRow(row, (col, hex)=>{
                hex.refreshLineEntries();
            });
        }

        refreshBordersInRow(row) {
            this.forEachHexInRow(row, (col, hex)=>{
                hex.refreshBorderSides();
            });
        }

        linkColumn(col) {
            this.forEachHexInColumn(col, (row, hex)=>{
                this.linkHex(col, row);
            });
        }

        refreshSurfacesInColumn(col) {
            this.forEachHexInColumn(col, (row, hex)=>{
                hex.refreshSurfaces();
            });
        }

        refreshLinesInColumn(col) {
            this.forEachHexInColumn(col, (row, hex)=>{
                hex.refreshLineEntries();
            });
        }

        refreshBordersInColumn(col) {
            this.forEachHexInColumn(col, (row, hex)=>{
                hex.refreshBorderSides();
            });
        }

        getHex(x, y) {
            return this.rows[y][x];
        }

        getHexFromPoint(point) {
            let x = point.x - MARGIN;
            let y = point.y - MARGIN;
            let h = svg.Hexagon.height(this.hexWidth);
            let w = this.hexWidth / 2;
            let c = Math.floor(x / h);
            let r = Math.floor(y / (w * 3));
            if (r === this.rowCount) {
                r = this.rowCount - 1;
            }
            if (c < 0 || c >= this.colCount * 2 || r < 0 || r >= this.rowCount) {
                return null;
            }
            if ((y % (w * 3)) < w) {
                if ((c + r) % 2) {
                    if ((x % h) * w > (y % w) * h) {
                        r--;
                    }
                }
                else {
                    if ((x % h) * w + (y % w) * h < h * w) {
                        r--;
                    }
                }
            }
            return r < 0 ? null : this.rows[r][c];
        }

        localPoint() {
            return this.component.localPoint.apply(this, arguments);
        }

        globalPoint() {
            return this.component.globalPoint.apply(this, arguments);
        }

        addGlasses(callback) {
            this.hexCallback = callback;
            this.hexes.forEach(function (hex) {
                hex.addGlass(callback)
            });
            return this;
        }

        execute(action) {
            this.hexes.forEach(action);
            return this;
        }
    }
    Map.MIN_COLS = 2;
    Map.MAX_COLS = 99;
    Map.MIN_ROWS = 2;
    Map.MAX_ROWS = 99;

    class Hex {

        constructor(x, y, width, ordered, baseSurface) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.baseSurface = baseSurface;
            this.hex = new svg.Hexagon(width, "V").color(this.baseSurface.color());
            this.component = new svg.Translation();
            this.ordered = makeOrdered(ordered);
            this.hexSupport = new svg.Ordered(ordered ? ordered.length : 0);
            this.component
                .add(this.hex)
                .add(this.hexSupport.active(false))
                .add(new svg.Hexagon(this.width, "V").color([], 2, [100, 100, 100]).opacity(0.3).active(false));
            this.itemSupport = new svg.Translation();
            this.surfaces = {};
            this.lines = {};
            this.borders = {};
            this.items = [];
            this.position(x, y);
        }

        memorize() {
            let memento = {};
            memento.x = this.x;
            memento.y = this.y;
            memento.width = this.width;
            memento.baseSurface = this.baseSurface;
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.ordered = Memento.registerObject(this.ordered);
            memento.hexSupport = Memento.registerSVGOrdered(this.hexSupport);
            memento.itemSupport = Memento.registerSVGTranslation(this.itemSupport);
            memento.surfaces = Memento.registerObject(this.surfaces);
            memento.lines = Memento.registerObject(this.lines);
            memento.borders = Memento.registerObject(this.borders);
            memento.items = Memento.registerArray(this.items);
            this.ne && (memento.ne = this.ne);
            this.e && (memento.e = this.e);
            this.se && (memento.se = this.se);
            this.sw && (memento.sw = this.sw);
            this.w && (memento.w = this.w);
            this.nw && (memento.nw = this.nw);
            return memento;
        }

        revert(memento) {
            this.x = memento.x;
            this.y = memento.y;
            this.width = memento.width;
            this.baseSurface = memento.baseSurface;
            this.hex.color(this.baseSurface.color());
            Memento.revertSVGTranslation(memento.component, this.component);
            Memento.revertObject(memento.ordered, this.ordered);
            Memento.revertSVGOrdered(memento.hexSupport, this.hexSupport);
            Memento.revertSVGTranslation(memento.itemSupport, this.itemSupport);
            Memento.revertObject(memento.surfaces, this.surfaces);
            Memento.revertObject(memento.lines, this.lines);
            Memento.revertObject(memento.borders, this.borders);
            Memento.revertArray(memento.items, this.items);
            this.items.forEach(item=>item.hex=this);
            memento.ne ? this.ne = memento.ne : delete this.ne;
            memento.e ? this.e = memento.e : delete this.e;
            memento.se ? this.se = memento.se : delete this.se;
            memento.sw ? this.sw = memento.sw : delete this.sw;
            memento.w ? this.w = memento.w : delete this.w;
            memento.nw ? this.nw = memento.nw : delete this.nw;
        }

        position(x, y) {
            Memento.register(this);
            let height = this.hex.height();
            this.x = x;
            this.y = y;
            let px = (x + 1) * height + MARGIN;
            let py = (y + 1) * this.width * 3 / 2 - this.width / 2 + MARGIN;
            this.component.move(px, py);
            this.itemSupport.move(px, py);
            console.log("Move hex["+this.x+","+this.y+"] to ("+px+","+py+")");
            return this;
        }

        setOrder(ordered) {
            Memento.register(this);
            this.ordered = makeOrdered(ordered);
            this.hexSupport.order(ordered.length);
            return this;
        }

        setBaseSurface(baseSurface) {
            Memento.register(this);
            this.baseSurface = baseSurface;
            this.hex.color(this.baseSurface.color());
            return this;
        }

        setSurface(surface) {
            if (!this.surfaces[surface.type]) {
                Memento.register(this);
                this.surfaces[surface.type] = surface.setHex(this);
                this.hexSupport.set(this.ordered[surface.type], surface.component);
                surface.draw();
                this.nw && this.nw.drawSurface(surface.type);
                this.ne && this.ne.drawSurface(surface.type);
                this.e && this.e.drawSurface(surface.type);
                this.se && this.se.drawSurface(surface.type);
                this.sw && this.sw.drawSurface(surface.type);
                this.w && this.w.drawSurface(surface.type);
            }
            return this;
        }

        refreshSurfaces() {
            for (let surfaceType in this.surfaces) {
                this.drawSurface(surfaceType);
            }
            return this;
        }

        removeSurface(type) {
            if (this.surfaces[type]) {
                Memento.register(this);
                delete this.surfaces[type];
                this.hexSupport.unset(this.ordered[type]);
                this.nw && this.nw.drawSurface(type);
                this.ne && this.ne.drawSurface(type);
                this.e && this.e.drawSurface(type);
                this.se && this.se.drawSurface(type);
                this.sw && this.sw.drawSurface(type);
                this.w && this.w.drawSurface(type);
            }
            return this;
        }

        getSurface(type) {
            return this.surfaces[type];
        }

        drawSurface(type) {
            if (this.surfaces[type]) {
                this._drawSurface(this.surfaces[type]);
            }
        }

        _drawSurface(surface) {
            Memento.register(surface);
            surface.draw();
        }

        setLine(line) {
            if (!this.lines[line.type]) {
                Memento.register(this);
                this.lines[line.type] = line.setHex(this);
                this.hexSupport.set(this.ordered[line.type], line.component);
                line.draw();
            }
            return this;
        }

        removeLine(type) {
            if (this.lines[type]) {
                Memento.register(this);
                delete this.lines[type];
                this.hexSupport.unset(this.ordered[type]);
            }
            return this;
        }

        getLine(type) {
            return this.lines[type];
        }

        getLineEntry(direction, type) {
            let line = this.getLine(type);
            return line ? line.getEntry(direction) : null;
        }

        addLineEntry(direction, type, value, builder) {
            let invDir = inverseDirection(direction);
            let invHex = this[direction];
            doIt(this, direction);
            invHex && doIt(invHex, invDir);

            function doIt(hex, direction) {
                let line = hex.getLine(type);
                if (line) {
                    line.addEntry(direction, value);
                }
                else {
                    line = builder();
                    hex.setLine(line);
                    line.addEntry(direction, value);
                }
            }
        }

        removeLineEntry(direction, type) {
            let invDir = inverseDirection(direction);
            let invHex = this[direction];
            doIt(this, direction);
            invHex && doIt(invHex, invDir);

            function doIt(hex, direction) {
                let line = hex.getLine(type);
                if (line) {
                    line.removeEntry(direction);
                    if (isEmpty(line.getEntries())) {
                        hex.removeLine(type);
                    }
                }
            }
        }

        refreshLineEntries() {
            doIt(this, "ne");
            doIt(this, "e");
            doIt(this, "se");
            doIt(this, "sw");
            doIt(this, "w");
            doIt(this, "nw");

            function doIt(hex, direction) {
                let invDir = inverseDirection(direction);
                let invHex = hex[direction];
                if (invHex) {
                    for (let type in invHex.lines) {
                        let line = invHex.getLine(type);
                        if (line && line.getEntry(invDir)) {
                            let hexLine = hex.getLine(type);
                            if (!hexLine) {
                                hexLine = line.duplicate();
                                hex.setLine(hexLine);
                            }
                            hexLine.addEntry(direction, line.getEntry(invDir));
                        }
                    }
                }
            }
        }

        setBorder(border) {
            if (!this.borders[border.type]) {
                Memento.register(this);
                this.borders[border.type] = border.setHex(this);
                this.hexSupport.set(this.ordered[border.type], border.component);
                border.draw();
            }
            return this;
        }

        removeBorder(type) {
            if (this.borders[type]) {
                Memento.register(this);
                delete this.borders[type];
                this.hexSupport.unset(this.ordered[type]);
            }
            return this;
        }

        getBorder(type) {
            return this.borders[type];
        }

        getBorderSide(direction, type) {
            var border = this.getBorder(type);
            return border ? border.getSide(direction) : null;
        }

        putBorderSide(direction, type, value, builder, force) {
            var border = this.getBorder(type);
            if (border) {
                if (!border.getSide(direction) && !border.getSide("c") || force) {
                    border.addSide(direction, value);
                }
            }
            else {
                border = builder();
                this.setBorder(border);
                border.addSide(direction, value);
            }
        }

        unputBorderSide(direction, type) {
            var border = this.getBorder(type);
            if (border) {
                border.removeSide(direction);
                if (isEmpty(border.getSides())) {
                    this.removeBorder(type);
                }
            }
        }

        addBorderSide(direction,type, value, builder) {
            this.putBorderSide(direction, type, value, builder, true);
            let invDir = inverseDirection(direction);
            let invHex = this[direction];
            invHex && invHex.putBorderSide(invDir, type, value, builder, true);
        }

        setBorderSide(direction, type, value, builder) {
            let border = this.getBorder(type);
            if (border) {
                this.removeBorder(type);
            }
            border = builder();
            this.setBorder(border);
            border.addSide(direction, value);
            if (direction === "c") {
                for (var d of ALL_DIRECTIONS) {
                    this[d] && this[d].putBorderSide(inverseDirection(d), type, value, builder, true);
                }
            }
        }

        removeBorderSide(direction, type, value, builder) {
            this.unputBorderSide(direction, type);
            if (direction === "c") {
                for (var d of ALL_DIRECTIONS) {
                    this.putBorderSide(d, type, value, builder, false);
                }
            }
            else {
                let invDir = inverseDirection(direction);
                let invHex = this[direction];
                invHex && invHex.unputBorderSide(invDir, type);
            }
        }

        refreshBorderSides() {
            doIt(this, "ne");
            doIt(this, "e");
            doIt(this, "se");
            doIt(this, "sw");
            doIt(this, "w");
            doIt(this, "nw");

            function doIt(hex, direction) {
                let invDir = inverseDirection(direction);
                let invHex = hex[direction];
                if (invHex) {
                    for (let type in invHex.borders) {
                        let border = invHex.getBorder(type);
                        if (border && (border.getSide(invDir) || border.getSide("c"))) {
                            let hexBorder = hex.getBorder(type);
                            if (!hexBorder) {
                                hexBorder = border.duplicate();
                                hex.setBorder(hexBorder);
                            }
                            let size = border.getSide(invDir) || border.getSide("c");
                            hexBorder.addSide(direction, size);
                        }
                    }
                }
            }
        }

        putItem(item, x, y) {
            if (!this.items.contains(item)) {
                Memento.register(this);
                Memento.register(item);
                this.items.add(item);
                if (x != undefined) {
                    item.move(x, y);
                }
                this.itemSupport.add(item.component);
                item.hex = this;
            }
            return this;
        }

        removeItem(item) {
            if (this.items.contains(item)) {
                Memento.register(this);
                Memento.register(item);
                this.items.remove(item);
                this.itemSupport.remove(item.component);
                item.hex = null;
            }
            return this;
        }

        getItem(type) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i] instanceof type) {
                    return this.items[i];
                }
            }
            return null;
        }

        height() {
            return this.hex.height();
        }

        toString() {
            return "Hex : " + this.x + "," + this.y + " ";
        }

        addGlass(callback) {
            svg.addEvent(this.hex, 'click', event=> {
                var local = this.hex.localPoint(event.pageX, event.pageY);
                callback(this, local.x, local.y, this.getPiece(local), this.isCenter(local));
            });
            svg.removeEvent(this.hex, 'mousedown');
            return this;
        }

        isCenter(local) {
            return local.x * local.x + local.y * local.y < this.width * this.width / 4;
        }

        localPoint() {
            return this.component.localPoint.apply(this, arguments);
        }

        globalPoint() {
            return this.component.globalPoint.apply(this, arguments);
        }

        getPiece(local) {
            let slope = this.width / 2 / this.height();
            if (local.x <= 0) {
                if (local.x * slope > local.y) {
                    return "nw";
                }
                else if (local.x * slope > -local.y) {
                    return "sw";
                }
                else {
                    return "w";
                }
            }
            else {
                if (local.x * slope < -local.y) {
                    return "ne";
                }
                else if (local.x * slope < local.y) {
                    return "se";
                }
                else {
                    return "e";
                }
            }
        };
    }

    class Surface {

        constructor(type, colors) {
            this.type = type;
            this.colors = colors;
            this.component = new svg.Translation();
        }

        memorize() {
            let memento = {};
            memento.type = this.type;
            memento.colors = this.colors;
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.path = this.path;
            memento.back = this.back;
            return memento;
        }

        revert(memento) {
            this.type = memento.type;
            this.colors = memento.colors;
            Memento.revertSVGTranslation(memento.component, this.component);
            this.path = memento.path;
            this.back = memento.back;
        }

        color() {
            return this.colors[0];
        }

        setHex(hex) {
            this.hex = hex;
            return this;
        }

        _process(leftDir, direction, rightDirection, angle) {
            let _same = direction => {
                return !this.hex[direction] || this.hex[direction].surfaces[this.type];
            };
            let point;
            let control1;
            let control2;
            if (_same(direction)) {
                if (_same(leftDir)) {
                    point = rotate(this.hex.height(), -this.hex.width / 2, angle);
                }
                else {
                    point = rotate(this.hex.height(), -this.hex.width / 2 * SECOND_REDUCTION_FACTOR, angle);
                }
                if (!this.back) {
                    this.back = new svg.Path(point.x, point.y);
                    this.path = new svg.Path(point.x, point.y);
                }
                if (_same(rightDirection)) {
                    point = rotate(this.hex.height(), this.hex.width / 2, angle);
                }
                else {
                    point = rotate(this.hex.height(), this.hex.width / 2 * SECOND_REDUCTION_FACTOR, angle);
                }
                this.back.line(point.x, point.y);
                this.path.move(point.x, point.y);
            }
            else {
                let rx = this.hex.height() * (0.5 + SECOND_REDUCTION_FACTOR / 2);
                let ry = this.hex.width / 2 * (1.5 - SECOND_REDUCTION_FACTOR / 2);
                let dx = this.hex.height() * REDUCTION_FACTOR;
                let dy = this.hex.width / 2 * REDUCTION_FACTOR;
                if (_same(leftDir)) {
                    point = rotate(rx, -ry, angle);
                    control1 = rotate(rx - dy / 3, -ry + dx / 3, angle);
                }
                else {
                    point = rotate(dx, -dy, angle);
                    control1 = rotate(dx + dy / 3, -dy + dx / 3, angle);
                }
                if (!this.back) {
                    this.back = new svg.Path(point.x, point.y);
                    this.path = new svg.Path(point.x, point.y);
                }
                if (_same(rightDirection)) {
                    point = rotate(rx, ry, angle);
                    control2 = rotate(rx - dy / 3, ry - dx / 3, angle);
                }
                else {
                    point = rotate(dx, dy, angle);
                    control2 = rotate(dx + dy / 3, dy - dx / 3, angle);
                }
                this.back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                this.path.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            }

        }

        draw() {
            let x = 0;
            let y = 0;
            if (this.back) {
                this.component.remove(this.back);
                delete this.back;
                this.component.remove(this.path);
                delete this.path;
            }
            this._process("ne", "e", "se", 0);
            this._process("e", "se", "sw", 60);
            this._process("se", "sw", "w", 120);
            this._process("sw", "w", "nw", 180);
            this._process("w", "nw", "ne", 240);
            this._process("nw", "ne", "e", 300);
            if (this.path) {
                this.component.add(this.back.opacity(0.7).color(this.colors[0]));
                this.component.add(this.path.opacity(0.7).color([], this.colors[1], this.colors[2]));
            }
        }
    }

    class Border {

        constructor(type, sides, colors) {
            this.type = type;
            this.sides = sides;
            this.colors = colors;
            this.component = new svg.Translation();
        }

        memorize() {
            let memento = {};
            memento.type = this.type;
            memento.sides = Memento.registerObject(this.sides);
            memento.colors = this.colors;
            memento.component = Memento.registerSVGTranslation(this.component);
            return memento;
        }

        revert(memento) {
            this.type = memento.type;
            Memento.revertObject(memento.sides, this.sides);
            this.colors = memento.colors;
            Memento.revertSVGTranslation(memento.component, this.component);
        }

        duplicate() {
            return new Border(this.type, {}, this.colors);
        }

        addSide(direction, value) {
            Memento.register(this);
            this.sides[direction] = value;
            this.draw();
            return this;
        }

        removeSide(direction) {
            Memento.register(this);
            delete this.sides[direction];
            this.draw();
            return this;
        }

        getSide(direction) {
            return this.sides[direction];
        }

        getSides() {
            return this.sides;
        }

        setHex(hex) {
            this.hex = hex;
            return this;
        }

        _processCenter() {
            if (this._hasBorder("c")) {
                this.component.add(new svg.Hexagon(this.hex.width, "V").color(this.colors[0]));
                return true;
            }
            return false;
        }

        _process(leftDirection, direction, rightDirection, angle) {
            let start;
            let point;
            let control1;
            let control2;
            let back = null;
            let border = null;
            if (this._hasBorder(direction)) {
                let cx = this.hex.height();
                let cy = this.hex.width / 2;
                let rx = this.hex.height() * (0.5 + SECOND_REDUCTION_FACTOR / 2);
                let ry = this.hex.width / 2 * (1.5 - SECOND_REDUCTION_FACTOR / 2);
                let dx = this.hex.height() * this._getReductionFactor();
                let dy = this.hex.width / 2 * this._getReductionFactor();
                start = rotate(cx, -cy, angle);
                back = new svg.Path(start.x, start.y);
                border = new svg.Path(start.x, start.y);
                if (this._hasBorder(leftDirection)) {
                    point = rotate(dx, -dy, angle);
                    back.line(point.x, point.y);
                    border.move(point.x, point.y);
                    control1 = rotate(dx + dy / 3, -dy + dx / 3, angle);
                }
                else {
                    point = rotate(rx, -ry, angle);
                    back = new svg.Path(point.x, point.y);
                    border = new svg.Path(point.x, point.y);
                    control1 = rotate(rx - dy / 3, -ry + dx / 3, angle);
                }
                if (this._hasBorder(rightDirection)) {
                    point = rotate(dx, dy, angle);
                    control2 = rotate(dx + dy / 3, dy - dx / 3, angle);
                }
                else {
                    point = rotate(rx, ry, angle);
                    control2 = rotate(rx - dy / 3, ry - dx / 3, angle);
                }
                back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                border.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                point = rotate(cx, cy, angle);
                back.line(point.x, point.y);
                back.line(start.x, start.y);
                this.component.add(back.color(this.colors[0]));
                this.component.add(border.color([], this.colors[1], this.colors[2]));
            }
        }

        _getReductionFactor() {
            let factor = 1;
            if (this.sides.ne && this.sides.ne < factor) factor = this.sides.ne;
            if (this.sides.e && this.sides.e < factor) factor = this.sides.e;
            if (this.sides.se && this.sides.se < factor) factor = this.sides.se;
            if (this.sides.sw && this.sides.sw < factor) factor = this.sides.sw;
            if (this.sides.w && this.sides.w < factor) factor = this.sides.w;
            if (this.sides.nw && this.sides.nw < factor) factor = this.sides.nw;
            return factor;
        }

        _hasBorder(direction) {
            return this.sides[direction];
        }

        draw() {
            let x = 0;
            let y = 0;
            this.component.clear();
            if (!this._processCenter()) {
                this._process("ne", "e", "se", 0);
                this._process("e", "se", "sw", 60);
                this._process("se", "sw", "w", 120);
                this._process("sw", "w", "nw", 180);
                this._process("w", "nw", "ne", 240);
                this._process("nw", "ne", "e", 300);
            }
        }
    }

    class Line {

        constructor(type, entries, colors) {
            this.type = type;
            this.colors = colors;
            this.entries = entries;
            this.component = new svg.Translation();
        }

        memorize() {
            let memento = {};
            memento.type = this.type;
            memento.entries = Memento.registerObject(this.entries);
            memento.colors = this.colors;
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.path = this.path;
            memento.back = this.back;
            return memento;
        }

        revert(memento) {
            this.type = memento.type;
            Memento.revertObject(memento.entries, this.entries);
            this.colors = memento.colors;
            Memento.revertSVGTranslation(memento.component, this.component);
            this.path = memento.path;
            this.back = memento.back;
        }

        duplicate() {
            return new Line(this.type, {}, this.colors);
        }

        addEntry(direction, value) {
            Memento.register(this);
            this.entries[direction] = value;
            this.draw();
            return this;
        }

        removeEntry(direction) {
            Memento.register(this);
            delete this.entries[direction];
            this.draw();
            return this;
        }

        getEntry(direction) {
            return this.entries[direction];
        }

        getEntries() {
            return this.entries;
        }

        setHex(hex) {
            this.hex = hex;
            return this;
        }

        draw() {
            let x = 0;
            let y = 0;
            let emptySteps = 0;
            if (this.path) {
                this.component.remove(this.back);
                delete this.back;
                this.component.remove(this.path);
                delete this.path;
            }
            let firstEntry = this._startProcess("e", null, 0);
            let control = this._endProcess("e", 0);
            firstEntry = this._startProcess("se", control, 60) || firstEntry;
            control = this._endProcess("se", 60) || enlarge(control);
            firstEntry = this._startProcess("sw", control, 120) || firstEntry;
            control = this._endProcess("sw", 120) || enlarge(control);
            firstEntry = this._startProcess("w", control, 180) || firstEntry;
            control = this._endProcess("w", 180) || enlarge(control);
            firstEntry = this._startProcess("nw", control, 240) || firstEntry;
            control = this._endProcess("nw", 240) || enlarge(control);
            firstEntry = this._startProcess("ne", control, 300) || firstEntry;
            control = this._endProcess("ne", 300) || enlarge(control);
            if (firstEntry) {
                for (var i = 0; i < emptySteps; i++) {
                    control.x *= LINE_ENLARGE_FACTOR;
                }
                this._startProcess(firstEntry[0], control, firstEntry[1]);
            }
            if (this.path) {
                this.component.add(this.back.color(this.colors[0]));
                this.component.add(this.path.color([], this.colors[1], this.colors[2]));
            }

            function enlarge(control) {
                if (control) {
                    control.x *= LINE_ENLARGE_FACTOR
                }
                else {
                    emptySteps += 1;
                }
                return control;
            }
        }

        _endProcess(entry, angle) {
            let point;
            if (this.entries[entry]) {
                point = rotate(this.hex.height(), 0, angle);
                if (!this.path) {
                    this.back = new svg.Path(point.x, point.y);
                    this.path = new svg.Path(point.x, point.y);
                }
                else {
                    this.back.line(point.x, point.y);
                }
                let wideness = this.entries[entry] * this.hex.width;
                point = rotate(this.hex.height(), wideness / 2, angle);
                this.back.line(point.x, point.y);
                this.path.move(point.x, point.y);
                point = rotate(this.hex.height() * .75, wideness / 2, angle);
                this.back.line(point.x, point.y);
                this.path.line(point.x, point.y);
                return {x: this.hex.height() * LINE_CONTROL_FACTOR, y: wideness / 2, angle: angle};
            }
            else {
                return null;
            }
        }

        _startProcess(entry, control1, angle) {
            let point;
            let control2;
            if (this.entries[entry]) {
                if (!this.path) {
                    return [entry, angle];
                }
                control1 = rotate(control1.x, control1.y, control1.angle);
                var wideness = this.entries[entry] * this.hex.width;
                control2 = rotate(this.hex.height() * LINE_CONTROL_FACTOR, -wideness / 2, angle);
                point = rotate(this.hex.height() * .75, -wideness / 2, angle);
                this.back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                this.path.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                point = rotate(this.hex.height(), -wideness / 2, angle);
                this.back.line(point.x, point.y);
                this.path.line(point.x, point.y);
                point = rotate(this.hex.height(), 0, angle);
                this.back.line(point.x, point.y);
            }
            return null;
        }

    }

    const ANCHOR_MARGIN = 10;

    class Item {

        constructor(angle, glass) {
            this.base = new svg.Translation();
            this.rotation = new svg.Rotation(angle);
            this.component = new svg.Translation().add(this.rotation.add(this.base));
            this.glass = glass;
            this.rotation.add(this.glass);
            this.events = {};
        }

        memorize() {
            let memento = {};
            memento.base = Memento.registerSVGTranslation(this.base);
            memento.rotation = Memento.registerSVGRotation(this.rotation);
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.events = Memento.registerObject(this.events);
            return memento;
        }

        revert(memento) {
            Memento.revertSVGTranslation(memento.base, this.base);
            Memento.revertSVGRotation(memento.rotation, this.rotation);
            Memento.revertSVGTranslation(memento.component, this.component);
            for (let eventName in this.events) {
                svg.removeEvent(this.glass, eventName);
            }
            Memento.revertObject(memento.events, this.events);
            for (let eventName in this.events) {
                svg.addEvent(this.glass, eventName, this.events[eventName]);
            }
        }

        rotate(angle) {
            Memento.register(this);
            this.rotation.rotate(angle);
            return this;
        }

        move(x, y) {
            Memento.register(this);
            this.component.move(x, y);
            return this;
        }

        addEvent(eventName, handler) {
            Memento.register(this);
            svg.addEvent(this.glass, eventName, handler);
            this.events[eventName] = handler;
        }

        removeEvent(eventName) {
            Memento.register(this);
            svg.removeEvent(this.glass, eventName);
            delete this.events[eventName];
        }

        get angle() {
            return this.rotation.angle;
        }

        get x() {
            return this.component.x;
        }

        get y() {
            return this.component.y;
        }

    }

    class Composite extends Item {

        constructor(angle, width) {
            super(angle, new svg.Hexagon(width, "V").color([255, 0, 0], 0, []).opacity(0.001));
            this.width = width;
            this.children = [];
        }

        memorize() {
            let memento = super.memorize();
            memento.width = this.width;
            memento.children = Memento.registerArray(this.children);
            memento._opacity = this.glass._opacity;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.width = memento.width;
            Memento.revertArray(memento.children, this.children);
            this.glass.opacity(memento._opacity);
        }

        highlight(flag) {
            this.glass.opacity(flag ? 0.2 : 0.001);
            return this;
        }

        isHighlighted() {
            var result = this.glass._opacity === 0.2;
            return result;
        }

        add(item) {
            Memento.register(this);
            if (this.children.add(item)) {
                this.base.add(item.component);
            }
            return this;
        }

        remove(item) {
            Memento.register(this);
            if (this.children.remove(item)) {
                this.base.remove(item.component);
            }
            return this;
        }

        conform() {
            for (let i = 0; i < this.children.length; i++) {
                let item = this.children[i];
                item.rotate(item.angle + this.angle);
                let point = svg.rotate(item.x, item.y, this.angle);
                item.move(point.x, point.y);
            }
            this.rotate(0);
        }

        clear() {
            let item;
            while (item = this.children.pop()) {
                this.base.remove(item.component);
            }
            return this;
        }

        anchor(x, y) {
            for (let i = 0; i < this.glass.points.length; i++) {
                let point = this.glass.points[i];
                let dist = (point.x - x) * (point.x - x) + (point.y - y) * (point.y - y);
                if (dist < ANCHOR_MARGIN * ANCHOR_MARGIN) {
                    return {x: x, y: y};
                }
            }
            return null;
        }

        duplicate() {
            var dup = new Composite(this.angle, this.width);
            dup.copy(this.children);
            return dup;
        }

        copy(items) {
            for (let i = 0; i < items.length; i++) {
                this.add(items[i].duplicate());
            }
            return this;
        }

    }

    class House extends Item {

        constructor(width, height, colors, angle) {
            super(angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
            this.width = width;
            this.height = height;
            this.colors = colors;
            this.base
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2, -height / 2, -width / 2 + height / 2, 0).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2, height / 2, -width / 2 + height / 2, 0).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2 + height / 2, 0, width / 2 - height / 2, 0).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(width / 2, -height / 2, width / 2 - height / 2, 0).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(width / 2, height / 2, width / 2 - height / 2, 0).color(colors[0], colors[1], colors[2]));
        }

        memorize() {
            let memento = super.memorize();
            memento.width = this.width;
            memento.height = this.height;
            memento.colors = this.colors;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.width = memento.width;
            this.height = memento.height;
            this.colors = memento.colors;
        }

        anchor(x, y) {
            var anchorX = null;
            var anchorY = null;
            if (x < -this.glass.width / 2 + ANCHOR_MARGIN) {
                anchorX = -this.glass.width / 2;
            }
            if (x > this.glass.width / 2 - ANCHOR_MARGIN) {
                anchorX = this.glass.width / 2;
            }
            if (y < -this.glass.height / 2 + ANCHOR_MARGIN) {
                anchorY = -this.glass.height / 2;
            }
            if (y > this.glass.height / 2 - ANCHOR_MARGIN) {
                anchorY = this.glass.height / 2;
            }
            return anchorX != null && anchorY != null ? {x: anchorX, y: anchorY} : null;
        }

        duplicate() {
            var house = new House(this.width, this.height, this.colors, this.angle);
            if (this.x != undefined) {
                house.move(this.x, this.y);
            }
            return house;
        }

    }

    class RoundOpenTower extends Item {

        constructor(radius, colors) {
            super(0, new svg.Circle(radius).color([0, 0, 0]).opacity(0.001));
            this.radius = radius;
            this.colors = colors;
            this.base
                .add(new svg.Circle(radius).color(colors[0], colors[1], colors[2]))
                .add(new svg.Circle(Math.round(radius * 0.8)).color(colors[0], colors[1], colors[2]));
        }

        memorize() {
            let memento = super.memorize();
            memento.radius = this.radius;
            memento.colors = this.colors;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.radius = memento.radius;
            this.colors = memento.colors;
        }

        anchor(x, y) {
            return null;
        }

        duplicate() {
            let tower = new RoundOpenTower(this.radius, this.colors);
            if (this.x != undefined) {
                tower.move(this.x, this.y);
            }
            return tower;
        }
    }

    class SquareOpenTower extends Item {

        constructor(width, height, colors, angle) {
            super(angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
            this.width = width;
            this.height = height;
            this.colors = colors;
            this.base
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Rect(Math.round(width * 0.8), Math.round(height * 0.8)).color(colors[0], colors[1], colors[2]));
        }

        memorize() {
            let memento = super.memorize();
            memento.width = this.width;
            memento.height = this.height;
            memento.colors = this.colors;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.width = memento.width;
            this.height = memento.height;
            this.colors = memento.colors;
        }

        anchor(x, y) {
            var anchorX = null;
            var anchorY = null;
            if (x < -this.glass.width / 2 + ANCHOR_MARGIN) {
                anchorX = -this.glass.width / 2;
            }
            if (x > this.glass.width / 2 - ANCHOR_MARGIN) {
                anchorX = this.glass.width / 2;
            }
            if (y < -this.glass.height / 2 + ANCHOR_MARGIN) {
                anchorY = -this.glass.height / 2;
            }
            if (y > this.glass.height / 2 - ANCHOR_MARGIN) {
                anchorY = this.glass.height / 2;
            }
            return anchorX != null && anchorY != null ? {x: anchorX, y: anchorY} : null;
        }

        duplicate() {
            var tower = new SquareOpenTower(this.width, this.height, this.colors, this.angle);
            if (this.x != undefined) {
                tower.move(this.x, this.y);
            }
            return tower;
        }
    }

    class Bridge extends Item {

        constructor(width, height, colors, angle) {
            const BORDER_FACTOR = 1;
            super(angle, new svg.Rect(width, height).color([0, 0, 0]).opacity(0.001));
            this.width = width;
            this.height = height;
            this.colors = colors;
            this.base
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Polygon(0, 0)
                    .add(-width / 2, -height / 2).trace(-height / 3, -height / 3).trace(height / 6, -height / 6)
                    .add(-width / 2 + height / 4, -height / 2 - height / 4)
                    .add(width / 2 - height / 4, -height / 2 - height / 4).trace(height * (5 / 12), -height / 4).trace(height / 6, height / 6)
                    .add(width / 2, -height / 2)
                    .color(colors[0], colors[1], colors[2]))
                .add(new svg.Polygon(0, 0)
                    .add(-width / 2, height / 2).trace(-height / 3, height / 3).trace(height / 6, height / 6)
                    .add(-width / 2 + height / 4, height / 2 + height / 4)
                    .add(width / 2 - height / 4, height / 2 + height / 4).trace(height * (5 / 12), height / 4).trace(height / 6, -height / 6)
                    .add(width / 2, height / 2)
                    .color(colors[0], colors[1], colors[2]));
        }

        memorize() {
            let memento = super.memorize();
            memento.width = this.width;
            memento.height = this.height;
            memento.colors = this.colors;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.width = memento.width;
            this.height = memento.height;
            this.colors = memento.colors;
        }

        anchor(x, y) {
            let anchorX = null;
            let anchorY = null;
            if (x < -this.glass.width / 2 + ANCHOR_MARGIN) {
                anchorX = -this.glass.width / 2;
            }
            if (x > this.glass.width / 2 - ANCHOR_MARGIN) {
                anchorX = this.glass.width / 2;
            }
            if (y < -this.glass.height / 2 + ANCHOR_MARGIN) {
                anchorY = -this.glass.height / 2;
            }
            if (y > this.glass.height / 2 - ANCHOR_MARGIN) {
                anchorY = this.glass.height / 2;
            }
            return anchorX != null && anchorY != null ? {x: anchorX, y: anchorY} : null;
        }

        duplicate() {
            let bridge = new Bridge(this.width, this.height, this.colors, this.angle);
            if (this.x != undefined) {
                bridge.move(this.x, this.y);
            }
            return bridge;
        }
    }

    class Tree extends Item {

        constructor(points, colors, angle) {
            super(angle, this._createGlass(points));
            this.points = points;
            this.colors = colors;
            this.base.add(this._createTree(points));
        }

        memorize() {
            let memento = super.memorize();
            memento.points = Memento.registerArray(this.points);
            memento.colors = this.colors;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            Memento.revertArray(memento.points, this.points);
            this.colors = memento.colors;
        }

        _createGlass(points) {
            var start = true;
            var glass = new svg.Polygon(0, 0);
            for (var i = 0; i < points.length; i++) {
                glass.add(points[i].x, points[i].y);
            }
            return glass;
        }

        _createTree(points) {
            let start = true;
            let tree = new svg.Path().color(colors[0], colors[1], colors[2]);
            for (let i = 0; i < points.length; i++) {
                let point = points[i];
                let prevPoint = i === 0 ? points[points.length - 1] : points[i - 1];
                let nextPoint = i === points.length - 1 ? points[0] : points[i + 1];
                let startMiddle = {x: (prevPoint.x + point.x) / 2, y: (prevPoint.y + point.y) / 2};
                let lastMiddle = {x: (nextPoint.x + point.x) / 2, y: (nextPoint.y + point.y) / 2};
                if (start) {
                    tree.move(startMiddle.x, startMiddle.y);
                    start = false;
                }
                tree.bezier(point.x, point.y, lastMiddle.x, lastMiddle.y);
            }
            return tree;
        }

        anchor(x, y) {
            return x * x + y * y > ANCHOR_MARGIN * ANCHOR_MARGIN ? {x: x, y: y} : null;
        }

        duplicate() {
            let tree = new Tree(this.points, this.colors, this.angle);
            if (this.x != undefined) {
                tree.move(this.x, this.y);
            }
            return tree;
        };
    }

    class MapBuilder {

        spec(map) {
            let desc = {};
            desc.surfaces = {};
            desc.borders = {};
            desc.lines = {};
            desc.minColCount = map.minColCount;
            desc.maxColCount = map.maxColCount;
            desc.minRowCount = map.minRowCount;
            desc.maxRowCount = map.maxRowCount;
            desc.rowOffset = map.rowOffset;
            desc.hexWidth = map.hexWidth;
            desc.rowCount = map.rowCount;
            desc.colCount = map.colCount;
            desc.ordered = map.ordered.duplicate();
            desc.baseSurface = map.baseSurface.type;
            this.registerSurface(desc, map.baseSurface);
            desc.background = map.background.fillColor.duplicate();
            desc.hexes = [];
            map.hexes.forEach(hex=>{
                let hexDesc = this.hexSpec(desc, hex);
                if (hexDesc) {
                    desc.hexes.push(hexDesc);
                }
            });
            return desc;
        }

        hexSpec(desc, hex) {
            if (hex.surfaces.empty() && hex.lines.empty() && hex.borders.empty() && hex.items.empty()) {
                return null;
            }
            let hexDesc = {};
            hexDesc.x = hex.x;
            hexDesc.y = hex.y;
            if (!hex.surfaces.empty()) {
                hexDesc.surfaces = [];
                hex.surfaces.forEach((type, surface)=>{
                    hexDesc.surfaces.push(type);
                    this.registerSurface(desc, surface);
                });
            }
            if (!hex.borders.empty()) {
                hexDesc.borders = [];
                hex.borders.forEach((type, border)=>{
                    hexDesc.borders.push({type:type, sides:border.sides});
                    this.registerBorder(desc, border);
                });
            }
            if (!hex.lines.empty()) {
                hexDesc.lines = [];
                hex.lines.forEach((type, line)=>{
                    hexDesc.lines.push({type:type, entries:line.entries});
                    this.registerLine(desc, line);
                });
            }
            if (!hex.items.empty()) {
                hexDesc.items = [];
                hex.items.forEach(item=>{
                    hexDesc.items.push(this.itemSpec(item));
                });
            }
            return hexDesc;
        }

        map(desc) {
            let baseSurface = this.retrieveSurface(desc, desc.baseSurface);
            let map = new Map(desc.rowOffset, desc.colCount, desc.rowCount, desc.hexWidth, desc.ordered, baseSurface, desc.background);
            map.bounds(desc.minColCount, desc.maxColCount, desc.minRowCount, desc.maxRowCount);
            desc.hexes.forEach(hexDesc=>{
                let hex = map.getHex(hexDesc.x, hexDesc.y);
                hexDesc.surfaces && hexDesc.surfaces.forEach(type=>{
                    hex.setSurface(this.retrieveSurface(desc, type));
                });
                hexDesc.borders && hexDesc.borders.forEach(descBorder=>{
                    hex.setBorder(this.retrieveBorder(desc, descBorder.type, descBorder.sides));
                });
                hexDesc.lines && hexDesc.lines.forEach(descLine=>{
                    hex.setLine(this.retrieveLine(desc, descLine.type, descLine.entries));
                });
                hexDesc.items && hexDesc.items.forEach(itemDesc=>{
                    hex.putItem(this.item(itemDesc), itemDesc.x, itemDesc.y);
                });
            });
            return map;
        }

        itemSpec(item) {
            if (item instanceof House) {
                return {type:"House", x:item.x, y:item.y,
                    angle:item.angle,
                    width:item.width, height:item.height,
                    colors:item.colors.duplicate()};
            }
            if (item instanceof RoundOpenTower) {
                return {type:"RoundOpenTower", x:item.x, y:item.y,
                    radius:item.radius,
                    colors:item.colors.duplicate()};
            }
            if (item instanceof SquareOpenTower) {
                return {type:"SquareOpenTower", x:item.x, y:item.y,
                    angle:item.angle,
                    width:item.width, height:item.height,
                    colors:item.colors.duplicate()};
            }
            if (item instanceof Bridge) {
                return {type:"Bridge", x:item.x, y:item.y,
                    angle:item.angle,
                    width:item.width, height:item.height,
                    colors:item.colors.duplicate()};
            }
            if (item instanceof Tree) {
                return {type:"Tree", x:item.x, y:item.y,
                    angle:item.angle,
                    points:item.points.duplicate(),
                    colors:item.colors.duplicate()};
            }
        }

        item(itemDesc) {
            if (itemDesc.type==="House") {
                return new House(itemDesc.width, itemDesc.height, itemDesc.colors.duplicate(), itemDesc.angle);
            }
            if (itemDesc.type==="RoundOpenTower") {
                return new RoundOpenTower(itemDesc.radius, itemDesc.colors.duplicate());
            }
            if (itemDesc.type==="SquareOpenTower") {
                return new SquareOpenTower(itemDesc.width, itemDesc.height, itemDesc.colors.duplicate(), itemDesc.angle);
            }
            if (itemDesc.type==="Bridge") {
                return new Bridge(itemDesc.width, itemDesc.height, itemDesc.colors.duplicate(), itemDesc.angle);
            }
            if (itemDesc.type==="Tree") {
                return new Tree(itemDesc.points.duplicate(), itemDesc.colors.duplicate(), itemDesc.angle);
            }
        }

        registerSurface(registry, surface) {
            if (!registry.surfaces[surface.type]) {
                registry.surfaces[surface.type] = {};
                registry.surfaces[surface.type].colors = surface.colors.duplicate();
            }
        }

        retrieveSurface(registry, type) {
            return new Surface(type, registry.surfaces[type].colors.duplicate());
        }

        registerBorder(registry, border) {
            if (!registry.borders[border.type]) {
                registry.borders[border.type] = {};
                registry.borders[border.type].colors = border.colors.duplicate();
            }
        }

        retrieveBorder(registry, type, sides) {
            return new Border(type, sides.duplicate(), registry.borders[type].colors.duplicate());
        }

        registerLine(registry, line) {
            if (!registry.lines[line.type]) {
                registry.lines[line.type] = {};
                registry.lines[line.type].colors = line.colors.duplicate();
            }
        }

        retrieveLine(registry, type, entries) {
            return new Line(type, entries.duplicate(), registry.lines[type].colors.duplicate());
        }

    }

    return {
        isEmpty : isEmpty,
        inverseDirection : inverseDirection,

        Map : Map,
        MapBuilder : MapBuilder,
        Hex : Hex,
        Surface : Surface,
        Line : Line,
        Border : Border,
        Item : Item,
        Composite : Composite,
        House : House,
        RoundOpenTower : RoundOpenTower,
        SquareOpenTower : SquareOpenTower,
        Tree : Tree,
        Bridge : Bridge,

        HEX_WIDTH : HEX_WIDTH,
        ALL_DIRECTIONS : ALL_DIRECTIONS
    };
};
