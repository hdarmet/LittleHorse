/**
 * Created by HDA3014 on 07/09/2016.
 */


exports.Generator = function(svg, gui, url) {

    class Error {

        constructor(ref, ...messages) {
            this.ref = ref;
            this.message = messages.empty() ? "" : messages[0];
            if (messages.length>1) {
                for (let i=1; i<messages.length; i++) {
                    this.message += "\n\t"+messages[i];
                }
            }
        }

        toString() {
            return this.message;
        }

        item(schema) {
            if (this.ref.type==="node") {
                return schema.nodes.find(node=>node.id===this.ref.id);
            }
            else if (this.ref.type==="link") {
                return schema.links.find(link=>link.id===this.ref.id);
            }
            return null;
        }

    }

    class RuleEngine {

        constructor(errors) {
            this.errors = errors;
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
                            if (err instanceof Error) {
                                this.errors.push(err);
                            }
                            else {
                                throw err;
                            }
                        }
                    })
                })
            }
            return this.errors.empty();
        }

    }

    class Rule {

        collectFields(pom, clazz) {
            let result = [];
            while (clazz) {
                clazz.fields.forEach((field, key)=> {
                    result.push({clazz:clazz, name:key, value:field});
                });
                if (clazz.inherit) {
                    clazz = clazz.inherit;
                }
                else {
                    clazz = null;
                }
            }
            return result;
        }

    }

    class EntityOrMappedInheritsFromEntityOrMapped extends Rule {

        constructor() {
            super();
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
            let superClass = item.inherit;
            if (superClass.category==="entity" ||
                superClass.category==="mapped") {
                return false;
            }
            if (superClass.category==="standard") {
                superClass.category="mapped";
                return true;
            }
            throw new Error(
                {type:"node", id:item.ids[0]},
                "Super class of entity class "+item.name+" must not be "+item.inherit.category);
        }

    }

    class EntityEmbeddedOrMappedLinkedToEmbedded extends Rule {

        constructor() {
            super();
        }

        execute(pom, item, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (data.from.category!=="entity" &&
                data.from.category!=="mapped" &&
                data.from.category!=="embeddable") {
                return false;
            }
            let target = item.type;
            if (target.category==="entity" ||
                target.category==="embeddable") {
                return false;
            }
            if (target.category==="standard") {
                target.category="embeddable";
                return true;
            }
            else if (target.category==="mapped") {
                throw new Error(
                    {type:"link", id:item.id},
                    "MappedSuperclass "+target.name+" cannot be target of a relationship");
            }
            return false;
        }

    }

    class RelationshipsTargetingPersistentClassesFromPersistentClassesArePersistent extends Rule {

        constructor() {
            super();
        }

        execute(pom, item, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (data.from.category!=="entity" &&
                data.from.category!=="embeddable" &&
                data.from.category!=="mapped") {
                return false;
            }
            let target = item.type;
            if (target.category==="entity") {
                if (item.persistence!=="persistent") {
                    item.persistence="persistent";
                    return true;
                }
                return false;
            }
            if (target.category==="embeddable") {
                if (item.persistence!=="embedded") {
                    item.persistence="embedded";
                    return true;
                }
                return false;
            }
            return false;
        }

    }

    class EntitiesMustHaveOneAndOnlyOneId extends Rule {

        constructor() {
            super();
        }

        execute(pom, item, data) {
            if (!data.type==="class") {
                return false;
            }
            if (item.category!=="entity") {
                return false;
            }
            let ids = [];
            this.collectFields(pom, item).forEach(fieldSpec=>{
                if (fieldSpec.value.key) {
                    ids.push(fieldSpec.clazz.name+"."+fieldSpec.name);
                }
            });
            if (ids.empty()) {
                throw new Error(
                    {type:"node", id:item.ids[0]},
                    "Entity "+item.name+" has no id !");
            }
            else if (ids.length>1) {
                throw new Error(
                    {type:"node", id:item.ids[0]},
                    "Entity "+item.name+" has multiple ids : ",...ids);
            }
            return false;
        }

    }

    class ClassesWithRelationshipsMustHaveADefaultConstructor extends Rule {

        constructor(...cardinalities) {
            super();
            this.cardinalities = cardinalities;
        }

        execute(pom, item, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (this.cardinalities.contains(item.cardinality) && !data.from.defaultConstructor) {
                data.from.defaultConstructor = true;
                return true;
            }
            return false;
        }

    }

    class Generator {

        constructor() {
        }

        generate(spec, success, error) {
            let pom = {};
            let errors = [];
            this.buildPOM(spec, pom, errors);
            if (errors.empty()) {
                let ruleEngine = new RuleEngine(errors);
                this.prepareRuleEngine(ruleEngine, pom);
                if (ruleEngine.execute(pom)) {
                    let result = this.generatePIM(pom, errors);
                    if (result) {
                        success(result);
                        return;
                    }
                }
            }
            error(errors);
        }

        save(file, text) {
            console.log("Persist generation...");
            let requestData = {
                method: "generate",
                file: file + "-generation",
                data: text
            };
            svg.request(url, requestData)
                .onSuccess((response)=> {
                    if (response.ack === 'ok') {
                        console.log("Save generation succeded");
                        new gui.WarningPopin("Generation succeeded", null, this.canvas).title("Message");
                    }
                    else {
                        console.log("Save generation failed");
                        new gui.WarningPopin("Generation failed : " + response.err, ()=> {
                        }, this.canvas);
                    }
                })
                .onFailure((errCode)=> {
                    console.log("Save generation failed");
                    new gui.WarningPopin("Generation failed : " + errCode, ()=> {
                    }, this.canvas)
                });

        }

        load(file, callback) {
            let requestData = {
                method: "pattern",
                file: file
            };
            svg.request(url, requestData)
                .onSuccess((response)=> {
                    console.log("Load model :" + file + " succeeded");
                    callback(response.data);
                })
                .onFailure((errCode)=> {
                    console.log("Load model :" + file + " failed");
                    new gui.WarningPopin("Generation failed : " + errCode, ()=> {
                    }, this.canvas)
                });
        }

        lines(value) {
            let lines = value.match(/([^\n\r]+)/g);
            return lines ? lines : [];
        }

        stereotypes(value) {
            return (value.match(/<<([^\>]*)>>/g) || []).map(token=>/<<(.*)>>/.exec(token)[1].trim());
        }

        getStereotype(value, spec) {
            let stereos = this.stereotypes(value);
            let stereo = stereos.find(
                value=>this.typed(value).name === spec);
            return stereo ? this.typed(stereo).type : null;
        }

        hasStereotype(value, spec) {
            let result = this.stereotypes(value).filter(
                value=>this.typed(value).name === spec);
            return result.length > 0;
        }

        constraints(value) {
            return (value.match(/\{([^\}]*)\}/g) || []).map(token=>/\{(.*)\}/.exec(token)[1].trim());
        }

        getConstraint(value, spec) {
            let consts = this.constraints(value);
            let constraint = consts.find(value=>this.typed(value).name===spec);
            return constraint ? this.typed(constraint).type : null;
        }

        hasConstraint(value, spec) {
            let result = this.constraints(value).filter(
                value=>this.typed(value).name === spec);
            return result.length > 0;
        }

        typed(value) {
            let result = /([^:]+):(.+)/.exec(value);
            return {
                name: result ? result[1].trim() : value.trim(),
                type: result ? result[2].trim() : null
            }
        }

        valued(value) {
            let result = /([^=]+)=(.+)/.exec(value);
            return {
                name: result ? result[1].trim() : value.trim(),
                value: result ? result[2].trim() : null
            }
        }

        value(value) {
            let tokens = value.match(/(?:\{[^\}]*\})*(?:<<[^\>]*>>)*(?:\{[^\}]*\})*([^\{\}><]+)/);
            return tokens ? tokens[1].trim() : null;
        }

        camelCase(name) {
            if (name.length <= 1) {
                return name.toUpperCase();
            }
            else {
                return name.charAt(0).toUpperCase() + name.slice(1);
            }
        }

        refName(name) {
            if (name.length <= 1) {
                return name.toLowerCase();
            }
            else {
                return name.charAt(0).toLowerCase() + name.slice(1);
            }
        }

        cardinality(value) {
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
        }
    }

    let JavaPIMMixin = superClass => class extends superClass {

        constructor(...args) {
            super(...args);
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
            throw "Unknown type : " + type;
        }

        prepareClass(clazz, root) {
            let mainClass = root.classArtifact.setClassName(clazz.name);
            if (clazz.inherit) {
                mainClass.setSuperClass(clazz.inherit.name);
            }
            return mainClass;
        }

        processStandardGetter(clazz, mainClass, name, type) {
            let getMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(type)
                .setName("get" + this.camelCase(name));
            getMethod.addInstruction("return this." + name + ";");
            mainClass.addMethod(getMethod);
        }

        processUnmodifiableListGetter(clazz, mainClass, name, type) {
            let getMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType("List<"+type+">")
                .setName("get" + this.camelCase(name));
            getMethod.addInstruction("return Collections.unmodifiableList(this." + name + ");");
            mainClass.addMethod(getMethod);
        }

        processStandardSetter(clazz, mainClass, name, param, type) {
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("set" + this.camelCase(name));
            setMethod.addParameter(type, param);
            setMethod.addInstruction("this." + name + " = " + param + ";");
            setMethod.addInstruction("return this;");
            mainClass.addMethod(setMethod);
        }

        processDefaultConstructor(clazz, root, mainClass) {
            if (clazz.defaultConstructor) {
                let defaultConstructor = new ConstructorArtifact()
                    .setPrivacy("public")
                    .setName(clazz.name);
                mainClass.addConstructor(defaultConstructor);
            }
        }

        processStandardAdder(clazz, mainClass, name, type) {
            let param = this.refName(type);
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("add" + this.camelCase(name));
            addMethod.addParameter(type, param);
            addMethod.addInstruction("this." + name + ".add("+param+");");
            addMethod.addInstruction("return this;");
            mainClass.addMethod(addMethod);
        }

        processStandardRemover(clazz, mainClass, name, type) {
            let param = this.refName(type);
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("remove" + this.camelCase(name));
            addMethod.addParameter(type, param);
            addMethod.addInstruction("this." + name + ".remove("+param+");");
            addMethod.addInstruction("return this;");
            mainClass.addMethod(addMethod);
        }

        processStandardAttribute(key, field, mainClass) {
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType(this.getJavaType(field.type));
            mainClass.addAttribute(attribute);
            return attribute;
        }

    };

    let JPAPersistencePOMMixin = superClass => class extends superClass {

        constructor(...args) {
            super(...args);
        }

        buildPOMForJPA(spec, pom, errors) {
            pom.classes = {};
            spec.clazzes && spec.clazzes
                .forEach(clazz=>this.declarePersistentClass(pom, clazz, errors));
            spec.inherits && spec.inherits
                .forEach(inherit=>this.declarePersistentInherit(pom, inherit, errors));
            spec.relationships && spec.relationships
                .forEach(relationship=>this.declarePersistentRelationship(pom, relationship, errors));
            return pom;
        }

        prepareRuleEngineForJPA(ruleEngine, pom) {
            ruleEngine.addItems(
                {type: "class"}, ...pom.classes.toArray(), ruleEngine.errors);
            pom.classes.forEach(clazz=>ruleEngine.addItems(
                {type: "relationship", from: clazz}, ...clazz.relationships.toArray()));
            ruleEngine.addRules(
                new EntityOrMappedInheritsFromEntityOrMapped(),
                new EntityEmbeddedOrMappedLinkedToEmbedded(),
                new RelationshipsTargetingPersistentClassesFromPersistentClassesArePersistent(),
                new EntitiesMustHaveOneAndOnlyOneId(),
                new ClassesWithRelationshipsMustHaveADefaultConstructor("OneToMany", "ManyToMany")
            );
        }

        declarePersistentClass(pom, clazz, errors) {
            let persistentType = value=> {
                return this.hasStereotype(value, "entity") ? "entity" : "standard";
            };

            let entityName = this.value(clazz.title);
            let pomClass = pom.classes.find(clazz=>clazz.name===entityName);
            if (!pomClass) {
                pomClass = {
                    ids: [clazz.id],
                    category: "standard",
                    defaultConstructor : false,
                    name: entityName,
                    fields: {},
                    relationships: {}
                };
            }
            else {
                pomClass.ids.add(clazz.id);
            }
            if (pomClass.category==="standard") {
                pomClass.category=persistentType(clazz.title);
            }
            pom.classes[clazz.id] = pomClass;
            this.lines(clazz.content).forEach(
                line=>this.declarePersistentField(pomClass, line, errors));
        }

        declarePersistentField(entityPom, line, errors) {
            var field = this.typed(this.value(line));
            if (!field.name) {
                errors.push(new Error({type:"node", id:entityPom.ids[0]}, "Field has no name !"));
            } else if (!field.type) {
                errors.push(new Error({type:"node", id:entityPom.ids[0]}, "Field "+field.name+" has no type !"));
            } else {
                entityPom.fields[field.name] = {
                    parent: entityPom,
                    name: field.name,
                    type: this.value(field.type)
                };
                if (this.hasStereotype(line, "id")) {
                    entityPom.fields[field.name].key = true;
                }
                if (this.hasStereotype(line, "version")) {
                    entityPom.fields[field.name].version = true;
                }
            }
        }

        declarePersistentInherit(pom, inherit, errors) {
            let start = pom.classes[inherit.from.id];
            let end = pom.classes[inherit.to.id];
            if (start && end) {
                start.inherit = end;
            }

        }

        declarePersistentRelationship(pom, relationship, errors) {

            let inverseName = value=> {
                let name = this.getConstraint(value, "inverse");
                return name ? name : value;
            };

            let start = pom.classes[relationship.from.id];
            let end = pom.classes[relationship.to.id];
            if (start && end) {
                let name = this.value(relationship.title.message);
                start.relationships[name] = {
                    id:relationship.id,
                    type: end,
                    cardinality:
                        this.cardinality(relationship.beginCardinality.message) + "To" +
                        this.cardinality(relationship.endCardinality.message),
                    ownership: true
                };
                if (relationship.endTermination !== "arrow") {
                    let invName = inverseName(relationship.title.message);
                    end.relationships[invName] = {
                        id:relationship.id,
                        type: start,
                        cardinality:
                            this.cardinality(relationship.endCardinality.message) + "To" +
                            this.cardinality(relationship.beginCardinality.message),
                        ownership: false,
                        inverse: name
                    };
                    start.relationships[name].inverse = invName;
                }
                if (relationship.beginTermination === "aggregation") {
                    start.relationships[name].category = "aggregation";
                }
                else if (relationship.beginTermination === "composition") {
                    start.relationships[name].category = "composition";
                }
            }
        }

    };

    class GeneratorJPA extends JPAPersistencePOMMixin(JavaPIMMixin(Generator)) {

        constructor() {
            super();
        }

        buildPOM(spec, pom, errors) {
            try {
                this.buildPOMForJPA(spec, pom, errors);
            }
            catch (err) {
                if (err instanceof Error) {
                    errors.push(err);
                }
            }
        }

        prepareRuleEngine(ruleEngine, pom) {
            this.prepareRuleEngineForJPA(ruleEngine, pom);
        }

        processClassPersistence(clazz, root, mainClass) {
            if (clazz.category === "entity") {
                root.importsArtifact.addImport("javax.persistence.Entity");
                mainClass.addAnnotation(new AnnotationArtifact().setName("Entity"));
            }
            else if (clazz.category === "mapped") {
                root.importsArtifact.addImport("javax.persistence.MappedSuperclass");
                mainClass.addAnnotation(new AnnotationArtifact().setName("MappedSuperclass"));
            }
            else if (clazz.category === "embeddable") {
                root.importsArtifact.addImport("javax.persistence.Embeddable");
                mainClass.addAnnotation(new AnnotationArtifact().setName("Embeddable"));
            }
        }

        processEqualsAndHashcode(mainClass, type, name) {
            function length(type) {
                if (type === "int") {
                    return 32;
                }
                else if (type === "long") {
                    return 64;
                }
                throw "Invalid key type : " + type;
            }

            let hashCodeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setName("hashCode")
                .setType(type)
                .addInstructions(
                    "final int prime = 31;",
                    type + " result = 1;",
                    "result = prime * result + (" + type + ") (" + name + " ^ (" + name + " >>> " + length(type) + "));",
                    "result result;"
                );
            hashCodeMethod.addAnnotation("Override");
            mainClass.addMethod(hashCodeMethod);

            let equalsMethod = new MethodArtifact()
                .setPrivacy("public")
                .setName("equals")
                .setType("boolean")
                .addParameter("obj", "Object")
                .addInstructions(
                    "if (this == obj)",
                    "   return true;",
                    "if (obj == null)",
                    "   return false;",
                    "if (getClass() != obj.getClass())",
                    "   return false;",
                    type + " other = (" + type + ") obj;",
                    "if (this." + name + " != other." + name + ")",
                    "   return false;",
                    "return true;"
                );
            equalsMethod.addAnnotation("Override");
            mainClass.addMethod(equalsMethod);
        }

        processPersistentAttribute(clazz, key, field, root, mainClass) {
            let attribute = this.processStandardAttribute(key, field, mainClass);
            let doSet = true;
            if (field.key) {
                root.importsArtifact.addImport("javax.persistence.GeneratedValue");
                root.importsArtifact.addImport("javax.persistence.Id");
                attribute.addAnnotation(new AnnotationArtifact().setName("Id"));
                attribute.addAnnotation(new AnnotationArtifact().setName("GeneratedValue"));
                this.processEqualsAndHashcode(mainClass, attribute.type, attribute.name);
                doSet = false;
            }
            if (field.version) {
                root.importsArtifact.addImport("javax.persistence.Version");
                attribute.addAnnotation(new AnnotationArtifact().setName("Version"));
                doSet = false;
            }
            this.processStandardGetter(clazz, mainClass, attribute.name, attribute.type);
            this.processStandardSetter(clazz, mainClass, attribute.name, attribute.name, attribute.type, doSet);
        }

        processOneToOneBidirSetter(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("set" + this.camelCase(name));
            setMethod.addParameter(type, param);
            setMethod.addInstructions(
                "if (this." + name + "!=null) {",
                "\tthis." + name + "." + invName + "=null;",
                "}",
                "if (" + param + "!=null) {",
                "\tif (" + param + "." + invName + "!=null) {",
                "\t\t" + param + "." + invName + "." + name + " = null;",
                "\t}",
                "\t" + param + "." + invName + " = this;",
                "}",
                "this." + name + " = " + param + ";");
            setMethod.addInstruction("return this;");
            mainClass.addMethod(setMethod);
        }

        processManyToOneBidirSetter(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("set" + this.camelCase(name));
            setMethod.addParameter(type, param);
            setMethod.addInstructions(
                "if (this." + name + "!=" + param + ") {",
                "\tif (this." + name + "!=null) {",
                "\t\tthis." + name + "." + invName + ".remove(this);",
                "\t}",
                "\tif (" + param + "!=null) {",
                "\t\t" + param + "." + invName + ".add(this);",
                "\t}",
                "\tthis." + name + " = " + param + ";",
                "}");
            setMethod.addInstruction("return this;");
            mainClass.addMethod(setMethod);
        }

        processRelationshipPersistentAnnotation(relationship, root, attribute) {
            if (relationship.persistence === "persistent") {
                root.importsArtifact.addImport("javax.persistence." + relationship.cardinality);
                let relationshipAnnotation = new AnnotationArtifact().setName(relationship.cardinality);
                if (!relationship.ownership) {
                    relationshipAnnotation.addParameter("mappedBy", '"' + relationship.inverse + '"');
                }
                if (relationship.category==="composition" || relationship.category==="aggregation") {
                    root.importsArtifact.addImport("javax.persistence.CascadeType");
                    relationshipAnnotation.addParameter("cascade", 'CascadeType.ALL');
                }
                if (relationship.category==="composition") {
                    relationshipAnnotation.addParameter("orphanRemoval", 'true');
                }
                attribute.addAnnotation(relationshipAnnotation);
            }
            else if (relationship.persistence === "embedded") {
                root.importsArtifact.addImport("javax.persistence.Embedded");
                attribute.addAnnotation(new AnnotationArtifact().setName("Embedded"));
            }
        }

        processSingleReference(pom, clazz, key, relationship, root, mainClass) {
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType(relationship.type.name);
            let target = relationship.type;
            this.processRelationshipPersistentAnnotation(relationship, root, attribute);
            this.processStandardGetter(clazz, mainClass, attribute.name, attribute.type);
            if (relationship.inverse) {
                let invAttribute = {name:relationship.inverse, type:clazz.name};
                if (relationship.cardinality==="OneToOne") {
                    this.processOneToOneBidirSetter(
                        clazz, mainClass, attribute.name, invAttribute.name, attribute.type);
                }
                else if (relationship.cardinality==="ManyToOne") {
                    this.processManyToOneBidirSetter(
                        clazz, mainClass, attribute.name, invAttribute.name, attribute.type);
                }
            }
            else {
                this.processStandardSetter(clazz, mainClass, attribute.name, this.refName(attribute.type), attribute.type);
            }
            mainClass.addAttribute(attribute);
        }

        processOneToManyBidirAdder(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("add" + this.camelCase(name));
            addMethod.addParameter(type, param);
            addMethod.addInstructions(
                "if (this."+name+".indexOf("+param+")==-1) {",
                "\tif ("+param+"."+invName+"!=null) {",
                "\t\t"+param+"."+invName+"."+name+".remove("+param+");",
                "\t}",
                "\tthis."+name+".add("+param+");",
                "\t"+param+"."+invName+" = this;",
                "}");
            addMethod.addInstruction("return this;");
            mainClass.addMethod(addMethod);
        }

        processOneToManyBidirRemover(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let removeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("remove" + this.camelCase(name));
            removeMethod.addParameter(type, param);
            removeMethod.addInstructions(
                "if (this."+name+".indexOf("+param+")!=-1) {",
                "\tthis."+name+".remove("+param+");",
                "\t"+param+"."+invName+" = null;",
                "}");
            removeMethod.addInstruction("return this;");
            mainClass.addMethod(removeMethod);
        }

        processManyToManyBidirAdder(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("add" + this.camelCase(name));
            addMethod.addParameter(type, param);
            addMethod.addInstructions(
                "if (this."+name+".indexOf("+param+")==-1) {",
                "\tthis."+name+".add("+param+");",
                "\t"+name+"."+invName+".add(this);",
                "}");
            addMethod.addInstruction("return this;");
            mainClass.addMethod(addMethod);
        }

        processManyToManyBidirRemover(clazz, mainClass, name, invName, type) {
            let param = this.refName(type);
            let removeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(clazz.name)
                .setName("remove" + this.camelCase(name));
            removeMethod.addParameter(type, param);
            removeMethod.addInstructions(
                "if (this."+name+".indexOf("+param+")!=-1) {",
                "\tthis."+name+".remove("+param+");",
                "\t"+param+"."+invName+".remove(this);",
                "}");
            removeMethod.addInstruction("return this;");
            mainClass.addMethod(removeMethod);
        }

        processListOfReferences(pom, clazz, key, relationship, root, mainClass) {
            root.importsArtifact.addImport("java.util.List");
            let type = relationship.type.name;
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType("List<"+type+">");
            let target = relationship.type;
            this.processRelationshipPersistentAnnotation(relationship, root, attribute);
            root.importsArtifact.addImport("java.util.ArrayList");
            mainClass.constructors.default.addInstruction(key+" = new ArrayList<"+relationship.type.name+">();");
            mainClass.addAttribute(attribute);
            root.importsArtifact.addImport("java.util.Collections");
            root.importsArtifact.addImport("java.util.List");
            this.processUnmodifiableListGetter(clazz, mainClass, attribute.name, type);
            if (relationship.inverse) {
                let invAttribute = {name:relationship.inverse, type:clazz.name};
                if (relationship.cardinality==="OneToMany") {
                    this.processOneToManyBidirAdder(
                        clazz, mainClass, attribute.name, invAttribute.name, type);
                    this.processOneToManyBidirRemover(
                        clazz, mainClass, attribute.name, invAttribute.name, type);
                }
                else if (relationship.cardinality==="ManyToMany") {
                    this.processManyToManyBidirAdder(
                        clazz, mainClass, attribute.name, invAttribute.name, type);
                    this.processManyToManyBidirRemover(
                        clazz, mainClass, attribute.name, invAttribute.name, type);
                }
            }
            else {
                this.processStandardAdder(clazz, mainClass, attribute.name, type);
                this.processStandardRemover(clazz, mainClass, attribute.name, type);
            }

        }

        processRelationship(pom, clazz, key, relationship, root, mainClass) {
            if (relationship.cardinality==="OneToOne" || relationship.cardinality==="ManyToOne") {
                this.processSingleReference(pom, clazz, key, relationship, root, mainClass);
            }
            else {
                this.processListOfReferences(pom, clazz, key, relationship, root, mainClass);
            }
        }

        generatePIM(pom, errors) {
            /*
            this.load("EntityModel", (model)=>{
                pom.classes.forEach(clazz=>)
            });
            */
            let text = "";
            pom.classes.forEach((clazz, key)=> {
                if (clazz.ids.indexOf(Number(key)) === 0) {
                    try {
                        let root = new FileArtifact().setPackageName("com.acme.domain");
                        let mainClass = this.prepareClass(clazz, root);
                        this.processClassPersistence(clazz, root, mainClass);
                        this.processDefaultConstructor(clazz, root, mainClass);
                        clazz.fields.forEach((field, key)=> {
                            this.processPersistentAttribute(clazz, key, field, root, mainClass)
                        });
                        clazz.relationships.forEach((relationship, key)=> {
                            this.processRelationship(pom, clazz, key, relationship, root, mainClass)
                        });
                        root.generate(0).forEach(line=>text += line + "\n");
                    }
                    catch (err) {
                        errors.push(new Error(
                            {type:"node", id:clazz.ids[0]}, err));
                    }
                }
            });
            if (errors.empty()) {
                return text;
            }
            else { return false; }
        }

    }

    class GeneratorDAO extends JPAPersistencePOMMixin(JavaPIMMixin(Generator)) {

        constructor() {
            super();
        }

        buildPOM(spec, pom, errors) {
            this.buildPOMForJPA(spec, pom, errors);
            if (errors.empty()) {
                pom.dtos = {};
                spec.objects && spec.objects
                    .forEach(object=>this.declareDTOClass(pom, object, spec, errors));
                spec.relationships && spec.relationships
                    .filter(relationship=>pom.dtos[relationship.from.id]!==undefined)
                    .forEach(relationship=>this.declareDTORelationship(pom, relationship, spec, errors));
            }
        }

        prepareRuleEngine(ruleEngine, pom) {
            this.prepareRuleEngineForJPA(ruleEngine, pom);
            ruleEngine.addItems(
                {type: "class"}, ...pom.dtos.toArray(), ruleEngine.errors);
            pom.dtos.forEach(clazz=>ruleEngine.addItems(
                {type: "relationship", from: clazz}, ...clazz.relationships.toArray()));
            ruleEngine.addRules(
                new ClassesWithRelationshipsMustHaveADefaultConstructor("Many")
            );
        }

        declareDTOClass(pom, object, spec, errors) {

            let initPomDtoClass = className=>{
                let pomDtoClass = pom.dtos.find(clazz=>clazz.name===className);
                if (!pomDtoClass) {
                    pomDtoClass = {
                        ids: [object.id],
                        name: className,
                        defaultConstructor: false,
                        fields: {},
                        relationships: {},
                        dependancies: {}
                    }
                }
                else {
                    pomDtoClass.ids.add(object.id);
                }
                pom.dtos[object.id] = pomDtoClass;
                return pomDtoClass;
            };

            let objectSpec = this.value(object.title);
            let {name:className, type:classType} = this.typed(objectSpec);
            if (classType==="DTO") {
                let pomDtoClass = initPomDtoClass(className);
                this.declareDependancies(pomDtoClass, spec, pom.classes);
                this.lines(object.content).forEach(
                    line=>this.declareDtoField(pomDtoClass, line, errors));
            }
        }

        declareDTORelationship(pom, relationship, spec, errors) {
            var link = this.valued(this.value(relationship.title.message));
            if (!link.name) {
                errors.push(new Error({type:"link", id:relationship.id}, "Relationship has no name !"));
            }
            else if (!link.value) {
                errors.push(new Error({type:"link", id:relationship.id}, "Relationship "+link.name+" has no path !"));
            }
            let dtoPom = pom.dtos[relationship.from.id];
            let path=link.value.split('.');
            let target = this.findClass(path, dtoPom, dtoPom.dependancies);
            dtoPom.relationships[link.name] = {
                parent: dtoPom,
                name: link.name,
                cardinality: this.cardinality(relationship.endCardinality.message),
                path: path,
                target: target,
                type: pom.dtos[relationship.to.id]
            };
        }

        processSingleReference(pom, clazz, key, relationship, root, mainClass) {
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType(relationship.type.name);
            let target = relationship.type;
            this.processStandardGetter(clazz, mainClass, attribute.name, attribute.type);
            this.processStandardSetter(clazz, mainClass, attribute.name, this.refName(attribute.type), attribute.type);
            mainClass.addAttribute(attribute);
        }

        processListOfReferences(pom, clazz, key, relationship, root, mainClass) {
            root.importsArtifact.addImport("java.util.List");
            let type = relationship.type.name;
            let attribute = new AttributeArtifact()
                .setName(key)
                .setType("List<"+type+">");
            let target = relationship.type;
            root.importsArtifact.addImport("java.util.ArrayList");
            mainClass.constructors.default.addInstruction(key+" = new ArrayList<"+relationship.type.name+">();");
            mainClass.addAttribute(attribute);
            root.importsArtifact.addImport("java.util.Collections");
            root.importsArtifact.addImport("java.util.List");
            this.processStandardGetter(clazz, mainClass, attribute.name, attribute.type);
            this.processStandardSetter(clazz, mainClass, attribute.name, this.refName(attribute.type), attribute.type);
        }

        processRelationship(pom, clazz, key, relationship, root, mainClass) {
            if (relationship.cardinality==="One") {
                this.processSingleReference(pom, clazz, key, relationship, root, mainClass);
            }
            else {
                this.processListOfReferences(pom, clazz, key, relationship, root, mainClass);
            }
        }

        declareDependancies(clazz, spec, targets) {
            spec.dependancies
                .filter(dependancy=>clazz.ids.indexOf(dependancy.from.id)!=-1)
                .forEach(dependancy=>{
                    clazz.dependancies[this.value(dependancy.comment.message)] = targets[dependancy.to.id];
                });
        }

        findClass(path, target, start) {
            path.forEach(segment=>{
                target = start[segment];
                if (!target) return null;
                if (target.type) {
                    target = target.type;
                }
                start = target.relationships;
            });
            return target;
        }

        getFields(pomClass) {
            function assignFields(fields, clazz) {
                if (clazz.inherit) {
                    assignFields(fields, clazz.inherit);
                }
                Object.assign(fields, clazz.fields);
                return fields;
            }
            return assignFields({}, pomClass);
        }

        findField(path, target, start) {
            path = [...path];
            let fieldPath = path.pop();
            let targetClass = this.findClass(path, target, start);
            return !targetClass ? null : this.getFields(targetClass)[fieldPath];
        }

        findFields(path, target, start) {
            path = [...path];
            let fieldPath = path.pop();
            let targetClass = this.findClass(path, target, start);
            return !targetClass ? null : this.getFields(targetClass);
        }

        declareDtoField(dtoPom, line, errors) {

            let processWildcardAttribute = field=> {
                let path = field.value.split('.');
                let targets = this.findFields(path, dtoPom, dtoPom.dependancies);
                if (!targets) {
                    errors.push(new Error({
                        type: "node",
                        id: dtoPom.ids[0]
                    }, "Field path for " + field.name + " is invalid !"));
                }
                path.pop();
                targets.forEach(target=>{
                    let fieldName = field.name.indexOf("*")===0 ?
                        field.name.replace("*", this.refName(target.name)) :
                        field.name.replace("*", this.camelCase(target.name));
                    dtoPom.fields[fieldName] = {
                        parent: dtoPom,
                        name: fieldName,
                        path : path,
                        target: target,
                        type: target.type
                    };
                });
            };

            let processBasicAttribute = field=> {
                let path = field.value.split('.');
                let target = this.findField(field.value.split('.'), dtoPom, dtoPom.dependancies);
                if (!target) {
                    errors.push(new Error({
                        type: "node",
                        id: dtoPom.ids[0]
                    }, "Field path for " + field.name + " is invalid !"));
                }
                else {
                    path.pop();
                    dtoPom.fields[field.name] = {
                        parent: dtoPom,
                        name: field.name,
                        path: path,
                        target: target,
                        type: target.type
                    };
                }
            };

            var field = this.valued(this.value(line));
            if (!field.name) {
                errors.push(new Error({type:"node", id:dtoPom.ids[0]}, "Field has no name !"));
            }
            else if (!field.value) {
                errors.push(new Error({type:"node", id:dtoPom.ids[0]}, "Field "+field.name+" has no path !"));
            }
            else {
                if (field.name.indexOf("*") > -1) {
                    processWildcardAttribute(field);
                }
                else {
                    processBasicAttribute(field);
                }
            }
        }

        generatePIM(pom, errors) {
            let text = "";
            pom.dtos.forEach((clazz, key)=> {
                if (clazz.ids.indexOf(Number(key)) === 0) {
                    try {
                        let root = new FileArtifact().setPackageName("com.acme.dtos");
                        let mainClass = this.prepareClass(clazz, root);
                        this.processDefaultConstructor(clazz, root, mainClass);
                        clazz.fields.forEach((field, key)=> {
                            let attribute = this.processStandardAttribute(key, field, mainClass);
                            this.processStandardGetter(clazz, mainClass, attribute.name, attribute.type);
                            this.processStandardSetter(clazz, mainClass, attribute.name, attribute.name, attribute.type, true);
                        });
                        clazz.relationships.forEach((relationship, key)=> {
                            this.processRelationship(pom, clazz, key, relationship, root, mainClass)
                        });
                        root.generate(0).forEach(line=>text += line + "\n");
                    }
                    catch (err) {
                        errors.push(new Error(
                            {type:"node", id:clazz.ids[0]}, err));
                    }
                }
            });
            if (errors.empty()) {
                return text;
            }
            else { return false; }
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
            if (typeof(annotationArtifact) === "string") {
                annotationArtifact = new AnnotationArtifact().setName(annotationArtifact);
            }
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
                let result = "implements "+interfaces[0];
                for (let i=1; i<interfaces.length; i++) {
                    result+=", "+interfaces[i];
                }
                return result+" ";
            }

            let result = [];
            this.annotations.forEach(annotationArtifact=>{
                this.writeLines(result, indent, annotationArtifact.generate(0));
            });
            this.writeLine(result, indent, "class "+this.className+" "+
                writeSuperClass(this.superClass)+
                writeInterfaces(this.interfaces)+"{");
            this.writeEmptyLine(result);
            if (!this.attributes.empty()) {
                this.attributes.forEach(attributeArtifact=>{
                    this.writeLines(result, indent, attributeArtifact.generate(1));
                });
                this.writeEmptyLine(result);
            }
            if (!this.constructors.empty()) {
                this.constructors.forEach(constructorArtifact=>{
                    this.writeLines(result, indent, constructorArtifact.generate(1));
                });
            }
            if (!this.methods.empty()) {
                this.methods.forEach(methodArtifact=>{
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
            this.parameters = {};
        }

        setName(name) {
            this.name = name;
            return this;
        }

        addParameter(name, value) {
            this.parameters[name] = value;
            return this;
        }

        generate(indent) {
            let result = [];
            let line = "@"+this.name;
            if (!this.parameters.empty()) {
                if (this.parameters.count===1 && this.parameters.value!==undefined) {
                    line+="("+this.parameters.value+")"
                }
                else {
                    let first = true;
                    this.parameters.forEach((value, key)=> {
                        if (first) {
                            line += "(" + key + " = " + value;
                            first = false;
                        }
                        else {
                            line += ", " + key + " = " + value;
                        }
                    });
                    line +=")";
                }
            }
            this.writeLine(result, indent, line);
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
            if (typeof(annotationArtifact) === "string") {
                annotationArtifact = new AnnotationArtifact().setName(annotationArtifact);
            }
            this.annotations[annotationArtifact.name] = annotationArtifact;
            return this;
        }

        generate(indent) {
            let result = [];
            this.annotations.forEach(annotationArtifact=>{
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
            this.annotations = {};
        }

        setPrivacy(privacy) {
            this.privacy = privacy;
            return this;
        }

        addParameter(type, name) {
            this.parameters.push({type:type, name:name});
            return this;
        }

        addAnnotation(annotationArtifact) {
            if (typeof(annotationArtifact) === "string") {
                annotationArtifact = new AnnotationArtifact().setName(annotationArtifact);
            }
            this.annotations[annotationArtifact.name] = annotationArtifact;
            return this;
        }

        addInstruction(instructionArtifact) {
            if (typeof(instructionArtifact) === "string") {
                instructionArtifact = new InstructionArtifact(instructionArtifact);
            }
            this.instructions.push(instructionArtifact);
            return this;
        }

        addInstructions(...instructionArtifacts) {
            instructionArtifacts.forEach(instructionArtifact=>this.addInstruction(instructionArtifact));
            return this;
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
            this.annotations.forEach(annotationArtifact=>{
                this.writeLines(result, indent, annotationArtifact.generate(0));
            });
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
        GeneratorJPA : GeneratorJPA,
        GeneratorDAO : GeneratorDAO
    };
};