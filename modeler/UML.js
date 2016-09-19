/**
 * Created by HDA3014 on 22/08/2016.
 */
var Memento = require("../memento").Memento;

console.log("UML Loaded...");
exports.UML = function(svg, gui) {

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
            Memento.register(this);
            svg.addEvent(this.component, eventName, handler);
            this.events[eventName] = handler;
            return this;
        }

        removeEvent(eventName) {
            Memento.register(this);
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

    const MINIMAL_SIZE = 50;

    class Node extends Item {

        constructor(id, width, height, x, y) {
            super(id);
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

        location() {
            return {x:this.x, y:this.y};
        }

        select() {
            Memento.register(this);
            this.schema.select(this);
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
            this.showSensors();
            return this;
        }

        minimalWidth() {
            return MINIMAL_SIZE;
        }

        minimalHeight() {
            return MINIMAL_SIZE;
        }

        unselect() {
            this.schema.unselect(this);
            if (!this.anchors.empty()) {
                this.schema.removeAnchors(this.anchors.ul, this.anchors.ur, this.anchors.dl, this.anchors.dr);
                this.anchors = {};
            }
            this.hideSensors();
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
            this.updateInfos();
            this.updateSensors();
            this._draw();
            return this;
        }

        dragged(x, y) {
            this.x = x;
            this.y = y;
            this.updateLinks();
            this.updateInfos();
            this.updateSensors();
        }

        dimension(width, height) {
            Memento.register(this);
            this.width = width;
            this.height = height;
            this.updateLinks();
            this.updateInfos();
            this.updateSensors();
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
    }

    const FIELD_MARGIN = 10;
    const FIELD_HEIGHT = 24;
    const CLOSE_MARGIN = 15;

    class Clazz extends Node {

        constructor(id, width, height, x, y) {
            super(id, width, height, x, y);
            this.titleBackground = new svg.Rect(10, 10)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.bodyBackground = new svg.Rect(10, 10)
                .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this._title = "ClassName";
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
            this._content = "field : type";
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
            this._resizeContent();
            this._draw();
        }

        className() {
            return this.titleText.textMessage;
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
                this.titleText.dimension(this.width - FIELD_MARGIN * 2, FIELD_HEIGHT)
                    .position(-1, -this.height / 2 + TITLE_HEIGHT / 2);
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
        }

        _draw() {
            super._draw();
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
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._title = memento.title;
            this.titleText.message(this._title);
            this._content = memento.content;
            this.contentText.message(this._content);
            this.status = memento.status;
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
                this.schema.putAnchors(this.statusSensor);
            }
        }

        hideSensors() {
            if (this.statusSensor) {
                this.schema.removeAnchors(this.statusSensor);
                delete this.statusSensor;
            }
        }

        updateSensors() {
            if (this.statusSensor) {
                this.statusSensor.adjust(this.x+this.width/2-CLOSE_MARGIN, this.y-this.height/2+CLOSE_MARGIN);
            }
        }

    }

    const CONTROL = 300;

    class Link extends Item {

        constructor(id, node1, ...args) {
            super(id);
            this.anchors = {};
            if (node1) {
                this.h1 = {x: args[0], y: args[1]};
                this.attach(this.h1, node1);
                node1.addLink(this);
                if (args[0] instanceof Node) {
                    this.h2 = {node: args[0], x: 0, y: 0};
                    args[0].addLink(this);
                }
                else {
                    this.h2 = {x: args[0], y: args[1]};
                }
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
            if (x) {
                handler.x = x;
                handler.y = y;
            }
            else {
                handler.x = (handler.x - handler.node.x) / handler.node.width;
                handler.y = (handler.y - handler.node.y) / handler.node.height;
            }
        }

        point(handler) {
            if (handler.node) {
                return {
                    x:handler.x*handler.node.width+handler.node.x,
                    y:handler.y*handler.node.height+handler.node.y
                }
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
            this.h1.x = x;
            this.h1.y = y;
            this.h1.node = null;
            this.adjustAnchor(this.h1, this.anchors.p1);
            this.updateInfos();
            this.computeBounds();
            this.hideSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return this;
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
            this.h2.x = x;
            this.h2.y = y;
            this.h2.node = null;
            this.adjustAnchor(this.h2, this.anchors.p2);
            if (this.h1) {
                this.updateInfos();
                this.computeBounds();
                this._draw();
            }
            this.hideSensors();
            this.updateTerminations();
            this.updateFloatings();
            return this;
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
            if (node===this.h1.node) {
                this.adjustAnchor(this.h1, this.anchors.p1);
            }
            else if (node===this.h2.node) {
                this.adjustAnchor(this.h2, this.anchors.p2);
            }
            this.updateInfos();
            this.computeBounds();
            this.updateSensors();
            this.updateTerminations();
            this.updateFloatings();
            this._draw();
            return this;
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
                        this.detachBegin(x, y);
                        return {x, y};
                    }, (x, y)=> {
                        let clazz = this.schema.nodeFromPosition(x, y);
                        if (clazz) {
                            this.begin(clazz);
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    let pt2 = this.point(this.h2);
                    this.anchors.p2 = new Anchor(pt2.x, pt2.y, (x, y)=> {
                        this.detachEnd(x, y);
                        return {x, y};
                    }, (x, y)=> {
                        let clazz = this.schema.nodeFromPosition(x, y);
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
                    this.dy1 = this.dy2 = node.y + node.height/2;
                    this.cy = CONTROL;
                }
                else {
                    this.dy1 = this.dy2 = node.y - node.height/2;
                    this.cy = -CONTROL;
                }
            }
            else {
                this.dy1 = pt1.y;
                this.dy2 = pt2.y;
                this.cy = 0;
                if (pt1.x + pt2.x > node.x*2) {
                    this.dx1 = this.dx2 = node.x + node.width/2;
                    this.cx = CONTROL;
                }
                else {
                    this.dx1 = this.dx2 = node.x - node.width/2;
                    this.cx = -CONTROL;
                }
            }
        }

        computeIntersects() {
            function polygon(clazz) {
                return [
                    {x:clazz.x-clazz.width/2, y:clazz.y-clazz.height/2},
                    {x:clazz.x-clazz.width/2, y:clazz.y+clazz.height/2},
                    {x:clazz.x+clazz.width/2, y:clazz.y+clazz.height/2},
                    {x:clazz.x+clazz.width/2, y:clazz.y-clazz.height/2}
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

    const FLOATING_DISTANCE = 20;
    const TITLE_SIZE = 150;
    const CARDINALITY_SIZE = 50;

    class Relationship extends Link {

        constructor(id, node, ...args) {
            super(id, node,...args);
            this.title = new Floating(this, 0.5, FLOATING_DISTANCE, TITLE_SIZE, "title");
            this.beginCardinality = new Floating(this, 0.1, FLOATING_DISTANCE, CARDINALITY_SIZE, "1?");
            this.endCardinality = new Floating(this, 0.9, FLOATING_DISTANCE, CARDINALITY_SIZE, "2?");
            this.beginTermination = new Termination(this, [null, this.blackLosange(), this.whiteLosange()]);
            this.component.add(this.beginTermination.component);
            this.endTermination = new Termination(this, [null, this.arrow()]);
            this.component.add(this.endTermination.component);
            this._draw();
        }

        shown() {
            this.schema.putFloatings(this.title, this.beginCardinality, this.endCardinality);
            return this;
        }

        hidden() {
            super.hidden();
            this.title.remove();
            this.beginCardinality.remove();
            this.endCardinality.remove();
            return this;
        }

        memorize() {
            let memento = super.memorize();
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._draw();
        }

        selectFloatings() {
            this.title.select();
            this.beginCardinality.select();
            this.endCardinality.select();
        }

        unselectFloatings() {
            this.title.unselect();
            this.beginCardinality.unselect();
            this.endCardinality.unselect();
        }

        showSensors() {
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
            if (this.anchors.s1) {
                this.schema.removeAnchors(this.anchors.s1, this.anchors.s2);
                delete this.anchors.s1;
                delete this.anchors.s2;
            }
        }

        updateSensors() {
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
            if (this.px1 && this.px2) {
                this.title && this.title.follow();
                this.beginCardinality && this.beginCardinality.follow();
                this.endCardinality && this.endCardinality.follow();
            }
            else {
                this.title && this.title.follow();
                this.beginCardinality && this.beginCardinality.follow();
                this.endCardinality && this.endCardinality.follow();
            }
        }

        updateTerminations() {
            if (this.px1 && this.px2) {
                this.endTermination && this.endTermination.follow(this.px2, this.py2);
                this.beginTermination && this.beginTermination.follow(this.px1, this.py1);
            }
            else {
                this.endTermination && this.endTermination.follow(this.dx2, this.dy2);
                this.beginTermination && this.beginTermination.follow(this.dx1, this.dy1, 1);
            }
        }

        arrow() {
            return new svg.Translation()
                .add(new svg.Line(0, 0, -8, 20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK))
                .add(new svg.Line(0, 0, 8, 20).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK));
        }

        blackLosange() {
            return new svg.Translation()
                .add(new svg.Path(0, 0).line(-8, -16).line(0, -32).line(8, -16).line(0, 0)
                    .color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK));
        }

        whiteLosange() {
            return new svg.Translation()
                .add(new svg.Path(0, 0).line(-8, -16).line(0, -32).line(8, -16).line(0, 0)
                    .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK));
        }
    }

    class Inherit extends Link {

        constructor(id, node, ...args) {
            super(id, node,...args);
            this.endTermination = new Termination(this, [this.triangle()]);
            this.component.add(this.endTermination.component);
            this._draw();
        }

        updateTerminations() {
            if (this.px1 && this.px2) {
                this.endTermination && this.endTermination.follow(this.px2, this.py2);
            }
            else {
                this.endTermination && this.endTermination.follow(this.dx2, this.dy2);
            }
        }

        begin(node, x, y) {
            super.begin(node, x, y);
            this.updateTerminations();
            return this;
        }

        detachBegin(x, y) {
            super.detachBegin(x, y);
            this.updateTerminations();
            return this;
        }

        end(node, x, y) {
            super.end(node, x, y);
            this.updateTerminations();
            return this;
        }

        detachEnd(x, y) {
            super.detachEnd(x, y);
            this.updateTerminations();
            return this;
        }

        follow(node) {
            super.follow(node);
            this.updateTerminations();
            return this;
        }

        memorize() {
            let memento = super.memorize();
            return memento;
        }

        revert(memento) {
            super.revert(memento);
            this._draw();
        }

        _draw() {
            super._draw();
            if (this.endTermination && this.px2) {
                this.endTermination._draw(this.px2, this.py2);
            }
        }

        triangle() {
            return new svg.Translation()
                .add(new svg.Path(0, 0).line(-16, 32).line(16, 32).line(0, 0)
                    .color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK));
        }
    }

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

    class SchemaBuilder {

        spec(schema) {
            let spec = {
                idgen : schema.idgen,
                width : schema.component.width,
                height : schema.component.height,
                clazzes : schema.nodes.filter(node=>node instanceof Clazz).map(clazz=>{
                    let nd = this.nodeSpec(clazz);
                    nd.title=clazz.title();
                    nd.content=clazz.content();
                    nd.status=clazz.status;
                    return nd;
                }),
                inherits : schema.links.filter(link=>link instanceof Inherit).map(link=>this.linkSpec(link)),
                relationships : schema.links.filter(link=>link instanceof Relationship).map(link=>{
                    let ls = this.linkSpec(link);
                    ls.title = this.floatingSpec(link.title);
                    ls.beginCardinality = this.floatingSpec(link.beginCardinality);
                    ls.endCardinality = this.floatingSpec(link.endCardinality);
                    ls.beginTermination = this.terminationSpec(link.beginTermination, "composition", "aggregation");
                    ls.endTermination = this.terminationSpec(link.endTermination, "arrow");
                    return ls;
                })
            };
            return spec;
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
            desc.clazzes.forEach(descClazz=>{
                let clazz = new Clazz(descClazz.id, descClazz.width, descClazz.height,descClazz.x, descClazz.y)
                        .title(descClazz.title).content(descClazz.content);
                if (descClazz==="closed") clazz.hideBody()
                schema.putNode(clazz);
                clazz._draw();
            });
            desc.inherits.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Inherit);
                link._draw();
            });
            desc.relationships.forEach(descLink=>{
                let link = this.buildLink(descLink, schema, Relationship);
                this.termination(link.endTermination, descLink.endTermination, "arrow");
                this.termination(link.beginTermination, descLink.beginTermination, "composition", "aggregation");
                this.floating(link.title, descLink.title);
                this.floating(link.beginCardinality, descLink.beginCardinality);
                this.floating(link.endCardinality, descLink.endCardinality);
                link.hideSensors();
                link._draw();
            });
            return schema;
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

        termination(termination, descTermination, ...items) {
            let index = !descTermination?0:items.findIndex(item=>item===descTermination)+1;
            termination.set(index);
        }

        floating(floating, descFloating) {
            floating.set(descFloating.ratio, descFloating.distance, descFloating.message);
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
        Relationship : Relationship,
        Inherit : Inherit,

        Schema : Schema,
        SchemaBuilder : SchemaBuilder,

        installDnD : installDnD,
        installClick : installClick
    }
};