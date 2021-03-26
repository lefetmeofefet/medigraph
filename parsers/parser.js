import "../userInterface/libs/xml2js.min.js";
import {parseSbml} from "./sbmlParser.js"
import {post} from "./parserUtil.js";
import {createMedigraph} from "../biopaxer3.js";
import {parsePwml} from "../pwmlReader.js";

async function parseFile(path) {
    const fs = await import("fs");
    let file = fs.readFileSync(path)
    return await parseString(file.toString())
}

async function parseRemoteFile(path) {
    let response = await post("/download_file", {path: path});
    return await parseString(response.file);
}


async function parseString(string) {
    let xml = await new Promise(accept => xml2js.parseString(string, (err, xml) => accept(xml)));
    if (xml.hasOwnProperty("sbml")) {
        return parseSbml(xml)
    } else if (xml.hasOwnProperty("super-pathway-visualization")) {
        return new Promise(finish => parsePwml(string, finish))
    } else if (xml.hasOwnProperty("rdf:RDF")) {
        xml = xml["rdf:RDF"];
        if (xml["$"].hasOwnProperty("xmlns:bp")) {
            return createMedigraph([xml])
        } else {
            debugger
        }
    } else {
        debugger
    }
}

if (typeof window === 'undefined') {
    parseFile("../pathways/reactome/sbml/reactome_vitamin_k.sbml")
}

export {parseString, parseRemoteFile, parseFile}