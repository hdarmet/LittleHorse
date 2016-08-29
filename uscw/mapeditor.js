/**
 * Created by HDA3014 on 24/01/2016.
 */

var Gui = require("../svggui.js").Gui;
var FileManager = require("../filemanager.js").FileManager;
var Hex = require("../uscw/hextools.js").Hex;
var Memento = require("../memento").Memento;

exports.mapEditor = function(svg) {

    var gui = Gui(svg, {
        speed: 10,
        step: 10
    });

    var fileManager = FileManager(svg, gui);

    var hexM = Hex(svg);

    class Support {

        constructor(pane, ...args) {
            this.pane = pane;
            this.component = this.buildIcon(...args);
            this.selectedBorder = this.buildSelectedBorder(...args);
            this.tool = new gui.Tool(this.component);
            this.pane.addTool(this.tool);
            if (this.register()) {
                this.select();
            }
            this.glass(()=> {
                this.tool.callback(this.select());
            },...args);
        }

        action(callback) {
            this.tool.setCallback(callback);
            this.tool.callback(true);
            return this;
        }

        register() {
            if (!this.pane.palette.tools) {
                this.pane.palette.tools = [];
            }
            this.pane.palette.tools.push(this);
            return this.pane.palette.tools.length === 1;
        }

        whenSelect(selectCallback) {
            this.selectCallback = selectCallback;
            return this;
        }

        whenUnselect(unselectCallback) {
            this.unselectCallback = unselectCallback;
            return this;
        }

        select() {
            if (!this.selected) {
                this.pane.palette.tools.forEach(function (support) {
                    support.unselect();
                });
                this.selected = true;
                this.component.add(this.selectedBorder);
                this.selectCallback && this.selectCallback();
                return true;
            }
            return false;
        }

        unselect() {
            if (this.selected) {
                this.component.remove(this.selectedBorder);
                this.selected = false;
                this.unselectCallback && this.unselectCallback();
                return true;
            }
            return false;
        }
    }

    class HexSupport extends Support{

        constructor(hex, pane) {
            super(pane, hex);
            this.hex = hex;
            this.tool.hex = this.hex;
        }

        buildIcon(hex) {
            return new svg.Translation()
                .add(hex.component.move(0, 0))
                .add(hex.itemSupport.move(0, 0).active(false))
                .add(hex.unitSupport.move(0, 0).active(false))
                .add(new svg.Hexagon(hex.width, "V").color([], 2, [10, 100, 10]));
        }

        buildSelectedBorder(hex) {
            return new svg.Hexagon(hex.width, "V").color([], 4, [220, 0, 0]);
        }

        glass(callback, hex) {
            hex.addGlass(callback);
        }

    }

    class SurfaceSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        surface(type, colors) {
            this.hex.setOrder([type]).setSurface(new hexM.Surface(type, colors));
            this.action(()=> {
                this.pane.palette.action = hex=> {
                    if (hex.getSurface(type)) {
                        hex.removeSurface(type);
                    }
                    else {
                        hex.setSurface(new hexM.Surface(type, colors));
                    }
                }
            });
        }
    }

    class LineSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        line(type, size, colors) {

            this.hex.setOrder([type]).setLine(new hexM.Line(type, {sw: size, e: size}, colors));

            this.action(()=> {
                this.pane.palette.action = (hex, x, y, piece)=> {
                    if (hex.getLineEntry(piece, type)) {
                        hex.removeLineEntry(piece, type);
                    }
                    else {
                        hex.addLineEntry(piece, type, size, ()=>new hexM.Line(type, {}, colors));
                    }
                }

            });
        }

    }

    class BorderSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        border(type, size, colors) {

            this.hex.setOrder([type]).setBorder(new hexM.Border(type, {w: size, nw: size, sw: size, se: size}, colors))

            this.action(()=> {
                this.pane.palette.action = (hex, x, y, piece, center)=> {
                    if (hex.getBorderSide("c", type)) {
                        hex.removeBorderSide("c", type, size, ()=>new hexM.Border(type, {}, colors));
                    }
                    else if (center) {
                        hex.setBorderSide("c", type, size, ()=>new hexM.Border(type, {}, colors));
                    }
                    else {
                        if (hex.getBorderSide(piece, type)) {
                            hex.removeBorderSide(piece, type, size, ()=>new hexM.Border(type, {}, colors));
                        }
                        else {
                            hex.addBorderSide(piece, type, size, ()=>new hexM.Border(type, {}, colors));
                        }
                    }
                }
            });
        }
    }

    class ItemSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        commonItem(itemForTool, itemForMap) {
            this.hex.putItem(itemForTool(), 0, 0);
            this.action(()=> {
                this.pane.palette.action = (hex, x, y, piece, center)=> {
                    let item = itemForMap();
                    hex.putItem(item, Math.round(x), Math.round(y));
                    this.enableDnD(item);
                };
            });
        }

        enableDnD(item) {
            hexM.installDnDOnHexes(item, frame,
                (item, rotate)=> {
                    return true;
                },
                (item, angle)=> {
                    item.rotate(Math.round(angle / 15) * 15);
                    return true;
                },
                (hex, item, x, y)=> {
                    hex.putItem(item.move(x, y));
                    return true;
                },
                (item, x, y)=> {
                    item.move(x, y);
                    return true;
                },
                (item)=> {
                    item.hex.map.select(item);
                    return true;
                },
                (item)=> {
                    item.hex.removeItem(item);
                    return true;
                }
            );
        }

        disableDnD(item) {
            item.removeEvent('mousedown');
        }
    }

    class CompositeSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        enableCompositeDnD(composite) {
            let hexComposite = this.hex.getItem(hexM.Composite);
            hexM.installDnDOnHexes(composite, frame,
                (comp, rotate)=> {
                    return true;
                },
                (comp, angle)=> {
                    comp.rotate(Math.round(angle / 60) * 60);
                    comp.conform();
                    return true;
                },
                (hex, comp, x, y)=> {
                    var present = hex.getItem(hexM.Composite);
                    if (present) {
                        hex.removeItem(present);
                    }
                    hex.putItem(comp.move(0, 0));
                    return true;
                },
                (comp, x, y)=> {
                    comp.move(0, 0);
                    return true;
                },
                comp=> {
                    if (!hexComposite.isHighlighted()) {
                        hexComposite.clear();
                        hexComposite.copy(comp.children);
                        hexComposite.highlight(true);
                    }
                    else {
                        comp.hex.map.select(comp);
                    }
                    return true;
                },
                (comp)=> {
                    comp.hex.removeItem(comp);
                    return true;
                }
            );

        }

        composite() {
            var me = this;
            this.hex.putItem(new hexM.Composite(0, hexM.HEX_WIDTH).highlight(true), 0, 0);
            this.action(
                function (selected) {
                    var composite = this.hex.getItem(hexM.Composite);
                    if (!selected) {
                        composite.highlight(!composite.isHighlighted())
                    }
                    me.pane.palette.action = (hex, x, y, piece, center)=> {
                        if (composite.isHighlighted()) {
                            let comp = composite.duplicate().highlight(true);
                            me.enableCompositeDnD(comp);
                            hex.putItem(comp, 0, 0);
                        }
                        else {
                            composite.clear();
                        }
                    };
                })
                .whenSelect(function () {
                    map.execute(hex=> {
                        if (hex.items.length !== 0) {
                            if (!hex.getItem(hexM.Composite)) {// Possible when rollback !
                                var composite = new hexM.Composite(0, hexM.HEX_WIDTH).highlight(true);
                                this.enableCompositeDnD(composite);
                                let items = hex.items.slice(0);
                                for (var i = 0; i < items.length; i++) {
                                    hex.removeItem(items[i]);
                                    this.disableDnD(items[i]);
                                    composite.add(items[i]);
                                }
                                hex.putItem(composite, 0, 0);
                            }
                        }
                    });
                })
                .whenUnselect(function () {
                    map.execute(hex=> {
                        let composite = hex.getItem(hexM.Composite);
                        if (composite && composite.children.length !== 0) {
                            let items = composite.children.slice(0);
                            for (let i = 0; i < items.length; i++) {
                                composite.remove(items[i]);
                                ItemSupport.prototype.enableDnD(items[i]);
                                hex.putItem(items[i]);
                            }
                        }
                        hex.removeItem(composite);
                    });
                });
        }

        disableDnD(comp) {
            comp.removeEvent('mousedown');
        }
    }

    class UnitSupport extends Support {

        constructor(unit, pane) {
            super(pane, unit)
        }

        buildIcon(unit) {
            return new svg.Translation()
                .add(unit.component.move(0, 0))
                .add(new svg.Rect(unit.width, unit.height).color([], 2, [10, 100, 10]));
        }

        buildSelectedBorder(unit) {
            return new svg.Rect(unit.width, unit.height).color([], 4, [220, 0, 0]);
        }

        glass(callback, unit) {
            svg.addEvent(unit.glass, "click", callback);
        }

        unit(unitForMap) {
            this.action(()=> {
                this.pane.palette.action = (hex, x, y, piece, center)=> {
                    let unit = unitForMap();
                    hex.putUnit(unit);
                    this.enableDnD(unit);
                };
            });
        }

        enableDnD(unit) {
            hexM.installDnDOnHexes(unit, frame,
                (unit, rotate)=> {
                    return true;
                },
                (unit, angle)=> {
                    unit.rotate(Math.round(angle / 30) * 30);
                    return true;
                },
                (hex, unit, x, y)=> {
                    hex.putUnit(unit.move(0, 0));
                    return true;
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                    return true;
                },
                (unit)=> {
                    if (unit.selected) {
                        new EditUnitPopin(unit)
                            .addSymbol(hexM.symbols.infantry)
                            .addSymbol(hexM.symbols.cavalry)
                            .addSymbol(hexM.symbols.artillery)
                            .show(drawing);
                    }
                    else {
                        unit.hex.map.select(unit);
                        if (unit.nextUnit) {
                            let nextUnit = unit.nextUnit;
                            let hex = unit.hex;
                            hex.removeUnit(nextUnit);
                            hex.removeUnit(unit);
                            hex.putUnit(nextUnit);
                            hex.putUnit(unit);
                        }
                    }
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
        }

        disableDnD(unit) {
            unit.removeEvent('mousedown');
        }
    }

    function createSurfaceHexes(surfaces) {
        let hexes = [];
        for (let i=0; i<surfaces.length; i++) {
            let hex = new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, surfaces[i]);
            hex.component.move(0, 0);
            hex.component.add(new svg.Hexagon(hex.width, "V").color([], surfaces[i].colors[1], surfaces[i].colors[2]));
            hexes.push(hex);
        }
        return hexes;
    }

    class EditUnitPopin extends gui.Popin {

        constructor(unit) {
            super(1000, 700);
            this.add(new gui.Label(-120, -280, "Edit Unit").font("arial", 60));
            this.whenOk(function () {
                Memento.begin();
                unit.infos(
                    this.upLeft.textMessage,
                    this.upRight.textMessage,
                    this.upCenter.textMessage,
                    this.topCenter.textMessage,
                    this.left.textMessage,
                    this.right.textMessage,
                    this.bottomLeft.textMessage,
                    this.bottomCenter.textMessage,
                    this.bottomRight.textMessage);
                unit.setSymbol(this.symbol);
                unit.turn = this.turnSelector.value();
                this.close();
            }).whenCancel(function () {
            });

            this.symbols = [];

            this.background = new svg.Rect(500, 500).color(unit.colors[0], 6, unit.colors[2]);
            this.colors = [unit.colors[0], 4, unit.colors[2]];
            this.frame = {component:new svg.Translation().add(this.background)};
            this.add(this.frame);
            this.setSymbol(unit.symbol);
            this.upLeft = new gui.TextField(-160, -150, 160, 150, unit.upLeft).font("arial", 120);
            this.upRight = new gui.TextField(160, -150, 160, 150, unit.upRight).font("arial", 120);
            this.upCenter = new gui.TextField(0, -110, 160, 70, unit.upCenter).font("arial", 50);
            this.topCenter = new gui.TextField(0, -190, 160, 70, unit.topCenter).font("arial", 40);
            this.left = new gui.TextField(-185, 0, 110, 70, unit.left).font("arial", 40);
            this.right = new gui.TextField(185, 0, 110, 70, unit.right).font("arial", 40);
            this.bottomLeft = new gui.TextField(-160, 150, 160, 150, unit.bottomLeft).font("arial", 120);
            this.bottomCenter = new gui.TextField(0, 160, 140, 130, unit.bottomCenter).font("arial", 100);
            this.bottomRight = new gui.TextField(160, 150, 160, 150, unit.bottomRight).font("arial", 120);
            this.add(this.upLeft).add(this.upRight).add(this.upCenter).add(this.topCenter)
                .add(this.left).add(this.right)
                .add(this.bottomLeft).add(this.bottomRight).add(this.bottomCenter);
            this.turnSelectorLabel = new gui.Label(280, -220, "Turn of entry").font("arial", 30);
            this.turnSelector = new gui.NumberField(370, -150, 230, 80, unit.turn).font("arial", 60).bounds(1, 300);
            this.add(this.turnSelectorLabel).add(this.turnSelector);
        }

        setSymbol(aSymbol) {
            if (this.symbolIcon) {
                this.frame.component.remove(this.symbolIcon);
            }
            this.symbol = aSymbol;
            this.symbolIcon = this.symbol(250, 126, this.colors);
            this.frame.component.add(this.symbolIcon);
        }

        addSymbol(symbol) {
            const ROW_SIZE = 3;
            let unit = new hexM.Unit("symbol", 60, 60, 0, symbol, [svg.ALMOST_WHITE, 3, svg.ALMOST_BLACK]);
            unit.glass.onClick(event=>{
                this.setSymbol(symbol);
            });
            let col = (this.symbols.length)%ROW_SIZE;
            let row = Math.floor(this.symbols.length/ROW_SIZE);
            this.add(unit.move(-450+col*75, -220+row*75));
            this.symbols.push(unit);
            return this;
        }

    }

    class EditTurnPopin extends gui.Popin {

        constructor(turn) {
            super(600, 400);
            this.add(new gui.Label(-120, -130, "Edit Turn").font("arial", 60));
            this.whenOk(function () {
                turn.label(this.turnTitle.textMessage);
                Memento.begin();
                this.close();
            }).whenCancel(function () {
            });
            this.turnTitleLabel = new gui.Label(-180, -60, "Label").font("arial", 30);
            this.turnTitle = new gui.TextField(0, 0, 350, 80, turn.title).font("arial", 40);
            this.add(this.turnTitleLabel).add(this.turnTitle);
        }

    }

    class EditTeamPopin extends gui.Popin {

        constructor(team) {
            super(600, 400);
            this.add(new gui.Label(-120, -130, "Edit Team").font("arial", 60));
            this.whenOk(function () {
                team.label(this.teamTitle.textMessage);
                Memento.begin();
                this.close();
            }).whenCancel(function () {
            });
            this.teamTitleLabel = new gui.Label(-180, -60, "Label").font("arial", 30);
            this.teamTitle = new gui.TextField(0, 0, 350, 80, team.title).font("arial", 40);
            this.add(this.teamTitleLabel).add(this.teamTitle);
        }

    }

    class EditPlayerPopin extends gui.Popin {

        constructor(player) {
            super(600, 400);
            this.whenOk(function () {
                player.label(this.playerTitle.textMessage);
                Memento.begin();
                this.close();
            }).whenCancel(function () {
            });
            this.add(new gui.Label(-120, -130, "Edit Player").font("arial", 60));
            this.playerTitleLabel = new gui.Label(-180, -60, "Label").font("arial", 30);
            this.playerTitle = new gui.TextField(0, 0, 350, 80, player.title).font("arial", 40);
            this.add(this.playerTitleLabel).add(this.playerTitle);
        }

    }

    class EditMapPopin extends gui.Popin {

        constructor(title) {
            super(1000, 700);
            this.add(new gui.Label(-120, -280, title).font("arial", 60));
            this.hexSelectorLabel = new gui.Label(-290, -220, "Basic Terrain").font("arial", 30);
            this.hexSelector = new gui.Selector(-200, -160, 200, 100,
                createSurfaceHexes(baseSurfaces).map(hex=>hex.component),
                (component, index)=> {
                    let surface = baseSurfaces[index];
                    map.setBaseSurface(surface);
                });
            this.add(this.hexSelectorLabel).add(this.hexSelector);
            this.turnSelectorLabel = new gui.Label(140, -220, "# of turns").font("arial", 30);
            this.turnSelector = new gui.NumberField(200, -160, 230, 80, map.turnCount).font("arial", 60).bounds(1, 300);
            this.add(this.turnSelectorLabel).add(this.turnSelector);
            this.mapResizer = new MapResizer(map.colCount, map.rowCount, action=>{
                console.log("Action received : "+action);
                if (action==="S+") {
                    map.createBottomRow();
                }
                else if (action==="S-") {
                    map.removeBottomRow();
                }
                else if (action==="N+") {
                    map.createTopRow();
                }
                else if (action==="N-") {
                    map.removeTopRow();
                }
                else if (action==="E+") {
                    map.createRightColumn();
                }
                else if (action==="E-") {
                    map.removeRightColumn();
                }
                else if (action==="W+") {
                    map.createLeftColumn();
                }
                else if (action==="W-") {
                    map.removeLeftColumn();
                }
            })
            .bounds(map.minColCount, map.maxColCount, map.minRowCount, map.maxRowCount)
            .position(0, 50);
            this.mapResizerLabel = new gui.Label(-60, 80, "Map Size").font("arial", 30);
            this.add(this.mapResizer).add(this.mapResizerLabel);
            Memento.begin();
        }

    }

    class EditPopin extends EditMapPopin {
        constructor() {
            super("Edit Map");
            this.whenOk(function() {
                updateTurnNumber(this.turnSelector.value());
                Memento.begin();
                this.close();
            }).whenCancel(function() {
                Memento.rollback();
            });
        }
    }

    class NewPopin extends EditMapPopin {
        constructor() {
            let oldMap = map;
            createMap();
            Memento.disable();
            super("New Map");
            this.whenOk(function () {
                updateTurnNumber(this.turnSelector.value());
                Memento.enable();
                Memento.clear();
                Memento.begin();
                this.close();
            }).whenCancel(function () {
                map = oldMap;
                frame.set(map.component);
                Memento.enable();
            });
        }
    }

    function updateTurnNumber(count) {
        let firstTurn = map.turnCount;
        map.turnNumber(count);
        actionOnTurns(firstTurn);
    }

    function preparePlayers() {
        for (let player of map.players) {
            player.component.onClick(event=>{
                new EditPlayerPopin(player).show(drawing);
            });
            for (team of player.teams) {
                prepareTeam(team);
            }
        }
    }

    function prepareTeam(team) {
        team.component.onClick(event=> {
            new EditTeamPopin(team).show(drawing);
        });
        team.unit.glass.onClick(event=> {
            let index = (map.players.indexOf(team.player) + 1) % map.players.length;
            team.player.removeTeam(team);
            map.players[index].addTeam(team);
            Memento.begin();
        });
    }

    function actionOnTurns(from) {
        for (let t=from; t<map.turns.length; t++) {
            map.turns[t].glass.onClick(event=>{
                new EditTurnPopin(map.turns[t]).show(drawing);
            });
        }
    }

    function saveMap() {
        unselectAllCompositeTools();
        return new hexM.MapBuilder().spec(map);
    }

    function loadMap(desc) {
        Memento.disable();
        unselectAllCompositeTools();
        map = new hexM.MapBuilder().map(desc).addGlasses(actionOnMap);
        frame.set(map.component);
        map.hexes.forEach(hex=>{
            hex.items.forEach(item=>{
                ItemSupport.prototype.enableDnD(item);
            });
            hex.units.forEach(unit=>{
                UnitSupport.prototype.enableDnD(unit);
            });
        });
        actionOnTurns(0);
        preparePlayers();
        Memento.enable();
        Memento.clear();
    }

    function createMap() {
        Memento.disable();
        map = new hexM.Map(0, 10, 10, hexM.HEX_WIDTH, ordered, baseSurfaces[0], MAP_COLOR)
            .turn(120, 120, [svg.HORIZON, 3, svg.BLUE])
            .addGlasses(actionOnMap);
        frame.set(map.component);
        map.createPlayer("Blue").createPlayer("Red");
        updateTurnNumber(10);
        preparePlayers();
        Memento.enable();
    }

    class MapResizer {

        constructor(colCount, rowCount, handler) {
            this.colCount = colCount;
            this.rowCount = rowCount;
            this.handler = handler;
            const backColor = svg.ORANGE;
            const strokeColor = svg.RED;
            const chevronWidth = 50;
            const chevronHeight = 100;
            const chevronThickness = 15;
            const mapWidth = 450;
            const mapHeight = 250;
            const margin = 10;
            this.maxColCount = 999;
            this.minColCount = 2;
            this.maxRowCount = 999;
            this.minRowCount = 2;
            this.colCountText = new svg.Text(this.colCount).font("Arial", 48).position(-mapWidth/2+chevronWidth+60, 10);
            this.rowCountText = new svg.Text(this.rowCount).font("Arial", 48).position(0, -20);
            let leftAdder = new svg.Chevron(chevronWidth, chevronHeight, chevronThickness, "W")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Add col in West");
                    if (this.colCount<this.maxColCount) {
                        this.handler("W+");
                        this.colCount++;
                        this.colCountText.message(this.colCount);
                    }
            });
            let leftRemover = new svg.Chevron(chevronWidth, chevronHeight, chevronThickness, "E")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Remove col in West");
                    if (this.colCount>this.minColCount) {
                        this.handler("W-");
                        this.colCount--;
                        this.colCountText.message(this.colCount);
                    }
            });
            let rightAdder = new svg.Chevron(chevronWidth, chevronHeight, chevronThickness, "E")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Add col in East");
                    if (this.colCount<this.maxColCount) {
                        this.handler("E+");
                        this.colCount++;
                        this.colCountText.message(this.colCount);
                    }
            });
            let rightRemover = new svg.Chevron(chevronWidth, chevronHeight, chevronThickness, "W")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Remove col in East");
                    if (this.colCount>this.minColCount) {
                        this.handler("E-");
                        this.colCount--;
                        this.colCountText.message(this.colCount);
                    }
            });
            let topAdder = new svg.Chevron(chevronHeight, chevronWidth, chevronThickness, "N")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Add row in North");
                    if (this.rowCount<this.maxRowCount) {
                        this.handler("N+");
                        this.rowCount++;
                        this.rowCountText.message(this.rowCount);
                    }
            });
            let topRemover = new svg.Chevron(chevronHeight, chevronWidth, chevronThickness, "S")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Remove row in North");
                    if (this.rowCount>this.minRowCount) {
                        this.handler("N-");
                        this.rowCount--;
                        this.rowCountText.message(this.rowCount);
                    }
            });
            let bottomAdder = new svg.Chevron(chevronHeight, chevronWidth, chevronThickness, "S")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Add row in South");
                    if (this.rowCount<this.maxRowCount) {
                        this.handler("S+");
                        this.rowCount++;
                        this.rowCountText.message(this.rowCount);
                    }
            });
            let bottomRemover = new svg.Chevron(chevronHeight, chevronWidth, chevronThickness, "N")
                .color(backColor, 2, strokeColor).onClick(()=>{
                    console.log("Remove row in South");
                    if (this.rowCount>this.minRowCount) {
                        this.handler("S-");
                        this.rowCount--;
                        this.rowCountText.message(this.rowCount);
                    }
                });
            this.component = new svg.Translation()
                .add(new svg.Rect(mapWidth, mapHeight).color(svg.LIGHT_GREEN, 3, svg.GREEN))
                .add(leftAdder.position(-mapWidth/2-chevronWidth/2-margin, 0))
                .add(leftRemover.position(-mapWidth/2+chevronWidth/2+margin, 0))
                .add(rightAdder.position(mapWidth/2+chevronWidth/2+margin, 0))
                .add(rightRemover.position(mapWidth/2-chevronWidth/2-margin, 0))
                .add(topAdder.position(0, -mapHeight/2-chevronWidth/2-margin))
                .add(topRemover.position(0, -mapHeight/2+chevronWidth/2+margin))
                .add(bottomAdder.position(0, mapHeight/2+chevronWidth/2+margin))
                .add(bottomRemover.position(0, mapHeight/2-chevronWidth/2-margin))
                .add(this.colCountText).add(this.rowCountText);
        }

        bounds(minColCount, maxColCount, minRowCount, maxRowCount) {
            this.minColCount = minColCount;
            this.maxColCount = maxColCount;
            this.minRowCount = minRowCount;
            this.maxRowCount = maxRowCount;
            return this;
        }

        position(x, y) {
            this.component.move(x, y);
            return this;
        }

    }

    var baseSurfaces = [
        new hexM.Surface("ground0", [[120, 220, 120], 4, [60, 140, 60]]),
        new hexM.Surface("desert0", [[255, 255, 150], 4, [230, 230, 140]]),
        new hexM.Surface("sea0", [[130, 200, 250], 4, [100, 150, 200]]),
        new hexM.Surface("space0", [[0, 0, 0], 4, [40, 40, 40]])
    ];

    function actionOnMap(hex, x, y, piece, center) {
        palette.action(hex, x, y, piece, center);
        Memento.begin();
    }

    function deleteSelected() {
        if (!map.selected.empty()) {
            Memento.register(map);
            for (let what of map.selected) {
                if (what instanceof hexM.Item) {
                    what.hex.removeItem(what);
                }
                else if (what instanceof hexM.Unit) {
                    what.hex.removeUnit(what);
                    manageUnitRemoval(what);
                }
            }
            map.selected.clear();
            Memento.begin();
        }
    }

    function editIcon() {
        return new svg.Translation()
            .add(new svg.Hexagon(hexM.HEX_WIDTH).direction("V").color(svg.LIGHT_GREEN, 3, svg.DARK_GREEN))
            .add(new svg.Chevron(hexM.HEX_WIDTH*2/3, hexM.HEX_WIDTH*3/2, hexM.HEX_WIDTH/4, "W")
                .position(-hexM.HEX_WIDTH*2/3, 0).color(svg.ORANGE, 2, svg.RED))
            .add(new svg.Chevron(hexM.HEX_WIDTH*2/3, hexM.HEX_WIDTH*3/2, hexM.HEX_WIDTH/4, "E")
                .position(hexM.HEX_WIDTH*2/3, 0).color(svg.ORANGE, 2, svg.RED))
            .add(
                new svg.Text("4").font("arial", 60).color(svg.LIGHT_GREY, 2, svg.GREY).position(0, hexM.HEX_WIDTH/3));
    }

    let ordered = [];

    var paneSaveLoad = new fileManager.FilePane([[255, 230, 150], 4, [10, 10, 10]], "Save/load", 120, "/uscw/edit")
        .newPopin(NewPopin).editPopin(editIcon(), EditPopin);
    paneSaveLoad.handlers(saveMap, loadMap);
    var paneTerrain = new gui.Pane([svg.BEIGE, 4, [10, 10, 10]], "Terrain", 120);
    var panePath = new gui.Pane([[215, 230, 150], 4, [10, 10, 10]], "Path", 120);
    var paneBuilding = new gui.Pane([[195, 230, 150], 4, [10, 10, 10]], "Building", 120);
    var paneUnit = new gui.Pane([[185, 230, 150], 4, [10, 10, 10]], "Unit", 120);

    let MAP_COLOR = [180, 240, 180];

    var frame = new gui.Frame(600, 1000).backgroundColor(MAP_COLOR);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        .key(46, deleteSelected)
        .key(8, deleteSelected);
    var palette = new gui.Palette(400, 1000)
        .addPane(paneSaveLoad)
        .addPane(paneTerrain)
        .addPane(panePath)
        .addPane(paneBuilding)
        .addPane(paneUnit);

    resizeAll();

    addSurfaceSupport("ground1", "ground0", [110, 210, 110], 0.9);
    addSurfaceSupport("ground2", "ground0", [100, 200, 100], 0.9);
    addSurfaceSupport("ground3", "ground0", [90, 190, 90], 0.9);
    addSurfaceSupport("ground4", "ground0", [80, 180, 80], 0.9);
    addSurfaceSupport("ground5", "ground0", [70, 170, 70], 0.9);
    addSurfaceSupport("ground6", "ground0", [60, 160, 60], 0.9);
    addSurfaceSupport("desert1", "desert0", [245, 245, 140], 0.8);
    addSurfaceSupport("desert2", "desert0", [235, 235, 130], 0.8);
    addSurfaceSupport("desert3", "desert0", [225, 225, 120], 0.8);
    addSurfaceSupport("desert4", "desert0", [215, 215, 110], 0.8);
    addSurfaceSupport("desert5", "desert0", [205, 205, 100], 0.8);
    addSurfaceSupport("desert6", "desert0", [195, 195, 90], 0.8);
    addLineSupport("path", "ground0", 0.2, [220, 180, 130], 0.8);
    addLineSupport("path", "ground0", 0.15, [220, 180, 130], 0.8);
    addLineSupport("path", "ground0", 0.1, [220, 180, 130], 0.8);
    addLineSupport("road", "ground0", 0.2, [180, 180, 180], 0.7);
    addLineSupport("road", "ground0", 0.3, [180, 180, 180], 0.7);
    addLineSupport("road", "ground0", 0.4, [180, 180, 180], 0.7);
    addBorderSupport("river", "ground0", 0.8, [120, 120, 230], 0.7);
    addBorderSupport("river", "ground0", 0.7, [120, 120, 230], 0.7);
    addBorderSupport("river", "ground0", 0.6, [120, 120, 230], 0.7);
    addItemSupport("ground0", new hexM.House(30, 20, [[180, 80, 80], 2, [140, 60, 60]]));
    addItemSupport("ground0", new hexM.House(40, 20, [[180, 80, 80], 2, [140, 60, 60]]));
    addItemSupport("ground0", new hexM.House(20, 20, [[180, 80, 80], 2, [140, 60, 60]]));
    addItemSupport("ground0", new hexM.SquareOpenTower(30, 30, [[180, 180, 180], 2, [40, 40, 40]]));
    addItemSupport("ground0", new hexM.RoundOpenTower(15, [[180, 180, 180], 2, [40, 40, 40]]));
    addItemSupport("ground0", new hexM.Bridge(40, 14, [[200, 200, 200], 2, [40, 40, 40]]));
    addCompositeSupport("ground0");
    addCompositeSupport("ground0");
    addCompositeSupport("ground0");
    addUnitSupport(new hexM.Unit("white", 64, 64, 0, hexM.symbols.infantry, [svg.ALMOST_WHITE, 3, svg.ALMOST_BLACK]));
    addUnitSupport(new hexM.Unit("grey", 64, 64, 0, hexM.symbols.infantry, [svg.LIGHT_GREY, 3, svg.ALMOST_BLACK]));
    addUnitSupport(new hexM.Unit("black", 64, 64, 0, hexM.symbols.infantry, [svg.ALMOST_BLACK, 3, svg.ALMOST_WHITE]));
    addUnitSupport(new hexM.Unit("red", 64, 64, 0, hexM.symbols.infantry, [svg.ALMOST_RED, 3, svg.ALMOST_WHITE]));
    addUnitSupport(new hexM.Unit("dark_blue", 64, 64, 0, hexM.symbols.infantry, [svg.DARK_BLUE, 3, svg.ALMOST_WHITE]));
    addUnitSupport(new hexM.Unit("light_blue", 64, 64, 0, hexM.symbols.infantry, [svg.LIGHT_BLUE, 3, svg.ALMOST_BLACK]));

    var map;
    createMap();

    function resizeAll() {
        const PALETTE_WIDTH = 400;
        const MIN_WIDTH = 800;
        const MIN_HEIGHT = 640;
        const MARGIN = 10;
        let screenSize = svg.runtime.screenSize();
        screenSize.width<MIN_WIDTH && (screenSize.width=MIN_WIDTH);
        screenSize.height<MIN_HEIGHT && (screenSize.height=MIN_HEIGHT);
        let canvasWidth = screenSize.width-MARGIN*2;
        let canvasHeight = screenSize.height-MARGIN*2;
        let frameWidth = canvasWidth-PALETTE_WIDTH-MARGIN*3;
        let frameHeight = canvasHeight-MARGIN*2;
        drawing.dimension(canvasWidth, canvasHeight);
        frame.dimension(frameWidth, frameHeight)
            .position(MARGIN+frameWidth/2, MARGIN+frameHeight/2);
        palette.dimension(PALETTE_WIDTH, frameHeight)
            .position(canvasWidth-MARGIN-PALETTE_WIDTH/2, MARGIN+frameHeight/2)
    }

    svg.runtime.addGlobalEvent("resize", event=>resizeAll());

    function getColor(color, factor) {
        return [Math.round(color[0]*factor), Math.round(color[1]*factor), Math.round(color[2]*factor)]
    }

    function addSurfaceSupport(type, baseType, color, factor) {
        if (!ordered.contains(type)) {
            ordered.push(type);
        }
        new SurfaceSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), paneTerrain)
            .surface(type, [color, 4, getColor(color, factor)]);
    }

    function addLineSupport(type, baseType, width, color, factor) {
        if (!ordered.contains(type)) {
            ordered.push(type);
        }
        new LineSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), panePath)
            .line(type, width, [color, 4, getColor(color, factor)]);
    }

    function addBorderSupport(type, baseType, width, color, factor) {
        if (!ordered.contains(type)) {
            ordered.push(type);
        }
        new BorderSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), panePath)
            .border(type, width, [color, 4, getColor(color, factor)]);
    }

    function addItemSupport(baseType, item) {
        new ItemSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), paneBuilding).commonItem(
            function () {
                let newItem = item.duplicate();
                item.rotate(30);
                return item;
            },
            function () {
                return item.duplicate();
            });
    }

    function addUnitSupport(unit) {
        new UnitSupport(unit, paneUnit).unit(
            function () {
                let newUnit = unit.duplicate();
                manageUnitAddition(newUnit);
                return newUnit;
            });
    }

    function addCompositeSupport(baseType) {
        new CompositeSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), paneBuilding)
            .composite();
    }

    function existUnitType(type) {
        return map.hexes.find(hex=>
            hex.units.find(unit=>
                unit.type===type)
        )
    }

    function manageUnitAddition(unit) {
        if (!existUnitType(unit.type)) {
            if (!map.findTeam(unit.type)) {
                let teamUnit = unit.duplicate();
                let team = map.players[0].createTeam(teamUnit);
                prepareTeam(team);
            }
        }
    }

    function manageUnitRemoval(unit) {
        if (!existUnitType(unit.type)) {
            let team = map.findTeam(unit.type);
            if (team) {
                team.player.removeTeam(team);
            }
        }
    }

    function getBaseSurface(type) {
        return baseSurfaces.find(surface=>surface.type===type);
    }

    var hexHouse = new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, baseSurfaces[0]);
    new HexSupport(hexHouse, paneBuilding).action(
        function () {
            palette.action = function (hex, x, y, piece, center) {
            };
        });

    drawing.add(palette.component);

    Memento.finalize(()=>{
        if (isCompositesPresentOnMap()) {
            selectFirstCompositeTool();
        }
        else {
            unselectAllCompositeTools();
        }
    });

    function isCompositesPresentOnMap () {
        map.forEachHex(hex=>{
            if (hex.getItem(hexM.Composite)) {
                return true;
            }
        });
        return false;
    }

    function selectFirstCompositeTool() {
        for (let tool in palette.hexTools) {
            if (palette.hexTools[tool] instanceof CompositeSupport) {
                palette.hexTools[tool].select();
                break;
            }
        }
    }

    function unselectAllCompositeTools() {
        for (let tool in palette.hexTools) {
            if (palette.hexTools[tool] instanceof CompositeSupport) {
                palette.hexTools[tool].unselect();
            }
        }
    }

    Memento.begin();
    return drawing;
};
