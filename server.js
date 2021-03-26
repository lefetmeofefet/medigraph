import express from "express";
import {MedigraphDb} from "./medigraphDb.js";
import fs from "fs"

let app = express();

app.use(express.json());
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

let server = app.listen(process.env.PORT || 8008, () => {
    let {port, address} = server.address();
    if (address === "::") {
        address = "http://localhost"
    }
    console.log(`Medigraph is UP! ${address}:${port}`)
});
