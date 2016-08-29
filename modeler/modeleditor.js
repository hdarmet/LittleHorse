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
            super(pane);
            let superPutClass = Uml.Schema.prototype.putNode;
            Uml.Schema.prototype.putNode = function(clazz) {
                superPutClass.call(this, clazz);
                ClassSupport.prototype.enableDnD(clazz);
            };
            let superRemoveClass = Uml.Schema.prototype.removeNode;
            Uml.Schema.prototype.removeNode = function(clazz) {
                superRemoveClass.call(this, clazz);
                ClassSupport.prototype.disableDnD(clazz);
            };
            let superSelect = Uml.Clazz.prototype.select;
            Uml.Clazz.prototype.select = function() {
                superSelect.call(this);
                this.anchors.forEach((field, anchor)=>ClassSupport.prototype.enableAnchorDnD(anchor));
            };
            let superUnselect = Uml.Clazz.prototype.unselect;
            Uml.Clazz.prototype.unselect = function() {
                superUnselect.call(this);
                this.anchors.forEach((field, anchor)=>ClassSupport.prototype.disableAnchorDnD(anchor));
            };
            this.action(()=> {
                if (schema) {
                    schema.nodeMode();
                }
                this.pane.palette.mouseDownAction = null;
                this.pane.palette.clickAction = (schema, x, y)=> {
                    let clazz = new Uml.Clazz(150, 150, x, y);
                    schema.putNode(clazz);
                    clazz.select();
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
                (clazz, x, y)=> {
                    clazz.move(x, y);
                    return {x, y};
                },
                (clazz)=> {
                    clazz.unselect();
                    return true;
                },
                (clazz, x, y)=> {
                    clazz.move(x, y);
                    clazz.select();
                    return true;
                },
                (clazz)=> {
                    clazz.select();
                    return true;
                }
            );
        }

        disableDnD(clazz) {
            clazz.removeEvent('mousedown');
        }

        enableAnchorDnD(anchor) {
            Uml.installDnD(anchor, frame,
                (anchor, x, y)=> {
                    return anchor.update(x, y);
                },
                (anchor)=> {
                    return true;
                },
                (anchor, x, y)=> {
                    anchor.move(x, y);
                    return true;
                },
                (anchor)=> {
                    return true;
                }
            );
        }

        disableAnchorDnD(anchor) {
            anchor.removeEvent('mousedown');
        }
    }

    class RelationshipSupport extends Support {

        constructor(pane) {
            super(pane);

            let superPutLink = Uml.Schema.prototype.putLink;
            Uml.Schema.prototype.putLink = function(relationship) {
                superPutLink.call(this, relationship);
                RelationshipSupport.prototype.enableClick(relationship);
            };
            let superRemoveLink = Uml.Schema.prototype.removeLink;
            Uml.Schema.prototype.removeLink = function(relationship) {
                superRemoveLink.call(this, relationship);
                RelationshipSupport.prototype.disableClick(relationship);
            };

            let superSelect = Uml.Relationship.prototype.select;
            Uml.Relationship.prototype.select = function(beginDrag=false) {
                superSelect.call(this);
                RelationshipSupport.prototype.enableAnchorDnD(this.anchors.p1, false);
                RelationshipSupport.prototype.enableAnchorDnD(this.anchors.p2, beginDrag);
            };
            let superUnselect = Uml.Relationship.prototype.unselect;
            Uml.Relationship.prototype.unselect = function() {
                superUnselect.call(this);
                this.anchors.forEach((field, anchor)=>RelationshipSupport.prototype.disableAnchorDnD(anchor));
            };
            this.action(()=> {
                if (schema) {
                    schema.linkMode();
                }
                this.pane.palette.clickAction = null;
                this.pane.palette.mouseDownAction = (schema, x, y)=> {
                    let startClazz = schema.getNode(x, y);
                    if (startClazz) {
                        let relationship = new Uml.Relationship(startClazz, x, y);
                        schema.putLink(relationship);
                        relationship.select(true);
                    }
                };
            });
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 40, 40, -40).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }

        buildSelectedBorder(clazz) {
            return new svg.Rect(82, 82).color([], 4, svg.ALMOST_RED);
        }

        enableClick(relationship) {
            Uml.installClick(relationship,
                ()=> {
                    relationship.select();
                    return true;
                }
            );
        }

        disableClick(relationship) {
            relationship.removeEvent('mousedown');
        }

        enableAnchorDnD(anchor, beginDrag) {
            if (beginDrag) {
                drawing.dragFocus(anchor.component);
            }
            Uml.installDnD(anchor, frame,
                (anchor, x, y)=> {
                    return anchor.update(x, y);
                },
                (anchor)=> {
                    return true;
                },
                (anchor, x, y)=> {
                    return anchor.finalize(x, y);
                },
                (anchor)=> {
                    return false;
                },
                beginDrag
            );
        }

        disableAnchorDnD(anchor) {
            anchor.removeEvent('mousedown');
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
            let point = schema.component.localPoint(event.pageX, event.pageY);
            palette.clickAction && palette.clickAction(schema, point.x, point.y);
            Memento.begin();
        });
        schema.component.onMouseDown(event=> {
            let point = schema.component.localPoint(event.pageX, event.pageY);
            palette.mouseDownAction && palette.mouseDownAction(schema, point.x, point.y);
        });
        schema.nodes.forEach(clazz=>ClassSupport.prototype.enableDnD(clazz));
    }

    function deleteSelected() {
        if (schema.selected) {
            Memento.register(schema);
            schema.selected.remove();
            schema.selected = null;
            Memento.begin();
        }
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
        .key(46, deleteSelected)
        .key(8, deleteSelected);
    var palette = new gui.Palette(400, 1000)
        .addPane(paneSaveLoad)
        .addPane(paneItems);
    drawing.add(palette.component);

    new ClassSupport(paneItems);
    new RelationshipSupport(paneItems);

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
