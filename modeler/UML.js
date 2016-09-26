/**
 * Created by HDA3014 on 22/08/2016.
 */
var Memento = require("../memento").Memento;

console.log("UML Loaded...");
exports.UML = function(svg, gui) {

    function isSubclass(subClass, superClass) {
        let proto = subClass.prototype;
        while (proto!=null) {
            if (proto===superClass.prototype) {
                return true;
            }
            proto = proto.__proto__;
        }
        return false;
    }

    class Schema {
        constructor(idgen, width, height) {
            this.idgen = idgen;
            this.component = new svg.Translation();
            this.component.width = width;
            this.component.height = height;
            this.background = new svg.Rect(width, height).color(svg.ALMOST_WHITE).position(width/2, height/2);
            this.nodeSupport = new svg.Translation();
            this.linkSupport = new svg.Translation();
            this.floatingSupport = new svg.Translation();
            this.anchorSupport = new svg.Translation();
            this.infoSupport = new svg.Translation();
            this.component
                .add(this.background)
                .add(this.floatingSupport)
                .add(this.nodeSupport)
                .add(this.linkSupport)
                .add(this.anchorSupport)
                .add(this.infoSupport);
            this.nodes = [];
            this.links = [];
            this.infos = [];
            this.selected = null;
        }

        linkMode() {
            Memento.register(this);
            if (this.selected) {
                this.selected.unselect();
            }
            this.nodeSupport.active(false);
        }

        nodeFromId(id) {
            return this.nodes.find(node=>node.id===id);
        }

        nodeFromPosition(x, y) {
            return this.nodes.find(clazz=>clazz.inside(x, y));
        }

        linkFromId(id) {
            return this.links.find(link=>link.id===id);
        }

        itemFromId(id) {
            let item = this.nodeFromId(id);
            if (!item) {
                item = this.linkFromId(id);
            }
            return item;
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
            node._draw();
            node.shown();
            return this;
        }

        removeNode(node) {
            Memento.register(this);
            this.nodes.remove(node);
            this.nodeSupport.remove(node.component);
            node.hidden();
            return this;
        }

        putLink(link) {
            Memento.register(this);
            link.schema = this;
            this.links.push(link);
            this.linkSupport.add(link.component);
            link.shown();
            return this;
        }

        removeLink(link) {
            Memento.register(this);
            this.links.remove(link);
            this.linkSupport.remove(link.component);
            link.hidden();
            return this;
        }

        putInfo(info) {
            Memento.register(this);
            info.schema = this;
            this.infos.push(info);
            this.infoSupport.add(info.component);
            info._draw();
            info.shown();
            return this;
        }

        removeInfo(info) {
            Memento.register(this);
            this.infos.remove(info);
            this.infoSupport.remove(info.component);
            info.hidden();
            return this;
        }

        clearInfos() {
            [...this.infos].forEach(info=>info.remove());
        }

        putAnchors(...anchors) {
            anchors.forEach(anchor=> {
                this.anchorSupport.add(anchor.component);
                anchor.schema = this;
                anchor.shown();
            });
            return this;
        }

        removeAnchors(...anchors) {
            anchors.forEach(anchor=>{
                this.anchorSupport.remove(anchor.component);
                anchor.hidden();
            });
            return this;
        }

        putFloatings(...floatings) {
            Memento.register(this);
            floatings.forEach(floating=>{
                this.floatingSupport.add(floating.component);
                floating.schema = this;
                floating.shown();
            });
            return this;
        }

        removeFloatings(...floatings) {
            Memento.register(this);
            floatings.forEach(floating=>{
                this.floatingSupport.remove(floating.component);
                floating.hidden();
            });
            return this;
        }

        select(selectable) {
            if (this.selected!=selectable) {
                if (this.selected) {
                    this.selected.unselect();
                }
                this.selected = selectable;
                return true;
            }
            return false;
        }

        unselect(selectable) {
            if (this.selected==selectable) {
                this.selected = null;
                return true;
            }
        }

        width() {
            return this.component.width;
        }

        height() {
            return this.component.height;
        }

        memorize() {
            return {
                component : Memento.registerSVGTranslation(this.component),
                width : this.component.width,
                height : this.component.height,
                nodeSupport : Memento.registerSVGTranslation(this.nodeSupport),
                floatingSupport : Memento.registerSVGTranslation(this.floatingSupport),
                linkSupport : Memento.registerSVGTranslation(this.linkSupport),
                infoSupport : Memento.registerSVGTranslation(this.infoSupport),
                nodes : Memento.registerArray(this.nodes),
                links : Memento.registerArray(this.links),
                infos : Memento.registerArray(this.infos)
            }
        }

        revert(memento) {
            Memento.revertSVGTranslation(memento.component, this.component);
            this.component.width = memento.width;
            this.component.height = memento.height;
            Memento.revertSVGTranslation(memento.nodeSupport, this.nodeSupport);
            Memento.revertSVGTranslation(memento.linkSupport, this.linkSupport);
            Memento.revertSVGTranslation(memento.floatingSupport, this.floatingSupport);
            Memento.revertSVGTranslation(memento.infoSupport, this.infoSupport);
            Memento.revertArray(memento.nodes, this.nodes);
            Memento.revertArray(memento.links, this.links);
            Memento.revertArray(memento.infos, this.infos);
        }

        _draw() {
            this.nodes.forEach(node=>node._draw());
            this.links.forEach(link=>link._draw());
        }
    }

    const TITLE_HEIGHT = 50;
    const ANCHOR_SIZE = 10;
    const NOP = function () {};

    class Item {

        constructor(id) {
            this.id = id;
            this.events = {};
            this.infos = [];
        }

        captureEvents() {
            this.addEvent("mousedown", NOP);
            this.addEvent("mouseup", NOP);
            this.addEvent("mousemove", NOP);
            this.addEvent("click", NOP);
            return this;
        }

        attachInfo(info) {
            Memento.register(this);
            this.infos.add(info);
            return this;
        }

        detachInfo(info) {
            Memento.register(this);
            this.infos.remove(info);
            return this;
        }

        updateInfos() {
            this.infos.forEach(info=>info.follow(this));
        }

        addEvent(eventName, handler) {
            svg.addEvent(this.component, eventName, handler);
            this.events[eventName] = handler;
            return this;
        }

        removeEvent(eventName) {
            svg.removeEvent(this.component, eventName);
            delete this.events[eventName];
            return this;
        }

        memorize(memento) {
            memento.infos = Memento.registerArray(this.infos);
            memento.events = Memento.registerObject(this.events);
            return memento;
        }

        revert(memento) {
            Memento.revertArray(memento.infos, this.infos);
            Memento.revertObject(memento.events, this.events);
            for (let eventName in this.events) {
                svg.addEvent(this.component, eventName, this.events[eventName]);
            }
            this._draw();
        }

    }

    const INFO_MARGIN = 10;
    const DELTA_INFO = 40;

    class Info extends Item {

        constructor(item, x, y, message, colors) {
            super(null);
            this.x = x;
            this.y = y;
            this.item = item;
            this.item.attachInfo(this);
            this.message = message;
            this.color = colors;
            this.background = new svg.Rect().color(...colors).opacity(0.8);
            this.text = new svg.Text(message).color(colors[2]).font("arial", 16, 16).anchor("start").vanchor("middle");
            this.line = new svg.Line(0, 0, 0, 0).color(...colors).dash("4,5,8,5");
            this.closeIcon = this.buildCloseIcon().onClick(
                ()=>this.remove());
            this.component = new svg.Translation()
                .add(this.background)
                .add(this.text)
                .add(this.line)
                .add(this.closeIcon);
            this.width = 0;
            this.height = 0;
            this.component.onClick((event)=>{});
        }

        findPosition(x, y) {
            let rx = 0;
            let ry = 0;
            let dx = (this.item.width+this.width)/2+DELTA_INFO;
            let dy = (this.item.height+this.height)/2+DELTA_INFO;
            let pos = this.item.infos.indexOf(this)%8;
            if (pos===0 || pos===1 || pos===2) {
                rx = - dx;
            }
            else if (pos===4 || pos===5 || pos===6) {
                rx = dx;
            }
            if (pos===0 || pos===6 || pos===7) {
                ry = - dy;
            }
            else if (pos===2 || pos===3 || pos===4) {
                ry =  dy;
            }
            if (this.item.x + rx - this.width/2 <0
             || this.item.x + rx + this.width/2 > this.schema.width()) {
                rx = -rx;
            }
            if (this.item.y + ry - this.height/2 <0
                || this.item.y + ry + this.height/2 > this.schema.height()) {
                ry = -ry;
            }
            return {x:this.item.x + rx, y:this.item.y + ry}
        }

        buildCloseIcon() {
            return new svg.Translation().add(new svg.Rotation(45)
                .add(new svg.Circle(8).color(svg.RED, 1, svg.DARK_RED))
                .add(new svg.Polygon(0, 0).color(svg.WHITE, 1, svg.GREY)
                    .add(-1, 6).add(-1, 1).add(-6, 1).add(-6, -1).add(-1, -1).add(-1, -6)
                    .add(1, -6).add(1, -1).add(6, -1).add(6, 1).add(1, 1).add(1, 6)
                ));
        }

        move(x, y) {
            Memento.register(this);
            this.x = x;
            this.y = y;
            this._draw();
            this.follow();
            return this;
        }

        dragged(x, y) {
            this.x = x;
            this.y = y;
            this.follow();
        }

        remove() {
            Memento.register(this);
            this.item.detachInfo(this);
            this.schema.removeInfo(this);
            return this;
        }

        inside(x, y) {
            return this.x-this.width/2<x && this.x+this.width/2>x && this.y-this.height/2<y && this.y+this.height/2>y;
        }

        _draw() {
            this.component.move(this.x, this.y);
            this.text.position(-this.width/2+INFO_MARGIN, 4);
            this.background.dimension(this.width, this.height);
            this.closeIcon.move(this.width/2, -this.height/2);
        }

        follow() {
            Memento.register(this);
            let start = {x:0, y:0};
            let end = this.item.location();
            let gEnd = this.schema.component.globalPoint(end);
            let fEnd = this.component.localPoint(gEnd);
            let s1 = svg.intersectLinePolygon(
                start, fEnd,
                [{x:-this.width/2, y:-this.height/2},
                {x:this.width/2, y:-this.height/2},
                {x:this.width/2, y:this.height/2},
                {x:-this.width/2, y:this.height/2}]
            );
            let s2 = svg.intersectLinePolygon(
                start, fEnd,
                [{x:fEnd.x-this.item.width/2, y:fEnd.y-this.item.height/2},
                {x:fEnd.x+this.item.width/2, y:fEnd.y-this.item.height/2},
                {x:fEnd.x+this.item.width/2, y:fEnd.y+this.item.height/2},
                {x:fEnd.x-this.item.width/2, y:fEnd.y+this.item.height/2}]
            );
            this.line.opacity(0);
            if (!s1.empty() && !s2.empty()) {
                let pt = this.component.globalPoint(s2[0]);
                if (!this.background.inside(pt.x, pt.y)) {
                    this.line.opacity(1);
                    this.line.start(s1[0].x, s1[0].y);
                    this.line.end(s2[0].x, s2[0].y);
                }
            }
            return this;
        }

        shown() {
            this.text.position(0, 0);
            let bounds = this.text.boundingRect();
            this.width = bounds.width+INFO_MARGIN*2;
            this.height = bounds.height+INFO_MARGIN*2;
            ({x:this.x, y:this.y} = this.findPosition(this.x, this.y));
            this.component.move(this.x, this.y);
            this.follow();
            this._draw();
        }

        hidden() {
        }

        memorize() {
            let memento = {
                item : this.item,
                message : this.message,
                width : this.width,
                height : this.height,
                x : this.x,
                y : this.y,
                lineX1 : this.line.x1,
                lineY1 : this.line.y1,
                lineX2 : this.line.x2,
                lineY2 : this.line.y2
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            [this.item, this.message, this.x, this.y, this.width, this.height] =
                [memento.item, memento.message, memento.x, memento.y, memento.width, memento.height];
            this.line.start(memento.lineX1, memento.lineY1).end(memento.lineX2, memento.lineY2);
            this._draw();
        }
    }

    class Anchor {

        constructor(x, y, update, finalize) {
            this.events = [];
            this.x = x;
            this.y = y;
            this.update = update;
            this.finalize = finalize;
            this.component = new svg.Translation().add(
                new svg.Rect(ANCHOR_SIZE, ANCHOR_SIZE).color(svg.ALMOST_WHITE, 1, svg.ALMOST_BLACK));
            this.component.onClick((event)=>{});
            this.component.anchor = this;
            this._draw();
        }

        addEvent(eventName, handler) {
            svg.addEvent(this.component, eventName, handler);
            this.events[eventName] = handler;
            return this;
        }

        removeEvent(eventName) {
            svg.removeEvent(this.component, eventName);
            delete this.events[eventName];
            return this;
        }

        shown() {
        }

        hidden() {
        }

        _draw() {
            this.component.move(this.x, this.y);
        }

        adjust(x, y) {
            this.x = x;
            this.y = y;
            this._draw();
            return this;
        }

        move(x, y) {
            this.x = x;
            this.y = y;
            this._draw();
            this.update(x, y);
            return this;
        }

    }

    const SENSOR_RADIUS = 8;
    const SENSOR_SIZE = 16;
    const SENSOR_OPACITY = 0.3;

    function circle() {
        return new svg.Circle(SENSOR_RADIUS).color(svg.RED).opacity(SENSOR_OPACITY);
    }

    function upTriangle() {
        return new svg.Triangle(SENSOR_SIZE, SENSOR_SIZE, "N").color(svg.RED).opacity(SENSOR_OPACITY);
    }

    function downTriangle() {
        return new svg.Triangle(SENSOR_SIZE, SENSOR_SIZE, "S").color(svg.RED).opacity(SENSOR_OPACITY);
    }

    class Sensor extends Item {

        constructor(x, y, change, icon=circle) {
            super(null);
            this.x = x;
            this.y = y;
            this.change = change;
            this.component = new svg.Translation().add(icon());
            this.component.onClick((event)=>{
                this.change();
                Memento.begin();
            });
            this._draw();
        }

        shown() {
        }

        hidden() {
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

        memorize() {
            let memento = {
                x:this.x,
                y:this.y
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            ({x:this.x, y:this.y}=memento);
            this._draw();
        }

    }

    const MINIMAL_SIZE = 70;

    class Node extends Item {

        constructor(id, width, height, x, y) {
            super(id);
            this.width = width;
            this.height = height;
            this.x = x;
            this.y = y;
            this.anchors = {};
            this.links = [];
            this.component = new svg.Translation();
            this.component.onClick((event)=>{});
        }

        location() {
            return {x:this.x, y:this.y};
        }

        minimalWidth() {
            return MINIMAL_SIZE;
        }

        minimalHeight() {
            return MINIMAL_SIZE;
        }

        selected() {
            return !this.anchors.empty();
        }

        select() {
            if (!this.selected()) {
                this.schema.select(this);
                this.showAnchors();
                this.showSensors();
                this.selectRelatedNodes();
            }
            return this;
        }

        unselect() {
            if (this.selected()) {
                this.schema.unselect(this);
                this.hideAnchors();
                this.hideSensors();
                this.unselectRelatedNodes();
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
            if (!this.anchors.empty()) {
                this.anchors.ul.adjust(this.x-this.width/2, this.y-this.height/2);
                this.anchors.ur.adjust(this.x+this.width/2, this.y-this.height/2);
                this.anchors.dr.adjust(this.x+this.width/2, this.y+this.height/2);
                this.anchors.dl.adjust(this.x-this.width/2, this.y+this.height/2);
            }
        }

        move(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this.updateRelatedNodes();
                this._draw();
            }
            return this;
        }

        dragged(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this.updateRelatedNodes();
            }
        }

        dimension(width, height) {
            if (this.width!==width || this.height!==height) {
                Memento.register(this);
                this.width = width;
                this.height = height;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this.updateRelatedNodes();
                this._draw();
            }
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

        shown() {
        }

        hidden() {
            this.hideSensors();
        }

        showAnchors() {
            if (this.anchors.empty()) {
                this.anchors.ul = new Anchor(this.x - this.width / 2, this.y - this.height / 2, (x, y)=> {
                    let dx = x - this.x + this.width / 2;
                    let dy = y - this.y + this.height / 2;
                    if (this.width - dx<this.minimalWidth()) {
                        dx = this.width-this.minimalWidth();
                        x = this.width/2-this.minimalWidth() + this.x;
                    }
                    if (this.height - dy<this.minimalHeight()) {
                        dy = this.height-this.minimalHeight();
                        y = this.height/2-this.minimalHeight() + this.y;
                    }
                    this.dimension(this.width - dx, this.height - dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.ur = new Anchor(this.x + this.width / 2, this.y - this.height / 2, (x, y)=> {
                    let dx = x - this.x - this.width / 2;
                    let dy = y - this.y + this.height / 2;
                    if (this.width + dx<this.minimalWidth()) {
                        dx = this.minimalWidth()-this.width;
                        x = this.minimalWidth()-this.width/2 + this.x;
                    }
                    if (this.height - dy<this.minimalHeight()) {
                        dy = this.height-this.minimalHeight();
                        y = this.height/2-this.minimalHeight() + this.y;
                    }
                    this.dimension(this.width + dx, this.height - dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.dr = new Anchor(this.x + this.width / 2, this.y + this.height / 2, (x, y)=> {
                    let dx = x - this.x - this.width / 2;
                    let dy = y - this.y - this.height / 2;
                    if (this.width + dx<this.minimalWidth()) {
                        dx = this.minimalWidth()-this.width;
                        x = this.minimalWidth()-this.width/2 + this.x;
                    }
                    if (this.height + dy<this.minimalHeight()) {
                        dy = this.minimalHeight()-this.height;
                        y = this.minimalHeight()-this.height/2 + this.y;
                    }
                    this.dimension(this.width + dx, this.height + dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.anchors.dl = new Anchor(this.x - this.width / 2, this.y + this.height / 2, (x, y)=> {
                    let dx = x - this.x + this.width / 2;
                    let dy = y - this.y - this.height / 2;
                    if (this.width - dx<this.minimalWidth()) {
                        dx = this.width-this.minimalWidth();
                        x = this.width/2-this.minimalWidth() + this.x;
                    }
                    if (this.height + dy<this.minimalHeight()) {
                        dy = this.minimalHeight()-this.height;
                        y = this.minimalHeight()-this.height/2 + this.y;
                    }
                    this.dimension(this.width - dx, this.height + dy).move(this.x + dx / 2, this.y + dy / 2);
                    return {x, y};
                });
                this.schema.putAnchors(this.anchors.ul, this.anchors.ur, this.anchors.dl, this.anchors.dr);
            }
        }

        hideAnchors() {
            if (!this.anchors.empty()) {
                this.schema.removeAnchors(this.anchors.ul, this.anchors.ur, this.anchors.dl, this.anchors.dr);
                this.anchors = {};
            }
        }

        updateSensors() {
        }

        showSensors() {
        }

        hideSensors() {
        }

        updateRelatedNodes() {
        }

        showRelatedNodes() {
        }

        hideRelatedNodes() {
        }

        selectRelatedNodes() {
        }

        unselectRelatedNodes() {
        }

        memorize() {
            let memento = {
                width : this.width,
                height : this.height,
                x : this.x,
                y : this.y,
                links : Memento.registerArray(this.links)
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            [this.x, this.y, this.width, this.height] = [memento.x, memento.y, memento.width, memento.height];
            Memento.revertArray(memento.links, this.links);
        }

        adjustHandler(handler) {
            handler.node = this;
            handler.x = (handler.x - this.x) / this.width;
            handler.y = (handler.y - this.y) / this.height;
        }

        pointFromHandler(handler) {
            return {
                x: handler.x * this.width + this.x,
                y: handler.y * this.height + this.y
            }
        }

        bounds() {
            return {
                left: this.x - this.width / 2,
                top: this.y - this.height / 2,
                right: this.x + this.width / 2,
                bottom: this.y + this.height / 2
            };
        }

        accept(NodeType) {
            if (NodeType===Dependancy) {
                return true;
            }
            return false;
        }
    }

    class Iconic extends Item {

        constructor(id, width, height, x, y) {
            super(id);
            this.x = x;
            this.y = y;
            this.links = [];
            this.icon = this.buildIcon();
            this.component = new svg.Translation().add(this.icon);
            this.component.onClick((event)=>{});
            this.isSelected = false;
        }

        location() {
            return {x:this.x, y:this.y};
        }

        selected() {
            return this.isSelected;
        }

        select() {
            if (!this.selected()) {
                this.schema.select(this);
                this.showSensors();
                this.selectRelatedNodes();
                this.isSelected = true;
            }
            return this;
        }

        unselect() {
            if (this.selected()) {
                this.schema.unselect(this);
                this.hideSensors();
                this.unselectRelatedNodes();
                this.isSelected = false;
            }
            return this;
        }

        remove() {
            Memento.register(this);
            [...this.links].forEach(link=>link.remove());
            this.schema.removeNode(this);
            return this;
        }

        inside(x, y) {
            return this.x-this.icon.width/2<x && this.x+this.icon.width/2>x &&
                this.y-this.icon.height/2<y && this.y+this.icon.height/2>y;
        }

        _draw() {
            this.component.move(this.x, this.y);
        }

        move(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this.updateRelatedNodes();
                this._draw();
            }
            return this;
        }

        dragged(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this.updateRelatedNodes();
            }
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

        shown() {
        }

        hidden() {
            this.hideSensors();
        }

        updateSensors() {
        }

        showSensors() {
        }

        hideSensors() {
        }

        updateRelatedNodes() {
        }

        showRelatedNodes() {
        }

        hideRelatedNodes() {
        }

        selectRelatedNodes() {
        }

        unselectRelatedNodes() {
        }

        memorize() {
            let memento = {
                x : this.x,
                y : this.y,
                links : Memento.registerArray(this.links)
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            [this.x, this.y] = [memento.x, memento.y];
            Memento.revertArray(memento.links, this.links);
        }

        adjustHandler(handler) {
            handler.node = this;
            handler.x = (handler.x - this.x) / this.icon.width;
            handler.y = (handler.y - this.y) / this.icon.height;
        }

        pointFromHandler(handler) {
            return {
                x: handler.x * this.icon.width + this.x,
                y: handler.y * this.icon.height + this.y
            }
        }

        bounds() {
            return {
                left: this.x - this.icon.width / 2,
                top: this.y - this.icon.height / 2,
                right: this.x + this.icon.width / 2,
                bottom: this.y + this.icon.height / 2
            };
        }

        accept(NodeType) {
            if (NodeType===Dependancy || NodeType===Relationship) {
                return true;
            }
            return false;
        }
    }

    const LINE_SENSIVITY = 2;

    class Line extends Item {

        constructor(id, height, x, y) {
            super(id);
            this.height = height;
            this.x = x;
            this.y = y;
            this.anchors = {};
            this.links = [];
            this.line = new svg.Line(0, 0, 0, this.height).color([], 2, svg.ALMOST_BLACK).dash("8,5,8,5");
            this.component = new svg.Translation().add(this.line);
            this.component.onClick((event)=>{});
        }

        location() {
            return {x:this.x, y:this.y};
        }

        minimalHeight() {
            let minimum = MINIMAL_SIZE;
            this.links.forEach(link=>{
                if (link.h1.node===this && link.h1.y>minimum) {
                    minimum = link.h1.y;
                }
                if (link.h2.node===this && link.h2.y>minimum) {
                    minimum = link.h2.y;
                }
            });
            return minimum;
        }

        select() {
            if (!this.selected()) {
                this.showAnchors();
                this.showSensors();
                if (this.owner) {
                    this.owner.select();
                }
            }
            return this;
        }

        unselect() {
            if (this.selected()) {
                this.hideAnchors();
                this.hideSensors();
                if (this.owner) {
                    this.owner.unselect();
                }
            }
            return this;
        }

        remove() {
            Memento.register(this);
            [...this.links].forEach(link=>link.remove());
            this.anchors.bottom && this.schema.removeAnchors(
                this.anchors.bottom);
            this.schema.removeNode(this);
            return this;
        }

        inside(x, y) {
            return this.x<=x+LINE_SENSIVITY && this.x>x-LINE_SENSIVITY && this.y<y && this.y+this.height>y;
        }

        _draw() {
            this.component.move(this.x, this.y);
            this.line.end(0, this.height);
            if (this.selected()) {
                this.anchors.bottom.adjust(this.x, this.y+this.height);
            }
        }

        move(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this._draw();
            }
            return this;
        }

        dragged(x, y) {
            if (this.x!==x || this.y!==y) {
                Memento.register(this);
                this.x = x;
                this.y = y;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
            }
        }

        dimension(height) {
            if (this.height!==height) {
                Memento.register(this);
                this.height = height;
                this.updateLinks();
                this.updateInfos();
                this.updateSensors();
                this._draw();
            }
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

        shown() {
        }

        hidden() {
            [...this.links].forEach(link=>link.remove());
            this.hideSensors();
        }

        selected() {
            return !this.anchors.empty();
        }

        showAnchors() {
            if (!this.selected()) {
                this.anchors.bottom = new Anchor(this.x, this.y + this.height, (x, y)=> {
                    let dheight = y - this.y;
                    if (dheight<this.minimalHeight()) {
                        dheight = this.minimalHeight();
                        y = this.y + dheight;
                    }
                    this.dimension(dheight);
                    return {x:this.x, y};
                });
                this.schema.putAnchors(this.anchors.bottom);
            }
        }

        hideAnchors() {
            if (this.selected()) {
                this.schema.removeAnchors(this.anchors.bottom);
                this.anchors = {};
            }
        }

        updateSensors() {
        }

        showSensors() {
        }

        hideSensors() {
        }

        memorize() {
            let memento = {
                height : this.height,
                x : this.x,
                y : this.y,
                links : Memento.registerArray(this.links)
            };
            return super.memorize(memento);
        }

        revert(memento) {
            super.revert(memento);
            [this.x, this.y, this.height] = [memento.x, memento.y, memento.height];
            Memento.revertArray(memento.links, this.links);
            this._draw();
        }

        adjustHandler(handler) {
            handler.node = this;
            handler.x = handler.x - this.x;
            handler.y = handler.y - this.y;
        }

        pointFromHandler(handler) {
            return {
                x: this.x + handler.x,
                y: this.y + handler.y
            }
        }

        bounds() {
            return {
                left: this.x - 2,
                top: this.y,
                right: this.x + 2,
                bottom: this.y + this.height
            };
        }

        moveLinks(dy) {
            this.links.forEach(link=>{
                if (link.h1.node===this) {
                    link.begin(link.h1.node, link.h1.x, link.h1.y+dy);
                }
                else if (link.h2.node===this) {
                    link.end(link.h2.node, link.h2.x, link.h2.y+dy);
                }
            });
        }

        accept(NodeType) {
            if (NodeType===Dependancy || isSubclass(NodeType, MessageLink)) {
                return true;
            }
            return false;
        }

    }

    const FIELD_MARGIN = 10;
    const FIELD_HEIGHT = 24;
    const CLOSE_MARGIN = 15;
    const SENSOR_MARGIN = 20;
    const DEFAULT_LINE_HEIGHT = 100;

    class ObjectOrientedNode extends Node {

        constructor(id, width, height, x, y, defaultTitle, defaultContent) {
            super(id, width, height, x, y);
            this.background = new svg.Rect(this.width, this.height).color(svg.ALMOST_WHITE, 3, svg.ALMOST_WHITE);
            this.component.add(this.background);
            this.titleBackground = new svg.Rect(10, 10)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.bodyBackground = new svg.Rect(10, 10)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this._title = defaultTitle;
            this.titleText = new gui.TextField(0, 0, 10, 10,
                this._title)
                .font("arial", 16)
                .color([svg.ALMOST_WHITE, 2, svg.ALMOST_WHITE]);
            this.titleText.editColor([svg.LIGHT_GREY, 2, svg.LIGHT_GREY]);
            this.titleText.onInput((oldMessage, message, validity)=>{
                Memento.register(this);
                this._title = message;
            }).onBlur(()=>{
                Memento.begin();
            });
            this._content = defaultContent;
            this.contentText = new gui.TextArea(0, 0, 10, 10,
                this._content)
                .font("arial", 16, 19)
                .color([svg.ALMOST_WHITE, 2, svg.ALMOST_WHITE]);
            this.contentText.editColor([svg.LIGHT_GREY, 2, svg.LIGHT_GREY]);
            this.contentText.onInput((oldMessage, message, validity)=>{
                Memento.register(this);
                this._content = message;
            }).onBlur(()=>{
                Memento.begin();
            });
            this.bodySupport = new svg.Translation().add(this.bodyBackground);
            this.contentTextSupport = new svg.Translation().add(this.contentText.component);
            this.component
                .add(this.titleBackground)
                .add(this.bodySupport)
                .add(this.titleText.component)
                .add(this.contentTextSupport);
            this.status = "opened";
            this.line = new Line(id, DEFAULT_LINE_HEIGHT, this.x, this.y+this.height/2);
            this._resizeContent();
            this._draw();
        }

        definition() {
            return this.contentText.textMessage.split("\n");
        }

        minimalHeight() {
            return this.status==="closed" ?
                TITLE_HEIGHT :
                this.definition().length*19+FIELD_MARGIN*2+TITLE_HEIGHT;
        }

        dimension(width, height) {
            super.dimension(width, height);
            this._resizeContent();
            this._draw();
            return this;
        }

        hideBody() {
            this.status="closed";
            this._resizeContent();
            this._draw();
            return this;
        }

        showBody() {
            this.status="opened";
            if (this.height<this.minimalHeight()) {
                this.dimension(this.width, this.minimalHeight());
                let y = this.y;
                if (y+this.height/2>this.schema.height()) {
                    y=this.schema.height()-this.height/2;
                }
                if (y-this.height/2<0) {
                    y=this.height/2;
                }
                if (y!=this.y) {
                    this.move(this.x, y);
                }
            }
            this._resizeContent();
            this._draw();
            return this;
        }

        _resizeContent() {
            if (this.status==="opened") {
                this.titleBackground.dimension(this.width, TITLE_HEIGHT).position(0, -this.height / 2 + TITLE_HEIGHT / 2);
                this.bodyBackground.dimension(this.width, this.height - TITLE_HEIGHT).position(0, TITLE_HEIGHT / 2);
                this.titleText.dimension(this.width - FIELD_MARGIN * 2 -SENSOR_MARGIN, FIELD_HEIGHT)
                    .position(-11, -this.height / 2 + TITLE_HEIGHT / 2);
                this.contentText.dimension(this.width - FIELD_MARGIN * 2, this.height - TITLE_HEIGHT - FIELD_MARGIN * 2)
                    .position(-1, TITLE_HEIGHT / 2);
                if (!this.bodyBackground.parent) {
                    this.bodySupport.add(this.bodyBackground);
                    this.contentTextSupport.add(this.contentText.component);
                }
            }
            else {
                this.titleBackground.dimension(this.width, this.height).position(0, 0);
                this.titleText.dimension(this.width - FIELD_MARGIN * 2, FIELD_HEIGHT)
                    .position(-1, 0);
                if (this.bodyBackground.parent) {
                    this.bodySupport.remove(this.bodyBackground);
                    this.contentTextSupport.remove(this.contentText.component);
                }
            }
            this.line.move(this.x, this.y+this.height/2);
        }

        updateRelatedNodes() {
            this.line.move(this.x, this.y + this.height / 2);
        }

        showRelatedNodes() {
            if (!this.lineShown) {
                Memento.register(this);
                Memento.register(this.line);
                this.lineShown = true;
                this.line.owner = this;
                this.schema.putNode(this.line);
                if (this.selected()) {
                    this.line.select();
                }
            }
        }

        hideRelatedNodes() {
            if (this.lineShown) {
                Memento.register(this);
                Memento.register(this.line);
                this.line.owner = null;
                this.line.unselect();
                this.lineShown = false;
                this.schema.removeNode(this.line);
            }
        }

        selectRelatedNodes() {
            super.selectRelatedNodes();
            if (this.lineShown) {
                this.line.select(true);
            }
        }

        unselectRelatedNodes() {
            super.unselectRelatedNodes();
            if (this.lineShown) {
                this.line.unselect(true);
            }
        }

        _draw() {
            super._draw();
            this.background.dimension(this.width, this.height).position(0, 0);
            this.titleBackground._draw();
            this.bodyBackground._draw();
            this.titleText._draw();
            this.contentText._draw();
        }

        memorize() {
            let memento = super.memorize();
            memento.title = this._title;
            memento.content = this._content;
            memento.status = this.status;
            memento.lineShown  = this.lineShown;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._title = memento.title;
            this.titleText.message(this._title);
            this._content = memento.content;
            this.contentText.message(this._content);
            this.status = memento.status;
            this.lineShown = memento.lineShown;
            this._resizeContent();
            this._draw();
        }

        title(_title) {
            if (_title) {
                this._title = _title;
                this.titleText.message(this._title);
                this._draw();
                return this;
            }
            return this._title;
        }

        content(_content) {
            if (_content) {
                this._content = _content;
                this.contentText.message(this._content);
                this._draw();
                return this;
            }
            return this._content;
        }

        showSensors() {
            if (!this.statusSensor) {
                this.statusSensor =
                    new Sensor(this.x + this.width / 2 - CLOSE_MARGIN, this.y - this.height / 2 + CLOSE_MARGIN, ()=> {
                        console.log("Sensor selected");
                        if (this.status==="closed") {
                            this.showBody();
                        }
                        else {
                            this.hideBody();
                        }
                        this.hideSensors();
                        this.showSensors();
                        return true;
                    }, this.status==="closed" ? downTriangle : upTriangle);
                this.lineSensor =
                        new Sensor(this.x, this.y + this.height / 2, ()=> {
                        if (!this.lineShown) {
                            this.showRelatedNodes();
                        }
                        else {
                            this.hideRelatedNodes();
                        }
                        this.hideSensors();
                        this.showSensors();
                        return true;
                    }, this.lineShown ? upTriangle : downTriangle);
                this.schema.putAnchors(this.statusSensor, this.lineSensor);
            }
        }

        hideSensors() {
            if (this.statusSensor) {
                this.schema.removeAnchors(this.statusSensor, this.lineSensor);
                delete this.statusSensor;
            }
        }

        updateSensors() {
            if (this.statusSensor) {
                this.statusSensor.adjust(this.x+this.width/2-CLOSE_MARGIN, this.y-this.height/2+CLOSE_MARGIN);
                this.lineSensor.adjust(this.x, this.y+this.height/2);
            }
        }

        accept(NodeType) {
            if (super.accept(NodeType)) {
                return true;
            }
            if (NodeType===Relationship) {
                return true;
            }
            return false;
        }

    }

    class Clazz extends ObjectOrientedNode {

        constructor(id, width, height, x, y) {
            super(id, width, height, x, y, "ClassName", "field : type");
        }

        accept(NodeType) {
            if (super.accept(NodeType)) {
                return true;
            }
            if (NodeType===Inherit || NodeType===Realization) {
                return true;
            }
            return false;
        }

    }

    class Object extends ObjectOrientedNode {

        constructor(id, width, height, x, y) {
            super(id, width, height, x, y, "object : Type", "property = value");
            this.titleText.decoration("underline");
        }

    }

    const HEAD_HEIGHT = 25;

    class Comment extends Node {

        constructor(id, width, height, x, y, defaultComment) {
            super(id, width, height, x, y);
            this.background = new svg.Path(0, 0)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_WHITE);
            this.frame = new svg.Path(0, 0)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.fold = new svg.Path(0, 0)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this._content = defaultComment;
            this.contentText = new gui.TextArea(0, 0, 10, 10,
                this._content)
                .font("arial", 16, 19)
                .color([svg.ALMOST_WHITE, 2, svg.ALMOST_WHITE]);
            this.contentText.editColor([svg.LIGHT_GREY, 2, svg.LIGHT_GREY]);
            this.contentText.onInput((oldMessage, message, validity)=>{
                Memento.register(this);
                this._content = message;
            }).onBlur(()=>{
                Memento.begin();
            });
            this.component
                .add(this.background)
                .add(this.frame)
                .add(this.fold)
                .add(this.contentText.component);
            this._resizeContent();
            this._draw();
        }

        definition() {
            return this.contentText.textMessage.split("\n");
        }

        minimalHeight() {
            return this.definition().length*19+FIELD_MARGIN*2+HEAD_HEIGHT;
        }

        dimension(width, height) {
            super.dimension(width, height);
            this._resizeContent();
            this._draw();
            return this;
        }

        _resizeContent() {
            function drawComment(path, width, height) {
                path.reset().move(-width/2, -height/2)
                    .line(width/2-HEAD_HEIGHT, -height/2)
                    .line(width/2, -height/2+HEAD_HEIGHT)
                    .line(width/2, height/2)
                    .line(-width/2, height/2)
                    .line(-width/2, -height/2);
            }

            drawComment(this.background, this.width, this.height);
            drawComment(this.frame, this.width, this.height);
            this.fold.reset().move(this.width/2-HEAD_HEIGHT, -this.height/2)
                .line(this.width/2, -this.height/2+HEAD_HEIGHT)
                .line(this.width/2-HEAD_HEIGHT, -this.height/2+HEAD_HEIGHT)
                .line(this.width/2-HEAD_HEIGHT, -this.height/2);
            this.contentText.dimension(this.width - FIELD_MARGIN * 2, this.height - HEAD_HEIGHT - FIELD_MARGIN * 2)
                .position(-1, HEAD_HEIGHT / 2);
        }

        _draw() {
            super._draw();
            this.background._draw();
            this.contentText._draw();
        }

        memorize() {
            let memento = super.memorize();
            memento.content = this._content;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._content = memento.content;
            this.contentText.message(this._content);
            this._resizeContent();
            this._draw();
        }

        content(_content) {
            if (_content) {
                this._content = _content;
                this.contentText.message(this._content);
                this._draw();
                return this;
            }
            return this._content;
        }

    }

    const CONTROL = 300;

    class Link extends Item {

        constructor(id, node1, x, y) {
            super(id);
            this.anchors = {};
            if (node1 && node1.accept(this.constructor)) {
                this.h1 = {x, y};
                this.h2 = {x, y};
                this.attach(this.h1, node1);
                node1.addLink(this);
            }
            else {
                this.h1 = {x:0, y:0};
                this.h2 = {x:0, y:0};
            }
            this.line = this.buildLine();
            this.component = new svg.Translation().add(this.line);
            this.component.onClick((event)=>{});
        }

        location() {
            return {x:(this.h1.x+this.h2.x)/2, y:(this.h1.y+this.h2.y)/2};
        }

        buildLine() {
            let path = new svg.Path().color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK).fillOpacity(0);
            path.inside = (x, y)=>{
                let p = path.localPoint({x, y});
                let d = this.computeParameters(p.x, p.y);
                return Math.abs(d.distance)<3;
            };
            return path;
        }

        angle() {
            if (this.px1 && this.px2) {
                let pt1 = this.point(this.h1);
                let pt2 = this.point(this.h2);
                return Math.floor(Math.atan2(pt2.x - pt1.x, pt1.y - pt2.y) / Math.PI * 180);
            }
            else {
                if (this.cx>0) {
                    return -90;
                }
                else if (this.cx<0) {
                    return 90;
                }
                else if (this.cy>0) {
                    return 0;
                }
                else {
                    return 180;
                }
            }
        }

        attach(handler, node, x, y) {
            handler.node = node;
            if (x !== undefined) {
                handler.x = x;
                handler.y = y;
            }
            else {
                handler.node.adjustHandler(handler);
            }
        }

        point(handler) {
            if (handler.node) {
                return handler.node.pointFromHandler(handler);
            }
            else return {x:handler.x, y:handler.y}
        }

        adjustAnchor(handler, anchor) {
            let pt = this.point(handler);
            anchor && anchor.adjust(pt.x, pt.y);
        }

        begin(node, x, y) {
            Memento.register(this);
            this.attach(this.h1, node, x, y);
            node.addLink(this);
            this.adjustAnchor(this.h1, this.anchors.p1);
            this.updateInfos();
            this.computeBounds();
            this.showSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return this;
        }

        detachBegin(x, y) {
            Memento.register(this);
            this.h1.node && this.h1.node.removeLink(this);
            this.h1.node = null;
            this.adjustBegin(x, y);
            this.adjustAnchor(this.h1, this.anchors.p1);
            this.updateInfos();
            this.computeBounds();
            this.hideSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return {x:this.h1.x, y:this.h1.y};
        }

        adjustBegin(x, y) {
            this.h1.x = x;
            this.h1.y = y;
        }

        end(node, x, y) {
            Memento.register(this);
            this.attach(this.h2, node, x, y);
            node.addLink(this);
            this.adjustAnchor(this.h2, this.anchors.p2);
            this.updateInfos();
            this.computeBounds();
            this.showSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return this;
        }

        detachEnd(x, y) {
            Memento.register(this);
            this.h2.node && this.h2.node.removeLink(this);
            this.h2.node = null;
            this.adjustEnd(x, y);
            this.adjustAnchor(this.h2, this.anchors.p2);
            if (this.h1) {
                this.updateInfos();
                this.computeBounds();
                this._draw();
            }
            this.hideSensors();
            this.updateTerminations();
            this.updateFloatings();
            return {x:this.h2.x, y:this.h2.y};
        }

        adjustEnd(x, y) {
            this.h2.x = x;
            this.h2.y = y;
        }

        remove() {
            Memento.register(this);
            this.h1.node && this.h1.node.removeLink(this);
            this.h2.node && this.h2.node.removeLink(this);
            this.h1.node = null;
            this.h2.node = null;
            this.anchors.p1 && this.schema.removeAnchors(this.anchors.p1, this.anchors.p2);
            this.schema.removeLink(this);
            return this;
        }

        follow(node) {
            Memento.register(this);
            this.adjustFollow(node);
            this.updateInfos();
            this.computeBounds();
            this.updateSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return this;
        }

        adjustFollow(node) {
            if (node===this.h1.node) {
                this.adjustAnchor(this.h1, this.anchors.p1);
            }
            else if (node===this.h2.node) {
                this.adjustAnchor(this.h2, this.anchors.p2);
            }
        }

        showSensors() {
        }

        hideSensors() {
        }

        updateSensors() {
        }

        selectFloatings() {
        }

        unselectFloatings() {
        }

        updateFloatings() {
        }

        updateTerminations() {
        }

        select() {
            if (this.schema.select(this)) {
                if (!this.anchors.p1) {
                    let pt1 = this.point(this.h1);
                    this.anchors.p1 = new Anchor(pt1.x, pt1.y, (x, y)=> {
                        return this.detachBegin(x, y);
                    }, (x, y)=> {
                        let clazz = this.schema.nodeFromPosition(x, y);
                        if (clazz && clazz.accept(this.constructor)) {
                            this.begin(clazz);
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    let pt2 = this.point(this.h2);
                    this.anchors.p2 = new Anchor(pt2.x, pt2.y, (x, y)=> {
                        return this.detachEnd(x, y);
                    }, (x, y)=> {
                        let clazz = this.schema.nodeFromPosition(x, y);
                        if (clazz && clazz.accept(this.constructor)) {
                            this.end(clazz);
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    this.schema.putAnchors(this.anchors.p1, this.anchors.p2);
                }
                this.showSensors();
                this.selectFloatings();
                return true;
            }
            return false;
        }

        unselect() {
            if (this.schema.unselect(this)) {
                if (!this.anchors.empty()) {
                    this.schema.removeAnchors(this.anchors.p1, this.anchors.p2);
                    delete this.anchors.p1;
                    delete this.anchors.p2;
                }
                this.hideSensors();
                this.unselectFloatings();
                return true;
            }
            return false;
        }

        computeBounds() {
            Memento.register(this);
            this.clearBounds();
            if (!this.computeIntersects()) {
                this.computeAutoBounds();
            }
        }

        clearBounds() {
            delete this.px1;
            delete this.px2;
            delete this.py1;
            delete this.py2;
            delete this.dx1;
            delete this.dx2;
            delete this.dy1;
            delete this.dy2;
            delete this.cx;
            delete this.cy
        }

        computeAutoBounds() {
            let node = this.h1.node || this.h2.node;
            let pt1 = this.point(this.h1);
            let pt2 = this.point(this.h2);
            let dx = pt2.x - pt1.x;
            let dy = pt2.y - pt1.y;
            dx<0 && (dx=-dx);
            dy<0 && (dy=-dy);
            if (dx>dy) {
                this.dx1 = pt1.x;
                this.dx2 = pt2.x;
                this.cx = 0;
                if (pt1.y + pt2.y > node.y*2) {
                    this.dy1 = this.dy2 = node.bounds().bottom;
                    this.cy = CONTROL;
                }
                else {
                    this.dy1 = this.dy2 = node.bounds().top;
                    this.cy = -CONTROL;
                }
            }
            else {
                this.dy1 = pt1.y;
                this.dy2 = pt2.y;
                this.cy = 0;
                if (pt1.x + pt2.x > node.x*2) {
                    this.dx1 = this.dx2 = node.bounds().right;
                    this.cx = CONTROL;
                }
                else {
                    this.dx1 = this.dx2 = node.bounds().left;
                    this.cx = -CONTROL;
                }
            }
        }

        computeIntersects() {
            function polygon(node) {
                let b = node.bounds();
                return [
                    {x: b.left, y: b.top },
                    {x: b.left, y: b.bottom },
                    {x: b.right, y: b.bottom },
                    {x: b.right, y: b.top }
                ];
            }

            if (this.h1.node) {
                let intersects = svg.intersectLinePolygon(
                    this.point(this.h1), this.point(this.h2), polygon(this.h1.node));
                if (!intersects.empty()) {
                    ({x: this.px1, y: this.py1} = intersects[0]);
                }
                else {
                    delete this.px1;
                    delete this.py1;
                }
            }
            else {
                this.px1 = this.h1.x;
                this.py1 = this.h1.y;
            }
            if (this.h2.node) {
                let intersects = svg.intersectLinePolygon(
                    this.point(this.h1), this.point(this.h2), polygon(this.h2.node));
                if (!intersects.empty()) {
                    ({x: this.px2, y: this.py2} = intersects[0]);
                }
                else {
                    delete this.px2;
                    delete this.py2;
                }
            }
            else {
                this.px2 = this.h2.x;
                this.py2 = this.h2.y;
            }
            return this.px1 && this.px2;
        }

        _draw() {
            if (this.px1 && this.px2) {
                this.line.reset();
                this.line.move(this.px1, this.py1);
                this.line.line(this.px2, this.py2);
                this.line.opacity(1);
            }
            else if (this.dx1 && this.dx2) {
                this.line.reset();
                this.line.move(this.dx1, this.dy1);
                this.line.cubic(
                    this.dx1+this.cx, this.dy1+this.cy,
                    this.dx2+this.cx, this.dy2+this.cy,
                    this.dx2, this.dy2);
                this.line.opacity(1);
            }
        }

        ellipseCoord(angle, dx, dy, sign) {
            if (angle%180===90) {
                return {x:0, y:dy};
            }
            else {
                let tan = Math.tan(angle/180*Math.PI);
                let ex = dx * dy * Math.sqrt(1 / (dy * dy + dx * dx * tan * tan)) * Math.sign(tan) * Math.sign(sign);
                return {
                    x: ex,
                    y: ex * tan * Math.sign(sign*dx)
                };
            }
        }

        computePosition(ratio, distance) {
            if (this.px1 && this.px2) {
                let dx = this.px2 - this.px1;
                let dy = this.py2 - this.py1;
                if (dx === 0 && dy === 0) {
                    return {x: this.px1, y: this.py1 - distance};
                }
                let px3 = this.px1 + dx * ratio;
                let py3 = this.py1 + dy * ratio;
                let dist = distance / Math.sqrt(dx * dx + dy * dy);
                return {x: px3 + dy * dist, y: py3 - dx * dist};
            }
            else {
                let mx = (this.dx1 + this.dx2)/2;
                let my = (this.dy1 + this.dy2)/2;
                let dx = (this.dx2 - this.dx1)/2;
                let dy = (this.dy2 - this.dy1)/2;
                let face = this.angle();
                dx===0 && (dx = this.cx*0.75);
                dy===0 && (dy = this.cy*0.75);
                if (face===0 || face===180) {
                    let angle = 180*ratio+face;
                    let {x:ex, y:ey} = this.ellipseCoord(angle, dx, dy, Math.sign(-this.cy));
                    let px = ex + Math.cos(angle / 180 * Math.PI) * distance * Math.sign(-this.cy*dx);
                    let py = ey + Math.sin(angle / 180 * Math.PI) * distance;
                    return {x: mx + px, y: my + py};
                }
                else {
                    let angle = 180*ratio-90+face;
                    let {x:ey, y:ex} = this.ellipseCoord(angle, dy, dx, Math.sign(-this.cx));
                    let px = ex - Math.sin(angle / 180 * Math.PI) * distance;
                    let py = ey + Math.cos(angle / 180 * Math.PI) * distance * Math.sign(this.cx*dy);
                    return {x: mx + px, y: my + py};
                }
            }
        }

        computeParametersForLine(x, y) {
            let dx = this.px2 - this.px1;
            let dy = this.py2 - this.py1;
            let t = (dx * (x - this.px2) + dy * (y - this.py2)) / (dx * dx + dy * dy);
            let px = this.px2 + dx * t;
            let py = this.py2 + dy * t;
            let pdx = px - this.px1;
            let pdy = py - this.py1;
            let sign = pdy * (x - px) - pdx * (y - py) > 0 ? 1 : -1;
            return {
                ratio: Math.sqrt((pdx * pdx + pdy * pdy) / (dx * dx + dy * dy)),
                distance: Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)) * sign
            };
        }

        computeParametersForEllipse(x, y) {
            let mx = (this.dx1 + this.dx2)/2;
            let my = (this.dy1 + this.dy2)/2;
            let dx = (this.dx2 - this.dx1)/2;
            let dy = (this.dy2 - this.dy1)/2;
            let face = this.angle();
            dx===0 && (dx = this.cx*0.75);
            dy===0 && (dy = this.cy*0.75);
            let px = x - mx;
            let py = y - my;
            if (face===0 || face===180) {
                let sign = Math.sign(-dx);
                let angle = Math.atan2(py*sign, px*sign)/Math.PI*180*sign*Math.sign(this.cy);
                let ratio = angle/180;
                let {x:ex} = this.ellipseCoord(angle, dx, dy, Math.sign(-this.cy));
                let distance = (px - ex)/Math.cos(angle / 180 * Math.PI)*sign;
                return {
                    ratio:ratio,
                    distance:distance
                }
            }
            else {
                let sign = Math.sign(-dy);
                let angle = Math.atan2(px*sign, py*sign)/Math.PI*180*sign*Math.sign(this.cx);
                let ratio = angle/180;
                let {x:ex} = this.ellipseCoord(angle, dy, dx, Math.sign(-this.cx));
                let distance = (py - ex)/Math.cos(angle / 180 * Math.PI)*sign;
                return {
                    ratio:ratio,
                    distance:distance
                }
            }
        }

        computeParameters(x, y) {
            if (this.px1 && this.px2) {
                return this.computeParametersForLine(x, y);
            }
            else {
                return this.computeParametersForEllipse(x, y);
            }
        }

        shown() {
        }

        hidden() {
            this.hideSensors();
        }

        visible() {
            return this.px1 && this.px2;
        }

        memorize() {
            let memento = {};
            if (this.h1) {
                memento.x1 = this.h1.x;
                memento.y1 = this.h1.y;
                memento.node1 = this.h1.node;
            }
            if (this.h2) {
                memento.x2 = this.h2.x;
                memento.y2 = this.h2.y;
                memento.node2 = this.h2.node;
            }

            memento.px2 = this.px2;
            memento.py2 = this.py2;
            memento.px1 = this.px1;
            memento.py1 = this.py1;

            memento.dx1 = this.dx1;
            memento.dx2 = this.dx2;
            memento.dy1 = this.dy1;
            memento.dy2 = this.dy2;
            memento.cx = this.cx;
            memento.cy = this.cy;

            return memento;
        }

        revert(memento) {
            super.revert(memento);
            ({
                x1:this.h1.x, y1:this.h1.y, px1:this.px1, py1:this.py1, node1:this.h1.node,
                x2:this.h2.x, y2:this.h2.y, px2:this.px2, py2:this.py2, node2:this.h2.node,
                dx1:this.dx1, dx2:this.dx2, dy1:this.dy1, dy2:this.dy2, cx:this.cx, cy:this.cy} = memento);
            this._draw();
        }
    }

    class Termination {

        constructor(link, items) {
            this.index=0;
            this.link = link;
            this.items = items;
            this.component = new svg.Translation();
            this.rotation = new svg.Rotation(0);
            if (this.items[this.index]) {
                this.rotation.add(this.items[this.index]);
            }
            this.component.add(this.rotation);
        }

        switch() {
            Memento.register(this);
            let index=(this.index+1)%this.items.length;
            if (this.items[this.index]) {
                this.rotation.remove(this.items[this.index]);
            }
            if (this.items[index]) {
                this.rotation.add(this.items[index]);
            }
            this.index = index;
        }

        set(index) {
            Memento.register(this);
            if (index!=this.index) {
                if (this.items[this.index]) {
                    this.rotation.remove(this.items[this.index]);
                }
                if (this.items[index]) {
                    this.rotation.add(this.items[index]);
                }
                this.index = index;
            }
        }

        memorize() {
            return {
                visible : this.visible,
                index : this.index,
                component : Memento.registerSVGTranslation(this.component),
                rotation : Memento.registerSVGRotation(this.rotation)
            }
        }

        revert(memento) {
            this.visible = memento.visible;
            this.index = memento.index;
            Memento.revertSVGTranslation(memento.component, this.component);
            Memento.revertSVGRotation(memento.rotation, this.rotation);
            this._draw();
        }

        follow(x, y, dir=0) {
            Memento.register(this);
            this.visible = true;
            this.component.move(x, y);
            this.rotation.rotate(this.link.angle()+dir*180);
            this._draw();
            return this;
        }

        _draw() {
            this.component.opacity(this.visible?1:0);
        }
    }

    function triangle() {
        return new svg.Translation()
            .add(new svg.Path(0, 0).line(-16, 32).line(16, 32).line(0, 0)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK));
    }

    function arrow() {
        return new svg.Translation()
            .add(new svg.Line(0, 0, -8, 20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK))
            .add(new svg.Line(0, 0, 8, 20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK));
    }

    function plainArrow() {
        return new svg.Translation()
            .add(new svg.Path(0, 0).line(-8, 20).line(8, 20).line(0, 0)
                .color(svg.ALMOST_BLACK, 1, svg.ALMOST_BLACK));
    }

    function reversedArrow() {
        return new svg.Translation()
            .add(new svg.Line(0, 0, -8, -20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK))
            .add(new svg.Line(0, 0, 8, -20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK));
    }

    function blackLosange() {
        return new svg.Translation()
            .add(new svg.Path(0, 0).line(-8, -16).line(0, -32).line(8, -16).line(0, 0)
                .color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK));
    }

    function whiteLosange() {
        return new svg.Translation()
            .add(new svg.Path(0, 0).line(-8, -16).line(0, -32).line(8, -16).line(0, 0)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK));
    }

    const FLOATING_DISTANCE = 20;
    const LABEL_SIZE = 150;
    const CARDINALITY_SIZE = 50;


    class SimpleLink extends Link {

        constructor(id, node, termination, ...args) {
            super(id, node,...args);
            this.label = new Floating(this, 0.5, FLOATING_DISTANCE, LABEL_SIZE, "?");
            this.endTermination = new Termination(this, [termination()]);
            this.component.add(this.endTermination.component);
            this._draw();
        }

        shown() {
            super.shown();
            this.schema.putFloatings(this.label);
            return this;
        }

        hidden() {
            super.hidden();
            this.label.remove();
            return this;
        }

        selectFloatings() {
            super.selectFloatings();
            this.label.select();
        }

        unselectFloatings() {
            super.unselectFloatings();
            this.label.unselect();
        }

        updateFloatings() {
            super.updateFloatings();
            this.label && this.label.follow();
        }

        updateTerminations() {
            super.updateTerminations();
            if (this.px1 && this.px2) {
                this.endTermination && this.endTermination.follow(this.px2, this.py2);
            }
            else {
                this.endTermination && this.endTermination.follow(this.dx2, this.dy2);
            }
        }

    }

    class EquippedLink extends Link {

        constructor(id, node, labelDefault, beginTerminaisons, endTerminaisons, ...args) {
            super(id, node,...args);
            this.label = new Floating(this, 0.5, FLOATING_DISTANCE, LABEL_SIZE, labelDefault);
            this.beginTermination = new Termination(this, beginTerminaisons);
            this.component.add(this.beginTermination.component);
            this.endTermination = new Termination(this, endTerminaisons);
            this.component.add(this.endTermination.component);
        }

        shown() {
            super.shown();
            this.schema.putFloatings(this.label);
            return this;
        }

        hidden() {
            super.hidden();
            this.label.remove();
            return this;
        }

        selectFloatings() {
            super.selectFloatings();
            this.label.select();
        }

        unselectFloatings() {
            super.unselectFloatings();
            this.label.unselect();
        }

        showSensors() {
            super.showSensors();
            if (!this.anchors.s1 && (this.px1||this.dx1) && (this.px2||this.dy2)) {
                let x1, x2, y1, y2;
                if (this.px1 && this.px2) {
                    [x1, x2, y1, y2] = [this.px1, this.px2, this.py1, this.py2];
                }
                else {
                    [x1, x2, y1, y2] = [this.dx1, this.dx2, this.dy1, this.dy2];
                }
                this.anchors.s1 = new Sensor(x1, y1, ()=> {
                    this.beginTermination.switch();
                    return true;
                });
                this.anchors.s2 = new Sensor(x2, y2, ()=> {
                    this.endTermination.switch();
                    return true;
                });
                this.schema.putAnchors(this.anchors.s1, this.anchors.s2);
            }
        }

        hideSensors() {
            super.hideSensors();
            if (this.anchors.s1) {
                this.schema.removeAnchors(this.anchors.s1, this.anchors.s2);
                delete this.anchors.s1;
                delete this.anchors.s2;
            }
        }

        updateSensors() {
            super.updateSensors();
            if (this.anchors.s1) {
                if (this.px1) {
                    this.anchors.s1.adjust(this.px1, this.py1);
                }
                else if (this.dx1) {
                    this.anchors.s1.adjust(this.dx1, this.dy1);
                }
            }
            if (this.anchors.s2) {
                if (this.px2) {
                    this.anchors.s2.adjust(this.px2, this.py2);
                }
                else if (this.dx1) {
                    this.anchors.s2.adjust(this.dx2, this.dy2);
                }
            }
        }

        updateFloatings() {
            super.updateFloatings();
            this.label && this.label.follow();
        }

        updateTerminations() {
            super.updateTerminations();
            if (this.px1 && this.px2) {
                this.endTermination && this.endTermination.follow(this.px2, this.py2);
                this.beginTermination && this.beginTermination.follow(this.px1, this.py1);
            }
            else {
                this.endTermination && this.endTermination.follow(this.dx2, this.dy2);
                this.beginTermination && this.beginTermination.follow(this.dx1, this.dy1, 1);
            }
        }

    }

    class Relationship extends EquippedLink {

        constructor(id, node, ...args) {
            super(id, node,
                "title",
                [null, blackLosange(), whiteLosange()],
                [null, arrow()],
                ...args);
            this.beginCardinality = new Floating(this, 0.1, FLOATING_DISTANCE, CARDINALITY_SIZE, "1?");
            this.endCardinality = new Floating(this, 0.9, FLOATING_DISTANCE, CARDINALITY_SIZE, "2?");
            this._draw();
        }

        shown() {
            super.shown();
            this.schema.putFloatings(this.beginCardinality, this.endCardinality);
            return this;
        }

        hidden() {
            super.hidden();
            this.beginCardinality.remove();
            this.endCardinality.remove();
            return this;
        }

        selectFloatings() {
            super.selectFloatings();
            this.beginCardinality.select();
            this.endCardinality.select();
        }

        unselectFloatings() {
            super.unselectFloatings();
            this.beginCardinality.unselect();
            this.endCardinality.unselect();
        }

        updateFloatings() {
            super.updateFloatings();
            this.beginCardinality && this.beginCardinality.follow();
            this.endCardinality && this.endCardinality.follow();
        }

    }

    class Inherit extends SimpleLink {

        constructor(id, node, ...args) {
            super(id, node, triangle,...args);
        }

    }

    class Realization extends SimpleLink {

        constructor(id, node, ...args) {
            super(id, node, triangle,...args);
            this.line.dash("8,5,8,5");
        }

    }

    class Dependancy extends EquippedLink {

        constructor(id, node, ...args) {
            super(id, node,
                "?",
                [null, reversedArrow()],
                [null, arrow()],
                ...args);
            this.line.dash("8,5,8,5");
            this._draw();
        }

    }

    const MESSAGE_HEIGHT_MARGIN = 40;

    class MessageLink extends SimpleLink {

        constructor(id, node, terminaison, ...args) {
            super(id, node, terminaison,...args);
        }

        adjustBegin(x, y) {
            this.h1.x = x;
            this.h1.y = y;
            this.h2.y = y-this.h2.node.y;
            if (this.margin) {
                this.h2.y+=MESSAGE_HEIGHT_MARGIN;
            }
            this.adjustFollow(this.h2.node);
            this.adjustAnchor(this.h2, this.anchors.p2);
        }

        adjustEnd(x, y) {
            this.h2.x = x;
            let pt = this.point(this.h1);
            if (y>pt.y+MESSAGE_HEIGHT_MARGIN) {
                this.h2.y = pt.y + MESSAGE_HEIGHT_MARGIN;
                this.margin = true;
            }
            else {
                this.h2.y = pt.y;
                delete this.margin;
            }
        }

        computeAutoBounds() {
            let node = this.h1.node || this.h2.node;
            let pt1 = this.point(this.h1);
            let pt2 = this.point(this.h2);
            this.dy1 = pt1.y;
            this.dy2 = pt2.y;
            this.cy = 0;
            this.dx1 = this.dx2 = node.bounds().right;
            this.cx = CONTROL;
        }

        adjustFollow(node) {
            let pt1 = this.point(this.h1);
            let pt2 = this.point(this.h2);
            this.h2.x = pt2.x;
            this.h2.y = pt1.y;
            if (this.margin) {
                this.h2.y += MESSAGE_HEIGHT_MARGIN;
            }
            this.h2.node.adjustHandler(this.h2);
            if (this.h2.y > this.h2.node.height) {
                this.h2.node.dimension(this.h2.y);
            }
            else if (this.h2.y<0) {
                this.h1.y-=this.h2.y;
                this.h2.y = 0;
                if (this.h1.node && this.h1.y > this.h1.node.height) {
                    this.h1.node.dimension(this.h1.y);
                }
            }
            this.adjustAnchor(this.h1, this.anchors.p1);
            this.adjustAnchor(this.h2, this.anchors.p2);
        }

        memorize() {
            let memento = super.memorize();
            memento.margin = this.margin;
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this.margin = memento.margin;
            this._draw();
        }
    }

    class Request extends MessageLink {

        constructor(id, node, ...args) {
            super(id, node, plainArrow,...args);
        }

    }

    class AsyncRequest extends MessageLink {

        constructor(id, node, ...args) {
            super(id, node, arrow,...args);
        }

    }

    class Response extends MessageLink {

        constructor(id, node, ...args) {
            super(id, node, arrow,...args);
            this.line.dash("8,5,8,5");
        }

    }

    /*
    class Taratata extends MessageLink {

        constructor(id, node, ...args) {
            super(id, node, arrow,...args);
            //this.line.dash("8,5,8,5");
        }

    }
*/

    class Floating extends Item {

        constructor(link, ratio, distance, width, message) {
            super(null);
            this.link = link;
            this.ratio = ratio;
            this.distance = distance;
            this._message = message;
            this.component = new svg.Translation();
            this.text = new gui.TextField(0, 0, width, FIELD_HEIGHT, message)
                .font("arial", 16)
                .anchor("center")
                .color([svg.ALMOST_WHITE, 2, svg.ALMOST_WHITE]);
            this.text.editColor([svg.LIGHT_GREY, 2, svg.LIGHT_GREY]);
            this.text.onInput((oldMessage, message, valid)=> {
                Memento.register(this);
                this._message = message;
            }).onBlur(()=>{
                Memento.begin();
            });
            this.component.add(this.text.component);
            this.anchor = new Anchor(0, 0,
                (x, y)=>{
                    this.adjust(x, y);
                    return {x:x, y:y}
                },
                (x, y)=>{
                    this.adjust(x, y);
                    return {x:x, y:y}
                }
            );
        }

        message(message) {
            Memento.register(this);
            this._message = message;
            this.text.message(message);
        }

        shown() {
        }

        hidden() {
        }

        select() {
            this.schema.putAnchors(this.anchor);
        }

        unselect() {
            this.schema.removeAnchors(this.anchor);
        }

        remove() {
            this.schema.removeFloatings(this);
            this.schema.removeAnchors(this.anchor);
        }

        set(ratio, distance, message) {
            Memento.register(this);
            this.ratio = ratio;
            this.distance = distance;
            this._message = message;
            this.text.message(this._message);
            this.follow();
        }

        adjust(x, y) {
            Memento.register(this);
            ({ratio:this.ratio, distance:this.distance} = this.link.computeParameters(x, y+FIELD_HEIGHT));
            this.follow();
        }

        memorize() {
            let memento = {};
            memento.link = this.link;
            memento.ratio = this.ratio;
            memento.distance = this.distance;
            memento.message = this._message;
            memento.visible = this.visible;
            memento.component = Memento.registerSVGTranslation(this.component);
            return memento;
        }

        revert(memento) {
            this.link = memento.link;
            this.ratio = memento.ratio;
            this.distance = memento.distance;
            this._message = memento.message;
            this.visible = memento.visible;
            this.text.message(this._message);
            Memento.revertSVGTranslation(memento.component, this.component);
            this._draw();
        }

        follow() {
            Memento.register(this);
            this.visible = true;
            let point = this.link.computePosition(this.ratio, this.distance);
            this.component.move(point.x, point.y);
            this.anchor.adjust(point.x, point.y - FIELD_HEIGHT);
            this._draw();
            return this;
        }

        _draw() {
            this.component.opacity(this.visible?1:0);
        }

    }

    const REQUEST_LABEL = "request";
    const RESPONSE_LABEL = "response";
    const ASYNC_LABEL = "async";

    class SchemaBuilder {

        spec(schema) {
            let spec = {
                idgen : schema.idgen,
                width : schema.component.width,
                height : schema.component.height,
                clazzes : this.processArray(schema.nodes.filter(node=>node instanceof Clazz).map(clazz=>{
                    let nd = this.nodeSpec(clazz);
                    nd.title=clazz.title();
                    nd.content=clazz.content();
                    nd.status=clazz.status;
                    nd.lineShown=clazz.lineShown;
                    nd.lineHeight=clazz.line.height;
                    return nd;
                })),
                objects : this.processArray(schema.nodes.filter(node=>node instanceof Object).map(object=>{
                    let nd = this.nodeSpec(object);
                    nd.title=object.title();
                    nd.content=object.content();
                    nd.status=object.status;
                    nd.lineShown=object.lineShown;
                    nd.lineHeight=object.line.height;
                    return nd;
                })),
                comments : this.processArray(schema.nodes.filter(node=>node instanceof Comment).map(object=>{
                    let nd = this.nodeSpec(object);
                    nd.content=object.content();
                    return nd;
                })),
                inherits : this.processArray(schema.links.filter(link=>link instanceof Inherit).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.comment = this.floatingSpec(link.label);
                    return ls;
                })),
                relationships : this.processArray(schema.links.filter(link=>link instanceof Relationship).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.title = this.floatingSpec(link.label);
                    ls.beginCardinality = this.floatingSpec(link.beginCardinality);
                    ls.endCardinality = this.floatingSpec(link.endCardinality);
                    ls.beginTermination = this.terminationSpec(link.beginTermination, "composition", "aggregation");
                    ls.endTermination = this.terminationSpec(link.endTermination, "arrow");
                    return ls;
                })),
                realizations : this.processArray(schema.links.filter(link=>link instanceof Realization).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.comment = this.floatingSpec(link.label);
                    return ls;
                })),
                dependancies : this.processArray(schema.links.filter(link=>link instanceof Dependancy).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.comment = this.floatingSpec(link.label);
                    ls.beginTermination = this.terminationSpec(link.beginTermination, "reversedArrow");
                    ls.endTermination = this.terminationSpec(link.endTermination, "arrow");
                    return ls;
                })),
                messages : this.processArray(schema.links.filter(link=>link instanceof MessageLink).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.type = this.messageTypeLabel(link);
                    ls.label = this.floatingSpec(link.label);
                    return ls;
                }))
            };
            return spec;
        }

        processArray(array) {
            if (array.empty()) {
                return undefined;
            }
            return array;
        }

        nodeSpec(node) {
            return {
                id:node.id,
                x:node.x,
                y:node.y,
                width:node.width,
                height:node.height
            };
        }

        linkSpec(link) {
            return {
                id:link.id,
                from:{id:link.h1.node.id, x:link.h1.x, y:link.h1.y},
                to:{id:link.h2.node.id, x:link.h2.x, y:link.h2.y}
            }
        }

        floatingSpec(floating) {
            return {
                ratio : floating.ratio,
                distance : floating.distance,
                message : floating._message
            }
        }

        terminationSpec(termination, ...items) {
            return termination.index === 0?0:items[termination.index-1]
        }

        schema(desc) {
            let schema = new Schema(desc.idgen, desc.width, desc.height);
            desc.clazzes && desc.clazzes.forEach(descClazz=>{
                let clazz = new Clazz(descClazz.id, descClazz.width, descClazz.height,descClazz.x, descClazz.y)
                        .title(descClazz.title).content(descClazz.content);
                schema.putNode(clazz);
                if (descClazz.status==="closed") clazz.hideBody();
                if (descClazz.lineShown) {
                    clazz.showRelatedNodes();
                    clazz.line.dimension(descClazz.lineHeight);
                }
                clazz._draw();
            });
            desc.objects && desc.objects.forEach(descObject=>{
                let object = new Object(descObject.id, descObject.width, descObject.height,descObject.x, descObject.y)
                    .title(descObject.title).content(descObject.content);
                schema.putNode(object);
                if (descObject.status==="closed") object.hideBody();
                if (descObject.lineShown) {
                    object.showRelatedNodes();
                    object.line.dimension(descObject.lineHeight);
                }
                object._draw();
            });
            desc.comments && desc.comments.forEach(descComment=>{
                let comment = new Comment(descComment.id, descComment.width, descComment.height,descComment.x, descComment.y)
                    .content(descComment.content);
                schema.putNode(comment);
                comment._draw();
            });
            desc.inherits && desc.inherits.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Inherit);
                this.floating(link.label, descLink.comment);
                link._draw();
            });
            desc.relationships && desc.relationships.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Relationship);
                this.termination(link.endTermination, descLink.endTermination, "arrow");
                this.termination(link.beginTermination, descLink.beginTermination, "composition", "aggregation");
                this.floating(link.label, descLink.title);
                this.floating(link.beginCardinality, descLink.beginCardinality);
                this.floating(link.endCardinality, descLink.endCardinality);
                link.hideSensors();
                link._draw();
            });
            desc.realizations && desc.realizations.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Realization);
                this.floating(link.label, descLink.comment);
                link._draw();
            });
            desc.dependancies && desc.dependancies.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Dependancy);
                this.termination(link.endTermination, descLink.endTermination, "arrow");
                this.termination(link.beginTermination, descLink.beginTermination, "reversedArrow");
                this.floating(link.label, descLink.comment);
                link.hideSensors();
                link._draw();
            });
            desc.messages && desc.messages.forEach(descLink=>{
                let link = this.buildMessage(descLink, schema);
                this.floating(link.label, descLink.label);
                link._draw();
            });
            return schema;
        }

        messageType(type) {
            if (type===REQUEST_LABEL) {
                return Request;
            }
            else if (type===RESPONSE_LABEL) {
                return Response;
            }
            else if (type===ASYNC_LABEL) {
                return AsyncRequest;
            }
            else {
                throw "Unknown message type : "+type;
            }
        }

        messageTypeLabel(link) {
            if (link instanceof Request) {
                return REQUEST_LABEL;
            }
            else if (link instanceof Response) {
                return RESPONSE_LABEL;
            }
            else if (link instanceof AsyncRequest) {
                return ASYNC_LABEL;
            }
            else {
                throw "Unknown message class : "+link.constructor;
            }
        }

        buildLink(descLink, schema, Link) {
            let fromNode = schema.nodeFromId(descLink.from.id);
            let toNode = schema.nodeFromId(descLink.to.id);
            let link = new Link(descLink.id);
            schema.putLink(link);
            link.begin(fromNode, descLink.from.x, descLink.from.y);
            link.end(toNode, descLink.to.x, descLink.to.y);
            return link;
        }

        buildMessage(descLink, schema) {
            let linkType = this.messageType(descLink.type);
            let fromNode = schema.nodeFromId(descLink.from.id);
            let toNode = schema.nodeFromId(descLink.to.id);
            let link = new linkType(descLink.id);
            schema.putLink(link);
            link.begin(fromNode.line, descLink.from.x, descLink.from.y);
            link.end(toNode.line, descLink.to.x, descLink.to.y);
            return link;
        }

        termination(termination, descTermination, ...items) {
            let index = !descTermination?0:items.findIndex(item=>item===descTermination)+1;
            termination.set(index);
        }

        floating(floating, descFloating) {
            if (descFloating) {
                floating.set(descFloating.ratio, descFloating.distance, descFloating.message);
            }
        }
    }

    function installDnD(what, glass, doDrag, doSelect, doMove, doClick, beginDrag) {
        if (what===undefined) {
            svg.bug();
        }
        what.addEvent('mousedown', event=> {
            if (what.component.parent===glass.scale) {
                console.log("Already on glass !");
            }
            install(what.component.parent.localPoint(event.x, event.y));
        });
        if (beginDrag) {
            install({x:what.x, y:what.y});
        }

        function install(delta) {
            let whatParent = what.component.parent;
            let {x:initX, y:initY} = what;
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
                    if (what.dragged) {
                        what.dragged(actualX, actualY);
                    }
                    click = false;
                });
                what.addEvent('mouseup', endEvent=> {
                    what.removeEvent('mousemove');
                    what.removeEvent('mouseup');
                    let depl = whatParent.localPoint(endEvent.x, endEvent.y);
                    let finalX = Math.round(initX + depl.x - delta.x);
                    let finalY = Math.round(initY + depl.y - delta.y);
                    if (what.component.parent===glass.scale) {
                        glass.drop(what.component, whatParent, finalX, finalY);
                    }
                    if (click && endEvent.x === delta.x && endEvent.y === delta.y) {
                        if (!doClick(what)) {
                            Memento.rollback(true);
                        }
                    }
                    else {
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
        Info : Info,
        Clazz : Clazz,
        Object : Object,
        Comment : Comment,
        Relationship : Relationship,
        Inherit : Inherit,
        Realization : Realization,
        Dependancy : Dependancy,
        Request : Request,
        Response : Response,
        AsyncRequest : AsyncRequest,

        Schema : Schema,
        SchemaBuilder : SchemaBuilder,

        installDnD : installDnD,
        installClick : installClick
    }
};