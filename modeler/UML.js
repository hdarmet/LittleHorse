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
            this.clazzSupport = new svg.Translation();
            this.linkSupport = new svg.Translation();
            this.anchorSupport = new svg.Translation();
            this.component
                .add(this.background)
                .add(this.clazzSupport)
                .add(this.linkSupport)
                .add(this.anchorSupport);
            this.clazzes = [];
            this.links = [];
            this.selected = null;
        }

        linkMode() {
            Memento.register(this);
            if (this.selected) {
                this.selected.unselect();
            }
            this.clazzSupport.active(false);
        }

        getClazz(x, y) {
            return this.clazzes.find(clazz=>clazz.inside(x, y));
        }

        classMode() {
            Memento.register(this);
            if (this.selected) {
                this.selected.unselect();
            }
            this.clazzSupport.active(true);
        }

        putClazz(clazz) {
            Memento.register(this);
            clazz.schema = this;
            this.clazzes.push(clazz);
            this.clazzSupport.add(clazz.component);
            return this;
        }

        removeClazz(clazz) {
            Memento.register(this);
            this.clazzes.remove(clazz);
            this.clazzSupport.remove(clazz.component);
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
            anchors.forEach(anchor=>this.anchorSupport.add(anchor.component));
            return this;
        }

        removeAnchors(...anchors) {
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
                clazzSupport : Memento.registerSVGTranslation(this.clazzSupport),
                linkSupport : Memento.registerSVGTranslation(this.linkSupport),
                anchorSupport : Memento.registerSVGTranslation(this.anchorSupport),
                clazzes : Memento.registerArray(this.clazzes),
                links : Memento.registerArray(this.links),
                selected : this.selected
            }
        }

        revert(memento) {
            Memento.revertSVGTranslation(memento.component, this.component);
            this.width = memento.width;
            this.height = memento.height,
            Memento.revertSVGTranslation(memento.clazzSupport, this.clazzSupport);
            Memento.revertSVGTranslation(memento.linkSupport, this.linkSupport);
            Memento.revertSVGTranslation(memento.anchorSupport, this.anchorSupport);
            Memento.revertArray(memento.clazzes, this.clazzes);
            Memento.revertArray(memento.links, this.links);
            this.selected = memento.selected;
        }
    }

    const TITLE_HEIGHT = 50;
    const ANCHOR_SIZE = 10;

    class Anchor {
        constructor(x, y, update, finalize) {
            this.x = x;
            this.y = y;
            this.update = update;
            this.finalize = finalize;
            this.component = new svg.Translation().add(
                new svg.Rect(ANCHOR_SIZE, ANCHOR_SIZE).color(svg.ALMOST_WHITE, 1, svg.ALMOST_BLACK));
            this.events = {};
            this.addEvent("click", (event)=>{});
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
                events : Memento.registerObject(this.events)
            };
            return memento;
        }

        revert(memento) {
            ({x:this.x, y:this.y}=memento);
            for (let eventName in this.events) {
                svg.addEvent(this.component, eventName, this.events[eventName]);
            }
            this._draw();
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
    }

    const MINIMAL_SIZE = 50;

    class Clazz {

        constructor(width, height, x, y) {
            this.width = width;
            this.height = height;
            this.x = x;
            this.y = y;
            this.background = new svg.Rect(this.width, this.height).color(svg.ALMOST_WHITE, 3, svg.ALMOST_WHITE);
            this.title = new svg.Rect(this.width, TITLE_HEIGHT).color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.body = new svg.Rect(this.width, this.height-TITLE_HEIGHT).color(svg.ALMOST_WHITE, 2, svg.ALMOST_BLACK);
            this.component = new svg.Translation()
                .add(this.background)
                .add(this.title)
                .add(this.body);
            this.events = {};
            this.anchors = {};
            this.links = [];
            this.addEvent("click", (event)=>{});
            this._draw();
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

        inside(x, y) {
            return this.x-this.width/2<x && this.x+this.width/2>x && this.y-this.height/2<y && this.y+this.height/2>y;
        }

        _draw() {
            this.component.move(this.x, this.y);
            this.background.dimension(this.width, this.height).position(0, 0);
            this.title.dimension(this.width, TITLE_HEIGHT).position(0, -this.height/2+TITLE_HEIGHT/2);
            this.body.dimension(this.width, this.height-TITLE_HEIGHT).position(0, TITLE_HEIGHT/2);
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

        memorize() {
            let memento = {
                width : this.width,
                height : this.height,
                x : this.x,
                y : this.y,
                anchors : Memento.registerObject(this.anchors),
                events : Memento.registerObject(this.events),
                links : Memento.registerArray(this.links)
            };
            return memento;
        }

        revert(memento) {
            [this.x, this.y, this.width, this.height] = [memento.x, memento.y, memento.width, memento.height];
            Memento.revertObject(memento.events, this.events);
            Memento.revertObject(memento.anchors, this.anchors);
            Memento.revertArray(memento.links, this.links);
            for (let eventName in this.events) {
                svg.addEvent(this.component, eventName, this.events[eventName]);
            }
            this._draw();
        }
    }

    class Relationship {
        constructor(clazz1, ...args) {
            this.line = new svg.Line(0, 0, 0, 0).color(svg.ALMOST_BLACK, 2, svg.ALMOST_BLACK);
            this.component = new svg.Translation().add(this.line);
            this.anchors = {};
            this.events = {};
            this.begin(clazz1);
            if (args[0] instanceof Clazz) {
                this.end(args[0]);
            }
            else {
                [this.x2, this.y2] = args;
            }
            this._draw();
        }

        begin(clazz) {
            Memento.register(this);
            this.clazz1 = clazz;
            clazz.addLink(this);
            this.x1 = null;
            this.y1 = null;
            this.anchors.p1 && this.anchors.p1.adjust(this.clazz1.x, this.clazz1.y);
            this._draw();
            return this;
        }

        detachBegin(x, y) {
            Memento.register(this);
            this.clazz1 && this.clazz1.removeLink(this);
            this.x1 = x;
            this.y1 = y;
            this.clazz1 = null;
            this.anchors.p1 && this.anchors.p1.adjust(this.x1, this.y1);
            this._draw();
            return this;
        }

        end(clazz) {
            Memento.register(this);
            this.clazz2 = clazz;
            clazz.addLink(this);
            this.x2 = null;
            this.y2 = null;
            this.anchors.p2 && this.anchors.p2.adjust(this.clazz2.x, this.clazz2.y);
            this._draw();
            return this;
        }

        detachEnd(x, y) {
            Memento.register(this);
            this.clazz2 && this.clazz2.removeLink(this);
            this.x2 = x;
            this.y2 = y;
            this.clazz2 = null;
            this.anchors.p2 && this.anchors.p2.adjust(this.x2, this.y2);
            this._draw();
            return this;
        }

        follow(clazz) {
            Memento.register(this);
            if (clazz===this.clazz1) {
                this.anchors.p1 && this.anchors.p1.adjust(this.clazz1.x, this.clazz1.y);
                this._draw();
            }
            else if (clazz===this.clazz2) {
                this.anchors.p2 && this.anchors.p2.adjust(this.clazz2.x, this.clazz2.y);
                this._draw();
            }
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
                    let clazz = this.schema.getClazz(x, y);
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
                    let clazz = this.schema.getClazz(x, y);
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

        _draw() {
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
            if (this.clazz1) {
                this.x1 = this.clazz1.x;
                this.y1 = this.clazz1.y;
            }
            if (this.clazz2) {
                this.x2 = this.clazz2.x;
                this.y2 = this.clazz2.y;
            }
            if (this.clazz1) {
                let intersects = svg.intersectLinePolygon(
                    point(this.clazz1), {x:this.x2, y:this.y2}, polygon(this.clazz1));
                if (!intersects.empty()) {
                    ({x: this.px1, y: this.py1} = intersects[0]);
                }
            }
            else {
                this.px1 = this.x1;
                this.py1 = this.y1;
            }
            if (this.clazz2) {
                let intersects = svg.intersectLinePolygon(
                    {x:this.x1, y:this.y1}, point(this.clazz2), polygon(this.clazz2));
                if (!intersects.empty()) {
                    ({x: this.px2, y: this.py2} = intersects[0]);
                }
            }
            else {
                this.px2 = this.x2;
                this.py2 = this.y2;
            }
            if (this.px1 && this.px2) {
                this.line.start(this.px1, this.py1);
                this.line.end(this.px2, this.py2);
                this.line.opacity(1);
            }
            else {
                this.line.opacity(0);
            }
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

        memorize() {
            return {
                x1 : this.x1,
                y1 : this.y1,
                clazz1 : this.clazz1,
                x2 : this.x2,
                y2 : this.y2,
                clazz2 : this.clazz2,
                anchors : Memento.registerObject(this.anchors),
                events : Memento.registerObject(this.events)
            }
        }

        revert(memento) {
            ({x1:this.x1, y1:this.y1, clazz1:this.clazz1, x2:this.x1, y2:this.y1, clazz2:this.clazz2} = memento);
            Memento.revertObject(memento.events, this.events);
            Memento.revertObject(memento.anchors, this.anchors);
            for (let eventName in this.events) {
                svg.addEvent(this.component, eventName, this.events[eventName]);
            }
            this._draw();
        }
    }

    class SchemaBuilder {

        spec(schema) {
            let spec = {
                width : schema.component.width,
                height : schema.component.height,
                clazzes : schema.clazzes.map(clazz=>({
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
            desc.clazzes.forEach(descClazz=>schema.putClazz(
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
        what.addEvent('mouseclick', event=> {
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