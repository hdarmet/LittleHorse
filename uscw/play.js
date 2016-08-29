/**
 * Created by HDA3014 on 20/08/2016.
 */

var Gui = require("../svggui.js").Gui;
var FileManager = require("../filemanager.js").FileManager;
var Hex = require("../uscw/hextools.js").Hex;
var Memento = require("../memento").Memento;
var GameItems = require("../gameitems").GameItems;
var Rules = require("./rules").Rules;

exports.play = function(svg) {

    let param = {
        speed: 10,
        step: 10
    };
    var gui = Gui(svg, param);
    var fileManager = FileManager(svg, gui);
    var hexM = Hex(svg);
    var gItems = GameItems(svg);
    var rules = Rules(hexM);

    let MAP_COLOR = [180, 240, 180];

    function sword() {
        let component = new svg.Translation()
            .add(new svg.Path(-25, -5)
                .line(40, -5).bezier(50, -5, 60, 0)
                .bezier(50, 5, 40, 5).line(-25, 5).line(-25, -5)
                .color(svg.LIGHT_GREY, 2, svg.DARK_GREY))
            .add(new svg.Rect(8, 28).corners(4, 4).position(-28, 0)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE))
            .add(new svg.Path(-33, -4).line(-50, -3).bezier(-60, 0, -50, 3)
                .line(-33, 4).line(-33, -4)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE))
            .add(new svg.Circle(4).position(-56, 0)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE));
        return component;
    }

    function fight() {
        let component = new svg.Translation()
            .add(new svg.Rotation(-45).add(sword()))
            .add(new svg.Rotation(-135).add(sword()));
        return component;
    }

    const FIGHT_MARGIN_X = 50;
    const FIGHT_MARGIN_Y = 50;
    const DIE_MARGIN_X = 20;
    const DIE_MARGIN_Y = 120;

    function resizeAll() {
        const MIN_WIDTH = 800;
        const MIN_HEIGHT = 640;
        const MARGIN = 10;
        let screenSize = svg.runtime.screenSize();
        screenSize.width<MIN_WIDTH && (screenSize.width=MIN_WIDTH);
        screenSize.height<MIN_HEIGHT && (screenSize.height=MIN_HEIGHT);
        let canvasWidth = screenSize.width-MARGIN*2;
        let canvasHeight = screenSize.height-MARGIN*2;
        let frameWidth = canvasWidth-MARGIN*2;
        let frameHeight = canvasHeight-MARGIN*2;
        if (paneSaveLoad.opened) {
            frameWidth -= paneSaveLoad.width+MARGIN;
            push.component.move(frameWidth-60, 20);
        }
        else {
            menu.component.move(frameWidth-60, 20);
        }
        paneSaveLoad
            .resize(paneSaveLoad.width, frameHeight)
            .position(canvasWidth-paneSaveLoad.width/2-MARGIN, frameHeight/2+MARGIN);
        drawing.dimension(canvasWidth, canvasHeight);
        frame.dimension(frameWidth, frameHeight)
            .position(MARGIN+frameWidth/2, MARGIN+frameHeight/2);
        fight.move(-frameWidth/2 +FIGHT_MARGIN_X, -frameHeight/2 +FIGHT_MARGIN_Y);
        die.component.move(-frameWidth/2 +DIE_MARGIN_X, -frameHeight/2 +DIE_MARGIN_Y);
    }

    class ParameterPopin extends gui.Popin {
        constructor() {
            super(1000, 700);
        }
    }

    class NewPlayPopin extends fileManager.BaseLoadPopin {

        constructor() {
            super(paneSaveLoad, "Select Game:", "listgames", "loadgame", function(text) {
                this.manager.setContent(text);
            });
        }

    }

    function parameterIcon() {
        return new svg.Rect(80, 80).color(svg.LIGHT_BLUE, 2, svg.DARK_BLUE);
    }

    const PANE_WIDTH = 360;
    const STEPS = 100;
    const DELAY = 2;

    function openPane() {
        paneSaveLoad.open();
        drawing.add(paneSaveLoad.component);
        drawing.remove(menu.component);
        channel.play(DELAY, STEPS,
            i=>{
                paneSaveLoad.resize(PANE_WIDTH*i/STEPS);
                resizeAll();
            },
            ()=> {
                paneSaveLoad.resize(PANE_WIDTH);
                drawing.add(push.component);
                resizeAll();
            }
        );
    }

    function closePane() {
        drawing.remove(push.component);
        resizeAll();
        channel.play(DELAY, STEPS,
            i=>{
                paneSaveLoad.resize(PANE_WIDTH*(STEPS-i)/STEPS);
                resizeAll();
            },
            ()=> {
                paneSaveLoad.close();
                drawing.remove(paneSaveLoad.component);
                drawing.add(menu.component);
                resizeAll();
            }
        );
    }

    function saveGame() {
        return new hexM.MapBuilder().spec(map);
    }

    function loadGame(desc) {
        Memento.disable();
        map = new hexM.MapBuilder().map(desc).playMode();
        frame.set(map.component);
        map.forEachHex(hex=>hex.setZoneOrder(["move"]));
        friendPlayer = map.players[0];
        foePlayer = map.players[1];
        manipulator.enableDnDOnHexesForPlayer(friendPlayer);
        manipulator.enableClickableOnHexesForPlayer(foePlayer);
        manipulator.prepareMoves();
        Memento.enable();
        Memento.clear();
    }

    class UnitManipulator {

        constructor() {
        }

        prepareMoves() {
            this.startMoves = new Map();
            map.forEachUnit(unit=>this.startMoves.set(unit, unit.hex));
        }

        mergeZones(unit, zoneBuilder, ...args) {
            let zone = zoneBuilder(unit, ...args);
            let nextUnit = unit.nextUnit;
            while(nextUnit) {
                let nextZone = zoneBuilder(nextUnit, ...args);
                zone.forEach((val, hex)=>{
                    if (!nextZone.has(hex)) {
                        zone.delete(hex);
                    }
                });
                nextUnit = nextUnit.nextUnit;
            }
            return zone;
        }

        getMoveZone(unit) {
            return this.mergeZones(unit, unit=>this.getPrimaryMoveZone(unit));
        }

        getPrimaryMoveZone(unit) {
            let zone = new Map();
            let startHex = this.startMoves.get(unit);
            process(startHex, unit.movementFactor());
            return zone;

            function process(hex, movementFactor) {
                if (hex && (!zone.has(hex) || zone.get(hex)<movementFactor)) {
                    zone.set(hex, movementFactor);
                    //console.log(hex.x+" "+hex.y);
                    for (let dir of ["ne", "e", "se", "sw", "w", "nw"]) {
                        let move = rule.movement(map, unit, startHex, movementFactor, hex, dir);
                        if (move.auth) {
                            process(hex[dir], move.ma);
                        }
                    }
                }
            }

        }

        getAdvanceZone(unit, units, hexes) {
            return this.mergeZones(unit, this.getPrimaryAdvanceZone, units, hexes);
        }

        getPrimaryAdvanceZone(unit, units, hexes) {
            let zone = new Map();
            if (units.contains(unit)) {
                hexes.forEach(hex=>zone.set(hex, 1));
            }
            return zone;
        }

        getRetreatZone(unit, units, range) {
            return this.mergeZones(unit, unit=>this.getPrimaryRetreatZone(unit, units, range));
        }

        getPrimaryRetreatZone(unit, units, range) {
            let zone = new Map();
            let startHex = this.startMoves.get(unit);
            if (units.contains(unit)) {
                process(startHex, range);
            }
            return zone.filter((range)=>range===0);

            function process(hex, range) {
                if (hex && (!zone.has(hex) || zone.get(hex)<range)) {
                    zone.set(hex, range);
                    for (let dir of ["ne", "e", "se", "sw", "w", "nw"]) {
                        let move = rule.retreat(map, unit, hex, dir);
                        if (move.auth && range>0) {
                            process(hex[dir], range-1);
                        }
                    }
                }
            }

        }

        proposeFighting() {
            if (rule.getFight(map)) {
                fight.show();
            }
            else {
                fight.hide();
            }
        }

        enableDnDOnHexesForPlayer(player) {
            player.teams.forEach(team=>{
                manipulator.enableDnDOnHexesForTeam(team);
            });
        }

        enableDnDOnHexesForTeam(team) {
            map.forEachUnit(unit=>{
               if (unit.type===team.unit.type) {
                   this.enableDnDOnHexes(unit);
               }
            });
        }

        enableDnDOnHexes(unit) {

            let showMoveZone=()=>{
                let zone = this.getMoveZone(unit);
                zone.forEach((val, hex)=> {
                    hex.setZone(new hexM.Zone("move", [svg.ALMOST_RED, 1, svg.DARK_RED]));
                });
            };

            let hideMoveZone=()=>{
                let zone = this.getMoveZone(unit);
                zone.forEach((val, hex)=> {
                    hex.removeZone("move");
                });
            };

            hexM.installDnDOnHexes(unit, frame,
                (unit, rotate)=> {
                    if (!rotate) {
                        showMoveZone();
                    }
                    return true;
                },
                (unit, angle)=> {
                    unit.rotate(Math.round(angle / 30) * 30);
                    return true;
                },
                (hex, unit, x, y)=> {
                    let zone = this.getMoveZone(unit);
                    if (zone.has(hex)) {
                        hex.putUnit(unit.move(0, 0));
                        map.unselectAll();
                        map.unhighlightAll();
                        this.proposeFighting();
                        hideMoveZone();
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                    hideMoveZone();
                    return true;
                },
                (unit)=> {
                    hideMoveZone();
                    if (unit.selected) {
                        rule.friendSelected(map, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        rule.friendSelected(map, unit, true);
                        this.proposeFighting();
                    }
                    this.putUnitOnTop(unit);
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
        }

        enableClickableOnHexesForPlayer(player) {
            player.teams.forEach(team=>{
                manipulator.enableClickableOnHexesForTeam(team);
            });
        }

        enableClickableOnHexesForTeam(team) {
            map.forEachUnit(unit=>{
                if (unit.type===team.unit.type) {
                    this.enableClickableOnHexes(unit);
                }
            });
        }

        enableClickableOnHexes(unit) {
            hexM.installClickableOnHexes(unit,
                (unit)=> {
                    if (unit.selected) {
                        rule.foeSelected(map, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        rule.foeSelected(map, unit, true);
                        this.proposeFighting();
                    }
                    if (unit.nextUnit) {
                        let nextUnit = unit.nextUnit;
                        let hex = unit.hex;
                        hex.removeUnit(nextUnit);
                        hex.removeUnit(unit);
                        hex.putUnit(nextUnit);
                        hex.putUnit(unit);
                    }
                    return true;
                }
            );
        }

        enableDnDOnEliminatedBox(unit) {

            hexM.installDnDOnBox(unit, frame, map.eliminatedBox,
                (unit)=> {
                    return true;
                },
                (unit, x, y)=> {
                    map.eliminatedBox.removeUnit(unit);
                    if (x<-map.eliminatedBox.width/2+unit.width/2) {
                        x=-map.eliminatedBox.width/2+unit.width/2;
                    }
                    if (x>map.eliminatedBox.width/2-unit.width/2) {
                        x=map.eliminatedBox.width/2-unit.width/2;
                    }
                    if (y<-map.eliminatedBox.height/3+unit.height/2) {
                        y=-map.eliminatedBox.height/3+unit.height/2;
                    }
                    if (y>map.eliminatedBox.height/2-unit.height/2) {
                        y=map.eliminatedBox.height/2-unit.height/2;
                    }
                    unit.component.smoothy(param.speed, param.step).moveTo(x, y);
                    svg.animate(param.speed, ()=>unit.move(x, y));
                    map.eliminatedBox.addUnit(unit);
                    return true;
                },
                (unit)=> {
                    map.eliminatedBox.removeUnit(unit);
                    map.eliminatedBox.addUnit(unit);
                    return true;
                }
            );
        }

        putUnitOnTop(unit) {
            if (unit.nextUnit) {
                let nextUnit = unit.nextUnit;
                let hex = unit.hex;
                hex.removeUnit(nextUnit);
                hex.removeUnit(unit);
                hex.putUnit(nextUnit);
                hex.putUnit(unit);
            }
        }

        enableDnDForAdvance(unit, units, hexes) {

            let unitHex = unit.hex;

            let showAdvanceZone=()=>{
                let zone = this.getAdvanceZone(unit, units, [unitHex,...hexes]);
                zone.forEach((val, hex)=> {
                    hex.setZone(new hexM.Zone("move", [svg.ALMOST_RED, 1, svg.DARK_RED]));
                });
            };

            let hideAdvanceZone=()=>{
                let zone = this.getAdvanceZone(unit, units, [unitHex,...hexes]);
                zone.forEach((val, hex)=> {
                    hex.removeZone("move");
                });
            };

            hexM.installDnDOnHexes(unit, frame,
                (unit, rotate)=> {
                    if (!rotate) {
                        showAdvanceZone();
                    }
                    return true;
                },
                (unit, angle)=> {
                    unit.rotate(Math.round(angle / 30) * 30);
                    return true;
                },
                (hex, unit, x, y)=> {
                    let zone = this.getAdvanceZone(unit, units, [unitHex,...hexes]);
                    if (zone.has(hex)) {
                        hex.putUnit(unit.move(0, 0));
                        hideAdvanceZone();
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                    hideAdvanceZone();
                    return true;
                },
                (unit)=> {
                    hideAdvanceZone();
                    this.putUnitOnTop(unit);
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
        }

        enableDnDForRetreat(unit, units, range, continued) {

            let unitHex = unit.hex;

            let showRetreatZone=()=>{
                let zone = this.getRetreatZone(unit, units, range);
                zone.forEach((val, hex)=> {
                    hex.setZone(new hexM.Zone("move", [svg.ALMOST_RED, 1, svg.DARK_RED]));
                });
            };

            let hideRetreatZone=()=>{
                let zone = this.getRetreatZone(unit, units, range);
                zone.forEach((val, hex)=> {
                    hex.removeZone("move");
                });
            };

            hexM.installDnDOnHexes(unit, frame,
                (unit, rotate)=> {
                    if (!rotate) {
                        showRetreatZone();
                    }
                    return !rotate;
                },
                (unit, angle)=> {
                    return false;
                },
                (hex, unit, x, y)=> {
                    let zone = this.getRetreatZone(unit, units, range);
                    if (zone.has(hex)) {
                        hex.putUnit(unit.move(0, 0));
                        hideRetreatZone();
                        continued();
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                    hideRetreatZone();
                    return true;
                },
                (unit)=> {
                    hideRetreatZone();
                    this.putUnitOnTop(unit);
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
        }

        disableForPlayer(player) {
            player.teams.forEach(team=>{
                manipulator.disableForTeam(team);
            });
        }

        disableForTeam(team) {
            map.forEachUnit(unit=>{
                if (unit.type===team.unit.type) {
                    this.disable(unit);
                }
            });
        }

        disable(unit) {
            unit.removeEvent('mousedown');
        }

    }

    class Fight {

        constructor() {
            this.scale = new svg.Scaling(1);
            this.rotate = new svg.Rotation(0);
            this.component = new svg.Translation().add(this.rotate.add(this.scale.add(fight())));
            this.component.onClick(()=>this.resolveFight());
        }

        move(x, y) {
            this.component.move(x, y);
            return this;
        }

        show() {
            this.component.opacity(1);
            die.component.opacity(1);
            return this;
        }

        hide() {
            this.component.opacity(0);
            die.component.opacity(0);
            return this;
        }

        resolveFight() {
            Memento.clear();
            Memento.disable();
            manipulator.prepareMoves();
            manipulator.disableForPlayer(friendPlayer);
            manipulator.disableForPlayer(foePlayer);
            this.scale.steppy(param.speed, 20).scale(1, 1.2).scale(1.2, 1);
            die.roll();
            svg.animate(param.speed, ()=>{
                let dieValue = die.value;
                let result = rule.resolveFight(map, friendPlayer, dieValue);
                new CRTPopin(result, dieValue).show(drawing);
            });
        }

        processResult(result) {
            console.log("fight:"+result.ratio+" "+result.result);
            let friends = rule.friendsFighting(map, friendPlayer);
            let foes = rule.foesFighting(map, friendPlayer);
            map.unselectAll();
            map.unhighlightAll();
            this.hide();
            result.result = "AR";
            if (result.result==="AE") {
                this.eliminate(friends);
                this.closeFight();
            }
            else if (result.result==="DE") {
                let hexes = this.collectHexes(foes);
                this.eliminate(foes);
                this.advance(friends, hexes);
            }
            else if (result.result==="EX") {
                this.eliminate(foes);
                // to be continued :)
                this.closeFight();
            }
            else if (result.result==="AR") {
                this.retreat(friends, 1);
            }
        }

        collectHexes(units) {
            let hexes=[];
            units.forEach(unit=>hexes.add(unit.hex));
            return hexes;
        }

        proposeEndOfFight() {
            this.rotate.rotate(180);
            this.component.onClick(()=>this.closeFight());
            this.show();
        }

        allUnitsHaveMoved(units) {
            let result = true;
            units.forEach(unit=>{
                if (manipulator.startMoves.get(unit)===unit.hex) {
                    result = false;
                }
            });
            return result;
        }

        closeFight() {
            svg.animate(param.speed, ()=>{
                manipulator.enableDnDOnHexesForPlayer(friendPlayer);
                manipulator.enableClickableOnHexesForPlayer(foePlayer);
                map.unselectAll();
                map.unhighlightAll();
                this.component.onClick(()=>this.resolveFight());
                this.hide();
                Memento.enable();
                Memento.clear();
            });
        }

        eliminate(units) {
            units.forEach(unit=>{
                manipulator.enableDnDOnEliminatedBox(unit);
                let global = unit.component.parent.globalPoint(unit.x, unit.y);
                let local = map.eliminatedBox.content.localPoint(global);
                unit.hex.removeUnit(unit);
                map.eliminatedBox.addUnit(unit.move(local.x, local.y));
                unit.component.smoothy(param.speed, param.step).moveTo(0, 0);
                unit.rotation.smoothy(param.speed, param.step).rotateTo(0);
                svg.animate(param.speed, ()=>unit.move(0, 0));
            });
        }

        advance(units, hexes) {
            svg.animate(param.speed, ()=>{
                units.forEach(unit=>{
                    map.highlight(unit);
                    manipulator.enableDnDForAdvance(unit, units, hexes);
                });
                this.proposeEndOfFight();
                Memento.enable();
            });
        }

        retreat(units, range) {
            units.forEach(unit=>{
                map.select(unit);
                manipulator.enableDnDForRetreat(unit, units, range, ()=>{
                    if (this.allUnitsHaveMoved(units)) {
                        this.proposeEndOfFight();
                    }
                });
            });
            Memento.enable();
        }

    }

    class CRTPopin extends gui.Popin {
        constructor(result, die) {
            super(1000, 600);
            this.title = new gui.Label(0, 0, "Combat Result Table").anchor('middle').font("arial", 40);
            this.add(this.title.position(0, -250));
            let table = this.buildCRT();
            table.component.add(this.highlightCell(result.ratio, die)).move(0, 50);
            this.add(table);
            svg.animate(2000, ()=>{
                this.close();
                fight.processResult(result);
            });
        }

        buildCRT() {
            const CELL_WIDTH=70;
            const CELL_HEIGHT = 50;

            let tableComponent = new svg.Translation();
            let data = rule.getCRT();
            for (let c=0; c<data.columns.length; c++) {
                tableComponent.add(new svg.Rect(CELL_WIDTH, CELL_HEIGHT)
                    .position(CELL_WIDTH*(c-data.columns.length/2+0.5), CELL_HEIGHT*(-data.rows.length/2-0.5))
                    .color(svg.WHITE, 3, svg.ALMOST_BLACK))
                    .add(new svg.Text(data.columns[c])
                        .position(
                            CELL_WIDTH*(c-data.columns.length/2+0.5),
                            CELL_HEIGHT*(-data.rows.length/2-0.5)+10)
                        .font("arial", 24)
                        .color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
            }
            for (let r=0; r<data.rows.length; r++) {
                tableComponent.add(new svg.Rect(CELL_WIDTH, CELL_HEIGHT)
                    .position(CELL_WIDTH*(-data.columns.length/2-0.5), CELL_HEIGHT*(r-data.rows.length/2+0.5))
                    .color(svg.WHITE, 3, svg.ALMOST_BLACK))
                    .add(new svg.Text(data.rows[r])
                        .position(
                            CELL_WIDTH*(-data.columns.length/2-0.5),
                            CELL_HEIGHT*(r-data.rows.length/2+0.5)+10)
                        .font("arial", 24)
                        .color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
                tableComponent.add(new svg.Rect(CELL_WIDTH, CELL_HEIGHT)
                    .position(CELL_WIDTH*(data.columns.length/2+0.5), CELL_HEIGHT*(r-data.rows.length/2+0.5))
                    .color(svg.WHITE, 3, svg.ALMOST_BLACK))
                    .add(new svg.Text(data.rows[r])
                        .position(
                            CELL_WIDTH*(data.columns.length/2+0.5),
                            CELL_HEIGHT*(r-data.rows.length/2+0.5)+10)
                        .font("arial", 24)
                        .color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
                for (let c=0; c<data.columns.length; c++) {
                    tableComponent.add(new svg.Rect(CELL_WIDTH, CELL_HEIGHT)
                        .position(CELL_WIDTH*(c-data.columns.length/2+0.5), CELL_HEIGHT*(r-data.rows.length/2+0.5))
                        .color(svg.WHITE, 3, svg.ALMOST_BLACK))
                        .add(new svg.Text(data.cells[c][r])
                            .position(
                                CELL_WIDTH*(c-data.columns.length/2+0.5),
                                CELL_HEIGHT*(r-data.rows.length/2+0.5)+10)
                            .font("arial", 24)
                            .color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
                }
            }
            return {component:tableComponent};
        }

        highlightCell(ratio, dieValue) {
            const CELL_WIDTH=70;
            const CELL_HEIGHT = 50;

            let component = new svg.Translation();
            let data = rule.getCRT();
            component.add(new svg.Rect(CELL_WIDTH, CELL_HEIGHT)
                .position(CELL_WIDTH*(ratio-data.columns.length/2+0.5), CELL_HEIGHT*(dieValue-data.rows.length/2-0.5))
                .color([], 4, svg.RED));
            return component;
        }
    }

    var channel = svg.onChannel();

    var paneSaveLoad = new fileManager.FilePane([[255, 230, 150], 4, svg.ALMOST_BLACK], "Save/load", 120, "/uscw/play")
        .newPopin(NewPlayPopin).editPopin(parameterIcon(), ParameterPopin)
        .resize(0)
        .titleAction(null);
    paneSaveLoad.handlers(saveGame, loadGame);

    var rule = new rules.SimpleRule();
    var map;
    var friendPlayer;
    var foePlayer;
    var menu = new gItems.Exit(()=>{
        openPane();
    });
    var push = new gItems.Push(()=>{
        closePane();
    });
    var die = new gItems.Die(param);
    var fight = new Fight().hide();
    var frame = new gui.Frame(600, 1000).backgroundColor(MAP_COLOR);
    frame.component.add(fight.component);
    frame.component.add(die.component);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        .add(menu.component);
    var manipulator = new UnitManipulator();

    svg.runtime.addGlobalEvent("resize", event=>resizeAll());
    resizeAll();

    Memento.begin();
    return drawing;
};