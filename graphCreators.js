import BiopaxPathways from "./biopaxPathways.js";

import PwmlPathways from "./pwmlPathways.js"
// import {parseBiopax} from "./biopaxer.js";
import {parseBiopax} from "./biopaxer3.js";
import {parsePwml} from "./pwmlReader.js";
import {SmallMoleculeInstance} from "./bioChemicalEntities/instances/SmallMoleculeInstance.js";
import {post} from "./parsers/parserUtil.js";
import {parseRemoteFile} from "./parsers/parser.js";
import {mergeGraphsOfSamePathway, mergeNodesNoCompartments} from "./parsers/medigraphMerger.js";
import pwmlPathways from "./pwmlPathways.js";
import {readNeo4jReactome} from "./parsers/neo4jReactomeReader.js";


function createMedigraph() {
    return new Promise(async (accept, reject) => {

        // let graph = await readDb()
        // accept(graph)


        // let xmls = [
        //     // BiopaxPathways.ReactomeProstagladin,
        //     // BiopaxPathways.ReactomeVitaminK,
        //
        //     // BiopaxPathways.ReactomeNotch,
        //     BiopaxPathways.ReactomeMapKinaseActivation,
        //
        //     // BiopaxPathways.PathbankVitaminK,
        //     // BiopaxPathways.PathbankAlzheimer,
        //     // BiopaxPathways.PathbankEGF,
        //     // BiopaxPathways.PathbankWarfarin
        //     // BiopaxPathways.PathbankArachidonicAcid
        // ]
        // parseBiopax(xmls, biopaxGraph => {
        //     // parseBiopax([BiopaxPathways.PathbankVitaminK], graph => {
        //
        //     parsePwml(PwmlPathways.PathbankVitaminK, pwmlGraph => {
        //     // parsePwml(PwmlPathways.PathbankAlzheimer, pwmlGraph => {
        //         // parsePwml(PwmlPathways.PathbankEGF, pwmlGraph => {
        //         // parsePwml(PwmlPathways.PathbankWarfarin, pwmlGraph => {
        //
        //         // accept(pwmlGraph)
        //         accept(biopaxGraph)
        //
        //         // let mergedGraph = mergeGraphs(pwmlGraph, biopaxGraph)
        //         //
        //         // addPhylloquinone(mergedGraph);
        //         // addBloodClotting(mergedGraph);
        //         // accept(mergedGraph);
        //     });
        // })


        // parseBiopax([
        //     BiopaxPathways.ReactomeVitaminK
        // ], biopaxGraph => {
        //     accept(biopaxGraph)
        // })


        /** Vitamin K */
        let neo4jMedigraph = await readNeo4jReactome()
        // mergeNodesNoCompartments(neo4jMedigraph)
        accept(neo4jMedigraph)

        // let reactomeSbml = await parseRemoteFile("./pathways/reactome/sbml/reactome_vitamin_k.sbml")
        // let reactomeBiopax = await parseRemoteFile("./pathways/reactome/biopax/reactome_vitamin_k.xml")
        // let pathbankPwml = await parseRemoteFile("./pathways/pathbank/pwml/pathbank_vitamin_k.pwml")
        // let medigraph = mergeGraphsOfSamePathway(reactomeSbml, reactomeBiopax, pathbankPwml)
        // accept(medigraph)

        // accept(reactomeBiopax)
        // accept(pathbankPwml)
        // accept(reactomeSbml)

        // /** Gamma Carboxylation, bla bla bla */
        // let reactomeSbml = await parseRemoteFile("./pathways/reactome/sbml/gamma_carboxylation.sbml")
        // let reactomeBiopax = await parseRemoteFile("./pathways/reactome/biopax/gamma_carboxylation.xml")
        // let medigraph = mergeGraphsOfSamePathway(reactomeSbml, reactomeBiopax)
        // accept(medigraph)

        // let reactomeBiopax = await parseRemoteFile("./pathways/reactome/biopax/all_of_metabolism.xml");
        // accept(reactomeBiopax)

    })
}


const unificationIdToNodes = new Map();


