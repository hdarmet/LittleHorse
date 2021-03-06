/**
 * Created by HDA3014 on 06/02/2016.
 */
var Memento = require("./memento").Memento;

console.log("File Manager loaded");
exports.FileManager = function(svg, gui) {

    class FileGrid extends gui.Grid {

        constructor() {
            super(600, 400, 40);
            this.textColumn(10, 590, "name");
        }
    }

    class SaveAsPopin extends gui.Popin {

        constructor(manager) {
            super(1000, 700);
            this.manager = manager;
            this.title = new gui.Label(0, 0, "Save as:").anchor('middle').font("arial", 40);
            this.fileListLabel = new gui.Label(0, 0, "Existing files:");
            this.fileList = new FileGrid();
            this.fileNameLabel = new gui.Label(0, 0, "File name:");
            this.fileName = new gui.TextField(0, 0, 600, 40, manager.fileName).pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
            this.fileName.onInput((oldMessage, message, valid)=>{
                this.manageOk(valid);
            });
            this.add(this.title.position(0, -300));
            this.add(this.fileListLabel.position(-300, -260));
            this.add(this.fileList.position(0, -50));
            this.add(this.fileNameLabel.position(-300, 200));
            this.add(this.fileName.position(0, 230));
            this.whenOk(function() {
                this.requestForSave(this.manager.url);
            }).whenCancel();
            this.fileList.onSelect((index, item)=> {
                this.fileName.message(item.name);
                this.manageOk();
            });
            this.requestForList(this.manager.url);
            this.manageOk();
        }

        manageOk(valid=true) {
            if (valid && this.fileName.textMessage) {
                this.enableOk();
            }
            else {
                this.disableOk();
            }
        }

        requestForList(url) {
            let requestData = {
                method:"list"
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    this.fileList.fill(response.files);
                    console.log("List received");
                })
                .onFailure(()=>{
                    console.log("List failed");
                });
        }

        requestForReplace(url) {
            let requestData = {
                method:"replace",
                file:this.fileName.textMessage,
                data:{content:this.manager.getContent()}
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    if (response.ack==='ok') {
                        console.log("Save succeded");
                        this.manager.fileName = requestData.file;
                        new gui.WarningPopin("Saved", null, gui.canvas(this.component)).title("Message");
                        this.close();
                    }
                    else {
                        console.log("Save failed");
                        new gui.WarningPopin("Save failed : "+response.err, ()=>{
                            this.close();
                        }, gui.canvas(this.component));
                    }
                })
                .onFailure((errCode)=>{
                    console.log("Save failed");
                    new gui.WarningPopin("Save failed : "+errCode, ()=>{
                        this.close();
                    }, gui.canvas(this.component))
                });
        }

        requestForSave(url) {
            let requestData = {
                method:"save",
                file:this.fileName.textMessage,
                data:{content:this.manager.getContent()}
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    if (response.ack==='ok') {
                        console.log("Save succeded");
                        this.manager.fileName = requestData.file;
                        new gui.WarningPopin("Saved", null, gui.canvas(this.component)).title("Message");
                        this.close();
                    }
                    else {
                        console.log("Save failed");
                        if (response.err==='file exists.') {
                            new gui.ConfirmPopin("Save failed : "+response.err+"\nWould you replace it ?", ()=>{
                                this.requestForReplace(url);
                            }, gui.canvas(this.component));
                        }
                        else {
                            new gui.WarningPopin("Save failed : "+response.err, ()=>{
                                this.close();
                            }, gui.canvas(this.component));
                        }
                    }
                })
                .onFailure((errCode)=>{
                    console.log("Save failed");
                    new gui.WarningPopin("Save failed : "+errCode, ()=>{
                        this.close();
                    }, gui.canvas(this.component))
                });
        }

    }

    class BaseLoadPopin extends gui.Popin {

        constructor(manager, title, listMethod, loadMethod, process) {
            super(1000, 600);
            this.listMethod = listMethod;
            this.loadMethod = loadMethod;
            this.process = process;
            this.manager = manager;
            this.title = new gui.Label(0, 0, title).anchor('middle').font("arial", 40);
            this.fileListLabel = new gui.Label(0, 0, "Files:");
            this.fileList = new FileGrid();
            this.add(this.title.position(0, -250));
            this.add(this.fileListLabel.position(-300, -210));
            this.add(this.fileList.position(0, 0));
            this.whenOk(function() {
                this.requestForLoad(this.manager.url);
            }).whenCancel();
            this.fileList.onSelect((index, item)=> {
                this.manager.fileName = item.name;
                this.enableOk();
            });
            this.requestForList(this.manager.url);
            this.disableOk();
        }

        requestForList(url) {
            let requestData = {
                method:this.listMethod
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    this.fileList.fill(response.files);
                    console.log("List received");
                })
                .onFailure(()=>{
                    console.log("List failed");
                });
        }

        requestForLoad(url) {
            let requestData = {
                method:this.loadMethod,
                file:this.manager.fileName
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    if (response.ack==='ok') {
                        this.manager.fileName = requestData.file;
                        this.process(JSON.parse(response.data).content);
                        console.log("Load succeded");
                        this.close();
                    }
                    else {
                        console.log("load failed");
                        new gui.WarningPopin("Load failed : "+response.err, ()=>{
                            this.close();
                        }, gui.canvas(this.component));
                    }
                })
                .onFailure((errCode)=>{
                    console.log("Load failed");
                    new gui.WarningPopin("Load failed : "+errCode, ()=>{
                        this.close();
                    }, gui.canvas(this.component))
                });
        }

    }

    class LoadPopin extends BaseLoadPopin {

        constructor(manager) {
            super(manager, "Load:", "list", "load", function(text) {
                this.manager.setContent(text);
            });
        }

    }

    class RemovePopin extends gui.Popin {

        constructor(manager) {
            super(1000, 600);
            this.manager = manager;
            this.title = new gui.Label(0, 0, "Remove:").anchor('middle').font("arial", 40);
            this.fileListLabel = new gui.Label(0, 0, "Files:");
            this.fileList = new FileGrid();
            this.add(this.title.position(0, -250));
            this.add(this.fileListLabel.position(-300, -210));
            this.add(this.fileList.position(0, 0));
            this.whenOk(function() {
                this.requestForRemove(this.manager.url);
            }).whenCancel();
            this.fileList.onSelect((index, item)=> {
                this.manager.fileName = item.name;
                this.enableOk();
            });
            this.requestForList(this.manager.url);
            this.disableOk();
        }

        requestForList(url) {
            let requestData = {
                method:"list"
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    this.fileList.fill(response.files);
                    console.log("List received");
                })
                .onFailure(()=>{
                    console.log("List failed");
                });
        }

        requestForRemove(url) {
            let requestData = {
                method:"remove",
                file:this.manager.fileName
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    if (response.ack==='ok') {
                        console.log("Remove succeded");
                        new gui.WarningPopin("Removed", null, gui.canvas(this.component)).title("Message");
                        this.close();
                    }
                    else {
                        console.log("Remove failed");
                        new gui.WarningPopin("Remove failed : "+response.err, ()=>{
                            this.close();
                        }, gui.canvas(this.component));
                    }
                })
                .onFailure((errCode)=>{
                    console.log("Remove failed");
                    new gui.WarningPopin("Remove failed : "+errCode, ()=>{
                        this.close();
                    }, gui.canvas(this.component))
                });
        }

    }

    class FilePane extends gui.Pane {

        constructor(colors, text, elemSize, url) {
            super(colors, text, elemSize);
            this.addTool(new Save(this))
                .addTool(new SaveAs(this))
                .addTool(new Load(this))
                .addTool(new New(this))
                .addTool(new Edit(this))
                .addTool(new Remove(this))
                .addTool(new Undo())
                .addTool(new Redo());
            this.url = url;
            this.fileName = "";
        }

        newPopin(popinClass) {
            this.newPopinClass = popinClass;
            return this;
        }

        editPopin(icon, popinClass) {
            this.editIcon.add(icon.duplicate());
            this.editPopinClass = popinClass;
            return this;
        }

        handlers(getHandler, setHandler) {
            this.getHandler = getHandler;
            this.setHandler = setHandler;
            return this;
        }

        getContent() {
            return this.getHandler ? this.getHandler() : null;
        }

        setContent(content) {
            this.setHandler && this.setHandler(content);
        }
    }

    function disk() {
        return new svg.Translation()
            .add(new svg.Rect(80, 80).color(svg.GREY, 2, svg.BLACK))
            .add(new svg.Rect(50, 30).position(0, -25).color(svg.LIGHT_GREY, 2, svg.BLACK))
            .add(new svg.Rect(15, 20).position(10, -25).color(svg.GREY, 2, svg.BLACK))
            .add(new svg.Rect(70, 40).position(0, 20).color(svg.WHITE, 2, svg.BLACK));
    }

    class Save extends gui.Tool {

        constructor(manager) {
            let icon = disk()
                .add(new svg.Arrow(15, 25, 25).position(-50, 0, -5, 0).color(svg.GREEN, 2, svg.DARK_GREEN));
            super(icon);
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("Save...");
            if (this.manager.fileName) {
                let requestData = {
                    method:"replace",
                    file:this.manager.fileName,
                    data:{content:this.manager.getContent()}
                };
                svg.request(this.manager.url, requestData)
                    .onSuccess((response)=>{
                        if (response.ack==='ok') {
                            console.log("Save succeded");
                            new gui.WarningPopin("Saved", null, gui.canvas(this.component)).title("Message");
                        }
                        else {
                            console.log("Save failed");
                            new gui.WarningPopin("Save failed : "+response.err, ()=>{
                            }, gui.canvas(this.component));
                        }
                    })
                    .onFailure((errCode)=>{
                        console.log("Save failed");
                        new gui.WarningPopin("Save failed : "+errCode, ()=>{
                        }, gui.canvas(this.component))
                    });
            }
            else {
                new SaveAsPopin(this.manager).show(gui.canvas(this.component));
            }
        }
    }

    class SaveAs extends gui.Tool {

        constructor(manager) {
            let icon = disk()
                .add(new svg.Arrow(15, 25, 25).position(-50, 0, -5, 0).color(svg.GREEN, 2, svg.DARK_GREEN))
                .add(new svg.Translation().move(-30, 0)
                    .add(new svg.Polygon(0, 0).color(svg.WHITE, 2, svg.GREY)
                        .add(-3, 10).add(-3, 3).add(-10, 3).add(-10, -3).add(-3, -3).add(-3, -10)
                        .add(3, -10).add(3, -3).add(10, -3).add(10, 3).add(3, 3).add(3, 10)
                    ));
            super(icon);
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("Save as...");
            new SaveAsPopin(this.manager).show(gui.canvas(this.component));
        }

    }

    class Load extends gui.Tool {

        constructor(manager) {
            let icon = disk()
                .add(new svg.Arrow(15, 25, 25).position(-5, 0, -50, 0).color(svg.LIGHT_BLUE, 2, svg.BLUE));
            super(icon);
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("Load...");
            new LoadPopin(this.manager).show(gui.canvas(this.component));
        }
    }

    class New extends gui.Tool {

        constructor(manager) {
            let icon = disk()
                .add(new svg.Translation().move(25, 25)
                    .add(new svg.Circle(20).color(svg.LIGHT_BLUE, 2, svg.BLUE))
                    .add(new svg.Polygon(0, 0).color(svg.WHITE, 2, svg.GREY)
                        .add(-3, 15).add(-3, 3).add(-15, 3).add(-15, -3).add(-3, -3).add(-3, -15)
                        .add(3, -15).add(3, -3).add(15, -3).add(15, 3).add(3, 3).add(3, 15)
                    ));
            super(icon);
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("New...");
            new this.manager.newPopinClass().show(gui.canvas(this.component));
        }

    }

    class Edit extends gui.Tool {

        constructor(manager) {
            let icon = new svg.Translation();
            super(icon);
            manager.editIcon = icon;
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("Edit...");
            new this.manager.editPopinClass().show(gui.canvas(this.component));
        }

    }

    class Remove extends gui.Tool {

        constructor(manager) {
            let icon = disk()
                .add(new svg.Translation().move(25, 25).add(new svg.Rotation(45)
                    .add(new svg.Circle(20).color(svg.RED, 2, svg.DARK_RED))
                    .add(new svg.Polygon(0, 0).color(svg.WHITE, 2, svg.GREY)
                        .add(-3, 15).add(-3, 3).add(-15, 3).add(-15, -3).add(-3, -3).add(-3, -15)
                        .add(3, -15).add(3, -3).add(15, -3).add(15, 3).add(3, 3).add(3, 15)
                    )));
            super(icon);
            this.setCallback(()=>{
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
            this.manager = manager;
        }

        action() {
            console.log("Remove...");
            new RemovePopin(this.manager).show(gui.canvas(this.component));
        }
    }

    class Undo extends gui.Tool {

        constructor() {
            let icon = new svg.Translation()
                .add(new svg.Arrow(25, 40, 40).position(40, 0, -40, 0).color(svg.LIGHT_BLUE, 3, svg.BLUE));
            super(icon);
            this.setCallback(()=> {
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
        }

        action() {
            console.log("Undo...");
            Memento.rollback();
        }
    }

    class Redo extends gui.Tool {

        constructor() {
            let icon = new svg.Translation()
                .add(new svg.Arrow(25, 40, 40).position(-40, 0, 40, 0).color(svg.LIGHT_BLUE, 3, svg.BLUE));
            super(icon);
            this.setCallback(()=> {
                this.action();
            });
            icon.onClick(this.callback);
            this.icon = icon;
        }

        action() {
            console.log("Redo...");
            Memento.replay();
        }
    }

    return {
        BaseLoadPopin:BaseLoadPopin,
        FilePane:FilePane
    }
};
