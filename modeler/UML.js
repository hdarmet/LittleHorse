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
            this.component
                .add(this.background)
                .add(this.clazzSupport);
            this.clazzes = [];
        }

        putClazz(clazz) {
            Memento.register(this);
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

        memorize() {
            return {
                component : Memento.registerSVGTranslation(this.component),
                width : this.component.width,
                height : this.component.height,
                clazzSupport : Memento.registerSVGTranslation(this.clazzSupport),
                clazzes : Memento.registerArray(this.clazzes)
            }
        }

        revert(memento) {
            Memento.revertSVGTranslation(memento.component, this.component);
            this.width = memento.width;
            this.height = memento.height,
            Memento.revertSVGTranslation(memento.clazzSupport, this.clazzSupport);
            Memento.revertArray(memento.clazzes, this.clazzes);
        }
    }

    const TITLE_HEIGHT = 50;

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
            this.addEvent("click", (event)=>{});
            this._draw();
        }

        _draw() {
            this.component.move(this.x, this.y);
            this.background.dimension(this.width, this.height).position(0, 0);
            this.title.dimension(this.width, TITLE_HEIGHT).position(0, -this.height/2+TITLE_HEIGHT/2);
            this.body.dimension(this.width, this.height-TITLE_HEIGHT).position(0, TITLE_HEIGHT/2);
        }

        move(x, y) {
            Memento.register(this);
            this.x = x;
            this.y = y;
            this._draw();
        }

        dimension(width, height) {
            Memento.register(this);
            this.width = width;
            this.height = height;
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

        memorize() {
            let memento = {
                width : this.width,
                height : this.height,
                x : this.x,
                y : this.y,
                events : Memento.registerObject(this.events)
            };
            return memento;
        }

        revert(memento) {
            [this.x, this.y, this.width, this.height] = [memento.x, memento.y, memento.width, memento.height];
            Memento.revertObject(memento.events, this.events);
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

    function installDnD(what, glass, doSelect, doMove, doClick) {
        what.addEvent('mousedown', event=> {
            let whatParent = what.component.parent;
            let delta = whatParent.localPoint(event.x, event.y);
            let local = what.component.localPoint(event.x, event.y);
            let {x:initX, y:initY, angle:initAngle} = what;
            if (doSelect(what)) {
                let click = true;
                what.addEvent('mousemove', moveEvent=> {
                    let depl = whatParent.localPoint(moveEvent.x, moveEvent.y);
                    glass.drag(what.component, whatParent, initX + depl.x - delta.x, initY + depl.y - delta.y);
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
        });
    }

    return {
        Clazz : Clazz,

        Schema : Schema,
        SchemaBuilder : SchemaBuilder,

        installDnD : installDnD
    }
};