function mergeGraphs(pwmlGraph, biopaxGraph) {
    function perUnificationId(medigraph, cb) {
        for (let node of medigraph.nodes.values()) {
            let bioEntity = node.bioEntity
            for (let unificationRef of bioEntity.unificationRefs) {
                let unificationId = unificationRef.db + ";" + unificationRef.id;
                cb(node, unificationId)
            }
        }
    }

    // Populate PWML entities
    perUnificationId(pwmlGraph, (node, unificationId) => {
        if (unificationIdToNodes.has(unificationId)) {
            let nodes = unificationIdToNodes.get(unificationId)
            nodes.push(node)
        } else {
            unificationIdToNodes.set(unificationId, [node])
        }
    });

    // Enrich graph with BioPAX entities
    perUnificationId(biopaxGraph, (biopaxNode, unificationId) => {
        if (unificationIdToNodes.has(unificationId)) {
            let pwmlNodes = unificationIdToNodes.get(unificationId)
            let pwmlProtein = pwmlNodes.find(node => node.type === "EnzymeInstance")
            if (pwmlProtein != null) {
                if (biopaxNode.type === "Enzyme") {
                    let biopaxEnzymeInstance = biopaxGraph.nodes.get(biopaxNode.incomingEdges[0].source);
                    let affectedNodes = biopaxEnzymeInstance.outgoingEdges
                        .map(edge => biopaxGraph.nodes.get(edge.destination));
                    if (affectedNodes.find(node => node.type === "ComplexInstance") == null) {
                        let pwmlComplex = pwmlProtein.outgoingEdges
                            .map(edge => pwmlGraph.nodes.get(edge.destination))
                            .filter(node => node.type === "ComplexInstance")[0];
                        let dest = pwmlGraph.getDestination(pwmlComplex.outgoingEdges[1])
                        pwmlGraph.removeNode(pwmlComplex)

                        pwmlGraph.createEdge(pwmlProtein, dest, "WHATVEER")
                    }
                    debugger
                } else {
                    debugger
                }
            }
        }
    });

    // TODO: Find all "unused" biopax nodes, and understand why they went to hell

    return pwmlGraph
}

function mergeBioEntityIfExists(bioEntity) {
    for (let unificationRef of bioEntity.unificationRefs) {
        let unificationId = unificationRef.db + ";" + unificationRef.id;
        if (unificationIdToBioEntity.has(unificationId)) {
            // TODO: Join Data + Unification Ids! Here we lose all data from bioEntity, and just return the joined node...
            let entity = unificationIdToBioEntity.get(unificationId)
            for (let unificationRef of bioEntity.unificationRefs) {
                let unificationId = unificationRef.db + ";" + unificationRef.id;
                unificationIdToBioEntity.set(unificationId, entity)
            }
            return entity
        } else {
            unificationIdToBioEntity.set(unificationId, bioEntity)
        }
    }
    return bioEntity;
}


function addPhylloquinone(medigraph) {
    let phylloquinoneSupplement = new SmallMoleculeInstance({name: "Pylloquinone Supplement"})
    let node = {
        id: Math.random(), //uuidv4()
        name: phylloquinoneSupplement.name,
        bioEntity: phylloquinoneSupplement,
        incomingEdges: [],
        outgoingEdges: [],
        cellularLocation: "somewhere in the liver",
        type: "Drug"
    }
    let edge = {
        source: node.id,
        destination: [...medigraph.nodes.values()]
            .find(node => node.name === "Phylloquinol" && node.type === "SmallMoleculeInstance").id,
        description: "supplements"
    }
    node.outgoingEdges.push(edge);
    medigraph.nodes.set(node.id, node)
    medigraph.edges.push(edge)
}

function addBloodClotting(medigraph) {
    let bloodClotting = new SmallMoleculeInstance({name: "Blood Clotting"})
    let node = {
        id: Math.random(), //uuidv4()
        name: bloodClotting.name,
        bioEntity: bloodClotting,
        incomingEdges: [],
        outgoingEdges: [],
        cellularLocation: "somewhere in the blood",
        type: "Sign"
    }
    let edge = {
        destination: node.id,
        source: [...medigraph.nodes.values()]
            .find(node => node.name === "Vitamin K1" && node.type === "SmallMoleculeInstance").id,
        description: "contributes to"
    }
    node.incomingEdges.push(edge);
    medigraph.nodes.set(node.id, node)
    medigraph.edges.push(edge)
}

async function readDb() {
    let pathway = await post("/get_pathway", {pathway: "Pathbank Vitamin K"});
    let nodes = new Map();
    for (let node of pathway.nodes) {
        nodes.set(node.id, node.data)
    }
    return {
        nodes: nodes,
        edges: pathway.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            destination: edge.destination,
            description: edge.description,
            pwmlObject: edge.data
        }))
    }
}

export {createMedigraph}