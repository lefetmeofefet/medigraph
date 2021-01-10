import "./libs/xml2js.min.js";
import {PathbankVitaminK} from "./pwmlPathways.js";


xml2js.parseString(PathbankVitaminK, (err, pwmlXmlObject) => {
    let pathway = pwmlXmlObject["super-pathway-visualization"]["pathway-visualization-contexts"][0]["pathway-visualization-context"][0]["pathway-visualization"][0];
    console.log(pathway)

    let idToEntity = new Map();
    doSomethingRecursive(pathway, entity => {
        if (entity.hasOwnProperty("id")) {
            if (entity.id.length !== 1) {
                throw "Entity id is in unexpected length (???)"
            }
            let id = entity.id[0]._;
            if (idToEntity.has(id)) {
                throw "ID already exists... how..."
            }
            idToEntity.set(id, entity)
        }
        else {
            throw "No ID! ???"
        }
    })


});

function doSomethingRecursive(object, doSomething) {
    if (object instanceof Object) {
        if (!(object instanceof Array)) {
            doSomething(object);
        }
        for (let child of Object.values(object)) {
            doSomethingRecursive(child)
        }
    }
}

