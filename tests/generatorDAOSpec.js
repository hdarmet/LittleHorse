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

describe('Generate DAO', function() {

    //--------------------------------------------------------------------------------------
    it("generates a simple DTO", function () {
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
            ],
            "objects":[
                {
                    "id": 1,
                    "title":"UserDTO : DTO",
                    "content":"id = user.id\nlogin = user.login"
                }
            ],
            "dependancies":[
                {
                    "id": 2,
                    "from": {"id": 1},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=>{
                console.log(result);
                assert.equal(result.file("com.acme.dtos.UserDTO.java"),
`// FILE : com.acme.dtos.UserDTO.java
package com.acme.dtos;

public class UserDTO {

	long id;
	String login;

	public long getId() {
		return this.id;
	}

	public UserDTO setId(long id) {
		this.id = id;
		return this;
	}

	public String getLogin() {
		return this.login;
	}

	public UserDTO setLogin(String login) {
		this.login = login;
		return this;
	}

}
`.canonize()
                );
                assert.equal(result.file("com.acme.converters.UserDTOConverter.java"),
`// FILE : com.acme.converters.UserDTOConverter.java
package com.acme.converters;

import com.acme.dtos.UserDTO;
import com.acme.domain.User;
import javax.persistence.EntityManager;

public class UserDTOConverter {

	public UserDTO convertToDTO(User user) {
		if (user != null) {
			UserDTO userDTO = new UserDTO();
			userDTO.setId(user.getId());
			userDTO.setLogin(user.getLogin());
			return userDTO;
		}
		else {
			return null;
		}
	}

    public User updateUser(UserDTO userDTO, EntityManager em) {
        User user = em.find(userDTO.getId());
		return user;
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
    it("generates a simple DTO using wildcards", function () {
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
            ],
            "objects":[
                {
                    "id": 1,
                    "title":"UserDTO : DTO",
                    "content":"* = user.*"
                }
            ],
            "dependancies":[
                {
                    "id": 2,
                    "from": {"id": 1},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                //console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long id;
	String login;
	String password;
`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a simple DTO using wildcards and excludes", function () {
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
            ],
            "objects":[
                {
                    "id": 1,
                    "title":"UserDTO : DTO",
                    "content":"* = user.* {exclude=login}"
                }
            ],
            "dependancies":[
                {
                    "id": 2,
                    "from": {"id": 1},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                //console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long id;
	String password;
`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a simple DTO using wildcards", function () {
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
            ],
            "objects":[
                {
                    "id": 1,
                    "title":"UserDTO : DTO",
                    "content":"* = user.*"
                }
            ],
            "dependancies":[
                {
                    "id": 2,
                    "from": {"id": 1},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                //console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
                    `public class UserDTO {

	long id;
	String login;
	String password;
`));
            },
            errors=>{
                errors.forEach(error=>console.log(error));
                assert.ok(false);
            }
        );
    });

    //--------------------------------------------------------------------------------------
    it("generates a DTO using more than one entity", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>
                        login : string`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Country",
                    "content":
                        `id : long <<id>>
                        name : string`
                }
            ],
            "objects":[
                {
                    "id": 10,
                    "title":"UserDTO : DTO",
                    "content":"user* = user.*\ncountry* = country.*"
                }
            ],
            "dependancies":[
                {
                    "id": 2,
                    "from": {"id": 10},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                },
                {
                    "id": 3,
                    "from": {"id": 10},
                    "to": {"id": 1},
                    "comment": {"message": "country"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long userId;
	String userLogin;
	long countryId;
	String countryName;

`));
                assert.equal(result.file("com.acme.converters.UserDTOConverter.java"),
`// FILE : com.acme.converters.UserDTOConverter.java
package com.acme.converters;

import com.acme.dtos.UserDTO;
import com.acme.domain.User;
import com.acme.domain.Country;
import javax.persistence.EntityManager;

public class UserDTOConverter {

	public UserDTO convertToDTO(User user, Country country) {
		if (user != null || country != null) {
			UserDTO userDTO = new UserDTO();
			this.convertUserToDTO(userDTO, user);
			this.convertCountryToDTO(userDTO, country);
			return userDTO;
		}
		else {
			return null;
		}
	}

	void convertUserToDTO(UserDTO userDTO, User user) {
		if (user != null) {
			userDTO.setUserId(user.getId());
			userDTO.setUserLogin(user.getLogin());
		}
	}

	void convertCountryToDTO(UserDTO userDTO, Country country) {
		if (country != null) {
			userDTO.setCountryId(country.getId());
			userDTO.setCountryName(country.getName());
		}
	}

	public User updateUser(UserDTO userDTO, EntityManager em) {
		User user = em.find(userDTO.getUserId());
		return user;
	}

	public Country updateCountry(UserDTO userDTO, EntityManager em) {
		Country country = em.find(userDTO.getUserId());
		return country;
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
    it("generates a DTO merging several related entities", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>
                        login : string`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>
                        street : string`
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
            ],
            "objects":[
                {
                    "id": 10,
                    "title":"UserDTO : DTO",
                    "content":"user* = user.*\naddr* = user.liveIn.*"
                }
            ],
            "dependancies":[
                {
                    "id": 20,
                    "from": {"id": 10},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                }
            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                //console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long userId;
	String userLogin;
	long addrId;
	String addrStreet;

`));
                assert.equal(result.file("com.acme.converters.UserDTOConverter.java"),
`// FILE : com.acme.converters.UserDTOConverter.java
package com.acme.converters;

import com.acme.dtos.UserDTO;
import com.acme.domain.User;
import com.acme.domain.Address;
import javax.persistence.EntityManager;

public class UserDTOConverter {

	public UserDTO convertToDTO(User user) {
		if (user != null) {
			UserDTO userDTO = new UserDTO();
			userDTO.setUserId(user.getId());
			userDTO.setUserLogin(user.getLogin());
			this.convertLiveInToDTO(userDTO, user.getLiveIn());
			return userDTO;
		}
		else {
			return null;
		}
	}

	void convertLiveInToDTO(UserDTO userDTO, Address liveIn) {
		if (liveIn != null) {
			userDTO.setAddrId(liveIn.getId());
			userDTO.setAddrStreet(liveIn.getStreet());
		}
	}

	public User updateUser(UserDTO userDTO, EntityManager em) {
		User user = em.find(userDTO.getUserId());
		return user;
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
    it("generates a DTO embedding another DTO", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>
                        login : string`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>
                        street : string`
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
                },
                {
                    "id":2,
                    "from":{"id":10},
                    "to":{"id":11},
                    "title":{"message":"liveHere = user.liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-1"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }

            ],
            "objects":[
                {
                    "id": 10,
                    "title":"UserDTO : DTO",
                    "content":"* = user.*"
                },
                {
                    "id": 11,
                    "title":"AddressDTO : DTO",
                    "content":"* = address.*"
                }
            ],
            "dependancies":[
                {
                    "id": 20,
                    "from": {"id": 10},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                },
                {
                    "id": 21,
                    "from": {"id": 11},
                    "to": {"id": 1},
                    "comment": {"message": "address"}
                }

            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long id;
	String login;
	AddressDTO liveHere;`));
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`	public AddressDTO getLiveHere() {
		return this.liveHere;
	}

	public UserDTO setLiveHere(AddressDTO liveHere) {
		this.liveHere = liveHere;
		return this;
	}`));
                assert.equal(result.file("com.acme.converters.UserDTOConverter.java"),
`// FILE : com.acme.converters.UserDTOConverter.java
package com.acme.converters;

import com.acme.dtos.UserDTO;
import com.acme.domain.User;
import javax.persistence.EntityManager;

public class UserDTOConverter {

	public UserDTO convertToDTO(User user) {
		if (user != null) {
			UserDTO userDTO = new UserDTO();
			userDTO.setId(user.getId());
			userDTO.setLogin(user.getLogin());
			this.convertLiveHereToDTO(userDTO, user);
			return userDTO;
		}
		else {
			return null;
		}
	}

	void convertLiveHereToDTO(UserDTO userDTO, User user) {
		AddressDTOConverter converter = new AddressDTOConverter();
		userDTO.setLiveHere(converter.convertToDTO(user.getLiveIn()));
	}

	public User updateUser(UserDTO userDTO, EntityManager em) {
		User user = em.find(userDTO.getId());
		return user;
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
    it("generates a DTO embedding a list of DTOs", function () {
        let spec = {
            "clazzes": [
                {
                    "id": 0,
                    "title": "<<entity>> User",
                    "content":
                        `id : long <<id>>
                        login : string`
                },
                {
                    "id": 1,
                    "title": "<<entity>> Address",
                    "content":
                        `id : long <<id>>
                        street : string`
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
                },
                {
                    "id":2,
                    "from":{"id":10},
                    "to":{"id":11},
                    "title":{"message":"liveHere = user.liveIn"},
                    "beginCardinality":{"message":"0-1"},
                    "endCardinality":{"message":"0-N"},
                    "beginTermination":"",
                    "endTermination":"arrow"
                }

            ],
            "objects":[
                {
                    "id": 10,
                    "title":"UserDTO : DTO",
                    "content":"* = user.*"
                },
                {
                    "id": 11,
                    "title":"AddressDTO : DTO",
                    "content":"* = address.*"
                }
            ],
            "dependancies":[
                {
                    "id": 20,
                    "from": {"id": 10},
                    "to": {"id": 0},
                    "comment": {"message": "user"}
                },
                {
                    "id": 21,
                    "from": {"id": 11},
                    "to": {"id": 1},
                    "comment": {"message": "address"}
                }

            ]
        };
        let gen = new generator.GeneratorDAO();
        gen.generate(
            spec,
            result=> {
                console.log(result);
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`import java.util.List;
import java.util.ArrayList;
`));
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`public class UserDTO {

	long id;
	String login;
	List<AddressDTO> liveHere;`));
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`	public UserDTO() {
		this.liveHere = new ArrayList<AddressDTO>();
	}`));
                assert(result.file("com.acme.dtos.UserDTO.java").contains(
`	public List<AddressDTO> getLiveHere() {
		return this.liveHere;
	}

	public UserDTO setLiveHere(List<AddressDTO> liveHere) {
		this.liveHere = liveHere;
		return this;
	}
`));
                assert.equal(result.file("com.acme.converters.UserDTOConverter.java"),
                    `// FILE : com.acme.converters.UserDTOConverter.java
package com.acme.converters;

import com.acme.dtos.UserDTO;
import com.acme.domain.User;
import com.acme.domain.Address;
import javax.persistence.EntityManager;

public class UserDTOConverter {

	public UserDTO convertToDTO(User user) {
		if (user != null) {
			UserDTO userDTO = new UserDTO();
			userDTO.setId(user.getId());
			userDTO.setLogin(user.getLogin());
			this.convertLiveHereToDTO(userDTO, user);
			return userDTO;
		}
		else {
			return null;
		}
	}

	void convertLiveHereToDTO(UserDTO userDTO, User user) {
		AddressDTOConverter converter = new AddressDTOConverter();
		for (Address address : user.getLiveIn()) {
			userDTO.getLiveHere().add(converter.convertToDTO(address));
		}
	}

	public User updateUser(UserDTO userDTO, EntityManager em) {
		User user = em.find(userDTO.getId());
		return user;
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

});

// FIXME tester deux classes avec le même nom
// FIXME tester une dépendence manquante entre un DTO et une entité
// FIXME verifier la validité des paths sur champs des DTO et relations entre DTOs
// FIXME vérifier la cohérence des cardinalités entre relation inter-entités et relations inter-dto associées