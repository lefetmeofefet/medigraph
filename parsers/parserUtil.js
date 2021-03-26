function one(list) {
    if (list.length !== 1) {
        debugger
        throw "Unexpected length of list!"
    }
    return list [0]
}

function doSomethingRecursive(object, doSomething, path = []) {
    if (object instanceof Object) {
        if (!(object instanceof Array)) {
            doSomething(object, path);
        }
        for (let key of Object.keys(object)) {
            if (key.startsWith("_")) {
                continue
            }
            doSomethingRecursive(object[key], doSomething, [...path, key])
        }
    }
}

function _jsonSchemaError(error, path) {
    throw `JSONSchema Error: ${error}. path: ${path.join("->")}`
}

function jsonSchemaValidate(schema, json, path = ["root"]) {
    if (schema.type == null) {
        return
    }

    if (json == null) {
        if (schema.type !== "null") {
            _jsonSchemaError(`expected ${schema.type}, got null`, path)
        }
    }

    if (json instanceof Object) {
        if (json instanceof Array) {
            // ARRAY
            if (schema.type !== "list") {
                _jsonSchemaError(`expected ${schema.type}, got list`, path)
            }

            if (schema.isSingleItem && json.length !== 1) {
                _jsonSchemaError(`expected single item list, got ${json.length} items`, path)
            }

            for (let item of json) {
                jsonSchemaValidate(schema.items, item, [...path, "0"])
            }
        } else {
            // OBJECT
            if (schema.type !== "object") {
                _jsonSchemaError(`expected ${schema.type}, got object`, path)
            }

            let properties = new Set(Object.keys(json))
            let expectedProperties = new Set(Object.keys(schema.properties))

            // Validate that all props exist in schema
            for (let propName of properties) {
                if (!expectedProperties.has(propName)) {
                    _jsonSchemaError(`property '${propName}' is not specified in the schema`, path)
                }
            }

            // Validate that all schema props exist in object
            for (let expectedProp of expectedProperties) {
                if (!properties.has(expectedProp) && schema.properties[expectedProp].required) {
                    _jsonSchemaError(`property '${expectedProp}' is required`, path)
                }
            }

            for (let propName of properties) {
                jsonSchemaValidate(schema.properties[propName], json[propName], [...path, propName])
            }
        }
    } else if (typeof json === "string") {
        if (schema.type !== "string") {
            _jsonSchemaError(`expected ${schema.type}, got string`, path)
        }
    } else if (typeof json === "number") {
        if (schema.type !== "number") {
            _jsonSchemaError(`expected ${schema.type}, got number`, path)
        }
    }
}

function parsingError(error) {
    showNotification(error, "error")
    throw error
}

async function post(url, body, params = {}) {
    const response = await fetch(url, {
        method: "POST",
        headers: Object.assign({
            "Content-Type": "application/json; charset=utf-8",
        }, params),
        body: JSON.stringify(body),
    });
    return await response.json()
}

export {one, doSomethingRecursive, parsingError, jsonSchemaValidate, post}

