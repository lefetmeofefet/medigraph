import {parsePwml} from "./pwmlReader.js"
import PwmlPathways from "./pwmlPathways.js"
import {MedigraphDb} from "./medigraphDb.js";

function uncirculate(json) {
    let cache = [];
    return JSON.parse(JSON.stringify(json, (key, value) => {
        if (typeof value === 'object' && value != null) {
            // Duplicate reference found, discard key
            if (cache.includes(value)) return;

            // Store value in our collection
            cache.push(value);
        }
        return value;
    }));
}


parsePwml(PwmlPathways.PathbankVitaminK, async pathway => {
    let nodes = [...pathway.nodes.keys()].map(nodeId => {
        // node.pwmlObject = uncirculate(node.pwmlObject)
        let node = uncirculate(pathway.nodes.get(nodeId))
        return {
            id: nodeId,
            type: node.type,
            name: node.name,
            data: JSON.stringify(node)
        }
    })

    let edges = pathway.edges.map(edge => ({
        source: edge.source,
        destination: edge.destination,
        description: edge.description,
        data: edge != null && JSON.stringify(uncirculate(edge.pwmlObject))
    }))
    await MedigraphDb.savePathway({
        pathway: {
            name: "Pathbank Vitamin K",
            source: "Pathbank"
        },
        nodes,
        edges
    });
})
