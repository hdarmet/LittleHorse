/**
 * Created by HDA3014 on 24/01/2016.
 */

var Gui = require("../svggui.js").Gui;
var FileManager = require("../filemanager.js").FileManager;
var UML = require("./UML.js").UML;
var Memento = require("../memento").Memento;

exports.modelEditor = function(svg) {

    var gui = Gui(svg, {
        speed: 10,
        step: 10
    });

    var fileManager = FileManager(svg, gui);

    var Uml = UML(svg);

    class Support {

        constructor(pane, ...args) {
            this.pane = pane;
            this.component = this.buildIcon();
            this.selectedBorder = this.buildSelectedBorder();
            this.tool = new gui.Tool(this.component);
            this.pane.addTool(this.tool);
            if (this.register()) {
                this.select();
            }
            this.tool.component.onClick(()=> {
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

    class ClassSupport extends Support {

        constructor(pane) {
            super(pane)
            this.action(()=> {
                this.pane.palette.action = (schema, x, y)=> {
                    let clazz = new Uml.Clazz(150, 150, x, y);
                    schema.putClazz(clazz);
                    this.enableDnD(clazz);
                    //this.enableDnD(clazz);
                };
            });
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 20).position(0, -30).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 60).position(0, 10).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

        buildSelectedBorder(clazz) {
            return new svg.Rect(82, 82).color([], 4, svg.ALMOST_RED);
        }

        enableDnD(clazz) {
            Uml.installDnD(clazz, frame,
                (clazz)=> {
                    return true;
                },
                (clazz, x, y)=> {
                    clazz.move(x, y);
                    return true;
                },
                (clazz)=> {
                    return true;
                }
            );
        }

        disableDnD(clazz) {
            clazz.removeEvent('mousedown');
        }
    }

    class NewPopin extends gui.Popin {
        constructor() {
            super(1000, 700);
            Memento.disable();
            this.whenOk(function () {
                createSchema();
                Memento.enable();
                Memento.clear();
                Memento.begin();
                this.close();
            }).whenCancel(function () {
                Memento.enable();
            });
        }
    }

    class EditPopin extends gui.Popin {
        constructor() {
            super(1000, 700);
        }
    }

    function saveSchema() {
        return new Uml.SchemaBuilder().spec(schema);
    }

    function loadSchema(desc) {
        Memento.disable();
        schema = new Uml.SchemaBuilder().schema(desc);
        actionOnSchema(schema);
        frame.set(schema.component);
        Memento.enable();
        Memento.clear();
    }

    function createSchema() {
        Memento.disable();
        schema = new Uml.Schema(3000, 6000);
        actionOnSchema(schema);
        frame.set(schema.component);
        Memento.enable();
    }

    function actionOnSchema(schema) {
        schema.component.onClick(event=> {
            palette.action(schema, event.pageX, event.pageY);
            Memento.begin();
        });
        schema.clazzes.forEach(clazz=>ClassSupport.prototype.enableDnD(clazz));
    }

    function editIcon() {
        return new svg.Translation().add(new svg.Rect(80, 80).color(svg.LIGHT_BLUE, 1, svg.BLUE));
    }

    const PANE_COLORS = [[255, 230, 150], 4, [10, 10, 10]];
    var paneSaveLoad = new fileManager.FilePane(PANE_COLORS, "Save/load", 120, "/model/edit")
        .newPopin(NewPopin).editPopin(editIcon(), EditPopin);
    paneSaveLoad.handlers(saveSchema, loadSchema);

    var paneItems = new gui.Pane(PANE_COLORS, "Items", 120);

    let SCHEMA_COLOR = [230, 230, 230];

    var frame = new gui.Frame(600, 1000).backgroundColor(SCHEMA_COLOR);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        //.key(46, deleteSelected)
        //.key(8, deleteSelected)
        ;
    var palette = new gui.Palette(400, 1000)
        .addPane(paneSaveLoad)
        .addPane(paneItems);
    drawing.add(palette.component);

    new ClassSupport(paneItems);

    resizeAll();

    var schema;
    createSchema();

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

    Memento.finalize(()=>{
    });

    Memento.begin();
    return drawing;
};
