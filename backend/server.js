import express from "express";
import {MedigraphDb} from "../medigraphDb.js";
import fs from "fs"
import libsbml from 'libsbmljs_stable'
import {queryNeo4J} from "../parsers/parserUtil.js";
import {createMedigraph} from "./medigraphCreator.js"
import {createSbml} from "./sbmlCreator.js";

// let medigraph = null;
// (async () => medigraph = await createMedigraph())()

let app = express();

app.use(express.json({limit: '500mb'}));
app.use(express.static('./userInterface'));
app.use(express.static('./'));

app.post('/get_pathway', async (request, response) => {
    let pathway = request.body.pathway;
    response.json(await MedigraphDb.getPathway(pathway));
});

app.post('/download_file', async (request, response) => {
    let path = request.body.path;
    let file = fs.readFileSync(path).toString()
    response.json({file: file});
});

app.post("/convert_to_sbml", async (request, response) => {
    let medigraph = request.body.medigraph;

    // the module isn't usable yet - wait for it to load
    createSbml(medigraph, sbmlString => {
        response.json({sbml: sbmlString});
    })
})

let server = app.listen(process.env.PORT || 8008, () => {
    let {port, address} = server.address();
    if (address === "::") {
        address = "http://localhost"
    }
    console.log(`Medigraph is UP! ${address}:${port}`)
});
