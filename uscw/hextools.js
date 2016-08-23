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

        constructor(rowOffset, colCount, rowCount, hexWidth, ordered, baseSurface,
                    backgroundColor) {
            this.minColCount = Map.MIN_COLS;
            this.maxColCount = Map.MAX_COLS;
            this.minRowCount = Map.MIN_ROWS;
            this.maxRowCount = Map.MAX_ROWS;
            this.rowOffset = rowOffset;
            this.hexWidth = hexWidth;
            this.rowCount = 0;
            this.colCount = colCount;
            this.turnCount = 0;
            this.turnWidth = hexWidth*4;
            this.turnHeight = hexWidth*2;
            this.turnColors = [backgroundColor, 4, [backgroundColor[0]/2, backgroundColor[1]/2, backgroundColor[2]/2]];
            this.playerHeight = hexWidth*2;
            this.teamWidth = hexWidth;
            this.playerColors = [backgroundColor, 4, [backgroundColor[0]/2, backgroundColor[1]/2, backgroundColor[2]/2]];
            this.ordered = ordered;
            this.rows = [];
            this.hexes = [];
            this.turns = [];
            this.players = [];
            this.selected = [];
            this.hexSupport = new svg.Translation();
            this.itemSupport = new svg.Translation();
            this.zoneSupport = new svg.Translation().active(false);
            this.unitSupport = new svg.Translation();
            this.turnSupport = new svg.Translation();
            this.playerSupport = new svg.Translation();
            this.component = new svg.Translation();
            this.baseSurface = baseSurface;
            this.background = new svg.Rect(0, 0).color(backgroundColor);
            this.component.width = (colCount * 2 + 1) * svg.Hexagon.height(this.hexWidth) + MARGIN * 2;
            this.component.height = (rowCount * 3 + 1) / 2 * this.hexWidth + MARGIN * 2;
            this.component
                .add(this.background)
                .add(this.hexSupport).add(this.itemSupport).add(this.zoneSupport).add(this.unitSupport)
                .add(this.turnSupport).add(this.playerSupport);
            this.component.onResize = (handler)=>{
                this.background.onResize(handler);
            };
            this.createHexes(rowCount);
        }

        playMode() {
            this.hexSupport = new svg.Translation().active(false);
            this.itemSupport = new svg.Translation().active(false);
            this.turnSupport = new svg.Translation().active(false);
            this.playerSupport = new svg.Translation().active(false);
            return this;
        }

        player(playerHeight, teamWidth, playerColors) {
            this.playerHeight = playerHeight;
            this.playerColors = playerColors;
            this.teamWidth = teamWidth;
            return this;
        }

        turn(turnWidth, turnHeight, turnColors) {
            this.turnWidth = turnWidth;
            this.turnHeight = turnHeight;
            this.turnColors = turnColors;
            return this;
        }

        turnNumber(turnCount) {
            Memento.register(this);
            this._turnNumber(turnCount);
            this._updateSize();
            return this;
        }

        _turnNumber(turnCount) {
            this.turnCount = turnCount;
            if (turnCount<this.turns.length) {
                for (let t=turnCount; t<this.turns.length; t++) {
                    this.turnSupport.remove(this.turns[t]);
                }
                this.turns.length = turnCount;
            }
            else {
                for (let t=this.turns.length; t<turnCount; t++) {
                    let turn = new Turn(t, "Turn " + (t+1), this.turnWidth, this.turnHeight, this.turnColors);
                    this.turnSupport.add(turn.component);
                    this.turns.push(turn);
                }
            }
        }

        createPlayer(playerName) {
            let player = new Player(playerName, this.playerHeight, this.teamWidth, this.playerColors);
            this.addPlayer(player);
            return this;
        }

        addPlayer(player) {
            Memento.register(this);
            player.map = this;
            this.players.add(player);
            this.playerSupport.add(player.component);
            this._updateSize();
            return this;
        }

        bounds(minColCount, maxColCount, minRowCount, maxRowCount) {
            this.minColCount = minColCount;
            this.maxColCount = maxColCount;
            this.minRowCount = minRowCount;
            this.maxRowCount = maxRowCount;
            return this;
        }

        _updateSize() {
            let mapHeight = (this.rows.length * 3 + 1) / 2 * this.hexWidth;
            let mapWidth = (this.colCount * 2 + 1) * svg.Hexagon.height(this.hexWidth);
            if (mapHeight < this.turnHeight) {
                mapHeight = this.turnHeight;
            }
            let turnRowCount = Math.floor(mapHeight/this.turnHeight);
            let turnColCount = Math.floor((this.turnCount-1)/turnRowCount)+1;
            let turnsWidth = turnColCount * this.turnWidth + MARGIN;
            this.component.width = mapWidth + turnsWidth + MARGIN * 2;
            this.component.height = mapHeight + this.playerHeight + MARGIN * 3;
            this.background
                .dimension(this.component.width, this.component.height)
                .position(this.component.width / 2, this.component.height / 2);
            this.turnSupport.move(mapWidth + MARGIN * 2, MARGIN);
            for (let t=0; t<this.turns.length; t++) {
                this.turns[t].component.move(
                    Math.floor(t/turnRowCount)*this.turnWidth + this.turnWidth/2,
                    (t%turnRowCount)*this.turnHeight + this.turnHeight/2
                )
            }
            this.playerSupport.move(MARGIN, mapHeight + MARGIN * 2);
            let margin = 0;
            for (let t=0; t<this.players.length; t++) {
                this.players[t].component.move(
                    margin+this.players[t].width/2,
                    this.playerHeight/2
                );
                margin+=this.players[t].width+MARGIN;
            }
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
            this.zoneSupport.add(hex.zoneComponent);
            this.unitSupport.add(hex.unitSupport);
            return hex;
        }

        removeHex(hex) {
            this.hexes.remove(hex);
            this.hexSupport.remove(hex.component);
            this.itemSupport.remove(hex.itemSupport);
            this.zoneSupport.remove(hex.zoneComponent);
            this.unitSupport.remove(hex.unitSupport);
        }

        createBottomRow() {
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
                    this.refreshSurfacesAndZonesInRow(this.rows.length - 2);
                }
                this.refreshLinesInRow(this.rows.length - 1);
                this.refreshBordersInRow(this.rows.length - 1);
                this._updateSize();
            }
        }

        removeBottomRow() {
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
                this.refreshSurfacesAndZonesInRow(this.rows.length - 1);
                this._updateSize();
            }
        }

        createTopRow() {
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
                    this.refreshSurfacesAndZonesInRow(1);
                }
                this.refreshLinesInRow(0);
                this.refreshBordersInRow(0);
                this._updateSize();
            }
        }

        removeTopRow() {
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
                this.refreshSurfacesAndZonesInRow(0);
                this._updateSize();
            }
        }

        createRightColumn() {
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
                    this.refreshSurfacesAndZonesInColumn(this.colCount - 2);
                }
                this.refreshLinesInColumn(this.colCount - 1);
                this.refreshBordersInColumn(this.colCount - 1);
                this._updateSize();
            }
        }

        removeRightColumn() {
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
                    this.refreshSurfacesAndZonesInColumn(1);
                }
                this.refreshLinesInColumn(0);
                this.refreshBordersInColumn(0);
                this._updateSize();
            }
        }

        removeLeftColumn() {
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
            memento.unitSupport = Memento.registerSVGTranslation(this.unitSupport);
            memento.turnSupport = Memento.registerSVGTranslation(this.turnSupport);
            memento.playerSupport = Memento.registerSVGTranslation(this.playerSupport);
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
            memento.selected = Memento.registerArray(this.selected);
            memento.ordered = Memento.registerArray(this.ordered);
            memento.rows = Memento.registerArrayOfArrays(this.rows);
            memento.turns = Memento.registerArray(this.turns);
            memento.players = Memento.registerArray(this.players);
            memento.turnCount = this.turnCount;
            return memento;
        }

        revert(memento) {
            Memento.revertArray(memento.hexes, this.hexes);
            Memento.revertSVGTranslation(memento.hexSupport, this.hexSupport);
            Memento.revertSVGTranslation(memento.itemSupport, this.itemSupport);
            Memento.revertSVGTranslation(memento.unitSupport, this.unitSupport);
            Memento.revertSVGTranslation(memento.turnSupport, this.turnSupport);
            Memento.revertSVGTranslation(memento.playerSupport, this.playerSupport);
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
            Memento.revertArray(memento.selected, this.selected);
            Memento.revertArray(memento.ordered, this.ordered);
            Memento.revertArrayOfArrays(memento.rows, this.rows);
            Memento.revertArray(memento.turns, this.turns);
            Memento.revertArray(memento.players, this.players);
            this.turnCount = memento.turnCount;
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

        refreshSurfacesAndZonesInRow(row) {
            this.forEachHexInRow(row, (col, hex)=>{
                hex.refreshSurfaces();
                hex.refreshZones();
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

        refreshSurfacesAndZonesInColumn(col) {
            this.forEachHexInColumn(col, (row, hex)=>{
                hex.refreshSurfaces();
                hex.refreshZones();
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

        forEachUnit(callback) {
            this.hexes.forEach(hex=>{
                hex.units.forEach(unit=>callback(unit));
            });
        }

        select(something, reset=true) {
            if (reset && !this.selected.empty()) {
                Memento.register(this);
                this.selected.forEach(what=>what.unselect());
                this.selected.clear();
            }
            if (something && !this.selected.contains(something)) {
                Memento.register(this);
                this.selected.push(something);
                something.select();
            }
        }

        unselect(something) {
            if (something && this.selected.contains(something)) {
                Memento.register(this);
                this.selected.remove(something);
                something.unselect();
            }
        }

        findTeam(type) {
            for (let player of this.players) {
                let team = player.findTeam(type);
                if (team) {
                    return team;
                }
            }
            return null;
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
            this.zoneSupport = new svg.Ordered(0);
            this.zoneComponent = new svg.Translation().add(this.zoneSupport);
            this.zoneOrdered = null;
            this.unitSupport = new svg.Translation();
            this.surfaces = {};
            this.zones = null;
            this.lines = {};
            this.borders = {};
            this.items = [];
            this.units = [];
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
            memento.zoneComponent = Memento.registerSVGTranslation(this.zoneComponent);
            memento.zoneSupport = Memento.registerSVGOrdered(this.zoneSupport);
            if (this.zones) {
                memento.zoneOrdered = Memento.registerObject(this.zoneOrdered);
                memento.zones = Memento.registerObject(this.zones);
            }
            memento.unitSupport = Memento.registerSVGTranslation(this.unitSupport);
            memento.surfaces = Memento.registerObject(this.surfaces);
            memento.lines = Memento.registerObject(this.lines);
            memento.borders = Memento.registerObject(this.borders);
            memento.items = Memento.registerArray(this.items);
            memento.units = Memento.registerArray(this.units);
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
            Memento.revertSVGTranslation(memento.zoneComponent, this.zoneComponent);
            Memento.revertSVGOrdered(memento.zoneSupport, this.zoneSupport);
            if (memento.zones) {
                Memento.revertObject(memento.zoneOrdered, this.zoneOrdered);
                Memento.revertObject(memento.zones, this.zones);
            }
            Memento.revertSVGTranslation(memento.itemSupport, this.itemSupport);
            Memento.revertSVGTranslation(memento.unitSupport, this.unitSupport);
            Memento.revertObject(memento.surfaces, this.surfaces);
            Memento.revertObject(memento.lines, this.lines);
            Memento.revertObject(memento.borders, this.borders);
            Memento.revertArray(memento.items, this.items);
            this.items.forEach(item=>item.hex=this);
            Memento.revertArray(memento.units, this.units);
            this.units.forEach(unit=>unit.hex=this);
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
            this.zoneComponent.move(px, py);
            this.unitSupport.move(px, py);
            return this;
        }

        setOrder(ordered) {
            Memento.register(this);
            this.ordered = makeOrdered(ordered);
            this.hexSupport.order(ordered.length);
            return this;
        }

        setZoneOrder(ordered) {
            Memento.register(this);
            this.zones = {};
            this.zoneOrdered = makeOrdered(ordered);
            this.zoneSupport.order(ordered.length);
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

        setZone(zone) {
            if (this.zones && !this.zones[zone.type]) {
                Memento.register(this);
                this.zones[zone.type] = zone.setHex(this);
                this.zoneSupport.set(this.zoneOrdered[zone.type], zone.component);
                zone.draw();
                this.nw && this.nw.drawZone(zone.type);
                this.ne && this.ne.drawZone(zone.type);
                this.e && this.e.drawZone(zone.type);
                this.se && this.se.drawZone(zone.type);
                this.sw && this.sw.drawZone(zone.type);
                this.w && this.w.drawZone(zone.type);
            }
            return this;
        }

        refreshZones() {
            if (this.zones) {
                for (let type in this.zones) {
                    this.drawZone(type);
                }
            }
            return this;
        }

        removeZone(type) {
            if (this.zones && this.zones[type]) {
                Memento.register(this);
                delete this.zones[type];
                this.zoneSupport.unset(this.zoneOrdered[type]);
                this.nw && this.nw.drawZone(type);
                this.ne && this.ne.drawZone(type);
                this.e && this.e.drawZone(type);
                this.se && this.se.drawZone(type);
                this.sw && this.sw.drawZone(type);
                this.w && this.w.drawZone(type);
            }
            return this;
        }

        getZone(type) {
            return this.zones ? this.zones[type] : null;
        }

        drawZone(type) {
            if (this.zones && this.zones[type]) {
                this._drawZone(this.zones[type]);
            }
        }

        _drawZone(zone) {
            Memento.register(zone);
            zone.draw();
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

        putUnit(unit) {
            if (!this.units.contains(unit)) {
                Memento.register(this);
                Memento.register(unit);
                if (this.units[0]) {
                    this.units[0].putUnit(unit);
                }
                else {
                    this.unitSupport.add(unit.component);
                    unit.setHex(this);
                    unit.move(0, 0);
                }
            }
            return this;
        }

        removeUnit(unit) {
            if (this.units.contains(unit)) {
                Memento.register(this);
                Memento.register(unit);
                if (this.units[0]===unit) {
                    this.unitSupport.remove(unit.component);
                    unit.setHex(null);
                }
                else {
                    this.units[0].removeUnit(unit);
                }
            }
            return this;
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

    function area(hex, predicate) {
        let path = null;
        let back = null;

        _process("ne", "e", "se", 0);
        _process("e", "se", "sw", 60);
        _process("se", "sw", "w", 120);
        _process("sw", "w", "nw", 180);
        _process("w", "nw", "ne", 240);
        _process("nw", "ne", "e", 300);

        return {path:path, back:back};

        function _process(leftDir, direction, rightDirection, angle) {
            let _same = direction => {
                return !hex[direction] || predicate(hex[direction]);
            };
            let point;
            let control1;
            let control2;
            if (_same(direction)) {
                if (_same(leftDir)) {
                    point = rotate(hex.height(), -hex.width / 2, angle);
                }
                else {
                    point = rotate(hex.height(), -hex.width / 2 * SECOND_REDUCTION_FACTOR, angle);
                }
                if (!back) {
                    back = new svg.Path(point.x, point.y);
                    path = new svg.Path(point.x, point.y);
                }
                if (_same(rightDirection)) {
                    point = rotate(hex.height(), hex.width / 2, angle);
                }
                else {
                    point = rotate(hex.height(), hex.width / 2 * SECOND_REDUCTION_FACTOR, angle);
                }
                back.line(point.x, point.y);
                path.move(point.x, point.y);
            }
            else {
                let rx = hex.height() * (0.5 + SECOND_REDUCTION_FACTOR / 2);
                let ry = hex.width / 2 * (1.5 - SECOND_REDUCTION_FACTOR / 2);
                let dx = hex.height() * REDUCTION_FACTOR;
                let dy = hex.width / 2 * REDUCTION_FACTOR;
                if (_same(leftDir)) {
                    point = rotate(rx, -ry, angle);
                    control1 = rotate(rx - dy / 3, -ry + dx / 3, angle);
                }
                else {
                    point = rotate(dx, -dy, angle);
                    control1 = rotate(dx + dy / 3, -dy + dx / 3, angle);
                }
                if (!back) {
                    back = new svg.Path(point.x, point.y);
                    path = new svg.Path(point.x, point.y);
                }
                if (_same(rightDirection)) {
                    point = rotate(rx, ry, angle);
                    control2 = rotate(rx - dy / 3, ry - dx / 3, angle);
                }
                else {
                    point = rotate(dx, dy, angle);
                    control2 = rotate(dx + dy / 3, dy - dx / 3, angle);
                }
                back.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                path.cubic(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
            }

        }
    }

    class Area {

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

        draw() {
            let x = 0;
            let y = 0;
            if (this.back) {
                this.component.remove(this.back);
                delete this.back;
                this.component.remove(this.path);
                delete this.path;
            }
            ({path:this.path, back:this.back} = area(this.hex, hex=>this.predicate(hex)));
            this.colorize(this.back, this.path, this.colors);
            if (this.path) {
                this.component.add(this.back);
                this.component.add(this.path);
            }
        }
    }

    class Surface extends Area {

        constructor(type, colors) {
            super(type, colors);
        }

        predicate(hex) {
            return hex.surfaces[this.type];
        }

        colorize(back, path, colors) {
            back.color(colors[0]);
            path.color([], colors[1], colors[2]);
        }
    }

    const ZONE_OPACITY = 0.15;

    class Zone extends Area {

        constructor(type, colors) {
            super(type, colors);
        }

        predicate(hex) {
            return hex.zones[this.type];
        }

        colorize(back, path, colors) {
            back.color(colors[0]).opacity(ZONE_OPACITY);
            path.color([], colors[1], colors[2]).opacity(ZONE_OPACITY);
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
            this.base = new svg.Translation().active(false);
            this.rotation = new svg.Rotation(angle);
            this.component = new svg.Translation().add(this.rotation.add(this.base));
            this.glass = glass.color(svg.BLACK, 3, svg.RED).opacity(0.001);
            this.rotation.add(this.glass);
            this.events = {};
            this.selected = false;
        }

        memorize() {
            let memento = {};
            memento.base = Memento.registerSVGTranslation(this.base);
            memento.rotation = Memento.registerSVGRotation(this.rotation);
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.events = Memento.registerObject(this.events);
            memento.selected = this.selected;
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
            this.selected = memento.selected;
            this.selected ? this.glass.opacity(1).fillOpacity(0.001) : this.glass.opacity(0.001).fillOpacity(1);
        }

        select() {
            Memento.register(this);
            this.selected = true;
            this.glass.opacity(1).fillOpacity(0.001);
        }

        unselect() {
            Memento.register(this);
            this.selected = false;
            this.glass.opacity(0.001).fillOpacity(1);
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
            super(angle, new svg.Hexagon(width, "V"));
            this.width = width;
            this.children = [];
        }

        memorize() {
            let memento = super.memorize();
            memento.width = this.width;
            memento.flag = this.flag;
            memento.children = Memento.registerArray(this.children);
            memento._opacity = this.glass._opacity;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.width = memento.width;
            this.flag = memento.flag;
            Memento.revertArray(memento.children, this.children);
            this.glass.opacity(memento._opacity);
        }

        highlight(flag) {
            this.flag = flag;
            this.glass.opacity(flag ? 0.2 : 0.001);
            return this;
        }

        isHighlighted() {
            return this.flag;
        }

        select() {
            Memento.register(this);
            this.selected = true;
            this.glass.opacity(1).fillOpacity(this.isHighlighted() ? 0.2 : 0.001);
        }

        unselect() {
            Memento.register(this);
            this.selected = false;
            this.glass.opacity(this.isHighlighted() ? 0.2 : 0.001).fillOpacity(1);
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
            super(angle, new svg.Rect(width, height));
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
            super(0, new svg.Circle(radius));
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
            super(angle, new svg.Rect(width, height));
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
            super(angle, new svg.Rect(width, height));
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

    class Unit {

        constructor(type, width, height, angle, symbol, colors) {
            this.type = type;
            this.base = new svg.Translation();
            this.unitBaseSupport = new svg.Rotation(-angle);
            this.unitSupport = new svg.Translation(width/10, -height/10);
            this.width = width;
            this.height = height;
            this.colors = colors;
            this._turn = 1;

            this.upLeft = "";
            this.upRight = "";
            this.upCenter = "";
            this.topCenter = "";
            this.left = "";
            this.right = "";
            this.bottomLeft = "";
            this.bottomCenter = "";
            this.bottomRight = "";

            this.upLeftField = new svg.Text().position(-width/3, -height/5).font("arial", width/4).color(colors[2]);
            this.upRightField = new svg.Text().position(width/3, -height/5).font("arial", width/4).color(colors[2]);
            this.upCenterField = new svg.Text().position(0, -height*2/12).font("arial", width/8).color(colors[2]);
            this.topCenterField = new svg.Text().position(0, -height*4/12).font("arial", width/12).color(colors[2]);
            this.leftField = new svg.Text().position(-width*3/8, 0).font("arial", width/12).color(colors[2]);
            this.rightField = new svg.Text().position(width*3/8, 0).font("arial", width/12).color(colors[2]);
            this.bottomLeftField = new svg.Text().position(-width/3, height*2/5).font("arial", width/4).color(colors[2]);
            this.bottomCenterField = new svg.Text().position(0, height*2/5).font("arial", width/5).color(colors[2]);
            this.bottomRightField = new svg.Text().position(width/3, height*2/5).font("arial", width/4).color(colors[2]);

            this.rotation = new svg.Rotation(angle);
            this.component = new svg.Translation().add(this.rotation.add(this.base));
            this.glass = new svg.Rect(width, height).opacity(0.001).color(svg.BLACK, 3, svg.RED);
            this.content = new svg.Translation().active(false)
                .add(new svg.Rect(width, height).color(colors[0], colors[1]+1, colors[0]))
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(this.upLeftField).add(this.upRightField).add(this.upCenterField).add(this.topCenterField)
                .add(this.leftField).add(this.rightField)
                .add(this.bottomLeftField).add(this.bottomCenterField).add(this.bottomRightField);
            this.base
                .add(this.content)
                .add(this.glass)
                .add(this.unitBaseSupport.add(this.unitSupport));
            this.events = {};
            this.nextUnit = null;
            this.selected = false;
            this._setSymbol(symbol);
        }

        setSymbol(symbol) {
            Memento.register(this);
            this._setSymbol(symbol);
        }

        _setSymbol(symbol) {
            if (this.symbolIcon) {
                this.content.remove(this.symbolIcon);
            }
            this.symbol = symbol;
            this.symbolIcon = symbol(this.width/2, this.height/4, [this.colors[0], this.colors[1]/2, this.colors[2]])
            this.content.add(this.symbolIcon);
        }

        infos(upLeft, upRight, upCenter, topCenter, left, right, bottomLeft, bottomCenter, bottomRight) {
            Memento.register(this);
            this._infos(upLeft, upRight, upCenter, topCenter, left, right, bottomLeft, bottomCenter, bottomRight);
        }

        _infos(upLeft, upRight, upCenter, topCenter, left, right, bottomLeft, bottomCenter, bottomRight) {
            this.upLeft = upLeft;
            this.upLeftField.message(this.upLeft);
            this.upRight = upRight;
            this.upRightField.message(this.upRight);
            this.upCenter = upCenter;
            this.upCenterField.message(this.upCenter);
            this.topCenter = topCenter;
            this.topCenterField.message(this.topCenter);
            this.left = left;
            this.leftField.message(this.left);
            this.right = right;
            this.rightField.message(this.right);
            this.bottomLeft = bottomLeft;
            this.bottomLeftField.message(this.bottomLeft);
            this.bottomCenter = bottomCenter;
            this.bottomCenterField.message(this.bottomCenter);
            this.bottomRight = bottomRight;
            this.bottomRightField.message(this.bottomRight);
            return this;
        }

        memorize() {
            let memento = {};
            memento.base = Memento.registerSVGTranslation(this.base);
            memento.rotation = Memento.registerSVGRotation(this.rotation);
            memento.component = Memento.registerSVGTranslation(this.component);
            memento.events = Memento.registerObject(this.events);
            memento.selected = this.selected;
            memento.symbol = this.symbol;
            memento.upLeft = this.upLeft;
            memento.upRight = this.upRight;
            memento.upCenter = this.upCenter;
            memento.topCenter = this.topCenter;
            memento.left = this.left;
            memento.right = this.right;
            memento.bottomLeft = this.bottomLeft;
            memento.bottomCenter = this.bottomCenter;
            memento.bottomRight = this.bottomRight;
            memento.nextUnit = this.nextUnit;
            memento._turn = this._turn;
            return memento;
        }

        revert(memento) {
            this._setSymbol(memento.symbol);
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
            this._infos(
                memento.upLeft, memento.upRight, memento.upCenter, memento.topCenter,
                memento.left, memento.right,
                memento.bottomLeft, memento.bottomCenter, memento.bottomRight);
            this.nextUnit = memento.nextUnit;
            this.selected = memento.selected;
            this.selected ? this.glass.opacity(1).fillOpacity(0.001) : this.glass.opacity(0.001).fillOpacity(1);
            this._turn = memento._turn;
        }

        get turn() {
            return this._turn;
        }

        set turn(value) {
            Memento.register(this);
            this._turn = value;
        }

        putUnit(unit) {
            if (this.nextUnit) {
                this.nextUnit.putUnit(unit);
            }
            else {
                Memento.register(this);
                Memento.register(unit);
                this.nextUnit = unit;
                this.unitSupport.add(unit.component);
                unit.previousUnit = this;
                unit.setHex(this.hex);
                unit.rotate(this.angle);
            }
        }

        removeUnit(unit) {
            if (this.nextUnit) {
                if (this.nextUnit !== unit) {
                    this.nextUnit.removeUnit(unit);
                }
                else {
                    Memento.register(this);
                    Memento.register(unit);
                    unit.move(0, 0);
                    this.nextUnit = null;
                    this.unitSupport.remove(unit.component);
                    unit.previousUnit = null;
                    unit.setHex(null);
                }
            }
        }

        setHex(hex) {
            Memento.register(this);
            if (this.hex) {
                Memento.register(this.hex);
                this.hex.units.remove(this);
            }
            this.hex = hex;
            if (this.hex) {
                Memento.register(this.hex);
                this.hex.units.add(this);
            }
            this.nextUnit && this.nextUnit.setHex(hex);
        }

        rotate(angle) {
            Memento.register(this);
            this.rotation.rotate(angle);
            this.unitBaseSupport.rotate(-angle);
            if (this.nextUnit) {
                this.nextUnit.rotate(angle);
            }
            return this;
        }

        move(x, y) {
            Memento.register(this);
            this.component.move(x, y);
            return this;
        }

        get x() {
            return this.component.x;
        }

        get y() {
            return this.component.y;
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

        select() {
            Memento.register(this);
            this.selected = true;
            this.glass.opacity(1).fillOpacity(0.001);
        }

        unselect() {
            Memento.register(this);
            this.selected = false;
            this.glass.opacity(0.001).fillOpacity(1);
        }

        duplicate() {
            return new Unit(this.type, this.width, this.height, 0, this.symbol, this.colors.duplicate());
        }
    }

    class Turn {

        constructor(number, title, width, height, colors) {
            this.number = number;
            this.title = title;
            this.colors = colors;
            this.component = new svg.Translation();
            this.background = new svg.Rect(width, height).corners(width/10, height/10)
                .color(colors[0], colors[1], colors[2]);
            this.base = new svg.Translation();
            this.glass = new svg.Rect(width, height).corners(width/10, height/10).color([0, 0, 0]).opacity(0.001);
            this.titleLabel = new svg.Text(title).font("arial", height/8).position(0, -height/3).color(colors[2]);
            this.component
                .add(this.base.active(false)
                    .add(this.background)
                    .add(this.titleLabel))
                .add(this.glass);
        }

        label(title) {
            Memento.register(this);
            this.title = title;
            this.titleLabel.message(this.title);
            return this;
        }

        memorize() {
            let memento = {
                title : this.title
            };
            return memento;
        }

        revert(memento) {
            this.title = memento.title;
            this.titleLabel.message(this.title);
        }

    }

    class Player {

        constructor(title, height, teamWidth, colors) {
            this.title = title;
            this.colors = colors;
            this.teamWidth = teamWidth;
            this.height = height*1.2;
            this.width = height;
            this.teams = [];
            this.component = new svg.Translation();
            this.teamSupport = new svg.Translation();
            this.background = new svg.Rect(this.width, this.height).corners(this.width/10, this.height/10)
                .color(colors[0], colors[1], colors[2]);
            this.base = new svg.Translation();
            this.titleLabel = new svg.Text(title).font("arial", height/6).color(colors[2]);
            this._updateSize();
            this.component
                .add(this.base
                    .add(this.background)
                    .add(this.titleLabel)
                    .add(this.teamSupport))
        }

        label(title) {
            Memento.register(this);
            this.title = title;
            this.titleLabel.message(this.title);
            return this;
        }

        findTeam(type) {
            return this.teams.find(team=>team.unit.type===type);
        }

        createTeam(unit) {
            let team = new Team(unit, this.teamWidth, this.height/2, this.colors[2]);
            this.addTeam(team);
            return team;
        }

        addTeam(team) {
            Memento.register(this);
            this.teams.push(team);
            team.player = this;
            this.teamSupport.add(team.component);
            this._updateSize();
            this.map._updateSize();
        }

        removeTeam(team) {
            Memento.register(this);
            if (this.teams.contains(team)) {
                this.teams.remove(team);
                this.teamSupport.remove(team.component);
                team.player = null;
            }
            this._updateSize();
            this.map._updateSize();
        }

        _updateSize() {
            this.width=this.height/2+(this.teamWidth+this.height/2)*this.teams.length;
            if (!this.teams.length) {
                this.width+=this.height/2;
            }
            this.background.dimension(this.width, this.height);
            this.titleLabel.position(0, -this.height/3);
            let position = -this.width/2 + this.height/2;
            for (let t=0; t<this.teams.length; t++) {
                let team = this.teams[t];
                team.component.move(position+this.teamWidth/2, 0);
                position+=this.teamWidth+this.height/2;
            }
        }

        memorize() {
            let memento = {
                title : this.title,
                teams : this.teams.duplicate(),
                width : this.width,
                teamSupport : Memento.registerSVGTranslation(this.teamSupport)
            };
            return memento;
        }

        revert(memento) {
            this.title = memento.title;
            this.titleLabel.message(this.title);
            this.width = memento.width;
            Memento.revertArray(memento.teams, this.teams);
            Memento.revertSVGTranslation(memento.teamSupport, this.teamSupport);
            this._updateSize();
            this.map._updateSize();
        }

    }

    class Team {

        constructor(unit, width, height, color) {
            this.unit = unit;
            unit.team = this;
            this.title = unit.type;
            this.width = width;
            this.height = height;
            this.component = new svg.Translation();
            this.titleLabel = new svg.Text(this.title).font("arial", height/4).position(0, +unit.height/2+height/4).color(color);
            this.component
                .add(this.unit.component)
                .add(this.titleLabel);
        }

        label(title) {
            Memento.register(this);
            this.title = title;
            this.titleLabel.message(this.title);
            return this;
        }

        memorize() {
            let memento = {
                title : this.title,
                player : this.player
            };
            return memento;
        }

        revert(memento) {
            this.title = memento.title;
            this.titleLabel.message(this.title);
            this.player = memento.player;
        }
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
            desc.turnWidth = map.turnWidth;
            desc.turnHeight = map.turnHeight;
            desc.turnColors = map.turnColors.duplicate();
            desc.turns = [];
            map.turns.forEach(turn=>{
                desc.turns.push({
                    label: turn.title
                });
            });
            desc.playerHeight = map.playerHeight;
            desc.teamWidth = map.teamWidth;
            desc.playerColors = map.playerColors.duplicate();
            desc.players = [];
            map.players.forEach(player=>{
                desc.players.push(this.playerSpec(desc, player));
            });
            return desc;
        }

        playerSpec(desc, player) {
            let playerDesc = {
                label : player.title,
                teams : []
            };
            player.teams.forEach(team=>{
                playerDesc.teams.push({
                    unit : {
                        type: team.unit.type,
                        width : team.unit.width,
                        height : team.unit.height,
                        colors : team.unit.colors.duplicate()
                    },
                    label : team.title
                });
            });
            return playerDesc;
        }

        hexSpec(desc, hex) {
            if (hex.surfaces.empty() && hex.lines.empty() && hex.borders.empty() && hex.items.empty() && hex.units.empty()) {
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
            if (!hex.units.empty()) {
                hexDesc.units = [];
                hex.units.forEach(unit=>{
                    hexDesc.units.push(this.unitSpec(unit));
                });
            }
            return hexDesc;
        }


        unitSpec(unit) {
            return {
                type : unit.type,
                symbol : symbols.keyOf(unit.symbol),
                width : unit.width,
                height : unit.height,
                angle : unit.angle,
                colors : unit.colors.duplicate(),
                upLeft : unit.upLeft,
                upRight : unit.upRight,
                upCenter : unit.upCenter,
                topCenter : unit.topCenter,
                left : unit.left,
                right : unit.right,
                bottomLeft : unit.bottomLeft,
                bottomCenter : unit.bottomCenter,
                bottomRight : unit.bottomRight,
                turn : unit._turn
            };
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

        map(desc) {

            let loadHexes = ()=> {
                map.bounds(desc.minColCount, desc.maxColCount, desc.minRowCount, desc.maxRowCount);
                desc.hexes.forEach(hexDesc=> {
                    let hex = map.getHex(hexDesc.x, hexDesc.y);
                    hexDesc.surfaces && hexDesc.surfaces.forEach(type=> {
                        hex.setSurface(this.retrieveSurface(desc, type));
                    });
                    hexDesc.borders && hexDesc.borders.forEach(descBorder=> {
                        hex.setBorder(this.retrieveBorder(desc, descBorder.type, descBorder.sides));
                    });
                    hexDesc.lines && hexDesc.lines.forEach(descLine=> {
                        hex.setLine(this.retrieveLine(desc, descLine.type, descLine.entries));
                    });
                    hexDesc.items && hexDesc.items.forEach(itemDesc=> {
                        hex.putItem(this.item(itemDesc), itemDesc.x, itemDesc.y);
                    });
                    hexDesc.units && hexDesc.units.forEach(unitDesc=> {
                        hex.putUnit(this.unit(unitDesc));
                    });
                });
            };

            let loadTurns = ()=> {
                map.turnWidth = desc.turnWidth;
                map.turnHeight = desc.turnHeight;
                map.turnColors = desc.turnColors.duplicate();
                map._turnNumber(desc.turns.length);
                for (let t = 0; t < desc.turns.length; t++) {
                    map.turns[t].label(desc.turns[t].label);
                }
            };

            let loadPlayers = ()=> {
                map.player(desc.playerHeight, desc.teamWidth, desc.playerColors);
                for (let p = 0; p < desc.players.length; p++) {
                    let playerDesc = desc.players[p];
                    let player = new Player(playerDesc.label, map.playerHeight, map.teamWidth, map.playerColors);
                    map.addPlayer(player);
                    for (let t = 0; t < playerDesc.teams.length; t++) {
                        let teamDesc = playerDesc.teams[t];
                        let unit = new Unit(teamDesc.unit.type, teamDesc.unit.width, teamDesc.unit.height, 0,
                            symbols["infantry"], teamDesc.unit.colors);
                        let team = new Team(unit, map.teamWidth, map.playerHeight / 2, map.playerColors[2]);
                        team.label(teamDesc.label);
                        player.addTeam(team);
                    }
                }
            };

            let baseSurface = this.retrieveSurface(desc, desc.baseSurface);
            let map = new Map(desc.rowOffset, desc.colCount, desc.rowCount, desc.hexWidth, desc.ordered, baseSurface, desc.background);
            loadHexes();
            loadTurns();
            loadPlayers();
            map._updateSize();
            return map;
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

        unit(unitDesc) {
            let unit = new Unit(unitDesc.type, unitDesc.width, unitDesc.height, unitDesc.angle,
                symbols[unitDesc.symbol], unitDesc.colors);
            unit._infos(unitDesc.upLeft, unitDesc.upRight, unitDesc.upCenter, unitDesc.topCenter,
                unitDesc.left, unitDesc.right,
                unitDesc.bottomLeft, unitDesc.bottomCenter, unitDesc.bottomRight);
            unit._turn = unitDesc.turn;
            return unit;
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

    let symbols = {
        infantry(width, height, colors)
        {
            return new svg.Translation()
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2, -height / 2, width / 2, height / 2).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2, height / 2, width / 2, -height / 2).color(colors[0], colors[1], colors[2]));
        },

        cavalry(width, height, colors) {
            return new svg.Translation()
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Line(-width / 2, height / 2, width / 2, -height / 2).color(colors[0], colors[1], colors[2]));
        },

        artillery(width, height, colors) {
            return new svg.Translation()
                .add(new svg.Rect(width, height).color(colors[0], colors[1], colors[2]))
                .add(new svg.Circle(width / 12).color(colors[2], colors[1], colors[2]));
        }
    };

    function installDnD(what, glass, doSelect, doRotate, doDrop, doMove, doClick, doRemove) {
        what.addEvent('mousedown', event=> {
            let whatParent = what.component.parent;
            let delta = whatParent.localPoint(event.x, event.y);
            let local = what.glass.localPoint(event.x, event.y);
            if (what.anchor(local.x, local.y)) {
                var angle = Math.round(Math.atan2(delta.x - what.x, -delta.y + what.y) / Math.PI * 180);
            }
            let {x:initX, y:initY, angle:initAngle} = what;
            if (doSelect(what, angle!==undefined)) {
                let click = true;
                what.addEvent('mousemove', moveEvent=> {
                    let depl = whatParent.localPoint(moveEvent.x, moveEvent.y);
                    if (angle) {
                        var newAngle = Math.round(Math.atan2(depl.x - what.x, -depl.y + what.y) / Math.PI * 180);
                        what.rotate(initAngle + newAngle - angle);
                    }
                    else {
                        glass.drag(what.component, whatParent, initX + depl.x - delta.x, initY + depl.y - delta.y);
                    }
                    click = false;
                });
                what.addEvent('mouseup', endEvent=> {
                    what.removeEvent('mousemove');
                    what.removeEvent('mouseup');
                    if (click && endEvent.x === event.x && endEvent.y === event.y) {
                        if (!doClick(what)) {
                            Memento.rollback(true);
                        }
                    }
                    else {
                        let depl = whatParent.localPoint(endEvent.x, endEvent.y);
                        if (angle) {
                            let newAngle = Math.round(Math.atan2(depl.x - what.x, -depl.y + what.y) / Math.PI * 180);
                            if (!doRotate(what, initAngle + newAngle - angle)) {
                                Memento.rollback(true);
                            }
                        }
                        else {
                            let finalX = Math.round(initX + depl.x - delta.x);
                            let finalY = Math.round(initY + depl.y - delta.y);
                            let global = whatParent.globalPoint(finalX, finalY);
                            let onMap = what.hex.map.component.localPoint(global);
                            let newHex = what.hex.map.getHexFromPoint(onMap);
                            glass.drop(what.component, whatParent, finalX, finalY);
                            if (newHex === what.hex) {
                                if (!doMove(what, finalX, finalY)) {
                                    Memento.rollback(true);
                                }
                            }
                            else {
                                if (!newHex) {
                                    Memento.rollback(true);
                                }
                                else {
                                    if (!doRemove(what)) {
                                        Memento.rollback(true);
                                    }
                                    else {
                                        if (newHex) {
                                            var local = newHex.component.localPoint(global);
                                            if (!doDrop(newHex, what, Math.round(local.x), Math.round(local.y))) {
                                                Memento.rollback(true);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Memento.begin();
                });
            }
        });
    }

    function installClickable(what, doClick) {
        what.addEvent('mousedown', event=> {
            what.addEvent('mouseup', endEvent=> {
                what.removeEvent('mouseup');
                if (endEvent.x === event.x && endEvent.y === event.y) {
                    if (!doClick(what)) {
                        Memento.rollback(true);
                    }
                }
                Memento.begin();
            });
        });
    }

    return {
        isEmpty : isEmpty,
        inverseDirection : inverseDirection,

        Map : Map,
        Hex : Hex,
        Surface : Surface,
        Zone : Zone,
        Line : Line,
        Border : Border,
        Item : Item,
        Composite : Composite,
        House : House,
        RoundOpenTower : RoundOpenTower,
        SquareOpenTower : SquareOpenTower,
        Tree : Tree,
        Bridge : Bridge,
        Unit : Unit,

        MapBuilder : MapBuilder,

        symbols : symbols,
        installDnD : installDnD,
        installClickable : installClickable,

        HEX_WIDTH : HEX_WIDTH,
        ALL_DIRECTIONS : ALL_DIRECTIONS
    };
};
