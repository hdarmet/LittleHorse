/**
 * Created by HDA3014 on 24/01/2016.
 */

var Gui = require("../svggui.js").Gui;
var FileManager = require("../filemanager.js").FileManager;
var UML = require("./UML.js").UML;
var Memento = require("../memento").Memento;
var Generator = require("../generator").Generator;

exports.modelEditor = function(svg) {

    var gui = Gui(svg, {
        speed: 10,
        step: 10
    });

    var fileManager = FileManager(svg, gui);

    var Uml = UML(svg, gui);

    var generator = Generator(svg, gui, "/model/edit");

    let currentMode;

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

    class SelectSupport extends Support {

        constructor(pane) {
            super(pane);
            this.action(()=> {
                if (schema) {
                    currentMode = "NODE";
                    schema.nodeMode();
                }
                this.pane.palette.clickAction = null;
                this.pane.palette.mouseDownAction = null;
            });
        }

        buildIcon() {
            return new svg.Translation().add(new svg.Rotation(45)
                .add(new svg.Path(0, -25)
                    .line(-15, 5).line(-5, 0).line(-7, 25)
                    .line(7, 25).line(5, 0).line(15, 5)
                    .line(0, -25).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK)));
        }

        buildSelectedBorder(clazz) {
            return new svg.Rect(82, 82).color([], 4, svg.ALMOST_RED);
        }

    }

    class SimpleSupport {

        constructor(pane, ...args) {
            this.pane = pane;
            this.component = this.buildIcon();
            this.tool = new gui.Tool(this.component);
            this.pane.addTool(this.tool);
            this.tool.component.onClick(()=> {
                this.tool.callback(...args);
            });
        }

        action(callback) {
            this.tool.setCallback(callback);
            return this;
        }

    }

    class GenerateSupport extends SimpleSupport {

        constructor(pane, generator) {
            super(pane);
            this.action(()=>{
                let gen = new generator();
                schema.clearInfos();
                gen.generate(
                    new Uml.SchemaBuilder().spec(schema),
                    result=>{
                        //gen.save(paneSaveLoad.fileName, result);
                        //let text = JSON.stringify(result);
                        new ShowGenerationPopin(result).show(drawing);
                    },
                    errors=>{
                        let text = "";
                        errors.forEach(error=>{
                            text=text+error.toString()+"\n\n";
                            let item = schema.itemFromId(error.ref.id);
                            let location = item.location();
                            let info = new Uml.Info(item, location.x, location.y,
                                error.toString(), [svg.LIGHT_PINK, 2, svg.RED]);
                            schema.putInfo(info);
                            Uml.installDnD(info, frame, {
                                moved: (info, x, y)=> {
                                    info.move(x, y);
                                    return true;
                                }
                            }
                                /*
                                (info, x, y)=> {
                                    return {x, y};
                                },
                                (info)=> {
                                    return true;
                                },
                                (info, x, y)=> {
                                    info.move(x, y);
                                    return true;
                                },
                                (info)=> {
                                    return true;
                                }*/
                            );
                        });
                        new ShowGenerationPopin(text).show(drawing);
                        Memento.begin();
                    }
                );
            });
        }

    }

    class GenerateJPASupport extends GenerateSupport {

        constructor(pane) {
            super(pane, generator.GeneratorJPA);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 80).color(svg.HORIZON, 4, svg.BLUE))
                .add(new svg.Text("JPA").position(0,10).font("arial", 32).color(svg.BLUE));
        }

    }

    class GenerateDAOSupport extends GenerateSupport {

        constructor(pane) {
            super(pane, generator.GeneratorDAO);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 80).color(svg.LIGHT_GREEN, 4, svg.DARK_GREEN))
                .add(new svg.Text("DAO").position(0,10).font("arial", 32).color(svg.DARK_GREEN));
        }

    }

    let schemaTooledForNodes = false;

    class NodeSupport extends Support {

        constructor(pane) {
            super(pane);
            if (!schemaTooledForNodes) {
                schemaTooledForNodes = true;
                let superPutNode = Uml.Schema.prototype.putNode;
                Uml.Schema.prototype.putNode = function (node) {
                    superPutNode.call(this, node);
                    NodeSupport.prototype.enableDnD(node);
                };
                let superRemoveNode = Uml.Schema.prototype.removeNode;
                Uml.Schema.prototype.removeNode = function (clazz) {
                    superRemoveNode.call(this, clazz);
                    NodeSupport.prototype.disableDnD(clazz);
                };
            }
            this.action(()=> {
                if (schema) {
                    currentMode = "NODE";
                    schema.nodeMode();
                }
                this.setAction((schema, x, y)=> {
                    let node = this.buildNode(x, y);
                    schema.putNode(node);
                    node.select(true);
                    node._draw();
                });
            });
        }

        setAction(action) {
            this.pane.palette.clickAction = ()=>{};
            this.pane.palette.mouseDownAction = action;
        }

        buildSelectedBorder(clazz) {
            return new svg.Rect(82, 82).color([], 4, svg.ALMOST_RED);
        }

        makeNodesDraggable(NodeConstructor) {
            let superSelect = NodeConstructor.prototype.select;
            NodeConstructor.prototype.select = function(beginDrag = false) {
                superSelect.call(this);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.ul);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.ur);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.dl);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.dr, beginDrag);
            };
            let superUnselect = NodeConstructor.prototype.unselect;
            NodeConstructor.prototype.unselect = function() {
                superUnselect.call(this);
                this.anchors.forEach((anchor, field)=>NodeSupport.prototype.disableAnchorDnD(anchor));
            };
        }

        enableDnD(node) {
            Uml.installDnD(node, frame, {
                select:(node)=> {
                    node.unselect();
                    return true;
                },
                moved:(node, x, y)=> {
                    node.move(x, y);
                    node.select();
                    return true;
                },
                clicked:(node)=> {
                    node.select();
                    return true;
                }
            }/*
                (node, x, y)=> {
                    return {x, y};
                },
                (node)=> {
                    node.unselect();
                    return true;
                },
                (node, x, y)=> {
                    node.move(x, y);
                    node.select();
                    return true;
                },
                (node)=> {
                    node.select();
                    return true;
                }*/
            );
        }

        disableDnD(node) {
            node.removeEvent('mousedown');
        }

        enableAnchorDnD(anchor, beginDrag) {
            if (beginDrag) {
                drawing.dragFocus(anchor.component);
            }
            Uml.installDnD(anchor, frame, {
                drag: (anchor, x, y)=> anchor.update(x, y),
                moved: (anchor, x, y)=> {
                    anchor.finalize(x, y);
                    return true;
                },
                startInDragMode: beginDrag
            });
            /*
                (anchor, x, y)=> { // drag
                    return anchor.update(x, y);
                },
                (anchor)=> { // select
                    return true;
                },
                (anchor, x, y)=> { // move
                    anchor.finalize(x, y);
                    return true;
                },
                (anchor)=> { //click
                    return true;
                },
                beginDrag
            );
            */
        }

        disableAnchorDnD(anchor) {
            anchor.removeEvent('mousedown');
        }
    }

    class ObjectOrientedNodeSupport extends NodeSupport {

        constructor(pane) {
            super(pane);
        }

        makeNodesDraggable(NodeConstructor) {
            let superSelect = NodeConstructor.prototype.select;
            NodeConstructor.prototype.select = function(beginDrag = false) {
                superSelect.call(this);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.ul);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.ur);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.dl);
                NodeSupport.prototype.enableAnchorDnD(this.anchors.dr, beginDrag);
                if (this.line.anchors.bottom) {
                    NodeSupport.prototype.enableAnchorDnD(this.line.anchors.bottom);
                }
            };
            let superUnselect = NodeConstructor.prototype.unselect;
            NodeConstructor.prototype.unselect = function() {
                superUnselect.call(this);
                this.anchors.forEach((anchor, field)=>NodeSupport.prototype.disableAnchorDnD(anchor));
                this.line.anchors.forEach((anchor, field)=>NodeSupport.prototype.disableAnchorDnD(anchor));
            };

        }
    }

    class ClassSupport extends ObjectOrientedNodeSupport {

        constructor(pane) {
            super(pane);
            this.makeNodesDraggable(Uml.Clazz);
        }

        buildNode(x, y) {
            return new Uml.Clazz(schema.idgen++, 70, 70, x-35, y-35, "ClassName", "field : type");
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 30).position(0, -25).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("class").font("arial", 16).color(svg.ALMOST_BLACK).position(0, -20))
                .add(new svg.Rect(80, 50).position(0, 15).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    class ClassWithBodyHiddenSupport extends ClassSupport {

        constructor(pane) {
            super(pane);
        }

        buildNode(x, y) {
            let clazz = new Uml.Clazz(schema.idgen++, 70, 70, x-35, y-35, "ClassName", "");
            clazz.hideBody();
            return clazz;
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("class").font("arial", 16).color(svg.ALMOST_BLACK).position(0, 4));
        }

    }

    class ObjectSupport extends ObjectOrientedNodeSupport {

        constructor(pane) {
            super(pane);
            this.makeNodesDraggable(Uml.Object);
        }

        buildNode(x, y) {
            return new Uml.Object(schema.idgen++, 70, 70, x-35, y-35, "object : Type", "property = value");
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 30).position(0, -25).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("object").font("arial", 16).color(svg.ALMOST_BLACK)
                    .position(0, -20).decoration("underline"))
                .add(new svg.Rect(80, 50).position(0, 15).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    class ObjectWithBodyHiddenSupport extends ObjectSupport {

        constructor(pane) {
            super(pane);
        }

        buildNode(x, y) {
            let object = new Uml.Object(schema.idgen++, 70, 70, x-35, y-35, "object : Type", "");
            object.hideBody();
            return object;
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("object").font("arial", 16).color(svg.ALMOST_BLACK)
                    .position(0, 4).decoration("underline"));
        }

    }

    class CommentSupport extends NodeSupport {

        constructor(pane) {
            super(pane);
            this.makeNodesDraggable(Uml.Comment);
        }

        buildNode(x, y) {
            return new Uml.Comment(schema.idgen++, 70, 70, x-35, y-35, "Comment here...");
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Path(-40, -40)
                    .line(20, -40).line(40, -20)
                    .line(40, 40).line(-40, 40)
                    .line(-40, -40)
                    .color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Path(20, -40).line(40, -20)
                    .line(20, -20).line(20, -40)
                    .color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("comment").font("arial", 16).color(svg.ALMOST_BLACK).position(0, 4))
        }

    }

    class UseCaseSupport extends NodeSupport {

        constructor(pane) {
            super(pane);
            this.makeNodesDraggable(Uml.UseCase);
        }

        buildNode(x, y) {
            return new Uml.UseCase(schema.idgen++, 100, 60, x-50, y-30, "Use Case");
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Ellipse(40, 25)
                    .color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("use case").font("arial", 16).color(svg.ALMOST_BLACK).position(0, 4))
        }

    }

    class AbstractUseCaseSupport extends NodeSupport {

        constructor(pane) {
            super(pane);
            this.makeNodesDraggable(Uml.AbstractUseCase);
        }

        buildNode(x, y) {
            return new Uml.AbstractUseCase(schema.idgen++, 100, 60, x-50, y-30, "Use Case");
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Ellipse(40, 25).dash("3,2,3,2")
                    .color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Text("use case").font("arial", 16).color(svg.ALMOST_BLACK).position(0, 4))
        }

    }

    class IconicSupport extends NodeSupport {

        constructor(pane, NodeConstructor) {
            super(pane);
            this.nodeConstructor = NodeConstructor;
            this.makeNodesDraggable(this.nodeConstructor);
        }

        setAction(action) {
            this.pane.palette.clickAction = action;
            this.pane.palette.mouseDownAction = ()=>{};
        }

        buildNode(x, y) {
            return new this.nodeConstructor(schema.idgen++, x, y);
        }

        makeNodesDraggable(NodeConstructor) {
            let superSelect = NodeConstructor.prototype.select;
            NodeConstructor.prototype.select = function() {
                superSelect.call(this);
                if (this.line.anchors.bottom) {
                    NodeSupport.prototype.enableAnchorDnD(this.line.anchors.bottom);
                }
            };
            let superUnselect = NodeConstructor.prototype.unselect;
            NodeConstructor.prototype.unselect = function() {
                superUnselect.call(this);
                this.line.anchors.forEach((anchor, field)=>NodeSupport.prototype.disableAnchorDnD(anchor));
            };

        }

    }

    class HumanSupport extends IconicSupport {

        constructor(pane) {
            super(pane, Uml.Human);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Circle(10).position(0, -25).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, -15, 0, 15).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, 15, -20, 35).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, 15, 20, 35).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(-25, 0, 25, 0).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    class ControllerSupport extends IconicSupport {

        constructor(pane) {
            super(pane, Uml.Controller);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Circle(30).position(0, 5).opacity(0.1))
                .add(new svg.Circle(30).position(0, 5).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, -25, 10, -35).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, -25, 10, -15).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    class EntitySupport extends IconicSupport {

        constructor(pane) {
            super(pane, Uml.Entity);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Circle(25).position(0, -5).opacity(0.1))
                .add(new svg.Circle(25).position(0, -5).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(0, 20, 0, 35).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(-25, 35, 25, 35).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    class InterfaceSupport extends IconicSupport {

        constructor(pane) {
            super(pane, Uml.Interface);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Circle(25).position(5, 0).opacity(0.1))
                .add(new svg.Circle(25).position(5, 0).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(-20, 0, -35, 0).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Line(-35, -25, -35, 25).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK));
        }

    }

    let schemaTooledForLinks = false;

    class LinkSupport extends Support {

        constructor(pane, linkType) {
            super(pane);
            if (!schemaTooledForLinks) {
                schemaTooledForLinks = true;
                let superPutLink = Uml.Schema.prototype.putLink;
                Uml.Schema.prototype.putLink = function (link) {
                    superPutLink.call(this, link);
                    LinkSupport.prototype.enableClick(link);
                };
                let superRemoveLink = Uml.Schema.prototype.removeLink;
                Uml.Schema.prototype.removeLink = function (link) {
                    superRemoveLink.call(this, link);
                    LinkSupport.prototype.disableClick(link);
                };
            }
            this.action(()=> {
                if (schema) {
                    currentMode = "LINK";
                    schema.linkMode();
                }
                this.pane.palette.clickAction = null;
                this.pane.palette.mouseDownAction = (schema, x, y)=> {
                    let startClazz = schema.nodeFromPosition(x, y);
                    if (startClazz && startClazz.accept(linkType)) {
                        let link = this.buildLink(schema.idgen++, startClazz, x, y);
                        schema.putLink(link);
                        link.select(true);
                    }
                };
            });
        }

        buildSelectedBorder(link) {
            return new svg.Rect(82, 82).color([], 4, svg.ALMOST_RED);
        }

        enableClick(link) {
            Uml.installClick(link,
                ()=> {
                    link.select();
                    return true;
                }
            );
        }

        disableClick(link) {
            link.removeEvent('mousedown');
        }

        enableAnchorDnD(anchor, beginDrag) {
            if (beginDrag) {
                drawing.dragFocus(anchor.component);
            }
            Uml.installDnD(anchor, frame, {
                    drag: (anchor, x, y)=> anchor.update(x, y),
                    moved: (anchor, x, y)=> anchor.finalize(x, y),
                    clicked: ()=>false,
                    startInDragMode: beginDrag
            }
                /*
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
                */
            );
        }

        disableAnchorDnD(anchor) {
            anchor.removeEvent('mousedown');
        }

        prepareSelection(Constructor) {
            let superSelect = Constructor.prototype.select;
            Constructor.prototype.select = function (beginDrag = false) {
                superSelect.call(this);
                LinkSupport.prototype.enableAnchorDnD(this.anchors.p1, false);
                LinkSupport.prototype.enableAnchorDnD(this.anchors.p2, beginDrag);
                LinkSupport.prototype.enableAnchorDnD(this.label.anchor, false);
            };
            let superUnselect = Constructor.prototype.unselect;
            Constructor.prototype.unselect = function () {
                superUnselect.call(this);
                this.anchors.forEach((field, anchor)=>LinkSupport.prototype.disableAnchorDnD(anchor));
            };
        }

    }

    class RelationshipSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Relationship);
            let superSelect = Uml.Relationship.prototype.select;
            this.prepareSelection(Uml.Relationship);
        }

        prepareSelection(Constructor) {
            let superSelect = Constructor.prototype.select;
            Constructor.prototype.select = function (beginDrag = false) {
                superSelect.call(this);
                LinkSupport.prototype.enableAnchorDnD(this.anchors.p1, false);
                LinkSupport.prototype.enableAnchorDnD(this.anchors.p2, beginDrag);
                LinkSupport.prototype.enableAnchorDnD(this.label.anchor, false);
                LinkSupport.prototype.enableAnchorDnD(this.beginCardinality.anchor, false);
                LinkSupport.prototype.enableAnchorDnD(this.endCardinality.anchor, false);
            };
            let superUnselect = Constructor.prototype.unselect;
            Constructor.prototype.unselect = function () {
                superUnselect.call(this);
                this.anchors.forEach((field, anchor)=>LinkSupport.prototype.disableAnchorDnD(anchor));
            };
        }

        buildLink(id, startClazz, x, y) {
            return new Uml.Relationship(id, startClazz, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 40, 40, -40).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Text("relation").font("arial", 16).color(svg.ALMOST_BLACK).position(0, 5))
                .add(new svg.Text("N").font("arial", 16).color(svg.ALMOST_BLACK).position(15, -25))
                .add(new svg.Text("M").font("arial", 16).color(svg.ALMOST_BLACK).position(-15, 40))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }
    }

    class InheritSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Inherit);
            this.prepareSelection(Uml.Inherit);
        }

        buildLink(id, startClazz, x, y) {
            return new Uml.Inherit(id, startClazz, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 40, 40, -40).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Path(40, -40).line(15, -30).line(30, -15).line(40, -40).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }

    }

    class RealizationSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Realization);
            this.prepareSelection(Uml.Realization);
        }

        buildLink(id, startClazz, x, y) {
            return new Uml.Realization(id, startClazz, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 40, 40, -40).color([], 4, svg.ALMOST_BLACK).dash("3,2,3,2"))
                .add(new svg.Path(40, -40).line(15, -30).line(30, -15).line(40, -40).color(svg.ALMOST_WHITE, 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }

    }

    class DependancySupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Dependancy);
            this.prepareSelection(Uml.Dependancy);
        }

        buildLink(id, startClazz, x, y) {
            return new Uml.Dependancy(id, startClazz, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 40, 40, -40).color([], 4, svg.ALMOST_BLACK).dash("3,2,3,2"))
                .add(new svg.Line(40, -40, 15, -30).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(40, -40, 30, -15).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }

    }

    class RequestSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Request);
            this.prepareSelection(Uml.Request);
        }

        buildLink(id, startLine, x, y) {
            return new Uml.Request(id, startLine, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 0, 40, 0).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Path(40, 0).line(20, -10).line(20, 10).line(40, 0).color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
        }

    }

    class AsyncRequestSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.AsyncRequest);
            this.prepareSelection(Uml.AsyncRequest);
        }

        buildLink(id, startLine, x, y) {
            return new Uml.AsyncRequest(id, startLine, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 0, 40, 0).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(40, 0, 20, -10).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(40, 0, 20, 10).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
        }

    }

    class ResponseSupport extends LinkSupport {

        constructor(pane) {
            super(pane, Uml.Response);
            this.prepareSelection(Uml.Response);
        }

        buildLink(id, startLine, x, y) {
            return new Uml.Response(id, startLine, x, y);
        }

        buildIcon() {
            return new svg.Translation()
                .add(new svg.Line(-40, 0, 40, 0).color([], 4, svg.ALMOST_BLACK).dash("3,2,3,2"))
                .add(new svg.Line(40, 0, 20, -10).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Line(40, 0, 20, 10).color([], 4, svg.ALMOST_BLACK))
                .add(new svg.Rect(80, 80).position(0, 0).color(svg.WHITE).opacity(0.001));
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

    class ShowGenerationPopin extends gui.Popin {

        constructor(text) {
            super(1000, 1000);
            this.panel = new gui.TextPanel(800, 800).font("courier", 20, 26).color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.title = new gui.Label(0, 0, "Generation Result").anchor('middle').font("arial", 40);
            this.add(this.title.position(0, -450));
            this.add(this.panel);
            this.panel.text(text);
            this.whenOk(()=>{this.close()});
        }

        show(...args) {
            super.show(...args);
            this.panel.refresh();
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
        schema._draw();
        Memento.enable();
        Memento.clear();
    }

    function createSchema() {
        Memento.disable();
        schema = new Uml.Schema(0, 3000, 6000);
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
            Memento.begin();
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
    var paneGenerators = new gui.Pane(PANE_COLORS, "Generators", 120);

    let SCHEMA_COLOR = [230, 230, 230];

    var frame = new gui.Frame(600, 1000).backgroundColor(SCHEMA_COLOR);
    var drawing = new gui.Canvas(1000, 1000)
        .add(frame.component)
        .key(46, deleteSelected)
        .key(8, deleteSelected);
    var palette = new gui.Palette(400, 1000)
        .addPane(paneSaveLoad)
        .addPane(paneItems)
        .addPane(paneGenerators);
    drawing.add(palette.component);

    new SelectSupport(paneItems);
    new ClassSupport(paneItems);
    new ClassWithBodyHiddenSupport(paneItems);
    new ObjectSupport(paneItems);
    new ObjectWithBodyHiddenSupport(paneItems);
    new CommentSupport(paneItems);
    new UseCaseSupport(paneItems);
    new AbstractUseCaseSupport(paneItems);
    new HumanSupport(paneItems);
    new ControllerSupport(paneItems);
    new EntitySupport(paneItems);
    new InterfaceSupport(paneItems);
    new RelationshipSupport(paneItems);
    new InheritSupport(paneItems);
    new RealizationSupport(paneItems);
    new DependancySupport(paneItems);
    new RequestSupport(paneItems);
    new AsyncRequestSupport(paneItems);
    new ResponseSupport(paneItems);

    new GenerateJPASupport(paneGenerators);
    new GenerateDAOSupport(paneGenerators);

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
        if (currentMode==="LINK") {
            schema.linkMode();
        }
        else {
            schema.nodeMode();
        }
    });

    Memento.begin();
    return drawing;
};
