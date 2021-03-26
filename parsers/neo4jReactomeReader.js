// import "https://unpkg.com/neo4j-driver@4.2.3/lib/browser/neo4j-web.min.js"
// import "https://unpkg.com/neo4j-driver@1.7.8/lib/browser/neo4j-web.min.js"
// import "../userInterface/libs/neo4j/neo4j-driver.js"
import VitaminKPathway from "../pathways/reactome/neo4j/neo4j_vitamin_k_osteocalcin.js"

import {one, post} from "./parserUtil.js";
import {Medigraph} from "../bioChemicalEntities/Medigraph.js";
import {EntityInstance} from "../bioChemicalEntities/instances/EntityInstance.js";
import {BiochemicalEntity} from "../bioChemicalEntities/BiochemicalEntity.js";
import {BiochemicalReaction} from "../bioChemicalEntities/BiochemicalReaction.js";
import {SmallMolecule} from "../bioChemicalEntities/SmallMolecule.js";
import {SmallMoleculeInstance} from "../bioChemicalEntities/instances/SmallMoleculeInstance.js";
import {EnzymeInstance} from "../bioChemicalEntities/instances/EnzymeInstance.js";
import {ComplexInstance} from "../bioChemicalEntities/instances/ComplexInstance.js";
import {Drug} from "../bioChemicalEntities/instances/Drug.js";
import {Group} from "../bioChemicalEntities/instances/Group.js";
import {Enzyme} from "../bioChemicalEntities/Enzyme.js";
import {BioLocation} from "../bioChemicalEntities/instances/BioLocation.js";
import {Compartment} from "../bioChemicalEntities/Compartment.js";
import {Disease} from "../bioChemicalEntities/instances/Disease.js";

function removeSquareBrackets(str) {
    let indexOfBracket = str.indexOf(" [")
    if (indexOfBracket === -1) {
        return str
    }
    return str.substring(0, indexOfBracket)
}

