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

    var gui = Gui(svg, {
        speed: 10,
        step: 10
    });
    var fileManager = FileManager(svg, gui);
    var hexM = Hex(svg);
    var gItems = GameItems(svg);
    var rules = Rules(hexM);

    let MAP_COLOR = [180, 240, 180];

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
        manipulator.enableDnDForPlayer(map.players[0]);
        manipulator.enableClickableForPlayer(map.players[1]);
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

        getMoveZone(unit) {
            let zone = this.getPrimaryMoveZone(unit);
            let nextUnit = unit.nextUnit;
            while(nextUnit) {
                let nextZone = this.getPrimaryMoveZone(nextUnit);
                zone.forEach((val, hex)=>{
                    if (!nextZone.has(hex)) {
                        zone.delete(hex);
                    }
                });
                nextUnit = nextUnit.nextUnit;
            }
            return zone;
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

        enableDnDForPlayer(player) {
            player.teams.forEach(team=>{
                manipulator.enableDnDForTeam(team);
            });
        }

        enableDnDForTeam(team) {
            map.forEachUnit(unit=>{
               if (unit.type===team.unit.type) {
                   this.enableDnD(unit);
               }
            });
        }

        enableDnD(unit) {

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

            hexM.installDnD(unit, frame,
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
                        //map.unselect(unit);
                    }
                    else {
                        rule.friendSelected(map, unit, true);
                        //map.select(unit);
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
                },
                (unit)=> {
                    unit.hex.removeUnit(unit);
                    return true;
                }
            );
        }

        enableClickableForPlayer(player) {
            player.teams.forEach(team=>{
                manipulator.enableClickableForTeam(team);
            });
        }

        enableClickableForTeam(team) {
            map.forEachUnit(unit=>{
                if (unit.type===team.unit.type) {
                    this.enableClickable(unit);
                }
            });
        }

        enableClickable(unit) {
            hexM.installClickable(unit,
                (unit)=> {
                    if (unit.selected) {
                        rule.foeSelected(map, unit, false);
                        //map.unselect(unit);
                    }
                    else {
                        rule.foeSelected(map, unit, true);
                        //map.select(unit);
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

    var channel = svg.onChannel();

    var paneSaveLoad = new fileManager.FilePane([[255, 230, 150], 4, svg.ALMOST_BLACK], "Save/load", 120, "/uscw/play")
        .newPopin(NewPlayPopin).editPopin(parameterIcon(), ParameterPopin)
        .resize(0)
        .titleAction(null);
    paneSaveLoad.handlers(saveGame, loadGame);

    var rule = new rules.SimpleRule();
    var map;
    var menu = new gItems.Exit(()=>{
        openPane();
    });
    var push = new gItems.Push(()=>{
        closePane();
    });
    var frame = new gui.Frame(600, 1000).backgroundColor(MAP_COLOR);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        .add(menu.component);
    var manipulator = new UnitManipulator();

    svg.runtime.addGlobalEvent("resize", event=>resizeAll());
    resizeAll();

    Memento.begin();
    return drawing;
};