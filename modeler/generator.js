/**
 * Created by HDA3014 on 07/09/2016.
 */


exports.Generator = function(svg, gui, url) {

    class RuleEngine {

        constructor(canvas) {
            this.canvas = canvas;
            this.errors = [];
            this.rules = [];
            this.items = new Map();
        }

        addItems(data, ...items) {
            items.forEach(item=>this.items.set(item, data));
        }

        addRules(...rules) {
            this.rules.push(...rules);
        }

        execute(pom) {
            let changed = true;
            while (changed && this.errors.empty()) {
                changed = false;
                this.rules.forEach(rule=> {
                    [...this.items.entries()].forEach(entry=> {
                        try {
                            if (rule.execute(pom, entry[0], entry[1])) {
                                changed = true;
                            }
                        }
                        catch (err) {
                            this.errors.push(err);
                        }
                    })
                })
            }
        }

        showErrors() {
            this.errors.forEach(error=>console.log(error));
        }
    }

    class EntityInheritsFromEntityOrMapped {

        constructor() {
        }

        execute(pom, item, data) {
            if (!data.type==="class") {
                return false;
            }
            if (item.category!=="entity") {
                return false;
            }
            if (!item.inherit) {
                return false;
            }
            let superClass = pom.classes[item.inherit.id];
            if (superClass.category==="entity" ||
                superClass.category==="mapped") {
                return false;
            }
            if (superClass.category==="standard") {
                superClass.category="mapped";
                return true;
            }
            throw "Super class of entity class : "+item.name+" must not be "+item.inherit.category;
        }

    }

    class GeneratorJPA {

        generate(spec, callback) {
            let pom = {classes:{}};
            spec.clazzes
                .forEach(clazz=>this.declareClass(pom, clazz));
            spec.inherits
                .forEach(inherit=>this.declareInherit(pom, inherit));
            spec.relationships
                .forEach(relationship=>this.declareRelationship(pom, relationship));
            let ruleEngine = new RuleEngine();
            ruleEngine.addItems(
                {type:"class"}, ...pom.classes.toArray());
            pom.classes.forEach((index,clazz)=>ruleEngine.addItems(
                {type:"relationship", from:clazz}, ...clazz.relationships.toArray()));
            ruleEngine.addRules(new EntityInheritsFromEntityOrMapped());
            ruleEngine.execute(pom);
            ruleEngine.showErrors();
            this.write(pom, callback);
        }

        declareClass(pom, clazz) {
            let persistentType = value=> {
                return this.hasPrototype(value, "entity")?"entity":"standard";
            };

            let entityName = this.value(clazz.title);
            pom.classes[clazz.id] = {
                category : persistentType(clazz.title),
                id: clazz.id,
                name: entityName,
                fields : {},
                relationships : {}
            };
            this.lines(clazz.content).forEach(
                line=>this.declareField(pom.classes[clazz.id], line));
        }

        declareField(entityPom, line) {
            var field = this.typed(this.value(line));
            if (!field.name || !field.type) {
                throw "err";
            }
            entityPom.fields[field.name] = {
                type : this.value(field.type)
            };
            if (this.hasPrototype(line, "id")) {
                entityPom.fields[field.name].key = true;
            }
            if (this.hasPrototype(line, "version")) {
                entityPom.fields[field.name].version = true;
            }
        }

        declareInherit(pom, inherit) {
            let start = pom.classes[inherit.from.id];
            let end = pom.classes[inherit.to.id];
            if (start && end) {
                start.inherit = {
                    id: end.id,
                    name: end.name
                };
            }

        }

        declareRelationship(pom, relationship) {
            let cardinality=value=> {
                switch (value.trim()) {
                    case "1":
                    case "1-1":
                    case "0-1":
                        return "One";
                    case "N":
                    case "1-N":
                    case "0-N":
                    case "*":
                    case "1-*":
                    case "0-*":
                        return "Many";
                }
                return "Unknown";
            };

            let inverseName=value=> {
                let name= this.getProtoType(value, "inverse");
                return name ? name : value;
            };

            let start = pom.classes[relationship.from.id];
            let end = pom.classes[relationship.to.id];
            if (start && end) {
                let name = this.value(relationship.title.message);
                start.relationships[name] = {
                    type : {
                        id:end.id,
                        name:end.name
                    },
                    cardinality :
                        cardinality(relationship.beginCardinality.message, relationship.endCardinality.message)+"To"+
                        cardinality(relationship.endCardinality.message, relationship.beginCardinality.message),
                    ownership: true
                };
                if (relationship.endTermination!=="arrow") {
                    let invName = inverseName(relationship.title.message);
                    end.relationships[invName] = {
                        type : {
                            id:start.id,
                            name:start.name
                        },
                        cardinality :
                            cardinality(relationship.endCardinality.message, relationship.beginCardinality.message)+"To"+
                            cardinality(relationship.beginCardinality.message, relationship.endCardinality.message),
                        ownership: false,
                        inverse: name
                    };
                    start.relationships[name].inverse = invName;
                }
            }
        }

        lines(value) {
            let lines = value.match(/([^\n\r]+)/g);
            return lines ? lines : [];
        }

        prototypes(value) {
            return (value.match(/\{([^\}]*)\}/g)||[]).map(token=>/\{(.*)\}/.exec(token)[1].trim());
        }

        getProtoType(value, spec) {
            let protos = this.prototypes(value);
            let proto = protos.find(
                value=>this.typed(value).name===spec);
            return proto ? this.typed(proto).type : null;
        }

        hasPrototype(value, spec) {
            let result = this.prototypes(value).filter(
                value=>this.typed(value).name===spec);
            return result.length>0;
        }

        typed(value) {
            let result = /([^:]+):(.+)/.exec(value);
            return {
                name : result ? result[1].trim() : value.trim(),
                type : result ? result[2].trim() : null
            }
        }

        value(value) {
            let tokens = value.match(/(?:\{[^\}]*\})*([^\{\}]+)/);
            return tokens ? tokens[1].trim() : null;
        }

        save(file, text) {
            console.log("Persist generation...");
            let requestData = {
                method:"generate",
                file:file+"-generation",
                data:text
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    if (response.ack==='ok') {
                        console.log("Save generation succeded");
                        new gui.WarningPopin("Generation succeeded", null, this.canvas).title("Message");
                    }
                    else {
                        console.log("Save generation failed");
                        new gui.WarningPopin("Generation failed : "+response.err, ()=>{}, this.canvas);
                    }
                })
                .onFailure((errCode)=>{
                    console.log("Save generation failed");
                    new gui.WarningPopin("Generation failed : "+errCode, ()=>{}, this.canvas)
                });

        }

        load(file, callback) {
            let requestData = {
                method:"pattern",
                file:file
            };
            svg.request(url, requestData)
                .onSuccess((response)=>{
                    console.log("Load model :"+file+" succeeded");
                    callback(response.data);
                })
                .onFailure((errCode)=>{
                    console.log("Load model :"+file+" failed");
                    new gui.WarningPopin("Generation failed : "+errCode, ()=>{}, this.canvas)
                });
        }

        getJavaType(type) {
            switch (type) {
                case "int" :
                    return "int";
                case "long" :
                    return "long";
                case "string" :
                    return "String";
            }
            throw "Unknown type : "+type;
        }

        camelCase(name) {
            if (name.length<=1) {
                return name.toUpperCase();
            }
            else {
                return name.charAt(0).toUpperCase()+name.slice(1);
            }
        }

        prepareClass(clazz, root, params) {
            let mainClass = root.classArtifact.setClassName(clazz.name);
            if (clazz.inherit) {
                mainClass.setSuperClass(clazz.inherit.name);
            }
            return mainClass;
        }

        processClassPersistence(clazz, root, mainClass, params) {
            if (clazz.category==="entity") {
                root.importsArtifact.addImport("javax.persistence.Entity");
                mainClass.addAnnotation(new AnnotationArtifact().setName("Entity"));
                params.doDefaultConstructor = true;
            }
            else if (clazz.category==="mapped") {
                root.importsArtifact.addImport("javax.persistence.MappedSuperclass");
                mainClass.addAnnotation(new AnnotationArtifact().setName("MappedSuperclass"));
                params.doDefaultConstructor = true;
            }
        }

        processAttribute(clazz, key, field, root, mainClass, params) {
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType(this.getJavaType(field.type));
            let doSet = true;
            if (field.key) {
                root.importsArtifact.addImport("javax.persistence.GeneratedValue");
                root.importsArtifact.addImport("javax.persistence.Id");
                attribute.addAnnotation(new AnnotationArtifact().setName("Id"));
                attribute.addAnnotation(new AnnotationArtifact().setName("GeneratedValue"));
                doSet = false;
            }
            if (field.version) {
                root.importsArtifact.addImport("javax.persistence.Version");
                attribute.addAnnotation(new AnnotationArtifact().setName("Version"));
                doSet = false;
            }
            mainClass.addAttribute(attribute);
            let getMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(attribute.type)
                .setName("get"+this.camelCase(attribute.name));
            getMethod.addInstruction("return this."+attribute.name+";");
            mainClass.addMethod(getMethod);
            if (doSet) {
                let setMethod = new MethodArtifact()
                    .setPrivacy("public")
                    .setType(clazz.name)
                    .setName("set" + this.camelCase(attribute.name));
                setMethod.addParameter(attribute.type, attribute.name);
                setMethod.addInstruction("this." + attribute.name + " = "+attribute.name+";");
                setMethod.addInstruction("return this;");
                mainClass.addMethod(setMethod);
            }
        }

        processDefaultConstructor(clazz, root, mainClass, params) {
            if (params.doDefaultConstructor) {
                let defaultConstructor = new ConstructorArtifact()
                    .setPrivacy("public")
                    .setName(clazz.name);
                mainClass.addConstructor(defaultConstructor);
            }
        }

        processSingleReference(pom, key, relationship, root, mainClass, params) {
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType(relationship.type.name);
            let target = pom.classes[relationship.type.id];
            if (target.category==="entity") {
                root.importsArtifact.addImport("javax.persistence." + relationship.cardinality);
                attribute.addAnnotation(new AnnotationArtifact().setName(relationship.cardinality));
            }
            mainClass.addAttribute(attribute);
        }

        processListOfReferences(pom, key, relationship, root, mainClass, params) {
            root.importsArtifact.addImport("java.util.List");
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType("List<"+relationship.type.name+">");
            let target = pom.classes[relationship.type.id];
            if (target.category==="entity") {
                root.importsArtifact.addImport("javax.persistence." + relationship.cardinality);
                attribute.addAnnotation(new AnnotationArtifact().setName(relationship.cardinality));
            }
            mainClass.addAttribute(attribute);
        }

        processRelationship(pom, key, relationship, root, mainClass, params) {
            if (relationship.cardinality==="OneToOne" || relationship.cardinality==="ManyToOne") {
                this.processSingleReference(pom, key, relationship, root, mainClass, params);
            }
            else {
                this.processListOfReferences(pom, key, relationship, root, mainClass, params);
            }
        }

        write(pom, callback) {
            /*
            this.load("EntityModel", (model)=>{
                pom.classes.forEach(clazz=>)
            });
            */
            let text = "";
            pom.classes.forEach((index,clazz)=>{
                let params = { doDefaultConstructor : false };
                let root = new FileArtifact().setPackageName("com.acme.domain");
                let mainClass = this.prepareClass(clazz, root, params);
                this.processClassPersistence(clazz, root, mainClass, params);
                clazz.fields.forEach((key, field)=>{
                    this.processAttribute(clazz, key, field, root, mainClass, params)
                });
                this.processDefaultConstructor(clazz, root, mainClass, params);
                clazz.relationships.forEach((key, relationship)=>{
                    this.processRelationship(pom, key, relationship, root, mainClass, params)
                });
                root.generate(0).forEach(line=>text+=line+"\n");
            });
            console.log(text);
        }

    }

    let INDENTATION = "\t";
    for (let i=0; i<8; i++) {
        INDENTATION+=INDENTATION;
    }

    class Artifact {

        constructor() {
        }

        writeLines(result, indent, lines) {
            lines.forEach(line=>this.writeLine(result, indent, line));
            return this;
        }

        writeEmptyLine(result) {
            result.push("");
            return this;
        }

        writeLine(result, indent, line) {
            result.push(INDENTATION.slice(0, indent)+line);
            return this;
        }

        generate(indent) {
            let result = [];
            this.writeLines(result, indent, this.open);
            this.writeLines(result, indent, this.close);
            this.writeEmptyLine(result);
            return result;
        }
    }

    class ImportsArtifact extends Artifact {

        constructor() {
            super();
            this.importInstrs = [];
        }

        addImport(importInstr) {
            this.importInstrs.add(importInstr);
            return this;
        }

        generate(indent) {
            let result = [];
            if (!this.importInstrs.empty()) {
                this.importInstrs.forEach(importInstr=>{
                    this.writeLine(result, indent, "import "+importInstr+";");
                });
                this.writeEmptyLine(result);
            }
            return result;
        }
    }

    class FileArtifact extends Artifact {

        constructor() {
            super();
            this.packageName = "com.acme.noapp";
            this.importsArtifact = new ImportsArtifact();
            this.classArtifact = new ClassArtifact();
        }

        setPackageName(packageName) {
            this.packageName = packageName;
            return this;
        }

        generate(indent) {
            let result = [];
            this.writeLine(result, indent, "//---------------------------------------------------")
            this.writeLine(result, indent, "// FILE : "+this.packageName+"."+this.classArtifact.className+".java")
            this.writeLine(result, indent, "package "+this.packageName+";");
            this.writeEmptyLine(result);
            this.writeLines(result, indent, this.importsArtifact.generate(0));
            this.writeLines(result, indent, this.classArtifact.generate(0));
            return result;
        }

    }

    class ClassArtifact extends Artifact {

        constructor() {
            super();
            this.className = "NoClass";
            this.superClass = null;
            this.interfaces = [];
            this.annotations = {};
            this.attributes = {};
            this.methods = {};
            this.constructors = {};
        }

        setClassName(className) {
            this.className = className;
            return this;
        }

        addAnnotation(annotationArtifact) {
            this.annotations[annotationArtifact.name] = annotationArtifact;
            return this;
        }

        addAttribute(attributeArtifact) {
            this.attributes[attributeArtifact.name] = attributeArtifact;
            return this;
        }

        addConstructor(constructorArtifact) {
            this.constructors[constructorArtifact.token] = constructorArtifact;
            return this;
        }

        addMethod(methodArtifact) {
            this.methods[methodArtifact.name] = methodArtifact;
            return this;
        }

        addInterface(interfaceClass) {
            this.interfaces.add(interfaceClass);
            return this;
        }

        setSuperClass(superClass) {
            this.superClass = superClass;
            return this;
        }

        generate(indent) {

            function writeSuperClass(superClass) {
                return superClass ? "extends "+superClass+" " : "";
            }

            function writeInterfaces(interfaces) {
                if (interfaces.empty()) {
                    return "";
                }
                let result = "implements "+interfaes[0];
                for (let i=1; i<interfaces.length; i++) {
                    result+=", "+interfaces[i];
                }
                return result+" ";
            }

            let result = [];
            this.annotations.forEach((key, annotationArtifact)=>{
                this.writeLines(result, indent, annotationArtifact.generate(0));
            });
            this.writeLine(result, indent, "class "+this.className+" "+
                writeSuperClass(this.superClass)+
                writeInterfaces(this.interfaces)+"{");
            this.writeEmptyLine(result);
            if (!this.attributes.empty()) {
                this.attributes.forEach((key, attributeArtifact)=>{
                    this.writeLines(result, indent, attributeArtifact.generate(1));
                });
                this.writeEmptyLine(result);
            }
            if (!this.constructors.empty()) {
                this.constructors.forEach((key, constructorArtifact)=>{
                    this.writeLines(result, indent, constructorArtifact.generate(1));
                });
            }
            if (!this.methods.empty()) {
                this.methods.forEach((key, methodArtifact)=>{
                    this.writeLines(result, indent, methodArtifact.generate(1));
                });
            }
            this.writeLine(result, indent, "}");
            return result;
        }

    }

    class AnnotationArtifact extends Artifact {

        constructor() {
            super();
            this.name = "NoAnnotation";
        }

        setName(name) {
            this.name = name;
            return this;
        }

        generate(indent) {
            let result = [];
            this.writeLine(result, indent, "@"+this.name);
            return result;
        }
    }

    class AttributeArtifact extends Artifact {

        constructor() {
            super();
            this.name = "noName";
            this.type = "NoType";
            this.annotations = {};
        }

        setName(name) {
            this.name = name;
            return this;
        }

        setType(type) {
            this.type = type;
            return this;
        }

        addAnnotation(annotationArtifact) {
            this.annotations[annotationArtifact.name] = annotationArtifact;
            return this;
        }

        generate(indent) {
            let result = [];
            this.annotations.forEach((key, annotationArtifact)=>{
                this.writeLines(result, indent, annotationArtifact.generate(0));
            });
            this.writeLine(result, indent, this.type+" "+this.name+";");
            return result;
        }

    }

    class FunctionArtifact extends Artifact {

        constructor() {
            super();
            this.privacy = "";
            this.parameters = [];
            this.instructions = [];
        }

        setPrivacy(privacy) {
            this.privacy = privacy;
            return this;
        }

        addParameter(type, name) {
            this.parameters.push({type:type, name:name});
        }

        addInstruction(instruction) {
            this.instructions.push(new InstructionArtifact(instruction));
        }

        generate(indent) {
            function generatePrivacy(privacy) {
                return privacy ? privacy+" " : "";
            }

            function generateParameters(parameters) {
                if (parameters.empty()) {
                    return "";
                }
                let result = parameters[0].type+" "+parameters[0].name;
                for (let i=1; i<parameters.length; i++) {
                    result+=", "+parameters[i].type+" "+parameters[i].name;
                }
                return result;
            }

            let result = [];
            this.generateDeclaration(result, indent,
                generatePrivacy(this.privacy),
                generateParameters(this.parameters));
            this.instructions.forEach(instruction=>{
                this.writeLines(result, indent, instruction.generate(1));
            });
            this.writeLine(result, indent, "}");
            this.writeEmptyLine(result);
            return result;
        }
    }

    class MethodArtifact extends FunctionArtifact {

        constructor() {
            super();
            this.name = "noName";
            this.type = "noType";
        }

        setName(name) {
            this.name = name;
            return this;
        }

        setType(type) {
            this.type = type;
            return this;
        }

        generateDeclaration(result, indent, privacy, parameters) {
            this.writeLine(result, indent,
                privacy+
                this.type+" "+this.name+"("+
                parameters+") {");
        }
    }

    class ConstructorArtifact extends FunctionArtifact {

        constructor() {
            super();
            this.name = "noName";
            this.token = "default";
        }

        setName(name) {
            this.name = name;
            return this;
        }

        setToken(token) {
            this.token = token;
            return this;
        }

        generateDeclaration(result, indent, privacy, parameters) {
            this.writeLine(result, indent,
                privacy+
                this.name+"("+
                parameters+") {");
        }
    }

    class InstructionArtifact extends Artifact {

        constructor(content) {
            super();
            this.content = content;
        }

        generate(indent) {
            let result = [];
            this.writeLine(result, indent, this.content);
            return result;
        }
    }

    return {
        GeneratorJPA : GeneratorJPA
    };
};