async function readNeo4jReactome() {
    let neo4jUrl = "http://localhost:7474/db/data/transaction/commit";

    // let response = await post(
    //     neo4jUrl,
    //     {
    //         statements: [{
    //             statement: `
    //
    //             MATCH (p:Pathway)-[:hasEvent*]->(reaction:ReactionLikeEvent),
    //             path = (reaction)-[
    //                     edge:input|output|catalystActivity|physicalEntity|regulatedBy|regulator|hasComponent|hasMember|hasCandidate|physicalEntity|referenceEntity|compartment*
    //                 ]->(node:DatabaseObject)
    //             where
    //                 // p.stId = "R-HSA-163841"
    //
    //                 (p.stId = "R-HSA-163841"
    //                     and
    //                     (
    //                         reaction.stId = "R-HSA-6807214" // BGLAP (Osteocalcin)
    //                         // or reaction.stId = "R-HSA-163810" // GAS6
    //                         // or reaction.stId = "R-HSA-159826" or reaction.stId = "R-HSA-159843" or reaction.stId = "R-HSA-159728" // F2 (Prothrombin)
    //                     )
    //                 )
    //                 //
    //                 or
    //                 (
    //                     reaction.stId = "R-HSA-140664" // Prothombin in Homeostasis
    //                     or reaction.stId = "R-HSA-159826" // F2 (prothrombin) first reaction in creation of epoxide
    //                     or reaction.stId = "R-HSA-159826" // F2 (prothrombin) first reaction in creation of epoxide
    //                     or reaction.stId = "R-HSA-159843" // Prothrombin second reaction (transport?)
    //                     or reaction.stId = "R-HSA-159728" // Third reaction: creation of prothombin (44-622)
    //                 )
    //                 or
    //                 p.stId = "R-HSA-6806664" // Metabolism of Vitamin K
    //
    //                 // p.stId = "R-HSA-1227986" or p.stId = "R-HSA-5673001" // ERBB2 + RAF
    //                 // or p.stId = "R-HSA-453274" // Mitotic G2-G2/M phases (Centrosome is here)
    //                 // or p.stId = "R-HSA-453279" // Mitotic G1 phase and G1/S transition
    //                 // or p.stId = "R-HSA-68886" // M Phase
    //                 // or p.stId = "R-HSA-69242" // S Phase
    //             RETURN node, reaction, [e in edge | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]], p
    //
    //            `
    //             // match(node:PhysicalEntity)
    //             // <-[relationship:input|output]-
    //             // (reaction:ReactionLikeEvent{speciesName: "Homo sapiens"})
    //             // where node.stId = {mk4}
    //             //    or node.stId = {mk4Epoxide}
    //             //    or node.stId = "R-HSA-6806371" // VKORC Dimer
    //             //    or node.stId = "R-HSA-9035037" // VKORC Inhibitors
    //             //
    //             // return node, reaction, type(relationship)
    //             // `
    //             ,
    //             parameters: {
    //                 // mk4: 'R-ALL-6806362',
    //                 // mk4Epoxide: 'R-ALL-6806366'
    //             }
    //         }],
    //     },
    //     {
    //         "Authorization": `Basic ${btoa(`${"neo4j"}:${"asdf"}`)}`
    //     },
    // )
    //
    // console.log("NEO4J RESPONSE: ", response);

    let medigraph = new Medigraph();

    // let neo4jGraph = response.results[0];
    let neo4jGraph = VitaminKPathway;

    let neo4jIdMap = new Map();
    let nodeTypesToRemove = ["CatalystActivity", "NegativeRegulation", "PositiveRegulation"]


    // Create all nodes
    for (let [node, reaction, edges, pathway] of neo4jGraph.data.map(item => item.row)) {
        let createNode = bioEntity => {
            let newNode = medigraph.createNode(bioEntity, "reactome neo4j", node);
            newNode._pathways = [pathway]
            neo4jIdMap.set(
                node.dbId,
                newNode
            )
            return newNode
        }

        if (neo4jIdMap.has(node.dbId)) {
            let medigraphNode = neo4jIdMap.get(node.dbId)
            if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
                medigraphNode._pathways.push(pathway)
            }
        } else {
            let bioEntity;
            if (node.schemaClass.startsWith("Reference")) {
                if (node.schemaClass === "ReferenceMolecule") {
                    bioEntity = new SmallMolecule({
                        name: removeSquareBrackets(node.displayName),
                        otherNames: node.name
                    });
                    createNode(bioEntity)
                } else if (node.schemaClass === "ReferenceTherapeutic") {
                    bioEntity = new SmallMolecule({
                        name: removeSquareBrackets(node.displayName),
                        otherNames: node.name
                    })
                    createNode(bioEntity)
                } else if (node.schemaClass === "ReferenceGeneProduct") {
                    bioEntity = new Enzyme({
                        name: removeSquareBrackets(node.displayName),
                        otherNames: node.name
                    })
                    createNode(bioEntity)
                }
            } else if (node.schemaClass === "Compartment") {
                bioEntity = new Compartment({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                createNode(bioEntity)
            } else if (node.schemaClass === "SimpleEntity") {
                bioEntity = new SmallMoleculeInstance({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                createNode(bioEntity)
            } else if (node.schemaClass === "Complex" || node.schemaClass === "Polymer") {
                bioEntity = new ComplexInstance({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                let newNode = createNode(bioEntity)

                let newReferenceNode = medigraph.createNode(
                    new BiochemicalEntity({
                        name: removeSquareBrackets(node.displayName) + " ref",
                        otherNames: node.name
                    }),
                    "reactome neo4j",
                    node
                );
                medigraph.createEdge(newNode, newReferenceNode, Medigraph.EDGE_TYPES.IS, null)
            } else if (node.schemaClass === "EntityWithAccessionedSequence") {
                bioEntity = new EnzymeInstance({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                createNode(bioEntity)
            } else if (node.schemaClass === "ChemicalDrug" || node.schemaClass === "ProteinDrug") {
                bioEntity = new Drug({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                createNode(bioEntity)
            } else if (node.schemaClass === "DefinedSet" || node.schemaClass === "CandidateSet") {
                bioEntity = new Group({
                    name: removeSquareBrackets(node.displayName),
                    otherNames: node.name
                })
                createNode(bioEntity)
            } else if (nodeTypesToRemove.includes(node.schemaClass)) {
                // Nodes that we throw away
                bioEntity = new BiochemicalEntity({})
                createNode(bioEntity)
            } else {
                // debugger
                console.error("neo4j object type unknown!" + node.schemaClass)
                // throw "neo4j object type unknown!"
            }
        }

        if (neo4jIdMap.has(reaction.dbId)) {
            let medigraphNode = neo4jIdMap.get(reaction.dbId)
            if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
                medigraphNode._pathways.push(pathway)
            }
        } else {
            let newNode = medigraph.createNode(new BiochemicalReaction({
                    name: [...reaction.name, reaction.displayName]
                        .reduce((prev, current) => prev.length > current.length ? current : prev),
                    otherNames: reaction.name
                }),
                "reactome neo4j",
                reaction
            )
            newNode._pathways = [pathway]
            neo4jIdMap.set(
                reaction.dbId,
                newNode
            )
        }
    }

    // Create edges
    let addedEdges = new Set();
    for (let [neo4jNode, neo4jReaction, relationships] of neo4jGraph.data.map(item => item.row)) {
        for (let [relationshipId, relationshipProperties, relationshipType, srcDbId, dstDbId] of relationships) {
            if (addedEdges.has(relationshipId)) {
                continue
            }
            addedEdges.add(relationshipId)

            let src = neo4jIdMap.get(srcDbId)
            let dst = neo4jIdMap.get(dstDbId)

            if (src == null || dst == null) {
                continue
            }

            if (nodeTypesToRemove.includes(src.sourceObject.schemaClass) ||
                nodeTypesToRemove.includes(dst.sourceObject.schemaClass)) {
                // Later we remove this edge, it's for remembering which nodes are connected to this node
                medigraph.createEdge(dst, src, "#")
                continue
            }

            if (relationshipType === "compartment") {
                src.bioEntity.location = new BioLocation({cellularLocation: dst.name})
            }

            if (relationshipType === "referenceEntity") {
                medigraph.createEdge(src, dst, "is")
            } else if (relationshipType === "compartment") {
                medigraph.createEdge(src, dst, "in")
            } else if (relationshipType === "input") {
                medigraph.createEdge(dst, src, "reactant")
            } else if (relationshipType === "output") {
                medigraph.createEdge(src, dst, "product")
            } else if (relationshipType === "catalystActivity") {
                medigraph.createEdge(dst, src, "catalyst")
            } else if (relationshipType === "physicalEntity") {
                medigraph.createEdge(dst, src, "physicalEntity")
            } else if (relationshipType === "hasComponent") {
                medigraph.createEdge(dst, src, "component")
            } else if (relationshipType === "hasMember") {
                medigraph.createEdge(dst, src, "member")
            } else if (relationshipType === "hasCandidate") {
                medigraph.createEdge(dst, src, "candidate")
            } else {
                debugger
                throw "OTHER EDGE"
            }
        }
    }

    // Remove nodes that are redundant and add edges instead of them
    for (let node of medigraph.nodes.values()) {
        let edgeType = null
        if (node.sourceObject.schemaClass === "CatalystActivity") {
            edgeType = "catalyst"
        } else if (node.sourceObject.schemaClass === "NegativeRegulation") {
            edgeType = "inhibitor"
        } else if (node.sourceObject.schemaClass === "PositiveRegulation") {
            edgeType = "inducer"
        }

        if (edgeType != null) {
            // There could be many targets for the behaviour
            try {
                let src = medigraph.getSource(one(node.incomingEdges));
                for (let outgoingEdge of node.outgoingEdges) {
                    let dest = medigraph.getDestination(outgoingEdge);
                    medigraph.removeNode(node);
                    medigraph.createEdge(src, dest, edgeType, node);
                }
            } catch (e) {
                console.error("Edge from nowhere!")
            }
        }
    }

    // Connect group components to group interactions
    for (let groupNode of medigraph.nodes.values()) {
        if (groupNode.type === "Group") {
            for (let groupComponent of groupNode.incomingEdges
                .filter(e => e.description === "member")
                .map(e => medigraph.getSource(e))) {

                for (let interactionEdge of groupNode.outgoingEdges) {
                    let interactedNode = medigraph.getDestination(interactionEdge);
                    medigraph.createEdge(groupComponent, interactedNode, interactionEdge.description, interactionEdge.sourceObject)
                }
            }
        }
    }

    // Rename reference ideals if all instances have the same name
    for (let refNode of medigraph.nodes.values()) {
        if (refNode.sourceObject.schemaClass.startsWith("Reference")) {
            let instances = refNode.incomingEdges
                .filter(e => e.description === Medigraph.EDGE_TYPES.IS)
                .map(e => medigraph.getSource(e))
            if (instances.every(node => node.name === instances[0].name)) {
                refNode.bioEntity.otherNames.push(refNode.name)
                refNode.bioEntity.name = instances[0].name
                refNode.name = instances[0].name
            }
        }
    }

    return medigraph
}

export {readNeo4jReactome}