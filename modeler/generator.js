/**
 * Created by HDA3014 on 07/09/2016.
 */


exports.Generator = function(svg, gui, url) {

    function lines(value) {
        let lines = value.match(/([^\n\r]+)/g);
        return lines ? lines : [];
    }

    function stereotypes(value) {
        return (value.match(/<<([^\>]*)>>/g) || []).map(token=>/<<(.*)>>/.exec(token)[1].trim());
    }

    function getStereotype(value, spec) {
        let stereos = stereotypes(value);
        let stereo = stereos.find(
            value=>typed(value).name === spec);
        return stereo ? typed(stereo).type : null;
    }

    function hasStereotype(value, spec) {
        let result = stereotypes(value).filter(
            value=>typed(value).name === spec);
        return result.length > 0;
    }

    function constraints(value) {
        return (value.match(/\{([^\}]*)\}/g) || []).map(token=>/\{(.*)\}/.exec(token)[1].trim());
    }

    function getConstraint(value, spec) {
        let consts = constraints(value);
        let constraint = consts.find(value=>valued(value).name===spec);
        return constraint ? valued(constraint).value : null;
    }

    function hasConstraint(value, spec) {
        let result = constraints(value).filter(
            value=>valued(value).name === spec);
        return result.length > 0;
    }

    /**
     * Builds an object of the form : { name="key", value="data" } form a string which syntax is of the form "key=data".
     * Note that the input string should not contain any stereotype or contraint specification.
     * @param value string to process.
     * @returns object that refers to "name" and "value" part of the input string.
     */
    function typed(value) {
        let result = /([^:]+):(.+)/.exec(value);
        return {
            name: result ? result[1].trim() : value.trim(),
            type: result ? result[2].trim() : null
        }
    }

    /**
     * Builds an object of the form : { name="key", value="data" } form a string which syntax is of the form "key:data".
     * Note that the input string should not contain any stereotype or contraint specification.
     * @param value string to process.
     * @returns object that refers to "name" and "value" part of the input string.
     */
    function valued(value) {
        let result = /([^=]+)=(.+)/.exec(value);
        return {
            name: result ? result[1].trim() : value.trim(),
            value: result ? result[2].trim() : null
        }
    }

    /**
     * Extract the "value part" of a string. The value part is everything which is not a stereotype or a constraint,
     * trimmed.
     * Example: the value of "<<stereotype>> key=value {constraint}" is : "key=value"
     * @param line the string to process
     * @returns the value part of the line.
     */
    function value(line) {
        let tokens = line.match(/(?:\{[^\}]*\})*(?:<<[^\>]*>>)*(?:\{[^\}]*\})*([^\{\}><]+)/);
        return tokens ? tokens[1].trim() : null;
    }

    /**
     * Creates a class name from a given name. Essentially, this method uppers the case of the first character.
     * @param name nome form which a class name is build
     * @returns the class name
     */
    function camelCase(name) {
        if (name.length <= 1) {
            return name.toUpperCase();
        }
        else {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }

    /**
     * Creates a reference name (variable name, field name, function name) from a given name. Essentially, this method
     * lowers the case of the first character.
     * @param name nome form which a reference name is build
     * @returns the reference name
     */
    function refName(name) {
        if (name.length <= 1) {
            return name.toLowerCase();
        }
        else {
            return name.charAt(0).toLowerCase() + name.slice(1);
        }
    }

    /**
     * Error object fired by generator
     */
    class Error {

        /**
         * Build a generator error to be fired
         * @param ref : indicates on which item the error is detected
         * @param messages : explanation about the error encountered
         */
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

        /**
         * Retrieve on a schema the object (a node or a link) related to the current error (in order to show a "red"
         * warning box).
         * @param schema where the item is to be found
         * @returns the node or link when found
         */
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

    /**
     * Tiny "Rule Engine" able to improve/check the POM definition.
     * IMPORTANT : this object is STATEFUL, so its must be "executed" only once.
     */
    class RuleEngine {

        /**
         * Array of errors objects (given empty) where the engine should set the detected errors and used afterward
         * to show eror on the schema.
         * @param errors
         */
        constructor(errors) {
            this.errors = errors;
            this.rules = [];
            this.items = new Map();
        }

        /**
         * Add an item to check (link or node).
         * Note that this method may be invoked many times, allowing the rule engine to work on a very heterogeneous set
         * of items.
         * @param data short description of the item set given thereafter. Useful because POM object are not "typed" (ie
         * built using a constructor) and because, in many times a POM relationship object does'nt contain any
         * reference to its "start" node. Data contains these missing infos.
         * @param items list of item to check.
         */
        addItems(data, ...items) {
            items.forEach(item=>this.items.set(item, data));
        }

        /**
         * Add a set of rules.
         * Note that this method may be invoked several times.
         * @param rules rules to be added.
         */
        addRules(...rules) {
            this.rules.push(...rules);
        }

        /**
         * Execution of the engine.
         * The principle is the following:
         * <ul>
         *     <li> The rules are all executed in successive passes. At the end of every "pass", the rule engine check
         *     that something had changed in the POM specification during that pass. If it's the case, another pass is
         *     launched.
         *     <li> During a "pass", every rule is executed against each item. The rule returns a flag indicating that
         *     its had improved the POM specification (ie. if something had "changed"). A rule may also throw an Error
         *     object which is stored by the rule engine.
         *     <li> A rule may also throw unexpected exceptions (non Error ones) which are simply rethrown by the
         *     engine.
         * </ul>
         * @param pom POM specification
         * @returns true if no errors are detected, false otherwise
         */
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

    /**
     * Base class for Rules. "Mark" class in fact. Contains only utilities.
     * Note that a concrete rule must define an "execute" method that accepts three parameters:
     * <ul>
     *     <li> the POM specification,
     *     <li> the item to be checked
     *     <li> the related "data" item (see RuleEngine.addItems for an explanation about this data item).
     * </ul>
     * The "execute" method throws an Error object or returns a flag indicating if it has improved the POM
     * specification.
     */
    class Rule {

    }

    /**
     * Improves a POM definition, marking as "mapped" (JPA mappedSuperclass) the superclass of any entity class, when
     * this superclass is a "standard" one (not mapped, not entity and not embedded).
     * Throws an Error when the superclass is already marked as "embedded".
     */
    class EntityOrMappedInheritsFromEntityOrMapped extends Rule {

        constructor() {
            super();
        }

        execute(pom, pomItem, data) {
            if (!data.type==="class") {
                return false;
            }
            if (pomItem.category!=="entity") {
                return false;
            }
            if (!pomItem.entity().getInheritance()) {
                return false;
            }
            let superClass = pomItem.entity().getInheritance().clazz;
            if (superClass.category==="entity" ||
                superClass.category==="mapped") {
                return false;
            }
            if (superClass.category==="standard") {
                superClass.category="mapped";
                return true;
            }
            throw new Error(
                {type:"node", id:pomItem.ids[0]},
                "Super class of entity class "+pomItem.name+" must not be "+pomItem.inherit.category);
        }

    }

    /**
     * Improves a POM definition, marking as "embedded" a class that is a target of a relationship starting from an
     * entity or an already embedded class.
     * Throws an Error object when a mapped superclass targets an embedded class with a relationship.
     */
    class EntityEmbeddedOrMappedLinkedToEmbedded extends Rule {

        constructor() {
            super();
        }

        execute(pom, pomRelationship, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (data.from.category!=="entity" &&
                data.from.category!=="mapped" &&
                data.from.category!=="embeddable") {
                return false;
            }
            let target = pomRelationship.getTarget();
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
                    {type:"link", id:pomRelationship.id},
                    "MappedSuperclass "+target.name+" cannot be target of a relationship");
            }
            return false;
        }

    }

    /**
     * Improves a POM definition, giving a "category" to a relationship when it links two persistent classes. Two kinds
     * of categories are possible:
     * <ul>
     *     <li> "persistent" when it targets an entity
     *     <li> "embedded" when it targets an "embedded" object
     * </ul>
     */
    class RelationshipsTargetingPersistentClassesFromPersistentClassesArePersistent extends Rule {

        constructor() {
            super();
        }

        execute(pom, pomRelationship, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (data.from.category!=="entity" &&
                data.from.category!=="embeddable" &&
                data.from.category!=="mapped") {
                return false;
            }
            let target = pomRelationship.getTarget();
            if (target.category==="entity") {
                if (pomRelationship.persistence!=="persistent") {
                    pomRelationship.persistence="persistent";
                    return true;
                }
                return false;
            }
            if (target.category==="embeddable") {
                if (pomRelationship.persistence!=="embedded") {
                    pomRelationship.persistence="embedded";
                    return true;
                }
                return false;
            }
            return false;
        }

    }

    /**
     * Ensure that an entity class defines one - and only one - id attribute. Note that all the class hierarchy is
     * checked.
     */
    class EntitiesMustHaveOneAndOnlyOneId extends Rule {

        constructor() {
            super();
        }

        execute(pom, pomItem, data) {
            if (data.type!=="class") {
                return false;
            }
            if (pomItem.category!=="entity") {
                return false;
            }
            let ids = [];
            pomItem.entity().collectFields().forEach(field=>{
                if (field.isKey()) {
                    ids.push(field.impl.getName()+"."+field.getName());
                }
            });
            if (ids.empty()) {
                throw new Error(
                    {type:"node", id:pomItem.ids[0]},
                    "Entity "+pomItem.name+" has no id !");
            }
            else if (ids.length>1) {
                throw new Error(
                    {type:"node", id:pomItem.ids[0]},
                    "Entity "+pomItem.name+" has multiple ids : ",...ids);
            }
            return false;
        }

    }

    /**
     * Improves a POM definition in order to ensure that a class owning collection typed attributes defines a default
     * constructor in which the class will have the opportunity to builds/initialize such attributes.
     */
    class ClassesWithRelationshipsMustHaveADefaultConstructor extends Rule {

        constructor(targetImplementation, ...cardinalities) {
            super();
            this.cardinalities = cardinalities;
            this.targetImplementation = targetImplementation;
        }

        execute(pom, pomItem, data) {
            if (data.type!=="relationship") {
                return false;
            }
            if (this.cardinalities.contains(pomItem.cardinality) &&
                !data.from.implementations[this.targetImplementation].getDefaultConstructor()) {
                data.from.implementations[this.targetImplementation].setDefaultConstructor(true);
                return true;
            }
            return false;
        }

    }

    /**
     * Container for an entire POM specification. A POM space is an autonomous set of objects (ie a POM object inside a
     * POM space may only refers to objects belonging to the same POM space). A POM space may contains many classes,
     * relationships etc.
     */
    class POMSpace {

        constructor() {
            this.types = {};
        }


        addType(key, name, packageName=null, getterPrefix="get", setterPrefix="set") {
            this.registerType(new POMType(key, name, packageName, getterPrefix, setterPrefix));
            return this;
        }

        registerType(pomType) {
            this.types[pomType.getKey()] = pomType;
            return this;
        }

        getType(longName) {
            return this.types[longName];
        }

        addItem(category, item) {
            if (!this[category]) {
                this[category]={};
            }
            let pomItem = this[category].find(anItem=>anItem.name===item.name);
            if (!pomItem) {
                item.pom = this;
                this[category][item.getId()] = item;
                if (item instanceof POMClass) {
                    item.implementations.forEach(implementation=>this.registerType(implementation));
                }
                return item;
            }
            else {
                pomItem.addId(item.getId());
                return pomItem;
            }
        }

        getItem(category, id) {
            return this[category] ? this[category][id] : null;
        }

    }

    class POMType {

        constructor(key, name, packageName=null, getterPrefix="get", setterPrefix="set") {
            this.key = key;
            this.name = name;
            this.packageName = packageName;
            this.getterPrefix = getterPrefix;
            this.setterPrefix = setterPrefix;
        }

        getKey() {
            return this.key;
        }

        getName() {
            return this.name;
        }

        getPackageName() {
            return this.packageName;
        }

        getDeclarations() {
            return !this.packageName ? [] : [this.packageName+"."+this.name];
        }

        getGetterPrefix() {
            return this.getterPrefix;
        }

        getSetterPrefix() {
            return this.setterPrefix;
        }
    }

    class POMParametrizedType extends POMType {

        constructor(key, name, packageName=null, getterPrefix="get", setterPrefix="set") {
            super(key, name, packageName, getterPrefix, setterPrefix);
            this.types = [];
        }

        parameter(... types) {
            this.types.push(...types);
            return this;
        }

        getName() {
            return super.getName()+"<"+this.types.map(type=>type.getName()).join(", ")+">";
        }

        getDeclarations() {
            let declarations = super.getDeclarations();
            this.types.forEach(type=>declarations.push(...type.getDeclarations()));
            return declarations;
        }
    }

    class POMClass {

        constructor(id, name) {
            this.ids = [id];
            this.name = name;
            this.implementations = {};
        }

        getSpace() {
            return this.pom;
        }

        addId(id) {
            this.ids.add(id);
            return this;
        }

        getId() {
            return this.ids[0];
        }

        addImplementation(implementationKey, className, packageName, implementationClass=POMImplementation) {
            let implementation = new implementationClass(className, packageName);
            this.implementations[implementationKey] = implementation;
            implementation.clazz = this;
            if (this.pom) {
                this.pom.registerType(implementation);
            }
            return this;
        }

        createError(message) {
            return new Error({type:"node", id:this.ids[0]}, message);
        }

    }

    class POMImplementation extends POMType {

        constructor(name, packageName) {
            let key = packageName ? packageName+"."+name : name;
            super(key, name, packageName, "get", "set");
            this.fields = {};
            this.relationships = {};
        }

        getSpace() {
            return this.clazz.pom;
        }

        setInheritance(pomImpl) {
            this.inheritance = pomImpl;
            return this;
        }

        getInheritance() {
            return this.inheritance;
        }

        addField(pomField) {
            this.fields[pomField.getName()] = pomField;
            pomField.impl = this;
            return pomField;
        }

        getFields() {
            return this.fields;
        }

        getField(fieldName) {
            return this.fields[fieldName];
        }

        addRelationship(pomRelationship) {
            this.relationships[pomRelationship.getName()] = pomRelationship;
            pomRelationship.impl = this;
            return pomRelationship;
        }

        getRelationships() {
            return this.relationships;
        }

        getRelationship(relationshipName) {
            return this.relationships[relationshipName];
        }

        /**
         * Gather all fields belonging to a given class object AND those belonging to all classes of its hierarchy.
         * @param pom POM specification containing the class hierarchy
         * @param pomImplementation class to be processed
         * @returns an array containing a record for every found fields. This record is an object containing three
         * attributes:
         * <ul>
         *     <li> "clazz" : the POM class, the field belongs to.
         *     <li> "name" : name of the field.
         *     <li> "value" : the field itself (which is an object containing "name" and "type" attributes)
         * </ul>
         */
        collectFields() {
            let pomImpl = this;
            let result = {};
            while (pomImpl) {
                pomImpl.fields.forEach((field, key)=> {
                    result[key] = field;
                });
                if (pomImpl.getInheritance()) {
                    pomImpl = pomImpl.getInheritance();
                }
                else {
                    pomImpl = null;
                }
            }
            return result;
        }

        setDefaultConstructor() {
            this.defaultConstructor = true;
            return this;
        }

        getDefaultConstructor() {
            return this.defaultConstructor;
        }
    }

    class POMField {

        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.getter = true;
            this.setter = true;
        }

        getSpace() {
            return this.impl.clazz.pom;
        }

        setGetter(flag) {
            this.getter = flag;
            return this;
        }

        setSetter(flag) {
            this.setter = flag;
            return this;
        }

        isGetter() {
            return this.getter;
        }

        isSetter() {
            return this.setter;
        }

        getName() {
            return this.name;
        }

        getType() {
            return typeof(this.type)==="string" ? this.impl.clazz.pom.getType(this.type) : this.type;
        }

        getGetterName() {
            return this.getType().getGetterPrefix() + camelCase(this.getName());
        }

        getSetterName() {
            return this.getType().getSetterPrefix() + camelCase(this.getName());
        }

        getAdderName() {
            return "add" + camelCase(this.getName());
        }

        getRemoverName() {
            return "remove" + camelCase(this.getName());
        }
    }

    class POMRelationship {

        constructor(id, name, target, cardinality) {
            this.id = id;
            this.name = name;
            this.target = target;
            this.cardinality = cardinality;
        }

        getSpace() {
            return this.impl.clazz.pom;
        }

        getId() {
            return this.id;
        }

        getName() {
            return this.name;
        }

        getTarget() {
            return this.target;
        }

        getCardinality() {
            return this.cardinality;
        }

    }

    class JavaPOMSpace extends POMSpace {

        constructor() {
            super();
            this.addType("void", "void")
                .addType("string", "String")
                .addType("int", "int")
                .addType("long", "long")
                .addType("float", "float")
                .addType("double", "double")
                .addType("boolean", "boolean", null, "is")
                .addType("date", "Date", "java.util")
                .addType("object", "Object");
        }

        collectionsType() {
            return new POMType("?", "Collections", "java.util");
        }

        listType(elemType) {
            return new POMParametrizedType("?", "List", "java.util").parameter(elemType);
        }

        arrayListType(elemType) {
            return new POMParametrizedType("?", "ArrayList", "java.util").parameter(elemType);
        }
    }

    class JPAPOMClass extends POMClass {

        constructor(id, name) {
            super(id, name);
            this.addImplementation("entity", name, "com.acme.domain", JPAPOMImplementation);
            this.category = "standard";
        }

        relationships() {
            return this.entity().relationships;
        }

        setCategory(category) {
            if (this.category==="standard") {
                this.category = category;
            }
            else if (category!== this.category) {
                throw this.createError("Cannot change persistent class category from "+this.category+" to "+category);
            }
            return this;
        }

        getCategory() {
            return this.category;
        }

        addField(name, type) {
            return this.entity().addField(new JPAPOMField(name, type));
        }

        addRelationship(id, name, target, cardinality, ownership) {
            return this.entity().addRelationship(
                new JPAPOMRelationship(id, name, target, cardinality, ownership));
        }

        extends(pomClass) {
            this.entity().setInheritance(pomClass.entity());
            return this;
        }

        entity() {
            return this.implementations.entity;
        }
    }

    class JPAPOMImplementation extends POMImplementation {

        constructor(name, packageName) {
            super(name, packageName);
        }

        getKeyField() {
            return this.fields.find(field=>field.isKey());
        }

        getVersionField() {
            return this.fields.find(field=>field.isVersion());
        }
    }

    class JPAPOMField extends POMField {

        constructor(name, type) {
            super(name, type);
            this.key = false;
            this.version = false;
        }

        isKey() {
            return this.key;
        }

        isVersion() {
            return this.version;
        }

        setKey(key) {
            return this.key = key;
        }

        setVersion(version) {
            return this.version = version;
        }
    }

    class JPAPOMRelationship extends POMRelationship {

        constructor(id, name, target, cardinality, ownership) {
            super(id, name, target, cardinality);
            this.ownership = ownership;
        }

        getOwnership() {
            return this.ownership;
        }

        getField() {
            let field = new POMField(this.getName(), this.getTarget().entity());
            field.impl = this.impl;
            return field;
        }

        getListField() {
            let field = new POMField(this.getName(), this.getSpace().listType(this.getTarget().entity()));
            field.impl = this.impl;
            return field;
        }

        setCategory(category) {
            this.category = category;
            return this;
        }

        getCategory() {
            return this.category;
        }

        setInverse(inverse) {
            this.inverse = inverse;
            return this;
        }

        getInverse() {
            return this.inverse;
        }
    }

    class DTOPOMClass extends POMClass {

        constructor(id, name) {
            super(id, name);
            this.mappings = {};
            this.addImplementation("dto", name, "com.acme.dtos", DTOPOMImplementation);
            this.addImplementation("converter", name+"Converter", "com.acme.converters", DTOPOMImplementation);
        }

        relationships() {
            return this.dto().relationships;
        }

        addRelationship(id, name, target, cardinality, path, mapping) {
            this.dto().addRelationship(
                new DTOPOMRelationship(id, name, target, cardinality, path, mapping));
            return this;
        }

        getMappings() {
            return this.mappings;
        }

        addMapping(mappingKey, pomEntityClass) {
            this.mappings[mappingKey] = pomEntityClass;
            return this;
        }

        dto() {
            return this.implementations.dto;
        }

        converter() {
            return this.implementations.converter;
        }
    }

    class DTOPOMImplementation extends POMImplementation {

        constructor(name, packageName) {
            super(name, packageName);
        }

        getKeyField() {
            return this.fields.find(field=>field.getMapping().isKey());
        }

        getVersionField() {
            return this.fields.find(field=>field.getMapping().isVersion());
        }
    }

    class DTOPOMField extends POMField {

        constructor(name, path, mapping) {
            super(name, mapping.getType());
            this.path = path;
            this.mapping = mapping;
        }

        getPath() {
            return this.path;
        }

        getMapping() {
            return this.mapping;
        }

        isKey() {
            return this.mapping.isKey();
        }

    }

    class DTOPOMRelationship extends POMRelationship {

        constructor(id, name, target, cardinality, path, mapping) {
            super(id, name, target, cardinality);
            this.path = path;
            this.mapping = mapping;
        }

        getField() {
            let field = new POMField(this.getName(), this.getTarget().dto());
            field.impl = this.impl;
            return field;
        }

        getListField() {
            let field = new POMField(this.getName(), this.getSpace().listType(this.getTarget().dto()));
            field.impl = this.impl;
            return field;
        }

        getPath() {
            return this.path;
        }

        getMapping() {
            return this.mapping;
        }
    }

    class Generator {

        constructor() {
        }

        generate(spec, success, error) {
            let errors = [];
            let pom = this.buildPOM(spec, errors);
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

        callChain(pomImpl, path) {
            let result="";
            let currentImpl = pomImpl;
            path.forEach(
                fieldOrRelationshipName=>{
                    let pomField =
                        pomImpl.getField(fieldOrRelationshipName) ||
                        pomImpl.getRelationship(fieldOrRelationshipName).getField();
                    result+=pomField.getGetterName()+"()";
                    currentImpl = pomField.getType();
                }
            );
            return result ? result : "";
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

        prepareClass(pomImpl, pimFile) {
            let pimClass = pimFile.classArtifact.setClassName(pomImpl.getName());
            if (pomImpl.getInheritance()) {
                pimClass.setSuperClass(pomImpl.getInheritance());
            }
            return pimClass;
        }

        processStandardGetter(pimClass, pomField) {
            let getMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomField.getType())
                .setName(pomField.getGetterName());
            getMethod.addInstruction("return this." + pomField.getName() + ";");
            pimClass.addMethod(getMethod);
        }

        processUnmodifiableListGetter(pimClass, pomField) {
            let getMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomField.getType())
                .setName(pomField.getGetterName());
            let collectionsType = pomField.getSpace().collectionsType();
            pimClass.rootArtifact().addImport(collectionsType);
            getMethod.addInstruction("return "+collectionsType.getName()+".unmodifiableList(this." + pomField.getName() + ");");
            pimClass.addMethod(getMethod);
        }

        processStandardSetter(pimClass, pomField, returnType) {
            let paramName = refName(pomField.getName());
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(returnType)
                .setName(pomField.getSetterName());
            setMethod.addParameter(pomField.getType(), paramName);
            setMethod.addInstruction("this." + pomField.getName() + " = " + paramName + ";");
            setMethod.addInstruction("return this;");
            pimClass.addMethod(setMethod);
        }

        processDefaultConstructor(pomImpl, pimClass) {
            if (pomImpl.getDefaultConstructor()) {
                let defaultConstructor = new ConstructorArtifact()
                    .setPrivacy("public")
                    .setName(pomImpl.getName());
                pimClass.addConstructor(defaultConstructor);
            }
        }

        processStandardAdder(pimClass, pomField, returnType) {
            let paramName = refName(pomField.getType().getName());
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(returnType)
                .setName(pomField.getAdderName());
            addMethod.addParameter(pomField.getType(), paramName);
            addMethod.addInstruction("this." + pomField.getName() + ".add("+paramName+");");
            addMethod.addInstruction("return this;");
            pimClass.addMethod(addMethod);
        }

        processStandardRemover(pimClass, pomField, returnType) {
            let paramName = refName(pomField.getType().getName());
            let removeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(returnType)
                .setName(pomField.getRemoverName());
            removeMethod.addParameter(pomField.getType(), paramName);
            removeMethod.addInstruction("this." + pomField.getName() + ".remove("+paramName+");");
            removeMethod.addInstruction("return this;");
            pimClass.addMethod(removeMethod);
        }

        processStandardAttribute(pomField, pimClass) {
            let attribute = new AttributeArtifact().setName(pomField.getName());
            attribute.setType(pomField.getType());
            pimClass.addAttribute(attribute);
            if (pomField.isGetter()) {
                this.processStandardGetter(pimClass, pomField);
            }
            if (pomField.isSetter()) {
                this.processStandardSetter(pimClass, pomField, pomField.impl);
            }
            return attribute;
        }

    };

    let JPAPIMMixin = superClass => class extends JavaPIMMixin(superClass) {

        constructor(...args) {
            super(...args);
        }

        processClassPersistence(pomClass, pimClass) {
            if (pomClass.getCategory() === "entity") {
                pimClass.addAnnotation(new AnnotationArtifact().setName("javax.persistence.Entity"));
            }
            else if (pomClass.getCategory() === "mapped") {
                pimClass.addAnnotation(new AnnotationArtifact().setName("javax.persistence.MappedSuperclass"));
            }
            else if (pomClass.getCategory() === "embeddable") {
                pimClass.addAnnotation(new AnnotationArtifact().setName("javax.persistence.Embeddable"));
            }
        }

        processEqualsAndHashcode(pomField, pimClass) {
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
                .setType(pomField.getType())
                .addInstructions(
                    "final int prime = 31;",
                    pomField.getType().getName() + " result = 1;",
                    "result = prime * result + (" + pomField.getType().getName() + ") (" +
                        pomField.getName() + " ^ (" + pomField.getName() + " >>> " +
                        length(pomField.getType().getName()) + "));",
                    "result result;"
                );
            hashCodeMethod.addAnnotation("Override");
            pimClass.addMethod(hashCodeMethod);

            let equalsMethod = new MethodArtifact()
                .setPrivacy("public")
                .setName("equals")
                .setType(pomField.getSpace().getType("boolean"))
                .addParameter(pomField.getSpace().getType("object"), "obj")
                .addInstructions(
                    "if (this == obj)",
                    "\treturn true;",
                    "if (obj == null)",
                    "\treturn false;",
                    "if (getClass() != obj.getClass())",
                    "\treturn false;",
                    pomField.getType().getName() + " other = (" + pomField.getType().getName() + ") obj;",
                    "if (this." + pomField.getName() + " != other." + pomField.getName() + ")",
                    "\treturn false;",
                    "return true;"
                );
            equalsMethod.addAnnotation("Override");
            pimClass.addMethod(equalsMethod);
        }

        processPersistentAttribute(pomField, pimClass) {
            let attribute = this.processStandardAttribute(pomField, pimClass);
            if (pomField.isKey()) {
                attribute.addAnnotation(new AnnotationArtifact().setName("javax.persistence.Id"));
                attribute.addAnnotation(new AnnotationArtifact().setName("javax.persistence.GeneratedValue"));
                this.processEqualsAndHashcode(pomField, pimClass);
            }
            if (pomField.isVersion()) {
                attribute.addAnnotation(new AnnotationArtifact().setName("javax.persistence.Version"));
            }
        }

        processOneToOneBidirSetter(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getName());
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getSetterName());
            setMethod.addParameter(pomField.getType(), paramName);
            setMethod.addInstructions(
                "if (this." + pomField.getName() + "!=null) {",
                "\tthis." + pomField.getName() + "." + invPomField.getName() + "=null;",
                "}",
                "if (" + paramName + "!=null) {",
                "\tif (" + paramName + "." + invPomField.getName() + "!=null) {",
                "\t\t" + paramName + "." + invPomField.getName() + "." + pomField.getName() + " = null;",
                "\t}",
                "\t" + paramName + "." + invPomField.getName() + " = this;",
                "}",
                "this." + pomField.getName() + " = " + paramName + ";");
            setMethod.addInstruction("return this;");
            pimClass.addMethod(setMethod);
        }

        processManyToOneBidirSetter(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getName());
            let setMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getSetterName());
            setMethod.addParameter(pomField.getType(), paramName);
            setMethod.addInstructions(
                "if (this." + pomField.getName() + "!=" + paramName + ") {",
                "\tif (this." + pomField.getName() + "!=null) {",
                "\t\tthis." + pomField.getName() + "." + invPomField.getName() + ".remove(this);",
                "\t}",
                "\tif (" + paramName + "!=null) {",
                "\t\t" + paramName + "." + invPomField.getName() + ".add(this);",
                "\t}",
                "\tthis." + pomField.getName() + " = " + paramName + ";",
                "}");
            setMethod.addInstruction("return this;");
            pimClass.addMethod(setMethod);
        }

        processRelationshipPersistentAnnotation(pomRelationship, pimRelationship) {
            if (pomRelationship.persistence === "persistent") {
                let relationshipAnnotation = new AnnotationArtifact().setName("javax.persistence."+pomRelationship.cardinality);
                pimRelationship.addAnnotation(relationshipAnnotation);
                if (!pomRelationship.ownership) {
                    relationshipAnnotation.addParameter("mappedBy", '"' + pomRelationship.getInverse().getName() + '"');
                }
                if (pomRelationship.category === "composition" || pomRelationship.category === "aggregation") {
                    pimRelationship.rootArtifact().addImport("javax.persistence.CascadeType");
                    relationshipAnnotation.addParameter("cascade", 'CascadeType.ALL');
                }
                if (pomRelationship.category === "composition") {
                    relationshipAnnotation.addParameter("orphanRemoval", 'true');
                }
            }
            else if (pomRelationship.persistence === "embedded") {
                pimRelationship.addAnnotation(new AnnotationArtifact().setName("javax.persistence.Embedded"));
            }
        }

        processPersistentSingleReference(pomImpl, pomRelationship, pimClass) {
            let target = pomRelationship.getTarget().entity();
            let pimRelationship = new AttributeArtifact()
                .setName(pomRelationship.getName())
                .setType(target);
            pimClass.addAttribute(pimRelationship);
            this.processRelationshipPersistentAnnotation(pomRelationship, pimRelationship);
            this.processStandardGetter(pimClass, pomRelationship.getField());
            if (pomRelationship.getInverse()) {
                if (pomRelationship.cardinality === "OneToOne") {
                    this.processOneToOneBidirSetter(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                }
                else if (pomRelationship.cardinality === "ManyToOne") {
                    this.processManyToOneBidirSetter(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                }
            }
            else {
                this.processStandardSetter(pimClass, pomRelationship.getField(), pomImpl);
            }
        }

        processOneToManyBidirAdder(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getType().getName());
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getAdderName());
            addMethod.addParameter(pomField.getType(), paramName);
            addMethod.addInstructions(
                "if (this." + pomField.getName() + ".indexOf(" + paramName + ")==-1) {",
                "\tif (" + paramName + "." + invPomField.getName() + "!=null) {",
                "\t\t" + paramName + "." + invPomField.getName() + "." + pomField.getName() + ".remove(" + paramName + ");",
                "\t}",
                "\tthis." + pomField.getName() + ".add(" + paramName + ");",
                "\t" + paramName + "." + invPomField.getName() + " = this;",
                "}");
            addMethod.addInstruction("return this;");
            pimClass.addMethod(addMethod);
        }

        processOneToManyBidirRemover(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getType().getName());
            let removeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getRemoverName());
            removeMethod.addParameter(pomField.getType(), paramName);
            removeMethod.addInstructions(
                "if (this." + pomField.getName() + ".indexOf(" + paramName + ")!=-1) {",
                "\tthis." + pomField.getName() + ".remove(" + paramName + ");",
                "\t" + paramName + "." + invPomField.getName() + " = null;",
                "}");
            removeMethod.addInstruction("return this;");
            pimClass.addMethod(removeMethod);
        }

        processManyToManyBidirAdder(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getType().getName());
            let addMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getAdderName());
            addMethod.addParameter(pomField.getType(), paramName);
            addMethod.addInstructions(
                "if (this." + pomField.getName() + ".indexOf(" + paramName + ")==-1) {",
                "\tthis." + pomField.getName() + ".add(" + paramName + ");",
                "\t" + pomField.getName() + "." + invPomField.getName() + ".add(this);",
                "}");
            addMethod.addInstruction("return this;");
            pimClass.addMethod(addMethod);
        }

        processManyToManyBidirRemover(pimClass, pomField, invPomField, pomImpl) {
            let paramName = refName(pomField.getType().getName());
            let removeMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomImpl)
                .setName(pomField.getRemoverName());
            removeMethod.addParameter(pomField.getType(), paramName);
            removeMethod.addInstructions(
                "if (this." + pomField.getName() + ".indexOf(" + paramName + ")!=-1) {",
                "\tthis." + pomField.getName() + ".remove(" + paramName + ");",
                "\t" + paramName + "." + invPomField.getName() + ".remove(this);",
                "}");
            removeMethod.addInstruction("return this;");
            pimClass.addMethod(removeMethod);
        }

        processPersistentListOfReferences(pomImpl, pomRelationship, pimClass) {
            let target = pomRelationship.getField().getType();
            let listName = pomRelationship.getName();
            let listType = pomRelationship.getListField().getType();
            let pimRelationship = new AttributeArtifact()
                .setName(listName)
                .setType(listType);
            pimClass.addAttribute(pimRelationship);
            this.processRelationshipPersistentAnnotation(pomRelationship, pimRelationship);
            let implListType = pomImpl.getSpace().arrayListType(target);
            pimClass.rootArtifact().addImport(implListType);
            pimClass.constructors.default.addInstruction("this."+listName + " = new "+implListType.getName()+"();");
            this.processUnmodifiableListGetter(pimClass, pomRelationship.getListField());

            if (pomRelationship.getInverse()) {
                if (pomRelationship.cardinality === "OneToMany") {
                    this.processOneToManyBidirAdder(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                    this.processOneToManyBidirRemover(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                }
                else if (pomRelationship.cardinality === "ManyToMany") {
                    this.processManyToManyBidirAdder(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                    this.processManyToManyBidirRemover(
                        pimClass, pomRelationship.getField(), pomRelationship.getInverse().getField(), pomImpl);
                }
            }
            else {
                this.processStandardAdder(pimClass, pomRelationship.getField(), pomImpl);
                this.processStandardRemover(pimClass, pomRelationship.getField(), pomImpl);
            }

        }

        processPersistentRelationship(pomImpl, pomRelationship, pimClass) {
            if (pomRelationship.cardinality === "OneToOne" || pomRelationship.cardinality === "ManyToOne") {
                this.processPersistentSingleReference(pomImpl, pomRelationship, pimClass);
            }
            else {
                this.processPersistentListOfReferences(pomImpl, pomRelationship, pimClass);
            }
        }

        generateDomainPIM(pom, errors, text) {
            pom.entities.forEach((pomClass, classId)=> {
                if (pomClass.getId()===Number(classId)) {
                    try {
                        let pimFile = new FileArtifact().setPackageName(pomClass.entity().getPackageName());
                        let pimClass = this.prepareClass(pomClass.entity(), pimFile);
                        this.processClassPersistence(pomClass, pimClass);
                        this.processDefaultConstructor(pomClass.entity(), pimClass);
                        pomClass.entity().fields.forEach(pomField=> {
                            this.processPersistentAttribute(pomField, pimClass)
                        });
                        pomClass.entity().relationships.forEach(pomRelationship => {
                            this.processPersistentRelationship(pomClass.entity(), pomRelationship, pimClass)
                        });
                        if (text!==undefined) {
                            pimFile.generate(0).forEach(line=>text += line + "\n");
                        }
                    }
                    catch (err) {
                        errors.push(new Error(
                            {type: "node", id: pomClass.ids[0]}, err));
                    }
                }
            });
            return text;
        }
    };

    let JPAPersistencePOMMixin = superClass => class extends superClass {

        constructor(...args) {
            super(...args);
        }

        buildPOMForJPA(spec, errors) {
            let pom = new JavaPOMSpace();
            spec.clazzes && spec.clazzes
                .forEach(speclass=>this.declarePersistentClass(pom, speclass, errors));
            spec.inherits && spec.inherits
                .forEach(specInherit=>this.declarePersistentInheritance(pom, specInherit, errors));
            spec.relationships && spec.relationships
                .forEach(specRelationship=>this.declarePersistentRelationship(pom, specRelationship, errors));
            return pom;
        }

        prepareRuleEngineForJPA(ruleEngine, pom) {
            ruleEngine.addItems(
                {type: "class"}, ...pom.entities.toArray());
            pom.entities.forEach(clazz=>ruleEngine.addItems(
                {type: "relationship", from: clazz}, ...clazz.relationships().toArray()));
            ruleEngine.addRules(
                new EntityOrMappedInheritsFromEntityOrMapped(),
                new EntityEmbeddedOrMappedLinkedToEmbedded(),
                new RelationshipsTargetingPersistentClassesFromPersistentClassesArePersistent(),
                new EntitiesMustHaveOneAndOnlyOneId(),
                new ClassesWithRelationshipsMustHaveADefaultConstructor("entity", "OneToMany", "ManyToMany")
            );
        }

        declarePersistentClass(pom, specClass, errors) {
            let entityName = value(specClass.title);
            let pomClass = pom.addItem("entities", new JPAPOMClass(specClass.id, entityName));
            pomClass.setCategory(hasStereotype(specClass.title, "entity") ? "entity" : "standard");
            lines(specClass.content).forEach(
                line=>this.declarePersistentField(pomClass, line, errors));
        }

        declarePersistentField(entityPom, specLine, errors) {
            var fieldSpec = typed(value(specLine));
            if (!fieldSpec.name) {
                errors.push(entityPom.createError("Field has no name !"));
            } else if (!fieldSpec.type) {
                errors.push(entityPom.createError("Field "+fieldSpec.name+" has no type !"));
            } else {
                let pomField = entityPom.addField(fieldSpec.name, value(fieldSpec.type));
                if (hasStereotype(specLine, "id")) {
                    pomField.setKey(true);
                    pomField.setSetter(false);
                }
                if (hasStereotype(specLine, "version")) {
                    pomField.setVersion(true);
                }
            }
        }

        declarePersistentInheritance(pom, inheritSpec, errors) {
            let start = pom.getItem("entities", inheritSpec.from.id);
            let end = pom.getItem("entities", inheritSpec.to.id);
            if (start && end) {
                start.extends(end);
            }
        }

        declarePersistentRelationship(pom, relationshipSpec, errors) {
            let inverseName = value=> {
                let name = getConstraint(value, "inverse");
                return name ? name : value;
            };

            let start = pom.getItem("entities", relationshipSpec.from.id);
            let end = pom.getItem("entities", relationshipSpec.to.id);
            if (start && end) {
                let name = value(relationshipSpec.title.message);
                let cardinality =
                    this.cardinality(relationshipSpec.beginCardinality.message) + "To" +
                    this.cardinality(relationshipSpec.endCardinality.message);
                let pomRelationship = start.addRelationship(relationshipSpec.id, name, end, cardinality, true);
                if (relationshipSpec.endTermination !== "arrow") {
                    let invName = inverseName(relationshipSpec.title.message);
                    let invCardinality =
                        this.cardinality(relationshipSpec.endCardinality.message) + "To" +
                        this.cardinality(relationshipSpec.beginCardinality.message);
                    let pomInvRelationship =
                        end.addRelationship(relationshipSpec.id, invName, start, invCardinality, false);
                    pomRelationship.setInverse(pomInvRelationship);
                    pomInvRelationship.setInverse(pomRelationship);
                }
                if (relationshipSpec.beginTermination === "aggregation") {
                    pomRelationship.setCategory("aggregation");
                }
                else if (relationshipSpec.beginTermination === "composition") {
                    pomRelationship.setCategory("composition");
                }
            }

        }

    };

    class GeneratorJPA extends JPAPersistencePOMMixin(JPAPIMMixin(Generator)) {

        constructor() {
            super();
        }

        buildPOM(spec, errors) {
            try {
                return this.buildPOMForJPA(spec, errors);
            }
            catch (err) {
                if (!err instanceof Error) {
                    err = new Error({}, "Unknown error : "+err)
                }
                errors.push(err);
                return null;
            }
        }

        prepareRuleEngine(ruleEngine, pom) {
            this.prepareRuleEngineForJPA(ruleEngine, pom);
        }

        generatePIM(pom, errors) {
            let text = "";
            text = this.generateDomainPIM(pom, errors, text);
            if (errors.empty()) {
                return text;
            }
            else {
                return false;
            }
        }

    }

    class GeneratorDAO extends JPAPersistencePOMMixin(JPAPIMMixin(Generator)) {

        constructor() {
            super();
        }

        prepareRuleEngine(ruleEngine, pom) {
            this.prepareRuleEngineForJPA(ruleEngine, pom);
            ruleEngine.addItems(
                {type: "class"}, ...pom.dtos.toArray());
            pom.dtos.forEach(clazz=>ruleEngine.addItems(
                {type: "relationship", from: clazz}, ...clazz.dto().relationships.toArray()));
            ruleEngine.addRules(
                new ClassesWithRelationshipsMustHaveADefaultConstructor("dto", "Many")
            );
        }

        buildPOM(spec, errors) {
            let pom = this.buildPOMForJPA(spec, errors);
            if (errors.empty()) {
                spec.objects && spec.objects
                    .forEach(specObject=>this.declareDTOClass(pom, specObject, errors));
                spec.dependancies && spec.dependancies
                    .filter(specDependancy=>pom.dtos[specDependancy.from.id]!==undefined)
                    .forEach(specDependancy=>this.declareDTOMapping(pom, specDependancy, errors));
                spec.objects && spec.objects
                    .forEach(specObject=>this.declareDTOFields(pom, specObject, errors));
                spec.relationships && spec.relationships
                    .filter(specRelationship=>pom.dtos[specRelationship.from.id]!==undefined)
                    .forEach(specRelationship=>this.declareDTORelationship(pom, specRelationship, errors));
            }
            return pom;
        }

        declareDTOClass(pom, specObject, errors) {
            let dtoTitle = value(specObject.title);
            let {name:className, type:classType} = typed(dtoTitle);
            if (classType==="DTO") {
                pom.addItem("dtos", new DTOPOMClass(specObject.id, className));
            }
        }

        declareDTOFields(pom, specObject, errors) {
            let dtoTitle = value(specObject.title);
            let {name:className, type:classType} = typed(dtoTitle);
            if (classType==="DTO") {
                let pomDTOClass = pom.getItem("dtos", specObject.id);
                lines(specObject.content).forEach(
                    line=>this.declareDTOField(pomDTOClass, line, errors));
            }
        }

        declareDTOMapping(pom, specDependancy, errors) {
            let pomDtoClass = pom.getItem("dtos", specDependancy.from.id);
            let pomTargetEntityClass = pom.getItem("entities", specDependancy.to.id)
            if (pomDtoClass && pomTargetEntityClass) {
                let mappingKey = value(specDependancy.comment.message);
                pomDtoClass.addMapping(mappingKey, pomTargetEntityClass);
            }
        }

        declareDTORelationship(pom, specRelationship, errors) {
            var link = valued(value(specRelationship.title.message));
            if (!link.name) {
                errors.push(new Error({type:"link", id:specRelationship.id}, "Relationship has no name !"));
            }
            else if (!link.value) {
                errors.push(new Error({type:"link", id:specRelationship.id}, "Relationship "+link.name+" has no path !"));
            }
            let pomDtoClass = pom.dtos[specRelationship.from.id];
            let pomTargetDtoClass = pom.dtos[specRelationship.to.id];
            let path=link.value.split('.');
            let entityMapped = this.findEntityImpl(pomDtoClass.getMappings()
                .map(pomEntityClass=>pomEntityClass.entity()), path);
            let cardinality = this.cardinality(specRelationship.endCardinality.message);
            pomDtoClass.addRelationship(specRelationship.id, link.name, pomTargetDtoClass, cardinality, path, entityMapped);
        }

        findEntityImpl(entities, path) {
            let target = null;
            path.forEach(segment=>{
                target = entities[segment];
                if (!target) return null;
                entities = target.relationships.map(
                    pomRelationship => pomRelationship.getTarget().entity());
            });
            return target;
        }

        findField(pomEntityImpls, path) {
            path = [...path];
            let fieldName = path.pop();
            let pomTargetEntityImpl = this.findEntityImpl(pomEntityImpls, path);
            return !pomTargetEntityImpl ? null : pomTargetEntityImpl.collectFields()[fieldName];
        }

        findFields(pomEntityImpls, path) {
            path = [...path];
            let fieldName = path.pop();
            let pomTargetEntityImpl = this.findEntityImpl(pomEntityImpls, path);
            return !pomTargetEntityImpl ? null : pomTargetEntityImpl.collectFields();
        }

        declareDTOField(pomDTOClass, specLine, errors) {
            var specField = valued(value(specLine));
            if (!specField.name) {
                errors.push(new Error({type:"node", id:pomDTOClass.ids[0]}, "Field has no name !"));
            }
            else if (!specField.value) {
                errors.push(new Error({type:"node", id:pomDTOClass.ids[0]}, "Field "+specField.name+" has no path !"));
            }
            else {
                if (specField.name.indexOf("*") > -1) {
                    let specExcludes = getConstraint(specLine, "exclude");
                    let excludes = specExcludes ? specExcludes.split(",").map(token=>token.trim()):[];
                    this.processWildcardAttribute(pomDTOClass, specField, excludes);
                }
                else {
                    this.processBasicAttribute(pomDTOClass, specField);
                }
            }
        }

        processWildcardAttribute(pomDTOClass, specField, excludes) {
            let path = specField.value.split('.');
            let mappings = this.findFields(
                pomDTOClass.getMappings().map(pomEntityClass=>pomEntityClass.entity()), path);
            if (!mappings) {
                errors.push(new Error({
                    type: "node",
                    id: pomDTOClass.ids[0]
                }, "Field path for " + specField.name + " is invalid !"));
            }
            else {
                path.pop();
                mappings.forEach(mapping=> {
                    if (!excludes.contains(mapping.getName())) {
                        let fieldName = specField.name.indexOf("*") === 0 ?
                            specField.name.replace("*", refName(mapping.getName())) :
                            specField.name.replace("*", camelCase(mapping.getName()));
                        pomDTOClass.dto().addField(
                            new DTOPOMField(fieldName, path, mapping));
                    }
                });
            }
        }

        processBasicAttribute(pomDTOClass, specField) {
            let path = specField.value.split('.');
            let mapping = this.findField(
                pomDTOClass.getMappings().map(pomEntityClass=>pomEntityClass.entity()), path);
            if (!mapping) {
                errors.push(new Error({
                    type: "node",
                    id: pomDTOClass.ids[0]
                }, "Field path for " + specField.name + " is invalid !"));
            }
            else {
                path.pop();
                pomDTOClass.dto().addField(
                    new DTOPOMField(specField.name, path, mapping));
            }
        }

        processDTOSingleReference(pomDTOImpl, pomRelationship, pimDTOClass) {
            let target = pomRelationship.getField().getType();
            let attribute = new AttributeArtifact()
                .setName(pomRelationship.getName())
                .setType(target);
            this.processStandardGetter(pimDTOClass, pomRelationship.getField());
            this.processStandardSetter(pimDTOClass, pomRelationship.getField(), pomDTOImpl);
            pimDTOClass.addAttribute(attribute);
        }

        processDTOListOfReferences(pomDTOImpl, pomRelationship, pimDTOClass) {
            let listName = pomRelationship.getName();
            let listType = pomRelationship.getListField().getType();
            let attribute = new AttributeArtifact()
                .setName(listName)
                .setType(listType);
            pimDTOClass.addAttribute(attribute);
            this.processStandardGetter(pimDTOClass, pomRelationship.getListField());
            this.processStandardSetter(pimDTOClass, pomRelationship.getListField(), pomDTOImpl);
            let implListType = pomDTOImpl.getSpace().arrayListType(pomRelationship.getField().getType());
            pimDTOClass.rootArtifact().addImport(implListType);
            pimDTOClass.constructors.default.addInstruction("this."+listName + " = new "+implListType.getName()+"();");
        }

        processDTORelationship(pomDTOImpl, pomRelationship, pimDTOClass) {
            if (pomRelationship.cardinality==="One") {
                this.processDTOSingleReference(pomDTOImpl, pomRelationship, pimDTOClass);
            }
            else {
                this.processDTOListOfReferences(pomDTOImpl, pomRelationship, pimDTOClass);
            }
        }

        generateDTOPIM(pom, errors, text) {
            pom.dtos.forEach((pomDTOClass, classId)=> {
                if (pomDTOClass.getId()===Number(classId)) {
                    try {
                        let pimFile = new FileArtifact().setPackageName(pomDTOClass.dto().getPackageName());
                        let pimDTOClass = this.prepareClass(pomDTOClass.dto(), pimFile);
                        this.processDefaultConstructor(pomDTOClass.dto(), pimDTOClass);
                        pomDTOClass.dto().fields.forEach(pomField=> {
                            this.processStandardAttribute(pomField, pimDTOClass)
                        });
                        pomDTOClass.dto().relationships.forEach(pomRelationship => {
                            this.processDTORelationship(pomDTOClass.dto(), pomRelationship, pimDTOClass)
                        });
                        if (text!==undefined) {
                            pimFile.generate(0).forEach(line=>text += line + "\n");
                        }
                    }
                    catch (err) {
                        errors.push(new Error(
                            {type:"node", id:pomDTOClass.ids[0]}, err));
                    }
                }
            });
            return text;
        }

        getFieldsAndRelationshipsAtSegment(pomSetOfFieldsAndRelationships, segment) {
            return {
                fields:pomSetOfFieldsAndRelationships.fields.filter(
                    field=>field.path.length>segment+1),
                relationships:pomSetOfFieldsAndRelationships.relationships.filter(
                    relationship=>relationship.path.length>segment+2)
            }
        }

        fillBlockWithExternalConverterCalls(
            pimConverterClass,
            pomDTOImpl, dtoObjectName,
            mappedEntityClass, mappedEntityName,
            pomDTOFieldsToConvert,
            pomDTORelationshipsToConvert,
            blockInstruction,
            segment)
        {
            let segments = [];
            pomDTOFieldsToConvert.filter(field=>field.path.length>segment+1)
                .forEach(field=>segments.add(field.path[segment+1]));
            pomDTORelationshipsToConvert.filter(relationship=>relationship.path.length>segment+2)
                .forEach(relationship=>segments.add(relationship.path[segment+2]));
            segments.forEach(nextEntityName=> {
                let clazzFields = pomDTOFieldsToConvert.filter(field=>field.path[segment+1]===nextEntityName);
                let clazzRelationships = pomDTORelationshipsToConvert.filter(relationship=>relationship.path[segment+1]===nextEntityName);
                let nextEntityClass = mappedEntityClass.entity().getRelationship(nextEntityName).getTarget();
                let convertTargetToDTOMethod = this.generateConvertLinkedEntityToDTOMethod(
                    pimConverterClass, pomDTOImpl, dtoObjectName, nextEntityClass, nextEntityName, segment+1, clazzFields, clazzRelationships);
                let getter = mappedEntityClass.entity().getRelationship(nextEntityName).getField().getGetterName();
                blockInstruction
                    .addInstruction("this." + convertTargetToDTOMethod.name + "(" + dtoObjectName + ", " + mappedEntityName+"."+getter+"());");
            });
        }

        fillBlockWithDTOFieldAssignement(
            pimConverterClass,
            pomDTOImpl, dtoObjectName,
            mappedEntityClass, mappedEntityName,
            pomDTOFieldsToConvert,
            pomDTORelationshipsToConvert,
            blockInstruction,
            segment)
        {
            pomDTOFieldsToConvert.filter(field=>field.path.length===segment+1).forEach(dtoField=>{
                blockInstruction.addInstruction(
                    dtoObjectName+"."+dtoField.getSetterName()+"("+mappedEntityName+"."+dtoField.getMapping().getGetterName()+"());");
            });
            pomDTORelationshipsToConvert.filter(relationship=>relationship.path.length===segment+2).forEach(dtoRelationship=>{
                let externalConverterCallMethod = this.generateExternalConverterCallMethod(
                    pimConverterClass, pomDTOImpl, dtoObjectName, dtoRelationship, mappedEntityClass, mappedEntityName);
                blockInstruction
                    .addInstruction("this." + externalConverterCallMethod.name + "(" + dtoObjectName + ", " + mappedEntityName+");");
            });
            this.fillBlockWithExternalConverterCalls(
                pimConverterClass,
                pomDTOImpl, dtoObjectName,
                mappedEntityClass, mappedEntityName,
                pomDTOFieldsToConvert,
                pomDTORelationshipsToConvert,
                blockInstruction,
                segment);
        }

        generateExternalConverterCallMethod(
            pimConverterClass, pomDTOImpl, dtoObjectName, dtoRelationship, mappedEntityClass, mappedEntityName)
        {
            let externalConverterCallMethod = new MethodArtifact()
                .setType(dtoRelationship.getSpace().getType("void"))
                .setName("convert"+camelCase(dtoRelationship.getName())+"ToDTO");
            pimConverterClass.addMethod(externalConverterCallMethod);
            externalConverterCallMethod.addParameter(pomDTOImpl, dtoObjectName);
            externalConverterCallMethod.addParameter(mappedEntityClass.entity(), mappedEntityName);
            let converterType = dtoRelationship.getTarget().converter();
            pimConverterClass.rootArtifact().addImport(converterType);
            externalConverterCallMethod.addInstruction(
                converterType.getName()+ " converter = new "+converterType.getName()+"();");
            if (dtoRelationship.getCardinality()==="One") {
                let mappedTargetEntity = mappedEntityName + "." + this.callChain(mappedEntityClass.entity(), dtoRelationship.path.slice(1));
                externalConverterCallMethod.addInstruction(dtoObjectName + "." + dtoRelationship.getField().getSetterName()
                    + "(converter.convertToDTO(" + mappedTargetEntity + "));");
            } else {
                let indexEntityType = dtoRelationship.getMapping();
                pimConverterClass.rootArtifact().addImport(indexEntityType);
                let indexObject = refName(indexEntityType.getName());
                let forInstruction = new ForInstructionArtifact(indexEntityType, indexObject,
                    mappedEntityName + "." + this.callChain(mappedEntityClass.entity(), dtoRelationship.path.slice(1)));
                externalConverterCallMethod.addInstruction(forInstruction);
                forInstruction.addInstruction(dtoObjectName + "." + dtoRelationship.getListField().getGetterName()
                    + "().add(converter.convertToDTO(" + indexObject + "));");
            }
            return externalConverterCallMethod;
        }

        generateConvertLinkedEntityToDTOMethod(
            pimConverterClass, pomDTOImpl, dtoObjectName, mappedEntityClass, mappedEntityName, segment,
            pomDTOFields = pomDTOImpl.getFields(),
            pomDTORelationships = pomDTOImpl.getRelationships())
        {
            let convertTargetToDTOMethod = new MethodArtifact()
                .setType(pomDTOImpl.getSpace().getType("void"))
                .setName("convert"+camelCase(mappedEntityName)+"ToDTO");
            pimConverterClass.addMethod(convertTargetToDTOMethod);
            convertTargetToDTOMethod.addParameter(pomDTOImpl, dtoObjectName);
            convertTargetToDTOMethod.addParameter(mappedEntityClass.entity(), mappedEntityName);
            let ifDomainObjectExistsInstruction = new IfInstructionArtifact();
            let predicate = mappedEntityName + " != null";
            ifDomainObjectExistsInstruction.setPredicate(predicate);
            convertTargetToDTOMethod.addInstruction(ifDomainObjectExistsInstruction);
            let pomDTOFieldsToConvert =
                pomDTOFields.filter(field=>field.path[segment]===mappedEntityName);
            let pomDTORelationshipsToConvert =
                pomDTORelationships.filter(relationship=>relationship.path[segment]===mappedEntityName);
            this.fillBlockWithDTOFieldAssignement(
                pimConverterClass,
                pomDTOImpl, dtoObjectName,
                mappedEntityClass, mappedEntityName,
                pomDTOFieldsToConvert,
                pomDTORelationshipsToConvert,
                ifDomainObjectExistsInstruction,
                segment);
            return convertTargetToDTOMethod;
        }

        generateConvertToDTOCaseWhenConversionImpliesOnlyOneEntity(
            pimConverterClass, pomDTOClass, dtoObjectName, ifDomainObjectExistsInstruction) {
            let mappedEntityName = Object.getOwnPropertyNames(pomDTOClass.getMappings())[0];
            let mappedEntityClass = pomDTOClass.getMappings()[mappedEntityName];
            let predicate = mappedEntityName + " != null";
            ifDomainObjectExistsInstruction.setPredicate(predicate);
            let pomDTOFieldsToConvert = pomDTOClass.dto().getFields().filter(field=>field.path[0] === mappedEntityName);
            let pomDTORelationshipsToConvert = pomDTOClass.dto().getRelationships().filter(relationship=>relationship.path[0] === mappedEntityName);
            this.fillBlockWithDTOFieldAssignement(
                pimConverterClass,
                pomDTOClass.dto(), dtoObjectName,
                mappedEntityClass, mappedEntityName,
                pomDTOFieldsToConvert,
                pomDTORelationshipsToConvert,
                ifDomainObjectExistsInstruction,
                0);
        }

        generateConvertToDTOCaseWhenConversionImpliesMultipleEntities(
            pimConverterClass, pomDTOClass, dtoObjectName, ifDomainObjectExistsInstruction)
        {
            let predicate = "";
            pomDTOClass.getMappings().forEach((mappedClass, mappedName)=>{
                if (predicate) {
                    predicate+=" || "+mappedName+" != null";
                }
                else {
                    predicate=mappedName+" != null";
                }
                let convertTargetToDTOMethod =
                    this.generateConvertLinkedEntityToDTOMethod(
                        pimConverterClass, pomDTOClass.dto(), dtoObjectName, mappedClass, mappedName, 0);
                ifDomainObjectExistsInstruction
                    .addInstruction("this."+convertTargetToDTOMethod.getName()+"("+dtoObjectName+", "+mappedName+");");
            });
            ifDomainObjectExistsInstruction.setPredicate(predicate);
        }

        generateConvertToDTOMethod(pimConverterClass, pomDTOClass) {
            let convertToDTOMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(pomDTOClass.dto())
                .setName("convertToDTO");
            pimConverterClass.addMethod(convertToDTOMethod);
            pomDTOClass.getMappings().forEach((mapped, mappedName)=>{
                convertToDTOMethod.addParameter(mapped.entity(), mappedName);
            });
            let dtoObjectName = refName(pomDTOClass.dto().getName());
            let ifDomainObjectExistsInstruction = new IfInstructionArtifact();
            ifDomainObjectExistsInstruction.addInstruction(
                pomDTOClass.dto().getName()+" "+dtoObjectName+" = new "+pomDTOClass.dto().getName()+"();");
            if (pomDTOClass.getMappings().length()>1) {
                this.generateConvertToDTOCaseWhenConversionImpliesMultipleEntities(
                    pimConverterClass, pomDTOClass, dtoObjectName, ifDomainObjectExistsInstruction);
            }
            else {
                this.generateConvertToDTOCaseWhenConversionImpliesOnlyOneEntity(
                    pimConverterClass, pomDTOClass, dtoObjectName, ifDomainObjectExistsInstruction);
            }
            ifDomainObjectExistsInstruction.addInstruction("return " + dtoObjectName + ";");
            convertToDTOMethod.addInstruction(ifDomainObjectExistsInstruction);
            let elseDomainObjectNotExistsInstruction = new ElseInstructionArtifact();
            elseDomainObjectNotExistsInstruction.addInstruction("return null;");
            convertToDTOMethod.addInstruction(elseDomainObjectNotExistsInstruction);
            return convertToDTOMethod;
        }

        generateUpdateEntityMethod(pimConverterClass, pomDTOClass, mappedEntityClass, mappedEntityName) {
            let updateEntityMethod = new MethodArtifact()
                .setPrivacy("public")
                .setType(mappedEntityClass.entity())
                .setName("update"+camelCase(mappedEntityName));
            pimConverterClass.addMethod(updateEntityMethod);
            let dtoObjectName = refName(pomDTOClass.dto().getName());
            updateEntityMethod.addParameter(pomDTOClass.dto(), dtoObjectName);
            updateEntityMethod.addParameter(new POMType("?", "EntityManager", "javax.persistence"), "em");
            let keyField = pomDTOClass.dto().getKeyField();
            updateEntityMethod.addInstruction(mappedEntityClass.entity().getName()+" "+mappedEntityName+" = em.find("+
                dtoObjectName+"."+keyField.getGetterName()+"());");
            updateEntityMethod.addInstruction("return "+mappedEntityName+";");
        }

        generateConverterPIM(pom, errors, text) {
            pom.dtos.forEach((pomDTOClass, classId)=> {
                if (pomDTOClass.getId()===Number(classId)) {
                    try {
                        let pimFile = new FileArtifact().setPackageName(pomDTOClass.converter().getPackageName());
                        let pimConverterClass = this.prepareClass(pomDTOClass.converter(), pimFile);
                        this.generateConvertToDTOMethod(pimConverterClass, pomDTOClass);
                        pomDTOClass.getMappings().forEach((mappedEntityClass, mappedEntityName)=>{
                            this.generateUpdateEntityMethod(pimConverterClass, pomDTOClass, mappedEntityClass, mappedEntityName);
                        });
                        if (text!==undefined) {
                            pimFile.generate(0).forEach(line=>text += line + "\n");
                        }
                    }
                    catch (err) {
                        errors.push(new Error(
                            {type:"node", id:pomDTOClass.ids[0]}, err));
                    }
                }
            });
            return text;
        }

        generatePIM(pom, errors) {
            let text = "";
            this.generateDomainPIM(pom, errors);
            text = this.generateDTOPIM(pom, errors, text);
            text = this.generateConverterPIM(pom, errors, text);
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

        attach(parent) {
            this.parent = parent;
            return this;
        }

        addImport(importInstr) {
            this.rootArtifact() && this.rootArtifact().importsArtifact.addImport(importInstr);
            return this;
        }

        rootArtifact() {
            return this.parent ? this.parent.rootArtifact() : null;
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
            this.package = "";
        }

        setPackageName(packageName) {
            if (!this.importInstrs.empty()) {
                throw "Imports must be empty when package is defined."
            }
            this.packageName = packageName;
            return this;
        }

        addImport(importInstr) {
            if (importInstr instanceof POMType) {
                importInstr.getDeclarations().forEach(longName=>this.addImport(longName));
            }
            else {
                let index = importInstr.lastIndexOf(".");
                let importPackage = index === -1 ? importInstr : importInstr.slice(0, index);
                if (importInstr.indexOf("undefined") !== -1) {
                    console.log("bug");
                }
                if (importPackage != this.packageName) {
                    this.importInstrs.add(importInstr);
                }
            }
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
            this.importsArtifact.attach(this);
            this.importsArtifact.setPackageName(this.importsArtifact);
            this.classArtifact = new ClassArtifact();
            this.classArtifact.attach(this);
        }

        rootArtifact() {
            return this;
        }

        setPackageName(packageName) {
            this.packageName = packageName;
            this.importsArtifact.setPackageName(packageName);
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

        attach(parent) {
            super.attach(parent);
            this.annotations.forEach(annotationArtifact=>annotationArtifact.attach(this));
            this.attributes.forEach(attributeArtifact=>attributeArtifact.attach(this));
            this.constructors.forEach(constructorArtifact=>constructorArtifact.attach(this));
            this.methods.forEach(methodArtifact=>methodArtifact.attach(this));
            return this;
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
            annotationArtifact.attach(this);
            return this;
        }

        addAttribute(attributeArtifact) {
            this.attributes[attributeArtifact.name] = attributeArtifact;
            attributeArtifact.attach(this);
            return this;
        }

        addConstructor(constructorArtifact) {
            this.constructors[constructorArtifact.token] = constructorArtifact;
            constructorArtifact.attach(this);
            return this;
        }

        addMethod(methodArtifact) {
            this.methods[methodArtifact.name] = methodArtifact;
            methodArtifact.attach(this);
            return this;
        }

        addInterface(interfaceClass) {
            this.interfaces.add(interfaceClass);
            return this;
        }

        setSuperClass(superClass) {
            this.addImport(superClass);
            this.superClass = superClass;
            return this;
        }

        generate(indent) {

            function writeSuperClass(superClass) {
                return superClass ? "extends "+superClass.getName()+" " : "";
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
            this.writeLine(result, indent, "public class "+this.className+" "+
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

        setName(longName) {
            this.name = longName;
            this.addImport(this.name);
            return this;
        }

        getName() {
            return this.name;
        }

        getShortName() {
            let index = this.name.lastIndexOf(".");
            return index===-1 ? this.name : this.name.slice(index+1);
        }

        attach(parent) {
            this.parent = parent;
            this.addImport(this.name);
            return this;
        }

        addParameter(name, value) {
            this.parameters[name] = value;
            return this;
        }

        generate(indent) {
            let result = [];
            let line = "@"+this.getShortName();
            if (!this.parameters.empty()) {
                if (this.parameters.getLength()===1 && this.parameters.value!==undefined) {
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
            this.type = null;
            this.annotations = {};
        }

        setName(name) {
            this.name = name;
            return this;
        }

        setType(type) {
            this.type = type;
            this.addImport(this.type);
            return this;
        }

        getName() {
            return this.name;
        }

        getType() {
            return this.type;
        }

        attach(parent) {
            super.attach(parent);
            this.annotations.forEach(annotationArtifact=>annotationArtifact.attach(this));
            this.addImport(this.type);
            return this;
        }

        addAnnotation(annotationArtifact) {
            if (typeof(annotationArtifact) === "string") {
                annotationArtifact = new AnnotationArtifact().setName(annotationArtifact);
            }
            this.annotations[annotationArtifact.getName()] = annotationArtifact;
            annotationArtifact.attach(this);
            return this;
        }

        generate(indent) {
            let result = [];
            this.annotations.forEach(annotationArtifact=>{
                this.writeLines(result, indent, annotationArtifact.generate(0));
            });
            this.writeLine(result, indent, this.type.getName()+" "+this.name+";");
            return result;
        }

    }

    function BlockMixin(superclass) {
        return class extends superclass {

            constructor(...args) {
                super(...args);
                this.instructions = [];
            }

            addInstruction(instructionArtifact) {
                if (typeof(instructionArtifact) === "string") {
                    instructionArtifact = new InstructionArtifact(instructionArtifact);
                }
                this.instructions.push(instructionArtifact);
                instructionArtifact.attach(this);
                return this;
            }

            addInstructions(...instructionArtifacts) {
                instructionArtifacts.forEach(instructionArtifact=>this.addInstruction(instructionArtifact));
                return this;
            }

            generateInstructions(indent) {
                let result = [];
                this.instructions.forEach(instruction=>{
                    this.writeLines(result, indent, instruction.generate(0));
                });
                return result;
            }

            attach(parent) {
                super.attach(parent);
                this.instructions.forEach(instruction=>instruction.attach(this));
                return this;
            }

            generate(indent) {
                let result = super.generate(indent);
                this.writeLines(result, indent, this.generateInstructions(1));
                this.writeLine(result, indent, "}");
                return result;
            }
        }
    }

    class FunctionArtifact extends BlockMixin(Artifact) {

        constructor() {
            super();
            this.privacy = "";
            this.parameters = [];
            this.annotations = {};
        }

        setPrivacy(privacy) {
            this.privacy = privacy;
            return this;
        }

        addParameter(type, name) {
            this.parameters.push({type:type, name:name});
            this.addImport(type);
            return this;
        }

        attach(parent) {
            super.attach(parent);
            this.parameters.forEach(parameter=>this.addImport(parameter.type));
            return this;
        }

        addAnnotation(annotationArtifact) {
            if (typeof(annotationArtifact) === "string") {
                annotationArtifact = new AnnotationArtifact().setName(annotationArtifact);
            }
            this.annotations[annotationArtifact.name] = annotationArtifact;
            annotationArtifact.attach(this);
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
                let result = parameters[0].type.getName()+" "+parameters[0].name;
                for (let i=1; i<parameters.length; i++) {
                    result+=", "+parameters[i].type.getName()+" "+parameters[i].name;
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
            this.writeLines(result, indent, this.generateInstructions(1));
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

        getName() {
            return this.name;
        }

        setType(type) {
            this.type = type;
            this.addImport(type);
            return this;
        }

        attach(parent) {
            super.attach(parent);
            this.addImport(this.type);
            return this;
        }

        generateDeclaration(result, indent, privacy, parameters) {
            this.writeLine(result, indent,
                privacy+
                this.type.getName()+" "+this.name+"("+
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

        getName() {
            return this.name;
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
            if (content) {
                this.content = content;
            }
        }

        setContent(content) {
            this.content = content;
            return this;
        }

        generate(indent) {
            let result = [];
            this.writeLine(result, indent, this.content);
            return result;
        }
    }

    class IfInstructionArtifact extends BlockMixin(InstructionArtifact) {

        constructor(predicate) {
            super();
            this.setPredicate(predicate);
        }

        setPredicate(predicate) {
            return this.setContent("if ("+predicate+") {");
        }

    }

    class SimpleBlockInstructionArtifact extends BlockMixin(InstructionArtifact) {

        constructor() {
            super("{");
        }

    }

    class ElseInstructionArtifact extends BlockMixin(InstructionArtifact) {

        constructor() {
            super("else {");
        }

    }

    class ForInstructionArtifact extends BlockMixin(InstructionArtifact) {

        constructor(indexClass, index, list) {
            super();
            this.setIndex(indexClass, index, list);
        }

        setIndex(indexClass, index, list) {
            return this.setContent("for ("+indexClass.getName()+" "+index+" : "+list+") {");
        }

    }

    return {
        Error : Error,
        GeneratorJPA : GeneratorJPA,
        GeneratorDAO : GeneratorDAO
    };
};