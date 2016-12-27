/**
 * Created by HDA3014 on 12/11/2016.
 */
let assert = require("assert");
let mockRuntime = require('../runtimemock').mockRuntime;
require('../enhancer').Enhance();
let SVG = require('../svghandler').SVG;
let svg = SVG(mockRuntime());
let Generator = require("../modeler/generator").Generator;
let generator = Generator();
require("./generatorTestUtils");

describe('Generate JPA', function() {

    //--------------------------------------------------------------------------------------
    it("generates a simple class", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "User",
                    "content":
                        `login : string
                        password : string`
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert.equal(result.file("com.acme.domain.User.java"),
`// FILE : com.acme.domain.User.java
package com.acme.domain;

public class User {

    String login;
    String password;

    public String getLogin() {
        return this.login;
    }

    public User setLogin(String login) {
        this.login = login;
        return this;
    }

    public String getPassword() {
        return this.password;
    }

    public User setPassword(String password) {
        this.password = password;
        return this;
    }

}
`.canonize()
                );
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a basic entity", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                       `id : long <<id>>
                        login : string
                        password : string`
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert.equal(result.file("com.acme.domain.User.java"),
`// FILE : com.acme.domain.User.java
package com.acme.domain;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;

@Entity
public class User {

    @Id
    @GeneratedValue
    long id;
    String login;
    String password;

    public long getId() {
        return this.id;
    }

    @Override
    public long hashCode() {
        final int prime = 31;
        long result = 1;
        result = prime * result + (long) (id ^ (id >>> 64));
        result result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        long other = (long) obj;
        if (this.id != other.id)
            return false;
        return true;
    }

    public String getLogin() {
        return this.login;
    }

    public User setLogin(String login) {
        this.login = login;
        return this;
    }

    public String getPassword() {
        return this.password;
    }

    public User setPassword(String password) {
        this.password = password;
        return this;
    }

}
`.canonize()
                );
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a mapped superclass", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "BaseEntity",
                    "content":
                       `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> User",
                    "content":
                       `login : string
                        password : string`
                }
            ],
            "inherits": [
                {
                    "id":2,
                    "from":{"id":1},
                    "to":{"id":0},
                    "comment":{"message":"{single-table}"}
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                // console.log(result);
                assert(result.file("com.acme.domain.BaseEntity.java").contains(
`// FILE : com.acme.domain.BaseEntity.java
package com.acme.domain;

import javax.persistence.MappedSuperclass;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;

@MappedSuperclass
public class BaseEntity {

	@Id
	@GeneratedValue
	long id;
`));

                assert(result.file("com.acme.domain.User.java").contains(
`@Entity
public class User extends BaseEntity {
`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates an entity with an embedded class", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "Address",
                    "content":
                        `street : string`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"composition",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import javax.persistence.Embedded;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@Embedded
	Address liveIn;
`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public Address getLiveIn() {
		return this.liveIn;
	}

	public User setLiveIn(Address liveIn) {
		this.liveIn = liveIn;
		return this;
	}`));
                assert.equal(result.file("com.acme.domain.Address.java"),
`// FILE : com.acme.domain.Address.java
package com.acme.domain;

import javax.persistence.Embeddable;

@Embeddable
public class Address {

	String street;

	public String getStreet() {
		return this.street;
	}

	public Address setStreet(String street) {
		this.street = street;
		return this;
	}

}
`.canonize())
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates an entity with a list of embedded objects", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "Address",
                    "content":
                        `street : string`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"composition",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import java.util.List;
import javax.persistence.Embedded;
import java.util.ArrayList;
import java.util.Collections;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@Embedded
	List<Address> liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public List<Address> getLiveIn() {
		return Collections.unmodifiableList(this.liveIn);
	}

	public User addLiveIn(Address address) {
		this.liveIn.add(address);
		return this;
	}

	public User removeLiveIn(Address address) {
		this.liveIn.remove(address);
		return this;
	}`));

                assert(result.file("com.acme.domain.Address.java").contains(
`import javax.persistence.Embeddable;

@Embeddable
public class Address {`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a simple one to one relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import javax.persistence.OneToOne;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@OneToOne
	Address liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public Address getLiveIn() {
		return this.liveIn;
	}

	public User setLiveIn(Address liveIn) {
		this.liveIn = liveIn;
		return this;
	}`));

            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a one to one composition relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"composition",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import javax.persistence.OneToOne;
import javax.persistence.CascadeType;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
	Address liveIn;`));

            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a double dir one to one relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn {inverse=owner}"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"",
                    "endTermination":""
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`	@OneToOne
	Address liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public User setLiveIn(Address liveIn) {
		if (this.liveIn!=null) {
			this.liveIn.owner=null;
		}
		if (liveIn!=null) {
			if (liveIn.owner!=null) {
				liveIn.owner.liveIn = null;
			}
			liveIn.owner = this;
		}
		this.liveIn = liveIn;
		return this;
	}`));
                assert(result.file("com.acme.domain.Address.java").contains(
`import javax.persistence.OneToOne;`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	@OneToOne(mappedBy = "liveIn")
	User owner;
`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	public User getOwner() {
		return this.owner;
	}

	public Address setOwner(User owner) {
		if (this.owner!=null) {
			this.owner.liveIn=null;
		}
		if (owner!=null) {
			if (owner.liveIn!=null) {
				owner.liveIn.owner = null;
			}
			owner.liveIn = this;
		}
		this.owner = owner;
		return this;
	}`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a simple one to many relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import java.util.List;
import javax.persistence.OneToMany;
import java.util.ArrayList;
import java.util.Collections;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@OneToMany
	List<Address> liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public User() {
		this.liveIn = new ArrayList<Address>();
	}`));
        assert(result.file("com.acme.domain.User.java").contains(
`	public List<Address> getLiveIn() {
		return Collections.unmodifiableList(this.liveIn);
	}

	public User addLiveIn(Address address) {
		this.liveIn.add(address);
		return this;
	}

	public User removeLiveIn(Address address) {
		this.liveIn.remove(address);
		return this;
	}
`));

            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a many to one relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":1},
                    "to":{"id":0},
                    "title":{"message":"owner"},
                    "beginCardinality":{"message":"0-N"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.Address.java").contains(
`import javax.persistence.ManyToOne;`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	@ManyToOne
	User owner;`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	public User getOwner() {
		return this.owner;
	}

	public Address setOwner(User owner) {
		this.owner = owner;
		return this;
	}`));

            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a double dir one to many/ many to one relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"owned {inverse=owner}"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"",
                    "endTermination":""
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`	@OneToMany
	List<Address> owned;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public User addOwned(Address address) {
		if (this.owned.indexOf(address)==-1) {
			if (address.owner!=null) {
				address.owner.owned.remove(address);
			}
			this.owned.add(address);
			address.owner = this;
		}
		return this;
	}

	public User removeOwned(Address address) {
		if (this.owned.indexOf(address)!=-1) {
			this.owned.remove(address);
			address.owner = null;
		}
		return this;
	}`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	@ManyToOne(mappedBy = "owned")
	User owner;`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	public Address setOwner(User owner) {
		if (this.owner!=owner) {
			if (this.owner!=null) {
				this.owner.owned.remove(this);
			}
			if (owner!=null) {
				owner.owned.add(this);
			}
			this.owner = owner;
		}
		return this;
	}`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a many to many relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn"},
                    "beginCardinality":{"message":"0-N"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`import java.util.List;
import javax.persistence.ManyToMany;
import java.util.ArrayList;
import java.util.Collections;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	@ManyToMany
	List<Address> liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public User() {
		this.liveIn = new ArrayList<Address>();
	}`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public List<Address> getLiveIn() {
		return Collections.unmodifiableList(this.liveIn);
	}

	public User addLiveIn(Address address) {
		this.liveIn.add(address);
		return this;
	}

	public User removeLiveIn(Address address) {
		this.liveIn.remove(address);
		return this;
	}`));

            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a double dir many to many relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>`
                }
            ],
            "relationships": [
                {
                    "id":2,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"liveIn {inverse=shelter}"},
                    "beginCardinality":{"message":"0-N"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"",
                    "endTermination":""
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert(result.file("com.acme.domain.User.java").contains(
`	@ManyToMany
	List<Address> liveIn;`));
                assert(result.file("com.acme.domain.User.java").contains(
`	public User addLiveIn(Address address) {
		if (this.liveIn.indexOf(address)==-1) {
			this.liveIn.add(address);
			liveIn.shelter.add(this);
		}
		return this;
	}

	public User removeLiveIn(Address address) {
		if (this.liveIn.indexOf(address)!=-1) {
			this.liveIn.remove(address);
			address.shelter.remove(this);
		}
		return this;
	}`));
                assert(result.file("com.acme.domain.Address.java").contains(
`	@ManyToMany(mappedBy = "liveIn")
	List<User> shelter;`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("fires an error if an entity has no id", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `login : string
                        password : string`
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                // console.log(result);
                assert.ok(false);
            },
            errors=>{
                // console.log(errors[0]);
                assert.deepEqual(new generator.Error({ type: 'node', id: 0 }, 'Entity User has no id !'), errors[0]);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("fires an error if an entity has more than one id in its hierarchy", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "<<entity>> SuperUser",
                    "content":
                        `code : long <<id>>`
                }
            ],
            "inherits": [
                {
                    "id":2,
                    "from":{"id":1},
                    "to":{"id":0},
                    "comment":{"message":"{single-table}"}
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert.ok(false);
            },
            errors=>{
                //console.log(errors[0]);
                assert.deepEqual(new generator.Error(
                    { type: 'node', id: 1 },
                    'Entity SuperUser has multiple ids : \n\tSuperUser.code\n\tUser.id'),
                    errors[0]);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("fires an error if one try to target a mapped superclass with a relationship", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> Group",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 1,
                    "title": "User",
                    "content":
                        `id : long <<id>>`
                },
                {
                    "id": 2,
                    "title": "<<entity>> SuperUser",
                    "content":
                        `code : long`
                }
            ],
            "relationships": [
                {
                    "id":3,
                    "from":{"id":0},
                    "to":{"id":1},
                    "title":{"message":"owns"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"composition",
                    "endTermination":"arrow"
                }
            ],
            "inherits": [
                {
                    "id":4,
                    "from":{"id":2},
                    "to":{"id":1},
                    "comment":{"message":"{single-table}"}
                }
            ]
        };
        let gen = new generator.GeneratorJPA();
        gen.generate(
            spec,
            result=>{
                //console.log(result);
                assert.ok(false);
            },
            errors=>{
                //console.log(errors[0]);
                assert.deepEqual(new generator.Error(
                    { type: 'link', id: 3 },
                    'MappedSuperclass User cannot be target of a relationship'),
                    errors[0]);
            }
        );
    });

    //--------------------------------------------------------------------------------------

});

// FIXME check that an entity contains at most one version field.
// FIXME check that relationships between entity and embedded classes are composition and uni-dir