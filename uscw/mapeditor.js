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

    class HexSupport {

        constructor(hex, pane) {
            this.hex = hex;
            this.pane = pane;
            this.component = new svg.Translation();
            this.component.add(hex.component.move(0, 0));
            this.component.add(hex.itemSupport.move(0, 0).active(false));
            this.component.add(hex.unitSupport.move(0, 0).active(false));
            this.component.add(new svg.Hexagon(hex.width, "V").color([], 2, [10, 100, 10]));
            if (this.register()) {
                this.select();
            }
            hex.addGlass(()=> {
                this.tool.callback(this.select());
            });
        }

        action(callback) {
            if (!this.tool) {
                this.tool = new gui.Tool(this.component, callback);
                this.tool.hex = this.hex;
                this.pane.addTool(this.tool);
            }
            else {
                this.tool.callback = callback;
            }
            this.tool.callback(true);
            return this;
        }

        register() {
            if (!this.pane.palette.hexTools) {
                this.pane.palette.hexTools = [];
            }
            this.pane.palette.hexTools.push(this);
            return this.pane.palette.hexTools.length === 1;
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
                this.pane.palette.hexTools.forEach(function (hexSupport) {
                    hexSupport.unselect();
                });
                this.selected = new svg.Hexagon(this.hex.width, "V").color([], 4, [220, 0, 0]);
                this.component.add(this.selected);
                this.selectCallback && this.selectCallback();
                return true;
            }
            return false;
        }

        unselect() {
            if (this.selected) {
                this.component.remove(this.selected);
                delete this.selected;
                this.unselectCallback && this.unselectCallback();
                return true;
            }
            return false;
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
                    if (center) {
                        if (hex.getBorderSide("c", type)) {
                            hex.removeBorderSide("c", type, size, ()=>new hexM.Border(type, {}, colors));
                        }
                        else {
                            hex.setBorderSide("c", type, size, ()=>new hexM.Border(type, {}, colors));
                        }
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
            installDnD(item,
                (item, angle)=> {
                    item.rotate(Math.round(angle / 15) * 15);
                },
                (hex, item)=> {
                    hex.putItem(item);
                },
                (item, x, y)=> {
                    item.move(x, y);
                },
                (item)=> {
                    item.hex.map.select(item);
                },
                (item)=> {
                    item.hex.removeItem(item);
                }
            );
        }

        disableDnD(item) {
            item.removeEvent('mousedown');
        }
    }

    class CompositeSupport extends ItemSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        enableCompositeDnD(composite) {
            let hexComposite = this.hex.getItem(hexM.Composite);
            installDnD(composite,
                (comp, angle)=> {
                    comp.rotate(Math.round(angle / 60) * 60);
                    comp.conform();
                },
                (hex, comp)=> {
                    var present = hex.getItem(hexM.Composite);
                    if (present) {
                        hex.removeItem(present);
                    }
                    hex.putItem(comp);
                },
                (comp, x, y)=> {
                    comp.move(0, 0);
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
                },
                (comp)=> {
                    comp.hex.removeItem(comp);
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
                                this.enableDnD(items[i]);
                                hex.putItem(items[i]);
                            }
                        }
                        hex.removeItem(composite);
                    });
                });
        }
    }

    class UnitSupport extends HexSupport {

        constructor(hex, pane) {
            super(hex, pane)
        }

        unit(unitForTool, unitForMap) {
            this.hex.putUnit(unitForTool());
            this.action(()=> {
                this.pane.palette.action = (hex, x, y, piece, center)=> {
                    let unit = unitForMap();
                    hex.putUnit(unit);
                    this.enableDnD(unit);
                };
            });
        }

        enableDnD(unit) {
            installDnD(unit,
                (unit, angle)=> {
                    unit.rotate(Math.round(angle / 30) * 30);
                },
                (hex, unit)=> {
                    hex.putUnit(unit);
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                },
                (unit)=> {
                    unit.hex.map.select(unit);
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                }
            );
        }

        disableDnD(unit) {
            unit.removeEvent('mousedown');
        }
    }

    function installDnD(item, doRotate, doDrop, doMove, doClick, doRemove) {
        item.addEvent('mousedown', event=> {
            let delta = item.hex.component.localPoint(event.x, event.y);
            let local = item.glass.localPoint(event.x, event.y);
            if (item.anchor(local.x, local.y)) {
                var angle = Math.round(Math.atan2(delta.x - item.x, -delta.y + item.y) / Math.PI * 180);
            }
            let {x:initX, y:initY, angle:initAngle} = item;
            let click = true;
            let itemParent = item.component.parent;
            item.addEvent('mousemove', moveEvent=> {
                let depl = item.hex.component.localPoint(moveEvent.x, moveEvent.y);
                if (angle) {
                    var newAngle = Math.round(Math.atan2(depl.x - item.x, -depl.y + item.y) / Math.PI * 180);
                    item.rotate(initAngle + newAngle - angle);
                }
                else {
                    frame.drag(item.component, itemParent, initX + depl.x - delta.x, initY + depl.y - delta.y);
//                    item.move(initX + depl.x - delta.x, initY + depl.y - delta.y);
                }
                click = false;
            });
            item.addEvent('mouseup', endEvent=> {
                if (click && endEvent.x === event.x && endEvent.y === event.y) {
                    doClick(item)
                }
                else {
                    let depl = item.hex.component.localPoint(endEvent.x, endEvent.y);
                    if (angle) {
                        let newAngle = Math.round(Math.atan2(depl.x - item.x, -depl.y + item.y) / Math.PI * 180);
                        doRotate(item, initAngle + newAngle - angle);
                    }
                    else {
                        let finalX = Math.round(initX + depl.x - delta.x);
                        let finalY = Math.round(initY + depl.y - delta.y);
                        let global = item.hex.component.globalPoint(finalX, finalY);
                        let onMap = item.hex.map.component.localPoint(global);
                        let newHex = item.hex.map.getHexFromPoint(onMap);
                        frame.drop(item.component, itemParent, finalX, finalY);
                        if (newHex === item.hex) {
                            doMove(item, finalX, finalY);
                        }
                        else {
                            doRemove(item);
                            if (newHex) {
                                var local = newHex.component.localPoint(global);
                                doMove(item, Math.round(local.x), Math.round(local.y));
                                doDrop(newHex, item);
                            }
                        }
                    }
                }
                Memento.begin();
                item.removeEvent('mousemove');
                item.removeEvent('mouseup');
            });
        });
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

    class NewPopin extends gui.Popin {

        constructor() {
            super(1000, 700);
            this.whenOk(function() {
                this.close();
            }).whenCancel(function() {
                Memento.rollback();
            });
            this.hexSelector = new gui.Selector(-200, -200, 200, 100,
                createSurfaceHexes(baseSurfaces).map(hex=>hex.component),
                (component, index)=> {
                    let surface = baseSurfaces[index];
                    map.setBaseSurface(surface);
                });
            this.add(this.hexSelector);
            this.turnSelector = new gui.NumberField(200, -200, 300, 100, 4).font("arial", 60).bounds(1, 300);
            this.add(this.turnSelector);
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
            this.add(this.mapResizer);
            Memento.begin();
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
        });
        Memento.enable();
        Memento.clear();
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
        if (map.selected) {
            Memento.register(map);
            if (map.selected instanceof hexM.Item) {
                map.selected.hex.removeItem(map.selected);
            }
            else if (map.selected instanceof hexM.Unit) {
                map.selected.hex.removeUnit(map.selected);
            }
            map.selected = null;
            Memento.begin();
        }
    }

    let ordered = [];

    var paneSaveLoad = new fileManager.FilePane([[255, 230, 150], 4, [10, 10, 10]], "Save/load", 120, "/uscw/edit")
        .newPopin(NewPopin);
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
    addUnitSupport("ground0", new hexM.Unit(64, 64, 0, infantry, [[240, 240, 240], 3, [40, 40, 40]]));

    function infantry(width, height, colors) {
        return new svg.Translation()
            .add(new svg.Rect(width, height).color(colors[0], 2, colors[2]))
            .add(new svg.Line(-width/2, -height/2, width/2, height/2).color(colors[0], 2, colors[2]))
            .add(new svg.Line(-width/2, height/2, width/2, -height/2).color(colors[0], 2, colors[2]));
    }

    var map = new hexM.Map(0, 10, 10, hexM.HEX_WIDTH, ordered, baseSurfaces[0], MAP_COLOR)
        .addGlasses(actionOnMap);
    frame.set(map.component);

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

    function addUnitSupport(baseType, unit) {
        new UnitSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), paneUnit).unit(
            function () {
                let newUnit = unit.duplicate();
                return unit;
            },
            function () {
                return unit.duplicate();
            });
    }

    function addCompositeSupport(baseType) {
        new CompositeSupport(new hexM.Hex(0, 0, hexM.HEX_WIDTH, null, getBaseSurface(baseType)), paneBuilding)
            .composite();
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
