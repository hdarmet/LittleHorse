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
                .color(svg.ALMOST_WHITE, 2, svg.DARK_GREY))
            .add(new svg.Rect(8, 28).corners(4, 4).position(-28, 0)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE))
            .add(new svg.Path(-33, -4).line(-50, -3).bezier(-60, 0, -50, 3)
                .line(-33, 4).line(-33, -4)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE))
            .add(new svg.Circle(4).position(-56, 0)
                .color(svg.LIGHT_ORANGE, 2, svg.ORANGE));
        return component;
    }

    function fadedSword() {
        let component = new svg.Translation()
            .add(new svg.Path(-25, -5)
                .line(40, -5).bezier(50, -5, 60, 0)
                .bezier(50, 5, 40, 5).line(-25, 5).line(-25, -5)
                .color(svg.LIGHT_GREY, 2, svg.GREY))
            .add(new svg.Rect(8, 28).corners(4, 4).position(-28, 0)
                .color(svg.LIGHT_GREY, 2, svg.GREY))
            .add(new svg.Path(-33, -4).line(-50, -3).bezier(-60, 0, -50, 3)
                .line(-33, 4).line(-33, -4)
                .color(svg.LIGHT_GREY, 2, svg.GREY))
            .add(new svg.Circle(4).position(-56, 0)
                .color(svg.LIGHT_GREY, 2, svg.GREY));
        return component;
    }

    function fight() {
        let component = new svg.Translation()
            .add(new svg.Rotation(-45).add(sword()))
            .add(new svg.Rotation(-135).add(sword()));
        return component;
    }

    function fadedFight() {
        let component = new svg.Translation()
            .add(new svg.Rotation(-45).add(fadedSword()))
            .add(new svg.Rotation(-135).add(fadedSword()));
        return component;
    }

    const FIGHT_MARGIN_X = 50;
    const FIGHT_MARGIN_Y = 50;

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
        command.move(-frameWidth/2 +FIGHT_MARGIN_X, -frameHeight/2 +FIGHT_MARGIN_Y);
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
        new Impulse(map, manipulator, command, rule, friendPlayer, foePlayer).play();
        Memento.enable();
        Memento.clear();
    }

    class UnitManipulator {

        constructor() {
            this.eliminated = [];
        }

        context(map, impulse, command, rule) {
            this.owningMap = map;
            this.impulse = impulse;
            this.command = command;
            this.rule = rule;
        }

        memorize() {
            return {
                eliminated : Memento.registerArray(this.eliminated)
            }
        }

        revert(memento) {
            Memento.revertArray(memento.eliminated, this.eliminated);
        }

        prepareMoves() {
            this.startMoves = new Map();
            this.owningMap.forEachUnit(unit=>this.startMoves.set(unit, unit.hex));
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
            let process = (hex, movementFactor)=> {
                if (hex && (!zone.has(hex) || zone.get(hex)<movementFactor)) {
                    zone.set(hex, movementFactor);
                    //console.log(hex.x+" "+hex.y);
                    for (let dir of ["ne", "e", "se", "sw", "w", "nw"]) {
                        let move = this.rule.movement(this.owningMap, unit, startHex, movementFactor, hex, dir);
                        if (move.auth) {
                            process(hex[dir], move.ma);
                        }
                    }
                }
            };

            let zone = new Map();
            let startHex = this.startMoves.get(unit);
            process(startHex, unit.movementFactor());
            return zone;
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
            if (this.rule.getFight(this.owningMap)) {
                if (this.command.status===HIDDEN) {
                    this.command.show();
                }
            }
            else {
                if (this.command.status!==HIDDEN) {
                    this.command.hide();
                }
            }
        }

        enableDnDForMove(player) {
            player.teams.forEach(team=>{
                this.owningMap.forEachUnit(unit=>{
                    if (unit.type===team.unit.type) {
                        this.enableDnDForMoveOnAUnit(unit);
                    }
                });
            });
        }

        enableDnDForMoveOnAUnit(unit) {

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

            hexM.installDnDOnHexes(unit, frame, {
                select:(unit, rotate)=>{
                    if (!rotate) {
                        showMoveZone();
                    }
                    return true;
                },
                rotated:unit=> {
                    unit.rotate(Math.round(unit.angle / 30) * 30);
                    return true;
                },
                dropped:(hex, unit, x, y)=> {
                    let zone = this.getMoveZone(unit);
                    if (zone.has(hex)) {
                        hex.putUnit(unit.move(0, 0));
                        this.owningMap.unselectAll();
                        this.owningMap.unhighlightAll();
                        this.proposeFighting();
                        hideMoveZone();
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                moved:(unit, x, y)=> {
                    unit.move(0, 0);
                    hideMoveZone();
                    return true;
                },
                clicked:unit=> {
                    hideMoveZone();
                    if (unit.selected) {
                        this.rule.friendSelected(this.owningMap, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        if (this.startMoves.get(unit)===unit.hex) {
                            this.rule.friendSelected(this.owningMap, unit, true);
                            this.proposeFighting();
                        }
                    }
                    this.putUnitOnTop(unit);
                    return true;
                },
                removed:unit=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            });
/*
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
                        this.owningMap.unselectAll();
                        this.owningMap.unhighlightAll();
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
                        this.rule.friendSelected(this.owningMap, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        if (this.startMoves.get(unit)===unit.hex) {
                            this.rule.friendSelected(this.owningMap, unit, true);
                            this.proposeFighting();
                        }
                    }
                    this.putUnitOnTop(unit);
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
            */
        }

        enableClickableForCombat(player) {
            player.teams.forEach(team=>{
                this.owningMap.forEachUnit(unit=>{
                    if (unit.type===team.unit.type) {
                        this.enableClickableForCombatOnAUnit(unit);
                    }
                });
            });
        }

        enableClickableForCombatOnAUnit(unit) {

            hexM.installClickableOnHexes(unit,
                (unit)=> {
                    if (unit.selected) {
                        this.rule.friendSelected(this.owningMap, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        if (this.startMoves.get(unit)===unit.hex) {
                            this.rule.friendSelected(this.owningMap, unit, true);
                            this.proposeFighting();
                        }
                    }
                    this.putUnitOnTop(unit);
                    return true;
                }
            );
        }

        enableClickableForTarget(player) {
            player.teams.forEach(team=>{
                this.owningMap.forEachUnit(unit=>{
                    if (unit.type===team.unit.type) {
                        this.enableClickableForTargetOnOneUnit(unit);
                    }
                });
            });
        }

        enableClickableForTargetOnOneUnit(unit, hexes) {
            hexM.installClickableOnHexes(unit,
                (unit)=> {
                    if (unit.selected) {
                        this.rule.foeSelected(this.owningMap, unit, false);
                        this.proposeFighting();
                    }
                    else {
                        this.rule.foeSelected(this.owningMap, unit, true);
                        this.proposeFighting();
                    }
                    this.putUnitOnTop(unit);
                    return true;
                }
            );
        }

        enableDnDOnEliminatedBox(unit) {

            hexM.installDnDOnBox(unit, frame, map.eliminatedBox, {
                moved: (unit, x, y)=> {
                    this.owningMap.eliminatedBox.removeUnit(unit);
                    if (x < -this.owningMap.eliminatedBox.width / 2 + unit.width / 2) {
                        x = -this.owningMap.eliminatedBox.width / 2 + unit.width / 2;
                    }
                    if (x > this.owningMap.eliminatedBox.width / 2 - unit.width / 2) {
                        x = this.owningMap.eliminatedBox.width / 2 - unit.width / 2;
                    }
                    if (y < -this.owningMap.eliminatedBox.height / 3 + unit.height / 2) {
                        y = -this.owningMap.eliminatedBox.height / 3 + unit.height / 2;
                    }
                    if (y > this.owningMap.eliminatedBox.height / 2 - unit.height / 2) {
                        y = this.owningMap.eliminatedBox.height / 2 - unit.height / 2;
                    }
                    unit.component.smoothy(param.speed, param.step).moveTo(x, y);
                    svg.animate(param.speed, ()=>unit.move(x, y));
                    this.owningMap.eliminatedBox.addUnit(unit);
                    return true;
                },
                clicked: unit=> {
                    this.owningMap.eliminatedBox.removeUnit(unit);
                    this.owningMap.eliminatedBox.addUnit(unit);
                    return true;
                }
            });
/*
            hexM.installDnDOnBox(unit, frame, map.eliminatedBox,
                (unit)=> {
                    return true;
                },
                (unit, x, y)=> {
                    this.owningMap.eliminatedBox.removeUnit(unit);
                    if (x<-this.owningMap.eliminatedBox.width/2+unit.width/2) {
                        x=-this.owningMap.eliminatedBox.width/2+unit.width/2;
                    }
                    if (x>this.owningMap.eliminatedBox.width/2-unit.width/2) {
                        x=this.owningMap.eliminatedBox.width/2-unit.width/2;
                    }
                    if (y<-this.owningMap.eliminatedBox.height/3+unit.height/2) {
                        y=-this.owningMap.eliminatedBox.height/3+unit.height/2;
                    }
                    if (y>this.owningMap.eliminatedBox.height/2-unit.height/2) {
                        y=this.owningMap.eliminatedBox.height/2-unit.height/2;
                    }
                    unit.component.smoothy(param.speed, param.step).moveTo(x, y);
                    svg.animate(param.speed, ()=>unit.move(x, y));
                    this.owningMap.eliminatedBox.addUnit(unit);
                    return true;
                },
                (unit)=> {
                    this.owningMap.eliminatedBox.removeUnit(unit);
                    this.owningMap.eliminatedBox.addUnit(unit);
                    return true;
                }
            );
            */
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

            hexM.installDnDOnHexes(unit, frame, {
                    select: (unit, rotate)=> {
                        if (!rotate) {
                            showAdvanceZone();
                        }
                        return true;
                    },
                    rotated: unit=> {
                        unit.rotate(Math.round(unit.angle / 30) * 30);
                        return true;
                    },
                    dropped: (hex, unit, x, y)=> {
                        let zone = this.getAdvanceZone(unit, units, [unitHex, ...hexes]);
                        if (zone.has(hex)) {
                            hex.putUnit(unit.move(0, 0));
                            hideAdvanceZone();
                            return true;
                        }
                        else {
                            return false;
                        }
                    },
                    moved: (unit, x, y)=> {
                        unit.move(0, 0);
                        hideAdvanceZone();
                        return true;
                    },
                    clicked: unit=> {
                        hideAdvanceZone();
                        this.putUnitOnTop(unit);
                        return true;
                    },
                    removed: unit=> {
                        unit.hex.removeUnit(unit);
                        return true;
                    }
                }
            );
/*
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
            */
        }

        enableDnDForRetreatOrDie(unit, units, range, continued) {

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

            hexM.installDnDOnHexes(unit, frame, {
                select: (unit, rotate)=> {
                    if (!rotate) {
                        showRetreatZone();
                    }
                    return !rotate;
                },
                rotated: unit=> {
                    return false;
                },
                dropped: (hex, unit, x, y)=> {
                    let zone = this.getRetreatZone(unit, units, range);
                    if (zone.has(hex)) {
                        hex.putUnit(unit.move(0, 0));
                        hideRetreatZone();
                        continued();
                        return true;
                    }
                    else {
                        if (!zone.size) { // No retreat => Die !
                            this.eliminate(unit, hex.component.globalPoint(x, y));
                            continued();
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                },
                moved: (unit, x, y)=> {
                    unit.move(0, 0);
                    hideRetreatZone();
                    return true;
                },
                clicked: unit=> {
                    hideRetreatZone();
                    this.putUnitOnTop(unit);
                    return true;
                },
                removed: unit=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            });

/*
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
                        if (!zone.size) { // No retreat => Die !
                            this.eliminate(unit, hex.component.globalPoint(x, y));
                            continued();
                            return true;
                        }
                        else {
                            return false;
                        }
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
            */
            return this;
        }

        enableDnDForLosses(unit, strength, continued) {
            this.eliminated.clear();
            hexM.installDnDOnHexes(unit, frame, {
                rotated:()=>false,
                dropped:(hex, unit, x, y)=> {
                    Memento.register(this);
                    this.eliminate(unit, hex.component.globalPoint(x, y));
                    this.eliminated.add(unit);
                    if (this.command.totalStrength(this.eliminated)>=strength) {
                        continued();
                    }
                    return true;
                },
                moved:(unit, x, y)=> {
                    unit.move(0, 0);
                    return true;
                },
                clicked:unit=> {
                    this.putUnitOnTop(unit);
                    return true;
                },
                removed:unit=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            });
            /*
            hexM.installDnDOnHexes(unit, frame,
                (unit, rotate)=> {
                    return true;
                },
                (unit, angle)=> {
                    return false;
                },
                (hex, unit, x, y)=> {
                    Memento.register(this);
                    this.eliminate(unit, hex.component.globalPoint(x, y));
                    this.eliminated.add(unit);
                    if (this.command.totalStrength(this.eliminated)>=strength) {
                        continued();
                    }
                    return true;
                },
                (unit, x, y)=> {
                    unit.move(0, 0);
                    return true;
                },
                (unit)=> {
                    this.putUnitOnTop(unit);
                    return true;
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
            */
            return this;
        }

        disableForPlayer(player) {
            player.teams.forEach(team=>{
                this.disableForTeam(team);
            });
            return this;
        }

        disableForTeam(team) {
            this.owningMap.forEachUnit(unit=>{
                if (unit.type===team.unit.type) {
                    this.disable(unit);
                }
            });
            return this;
        }

        disable(unit) {
            unit.removeEvent('mousedown');
            return this;
        }

        eliminate(unit, global) {
            if (!global) {
                global = unit.component.parent.globalPoint(unit.x, unit.y);
                unit.hex.removeUnit(unit);
            }
            let local = this.owningMap.eliminatedBox.content.localPoint(global);
            this.enableDnDOnEliminatedBox(unit);
            this.owningMap.eliminatedBox.addUnit(unit.move(local.x, local.y));
            unit.component.smoothy(param.speed, param.step).moveTo(0, 0);
            unit.rotation.smoothy(param.speed, param.step).rotateTo(0);
            svg.animate(param.speed, ()=>unit.move(0, 0));
            return this;
        }
    }

    const DIE_MARGIN_X = -30;
    const DIE_MARGIN_Y = 50;
    const NEXT_MARGIN_X = -30;
    const NEXT_MARGIN_Y = -40;
    const FIGHT_MARGIN = 80;

    const SHOWN = "shown";
    const HIDDEN = "hidden";
    const ACTIVE = "active";
    const INACTIVE = "inactive";

    class Command {

        constructor() {
            this.status = HIDDEN;
            this.active = fight().opacity(1);
            this.passive = fadedFight().opacity(0);
            this.scale = new svg.Scaling(1);
            this.rotate = new svg.Rotation(0);
            this.die = new gItems.Die(param);
            this.next = new gItems.Next(()=>{
                this.nextImpulse();
            });
            this.fight = new svg.Translation()
                .add(this.rotate.add(this.scale.add(this.active).add(this.passive)))
                .add(this.die.component)
                .move(0, FIGHT_MARGIN).opacity(0);
            this.action = ()=>this.resolveFight();
            this.fight.onClick(this.action);
            this.die.component.move(DIE_MARGIN_X, DIE_MARGIN_Y);
            this.next.component.move(NEXT_MARGIN_X, NEXT_MARGIN_Y);
            this.component = new svg.Translation()
                .add(this.next.component).add(this.fight);
            this.visible = false;
        }

        context(map, impulse, manipulator, rule, friendPlayer, foePlayer) {
            this.owningMap = map;
            this.impulse = impulse;
            this.manipulator = manipulator;
            this.rule = rule;
            this.friendPlayer = friendPlayer;
            this.foePlayer = foePlayer;
        }

        memorize() {
            return {
                visible : this.visible,
                action : this.action,
                status : this.status
            }
        }

        revert(memento) {
            ({visible:this.visible, action:this.action, status:this.status} = memento);
            this.fight.onClick(this.action);
            if (this.status===SHOWN) {
                this.show();
            }
            else if (this.status===HIDDEN) {
                this.hide();
            }
            else if (this.status===ACTIVE) {
                this.activate(this.action);
            }
            else if (this.status===INACTIVE) {
                this.desactivate(()=>{});
            }
        }

        move(x, y) {
            this.component.move(x, y);
            return this;
        }

        show() {
            Memento.register(this);
            this.status = SHOWN;
            this.rotate.rotate(0);
            this.fight.opacity(0);
            this.active.opacity(1);
            this.passive.opacity(0);
            this.die.component.opacity(1);
            this.fight.smoothy(param.speed, 0.01).opacity(0, 1);
            this.action = ()=>this.resolveFight();
            this.fight.onClick(this.action);
            this.visible = true;
            return this;
        }

        hide() {
            Memento.register(this);
            this.status = HIDDEN;
            this.fight.smoothy(param.speed, 0.01).opacity(1, 0);
            this.visible = false;
            return this;
        }

        activate(callback) {
            Memento.register(this);
            this.status = ACTIVE;
            this.passive.onChannel().smoothy(param.speed, 0.01).opacity(1, 0);
            this.active.smoothy(param.speed, 0.01).opacity(0, 1);
            this.action = callback;
            this.fight.onClick(this.action);
        }

        desactivate(callback) {
            Memento.register(this);
            this.status = INACTIVE;
            this.passive.onChannel().smoothy(param.speed, 0.01).opacity(0, 1);
            this.active.smoothy(param.speed, 0.01).opacity(1, 0);
            this.action = null;
            this.fight.onClick(this.action);
            callback();
        }

        turn() {
            Memento.register(this);
            this.status = INACTIVE;
            this.die.component.onChannel().smoothy(param.speed, 0.01).opacity(1, 0);
            this.passive.onChannel().smoothy(param.speed, 0.01).opacity(0, 1);
            this.rotate.onChannel().smoothy(param.speed, 2).rotate(0, 180);
            this.active.smoothy(param.speed, 0.01).opacity(1, 0);
        }

        resolveFight() {
            this.action = null;
            this.fight.onClick(this.action);
            Memento.clear();
            Memento.disable();
            this.manipulator.disableForPlayer(this.friendPlayer);
            this.manipulator.disableForPlayer(this.foePlayer);
            this.scale.steppy(param.speed, 20).scale(1, 1.2).scale(1.2, 1);
            this.die.roll();
            svg.animate(param.speed, ()=>{
                let dieValue = this.die.value;
                let result = this.rule.resolveFight(this.owningMap, this.friendPlayer, dieValue);
                new CRTPopin(result, dieValue).show(drawing);
            });
        }

        processResult(result) {
            console.log("fight:"+result.ratio+" "+result.result);
            let friends = this.rule.friendsFighting(this.owningMap, this.friendPlayer);
            let foes = this.rule.foesFighting(this.owningMap, this.friendPlayer);
            this.owningMap.unselectAll();
            this.owningMap.unhighlightAll();
            this.turn();
            if (result.result==="AE") {
                this.eliminate(friends);
                this.closeFight();
            }
            else if (result.result==="DE") {
                let hexes = this.collectHexes(foes);
                this.eliminate(foes);
                this.advance(friends, [], hexes);
            }
            else if (result.result==="EX") {
                let strength = this.totalStrength(foes);
                let hexes = this.collectHexes(foes);
                this.eliminate(foes);
                this.chooseLosses(friends, strength,
                    ()=>this.proposeAdvanceAfterLosses(friends,
                        ()=>this.advance(friends, this.manipulator.eliminated, hexes)));
            }
            else if (result.result==="AR") {
                this.retreat(friends, 1,
                    ()=>this.proposeEndOfFight());
            }
            else if (result.result==="DR") {
                let hexes = this.collectHexes(foes);
                this.retreat(foes, 1,
                    ()=>this.giveHand(
                        ()=>this.advance(friends, [], hexes)));
            }
        }

        collectHexes(units) {
            let hexes=[];
            units.forEach(unit=>hexes.add(unit.hex));
            return hexes;
        }

        totalStrength(units) {
            let strength = 0;
            units.forEach(unit=>strength+=unit.combatFactor());
            return strength;
        }

        proposeEndOfFight() {
            this.activate(()=>this.closeFight());
        }

        giveHand(callback) {
            this.activate(()=>{
                this.desactivate(callback);
            });
        }

        proposeAdvanceAfterLosses(units, callback) {
            this.activate(()=>{
                this.desactivate(callback);
            });
        }

        allUnitsHaveMovedOrDied(units) {
            let result = true;
            units.forEach(unit=>{
                if (unit.hex && this.manipulator.startMoves.get(unit)===unit.hex) {
                    result = false;
                }
            });
            return result;
        }

        closeFight() {
            svg.animate(param.speed, ()=>{
                this.owningMap.unselectAll();
                this.owningMap.unhighlightAll();
                this.hide();
                Memento.enable();
                Memento.clear();
                this.manipulator.enableClickableForCombat(this.friendPlayer);
                this.manipulator.enableClickableForTarget(this.foePlayer);
            });
        }

        eliminate(units) {
            units.forEach(unit=>this.manipulator.eliminate(unit));
        }

        advance(units, discard, hexes) {
            svg.animate(param.speed, ()=>{
                units.forEach(unit=>{
                    if (!discard.contains(unit)) {
                        this.owningMap.highlight(unit);
                        this.manipulator.enableDnDForAdvance(unit, units, hexes);
                    }
                });
                this.proposeEndOfFight();
                Memento.enable();
            });
        }

        retreat(units, range, continued) {
            units.forEach(unit=>{
                if (!this.manipulator.getRetreatZone(unit, units, range).size) {
                    this.manipulator.eliminate(unit);
                }
                else {
                    this.owningMap.select(unit, false);
                    this.manipulator.enableDnDForRetreatOrDie(unit, units, range, ()=> {
                        if (this.allUnitsHaveMovedOrDied(units)) {
                            continued();
                        }
                    });
                }
                continued();
            });
            Memento.enable();
        }

        chooseLosses(units, strength, continued) {
            units.forEach(unit=>{
                this.owningMap.select(unit, false);
                this.manipulator.enableDnDForLosses(unit, strength, ()=> {
                    continued();
                });
            });
            Memento.enable();
        }

        nextImpulse() {
            console.log("end of impulse !");
        }

    }

    class Impulse {

        constructor(map, manipulator, command, rule, friendPlayer, foePlayer) {
            this.owningMap = map;
            this.manipulator = manipulator;
            this.command = command;
            this.rule = rule;
            this.friendPlayer = friendPlayer;
            this.foePlayer = foePlayer;

            this.manipulator.context(map, this, command, rule);
            this.command.context(map, this, manipulator, rule, friendPlayer, foePlayer);
        }

        play() {
            this.manipulator.enableDnDForMove(this.friendPlayer);
            this.manipulator.enableClickableForTarget(this.foePlayer);
            this.manipulator.prepareMoves();
        }

        close() {
            console.log("close");
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
                command.processResult(result);
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
    var command = new Command();
    var frame = new gui.Frame(600, 1000).backgroundColor(MAP_COLOR);
    frame.component.add(command.component);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        .add(menu.component);
    var manipulator = new UnitManipulator();

    svg.runtime.addGlobalEvent("resize", event=>resizeAll());
    resizeAll();

    Memento.begin();
    return drawing;
};