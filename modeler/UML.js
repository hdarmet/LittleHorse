/**
 * Created by HDA3014 on 22/08/2016.
 */
var Memento = require("../memento").Memento;

exports.UML = function(svg) {

    class Schema {
        constructor(width, height) {
            this.component = new svg.Translation();
            this.component.width = width;
            this.component.height = height;
            this.background = new svg.Rect(width, height).color(svg.ALMOST_WHITE).position(width/2, height/2);
            this.nodeSupport = new svg.Translation();
            this.linkSupport = new svg.Translation();
            this.anchorSupport = new svg.Translation();
            this.component
                .add(this.background)
                .add(this.nodeSupport)
                .add(this.linkSupport)
                .add(this.anchorSupport);
            this.nodes = [];
            this.links = [];
            this.selected = null;
        }

        linkMode() {
            Memento.register(this);
            if (this.selected) {
                this.selected.unselect();
            }
            this.nodeSupport.active(false);
        }

        getNode(x, y) {
            return this.nodes.find(clazz=>clazz.inside(x, y));
        }

        nodeMode() {
            Memento.register(this);
            if (this.selected) {
                this.selected.unselect();
            }
            this.nodeSupport.active(true);
        }

        putNode(node) {
            Memento.register(this);
            node.schema = this;
            this.nodes.push(node);
            this.nodeSupport.add(node.component);
            return this;
        }

        removeNode(node) {
            Memento.register(this);
            this.nodes.remove(node);
            this.nodeSupport.remove(node.component);
            return this;
        }

        putLink(link) {
            Memento.register(this);
            link.schema = this;
            this.links.push(link);
            this.linkSupport.add(link.component);
            return this;
        }

        removeLink(link) {
            Memento.register(this);
            this.links.remove(link);
            this.linkSupport.remove(link.component);
            return this;
        }

        putAnchors(...anchors) {
            Memento.register(this);
            anchors.forEach(anchor=>this.anchorSupport.add(anchor.component));
            return this;
        }

        removeAnchors(...anchors) {
            Memento.register(this);
            anchors.forEach(anchor=>this.anchorSupport.remove(anchor.component));
            return this;
        }

        select(selectable) {
            if (this.selected!=selectable) {
                Memento.register(this);
                if (this.selected) {
                    this.selected.unselect();
                }
                this.selected = selectable;
            }
        }

        unselect(selectable) {
            if (this.selected==selectable) {
                Memento.register(this);
                this.selected = null;
            }
        }

        memorize() {
            return {
                component : Memento.registerSVGTranslation(this.component),
                width : this.component.width,
                height : this.component.height,
                nodeSupport : Memento.registerSVGTranslation(this.nodeSupport),
                linkSupport : Memento.registerSVGTranslation(this.linkSupport),
                anchorSupport : Memento.registerSVGTranslation(this.anchorSupport),
                nodes : Memento.registerArray(this.nodes),
                links : Memento.registerArray(this.links),
                selected : this.selected
            }
        }

        revert(memento) {
            Memento.revertSVGTranslation(memento.component, this.component);
            this.width = memento.width;
            this.height = memento.height,
            Memento.revertSVGTranslation(memento.nodeSupport, this.nodeSupport);
            Memento.revertSVGTranslation(memento.linkSupport, this.linkSupport);
            Memento.revertSVGTranslation(memento.anchorSupport, this.anchorSupport);
            Memento.revertArray(memento.nodes, this.nodes);
            Memento.revertArray(memento.links, this.links);
            this.selected = memento.selected;
        }
    }

    const TITLE_HEIGHT = 50;
    const ANCHOR_SIZE = 10;

    class Item {

        constructor() {
            this.events = {};
        }

        addEvent(eventName, handler) {
            Memento.register(this);
            svg.addEvent(this.component, eventName, handler);
            this.events[eventName] = handler;
        }

        removeEvent(eventName) {
            Memento.register(this);
            svg.removeEvent(this.component, eventName);
            delete this.events[eventName];
        }

        memorize(memento) {
            memento.events = Memento.registerObject(this.events);
            return memento;
        }

        revert(memento) {
            if (memento===undefined) {
                console.log("undefined");
            }
            this.events = memento.events;
            for (let eventName in this.events) {
                svg.addEvent(this.component, eventName, this.events[eventName]);
            }
            this._draw();
        }

    }

    class Anchor extends Item {
        constructor(x, y, update, finalize) {
            super();
            this.x = x;
            this.y = y;
            this.update = update;
            this.finalize = finalize;
            this.component = new svg.Translation().add(
                new svg.Rect(ANCHOR_SIZE, ANCHOR_SIZE).color(svg.ALMOST_WHITE, 1, svg.ALMOST_BLACK));
            this.component.onClick((event)=>{});
            this._draw();
        }

        _draw() {
            this.component.move(this.x, this.y);
        }

        adjust(x, y) {
            Memento.register(this);
            this.x = x;
            this.y = y;
            this._draw();
            return this;
        }

        move(x, y) {
            Memento.register(this);
            this.x = x;
            this.y = y;
            this._draw();
            this.update(x, y);
            return this;
        }

        memorize() {
            let memento = {
                x:this.x,
                y:this.y,
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            ({x:this.x, y:this.y}=memento);
            this._draw();
        }

    }

    const MINIMAL_SIZE = 50;

    class Node extends Item {

        constructor(width, height, x, y) {
            super();
            this.width = width;
            this.height = height;
            this.x = x;
            this.y = y;
            this.background = new svg.Rect(this.width, this.height).color(svg.ALMOST_WHITE, 3, svg.ALMOST_WHITE);
            this.component = new svg.Translation()
                .add(this.background);
            this.anchors = {};
            this.links = [];
            this.component.onClick((event)=>{});
        }

        select() {
            Memento.register(this);
            this.schema.select(this);
            if (this.anchors.empty()) {
                this.anchors.ul = new Anchor(this.x - this.width / 2, this.y - this.height / 2, (x, y)=> {
                    let dx = x - this.x + this.width / 2;
                    let dy = y - this.y + this.height / 2;
                    if (this.width - dx<MINIMAL_SIZE) {
                        dx = this.width-MINIMAL_SIZE;
                        x = this.width/2-MINIMAL_SIZE + this.x;
                    }
                    if (this.height - dy<MINIMAL_SIZE) {
                        dy = this.height-MINIMAL_SIZE;
                        y = this.height/2-MINIMAL_SIZE + this.y;
                    }
                    this.dimension(this.width - dx, this.height - dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.ur = new Anchor(this.x + this.width / 2, this.y - this.height / 2, (x, y)=> {
                    let dx = x - this.x - this.width / 2;
                    let dy = y - this.y + this.height / 2;
                    if (this.width + dx<MINIMAL_SIZE) {
                        dx = MINIMAL_SIZE-this.width;
                        x = MINIMAL_SIZE-this.width/2 + this.x;
                    }
                    if (this.height - dy<MINIMAL_SIZE) {
                        dy = this.height-MINIMAL_SIZE;
                        y = this.height/2-MINIMAL_SIZE + this.y;
                    }
                    this.dimension(this.width + dx, this.height - dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.dr = new Anchor(this.x + this.width / 2, this.y + this.height / 2, (x, y)=> {
                    let dx = x - this.x - this.width / 2;
                    let dy = y - this.y - this.height / 2;
                    if (this.width + dx<MINIMAL_SIZE) {
                        dx = MINIMAL_SIZE-this.width;
                        x = MINIMAL_SIZE-this.width/2 + this.x;
                    }
                    if (this.height + dy<MINIMAL_SIZE) {
                        dy = MINIMAL_SIZE-this.height;
                        y = MINIMAL_SIZE-this.height/2 + this.y;
                    }
                    this.dimension(this.width + dx, this.height + dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.dl = new Anchor(this.x - this.width / 2, this.y + this.height / 2, (x, y)=> {
                    let dx = x - this.x + this.width / 2;
                    let dy = y - this.y - this.height / 2;
                    if (this.width - dx<MINIMAL_SIZE) {
                        dx = this.width-MINIMAL_SIZE;
                        x = this.width/2-MINIMAL_SIZE + this.x;
                    }
                    if (this.height + dy<MINIMAL_SIZE) {
                        dy = MINIMAL_SIZE-this.height;
                        y = MINIMAL_SIZE-this.height/2 + this.y;
                    }
                    this.dimension(this.width - dx, this.height + dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.schema.putAnchors(this.anchors.ul, this.anchors.ur, this.anchors.dl, this.anchors.dr);
            }
            return this;
        }

        unselect() {
            Memento.register(this);
            this.schema.unselect(this);
            if (!this.anchors.empty()) {
                this.schema.removeAnchors(this.anchors.ul, this.anchors.ur, this.anchors.dl, this.anchors.dr);
                this.anchors = {};
            }
            return this;
        }

        remove() {
            Memento.register(this);
            [...this.links].forEach(link=>link.remove());
            this.anchors.ul && this.schema.removeAnchors(
                this.anchors.ul, this.anchors.ur,
                this.anchors.dl, this.anchors.dr);
            this.schema.removeNode(this);
            return this;
        }

        inside(x, y) {
            return this.x-this.width/2<x && this.x+this.width/2>x && this.y-this.height/2<y && this.y+this.height/2>y;
        }

        _draw() {
            this.component.move(this.x, this.y);
            this.background.dimension(this.width, this.height).position(0, 0);
            if (!this.anchors.empty()) {
                this.anchors.ul.adjust(this.x-this.width/2, this.y-this.height/2);
                this.anchors.ur.adjust(this.x+this.width/2, this.y-this.height/2);
                this.anchors.dr.adjust(this.x+this.width/2, this.y+this.height/2);
                this.anchors.dl.adjust(this.x-this.width/2, this.y+this.height/2);
            }
        }

        move(x, y) {
            Memento.register(this);
            this.x = x;
            this.y = y;
            this.updateLinks();
            this._draw();
            return this;
        }

        dimension(width, height) {
            Memento.register(this);
            this.width = width;
            this.height = height;
            this._draw();
            return this;
        }

        addLink(link) {
            if (!this.links.contains(link)) {
                Memento.register(this);
                this.links.push(link);
            }
            return this;
        }

        removeLink(link) {
            if (this.links.contains(link)) {
                Memento.register(this);
                this.links.remove(link);
            }
            return this;
        }

        updateLinks() {
            this.links.forEach(link=>link.follow(this));
        }

        memorize() {
            let memento = {
                width : this.width,
                height : this.height,
                x : this.x,
                y : this.y,
                anchors : Memento.registerObject(this.anchors),
                links : Memento.registerArray(this.links)
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            [this.x, this.y, this.width, this.height] = [memento.x, memento.y, memento.width, memento.height];
            Memento.revertObject(memento.anchors, this.anchors);
            Memento.revertArray(memento.links, this.links);
        }
    }

    class Clazz extends Node {

        constructor(width, height, x, y) {
            super(width, height, x, y);
            this.title = new svg.Rect(this.width, TITLE_HEIGHT).color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.body = new svg.Rect(this.width, this.height-TITLE_HEIGHT).color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.component
                .add(this.title)
                .add(this.body);
            this._draw();
        }

        _draw() {
            super._draw();
            this.title.dimension(this.width, TITLE_HEIGHT).position(0, -this.height/2+TITLE_HEIGHT/2);
            this.body.dimension(this.width, this.height-TITLE_HEIGHT).position(0, TITLE_HEIGHT/2);
        }

        memorize() {
            let memento = super.memorize();
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._draw();
        }
    }

    class Link extends Item {

        constructor(node1, ...args) {
            super();
            this.line = this.buildLine();
            this.component = new svg.Translation().add(this.line);
            this.anchors = {};
            this.begin(node1);
            if (args[0] instanceof Node) {
                this.end(args[0]);
            }
            else {
                [this.x2, this.y2] = args;
            }
            this.component.onClick((event)=>{});
        }

        buildLine() {
            return new svg.Line(0, 0, 0, 0).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK);
        }

        begin(node) {
            Memento.register(this);
            this.node1 = node;
            node.addLink(this);
            this.x1 = this.node1.x;
            this.y1 = this.node1.y;
            this.anchors.p1 && this.anchors.p1.adjust(this.node1.x, this.node1.y);
            this.computeIntersects();
            this._draw();
            return this;
        }

        detachBegin(x, y) {
            Memento.register(this);
            this.node1 && this.node1.removeLink(this);
            this.x1 = x;
            this.y1 = y;
            this.node1 = null;
            this.anchors.p1 && this.anchors.p1.adjust(this.x1, this.y1);
            this.computeIntersects();
            this._draw();
            return this;
        }

        end(node) {
            Memento.register(this);
            this.node2 = node;
            node.addLink(this);
            this.x2 = this.node2.x;
            this.y2 = this.node2.y;
            this.anchors.p2 && this.anchors.p2.adjust(this.node2.x, this.node2.y);
            this.computeIntersects();
            this._draw();
            return this;
        }

        detachEnd(x, y) {
            Memento.register(this);
            this.node2 && this.node2.removeLink(this);
            this.x2 = x;
            this.y2 = y;
            this.node2 = null;
            this.anchors.p2 && this.anchors.p2.adjust(this.x2, this.y2);
            this.computeIntersects();
            this._draw();
            return this;
        }

        remove() {
            Memento.register(this);
            this.node1 && this.node1.removeLink(this);
            this.node2 && this.node2.removeLink(this);
            this.node1 = null;
            this.node2 = null;
            this.anchors.p1 && this.schema.removeAnchors(this.anchors.p1, this.anchors.p2);
            this.schema.removeLink(this);
            return this;
        }

        follow(node) {
            Memento.register(this);
            if (node===this.node1) {
                this.x1 = this.node1.x;
                this.y1 = this.node1.y;
                this.anchors.p1 && this.anchors.p1.adjust(this.node1.x, this.node1.y);
            }
            else if (node===this.node2) {
                this.x2 = this.node2.x;
                this.y2 = this.node2.y;
                this.anchors.p2 && this.anchors.p2.adjust(this.node2.x, this.node2.y);
            }
            this.computeIntersects();
            this._draw();
            return this;
        }

        select() {
            Memento.register(this);
            this.schema.select(this);
            if (this.anchors.empty()) {
                this.anchors.p1 = new Anchor(this.x1, this.y1, (x, y)=> {
                    this.detachBegin(x, y);
                    return {x, y};
                },(x, y)=> {
                    let clazz = this.schema.getNode(x, y);
                    if (clazz) {
                        this.begin(clazz);
                        return true;
                    }
                    else {
                        return false;
                    }
                });
                this.anchors.p2 = new Anchor(this.x2, this.y2, (x, y)=> {
                    this.detachEnd(x, y);
                    return {x, y};
                },(x, y)=> {
                    let clazz = this.schema.getNode(x, y);
                    if (clazz) {
                        this.end(clazz);
                        return true;
                    }
                    else {
                        return false;
                    }
                });
                this.schema.putAnchors(this.anchors.p1, this.anchors.p2);
            }
            return this;
        }

        unselect() {
            Memento.register(this);
            this.schema.unselect(this);
            if (!this.anchors.empty()) {
                this.schema.removeAnchors(this.anchors.p1, this.anchors.p2);
                this.anchors = {};
            }
            return this;
        }

        computeIntersects() {
            Memento.register(this);
            function polygon(clazz) {
                return [
                    {x:clazz.x-clazz.width/2, y:clazz.y-clazz.height/2},
                    {x:clazz.x-clazz.width/2, y:clazz.y+clazz.height/2},
                    {x:clazz.x+clazz.width/2, y:clazz.y+clazz.height/2},
                    {x:clazz.x+clazz.width/2, y:clazz.y-clazz.height/2}
                ];
            }
            function point(clazz) {
                return {x:clazz.x, y:clazz.y};
            }
            if (this.node1) {
                let intersects = svg.intersectLinePolygon(
                    point(this.node1), {x:this.x2, y:this.y2}, polygon(this.node1));
                if (!intersects.empty()) {
                    ({x: this.px1, y: this.py1} = intersects[0]);
                }
            }
            else {
                this.px1 = this.x1;
                this.py1 = this.y1;
            }
            if (this.node2) {
                let intersects = svg.intersectLinePolygon(
                    {x:this.x1, y:this.y1}, point(this.node2), polygon(this.node2));
                if (!intersects.empty()) {
                    ({x: this.px2, y: this.py2} = intersects[0]);
                }
            }
            else {
                this.px2 = this.x2;
                this.py2 = this.y2;
            }
        }

        _draw() {
            if (this.px1 && this.px2) {
                this.line.start(this.px1, this.py1);
                this.line.end(this.px2, this.py2);
                this.line.opacity(1);
            }
            else {
                this.line.opacity(0);
            }
        }

        memorize() {
            return super.memorize({
                x1 : this.x1,
                y1 : this.y1,
                px1 : this.px1,
                py1 : this.py1,
                node1 : this.node1,
                x2 : this.x2,
                y2 : this.y2,
                px2 : this.px2,
                py2 : this.py2,
                node2 : this.node2,
                anchors : Memento.registerObject(this.anchors),
            });
        }

        revert(memento) {
            super.revert(memento);
            ({x1:this.x1, y1:this.y1, px1:this.px1, py1:this.py1, node1:this.node1,
                x2:this.x2, y2:this.y2, px2:this.px2, py2:this.py2, node2:this.node2} = memento);
            Memento.revertObject(memento.anchors, this.anchors);
        }
    }

    class Relationship extends Link {

        constructor(node, ...args) {
            super(node,...args);
            this._draw();
        }

        memorize() {
            let memento = super.memorize();
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._draw();
        }
    }

    class SchemaBuilder {

        spec(schema) {
            let spec = {
                width : schema.component.width,
                height : schema.component.height,
                clazzes : schema.nodes.map(clazz=>({
                    x:clazz.x,
                    y:clazz.y,
                    width:clazz.width,
                    height:clazz.height}
                ))
            };
            return spec;
        }

        schema(desc) {
            let schema = new Schema(desc.width, desc.height);
            desc.nodes.forEach(descClazz=>schema.putNode(
                new Clazz(descClazz.width, descClazz.height,descClazz.x, descClazz.y)));
            return schema;
        }
    }

    function installDnD(what, glass, doDrag, doSelect, doMove, doClick, beginDrag) {
        what.addEvent('mousedown', event=> {
            install(what.component.parent.localPoint(event.x, event.y));
        });
        if (beginDrag) {
            install({x:what.x, y:what.y});
        }

        function install(delta) {
            let whatParent = what.component.parent;
            let {x:initX, y:initY, angle:initAngle} = what;
            if (doSelect(what)) {
                let click = true;
                what.addEvent('mousemove', moveEvent=> {
                    let depl = whatParent.localPoint(moveEvent.x, moveEvent.y);
                    let actualX = initX + depl.x - delta.x;
                    let actualY = initY + depl.y - delta.y;
                    let pt = doDrag(what, actualX, actualY);
                    if (!pt) {
                        pt = {x:actualX, y:actualY};
                    }
                    glass.drag(what.component, whatParent, pt.x, pt.y);
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
                        let finalX = Math.round(initX + depl.x - delta.x);
                        let finalY = Math.round(initY + depl.y - delta.y);
                        glass.drop(what.component, whatParent, finalX, finalY);
                        if (!doMove(what, finalX, finalY)) {
                            Memento.rollback(true);
                        }
                    }
                    Memento.begin();
                });
            }
        }

    }

    function installClick(what, doClick) {
        what.addEvent('click', event=> {
            doClick();
            Memento.begin();
        });
    }

    return {
        Clazz : Clazz,
        Relationship : Relationship,

        Schema : Schema,
        SchemaBuilder : SchemaBuilder,

        installDnD : installDnD,
        installClick : installClick
    }
};