// import "https://unpkg.com/neo4j-driver@4.2.3/lib/browser/neo4j-web.min.js"
// import "https://unpkg.com/neo4j-driver@1.7.8/lib/browser/neo4j-web.min.js"
// import "../userInterface/libs/neo4j/neo4j-driver.js"
import VitaminKPathway from "../userInterface/neo4j_vitamin_k_osteocalcin.js"

import {one, post, queryNeo4J} from "./parserUtil.js";
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

async function createMedigraphFromNeo4jQuery(query) {
    let neo4jGraph = await queryNeo4J(query);

    // Convert neo4j response format into nodes, reactions, edges
    let data = neo4jGraph.data[0].row
    let [nodes, reactions, edges] = [data[0], data[1], data[2].flat()]

    let medigraph = new Medigraph();
    let neo4jIdMap = new Map();
    let nodeTypesToRemove = ["CatalystActivity", "NegativeRegulation", "PositiveRegulation"]


    // Create all nodes
    for (let [dbId, displayName, name, schemaClass] of nodes) {
        let createNode = bioEntity => {
            let newNode = medigraph.createNode(bioEntity, "reactome neo4j", {
                dbId, displayName, name, schemaClass
            });
            // newNode._pathways = [pathway]
            neo4jIdMap.set(
                dbId,
                newNode
            )
            return newNode
        }

        if (neo4jIdMap.has(dbId)) {
            // let medigraphNode = neo4jIdMap.get(node.dbId)
            // if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
            //     medigraphNode._pathways.push(pathway)
            // }
        } else {
            let bioEntity;
            if (schemaClass.startsWith("Reference")) {
                if (schemaClass === "ReferenceMolecule") {
                    bioEntity = new SmallMolecule({
                        name: removeSquareBrackets(displayName),
                        otherNames: name
                    });
                    createNode(bioEntity)
                }
                // else if (schemaClass === "ReferenceTherapeutic") {
                //     bioEntity = new SmallMolecule({
                //         name: removeSquareBrackets(displayName),
                //         otherNames: name
                //     })
                //     createNode(bioEntity)
                // }
                else if (schemaClass === "ReferenceGeneProduct") {
                    bioEntity = new Enzyme({
                        name: removeSquareBrackets(displayName),
                        otherNames: name
                    })
                    createNode(bioEntity)
                } else if (schemaClass === "ReferenceIsoform") {
                    bioEntity = new Enzyme({
                        name: removeSquareBrackets(displayName),
                        otherNames: name
                    })
                    createNode(bioEntity)
                } else {

                }
            } else if (schemaClass === "Compartment") {
                bioEntity = new Compartment({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                createNode(bioEntity)
            } else if (schemaClass === "SimpleEntity") {
                bioEntity = new SmallMoleculeInstance({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                createNode(bioEntity)
            } else if (schemaClass === "Complex" || schemaClass === "Polymer") {
                bioEntity = new ComplexInstance({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                let newNode = createNode(bioEntity)

                let newReferenceNode = medigraph.createNode(
                    new BiochemicalEntity({
                        name: removeSquareBrackets(displayName) + " ref",
                        otherNames: name
                    }),
                    "reactome neo4j",
                    {dbId, displayName, name, schemaClass}
                );
                medigraph.createEdge(newNode, newReferenceNode, Medigraph.EDGE_TYPES.IS, null)
            } else if (schemaClass === "EntityWithAccessionedSequence") {
                bioEntity = new EnzymeInstance({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                createNode(bioEntity)
            } else if (schemaClass === "ChemicalDrug" || schemaClass === "ProteinDrug") {
                bioEntity = new Drug({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                createNode(bioEntity)
            } else if (schemaClass === "DefinedSet" || schemaClass === "CandidateSet") {
                bioEntity = new Group({
                    name: removeSquareBrackets(displayName),
                    otherNames: name
                })
                createNode(bioEntity)
            } else if (nodeTypesToRemove.includes(schemaClass)) {
                // Nodes that we throw away after we merge their input and output edges
                bioEntity = new BiochemicalEntity({})
                createNode(bioEntity)
            } else {
                // debugger
                console.error("neo4j object type unknown!" + schemaClass)
                // throw "neo4j object type unknown!"
            }
        }
    }

    // Create all reactions
    for (let [dbId, displayName, name] of reactions) {
        if (neo4jIdMap.has(dbId)) {
            // let medigraphNode = neo4jIdMap.get(dbId)
            // if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
            //     medigraphNode._pathways.push(pathway)
            // }
        } else {
            let newNode = medigraph.createNode(new BiochemicalReaction({
                    name: [...name, displayName]
                        .reduce((prev, current) => prev.length > current.length ? current : prev),
                    otherNames: name
                }),
                "reactome neo4j",
                {dbId, displayName, name}
            )
            // newNode._pathways = [pathway]
            neo4jIdMap.set(
                dbId,
                newNode
            )
        }
    }

    // Create edges
    let addedEdges = new Set();
    for (let [relationshipId, relationshipProperties, relationshipType, srcDbId, dstDbId] of edges) {
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
            medigraph.createEdge(dst, src, "#", null, relationshipProperties)
            continue
        }

        if (relationshipType === "compartment") {
            src.bioEntity.location = new BioLocation({cellularLocation: dst.name})
        }

        if (relationshipType === "referenceEntity") {
            medigraph.createEdge(src, dst, "is")
        } else if (relationshipType === "medigraph_instanceOf") {
            medigraph.createEdge(dst, src, "is")
        } else if (relationshipType === "compartment") {
            medigraph.createEdge(src, dst, "in")
        } else if (relationshipType === "input") {
            medigraph.createEdge(dst, src, "reactant", null, relationshipProperties)
        } else if (relationshipType === "medigraph_input") {
            medigraph.createEdge(src, dst, "reactant", null, relationshipProperties)
        } else if (relationshipType === "output") {
            medigraph.createEdge(src, dst, "product", null, relationshipProperties)
        } else if (relationshipType === "medigraph_output") {
            medigraph.createEdge(dst, src, "product", null, relationshipProperties)
        } else if (relationshipType === "catalystActivity") {
            medigraph.createEdge(dst, src, "catalyst", null, relationshipProperties)
        } else if (relationshipType === "physicalEntity") {
            medigraph.createEdge(dst, src, "physicalEntity")
        } else if (relationshipType === "hasComponent") {
            medigraph.createEdge(dst, src, "component")
        } else if (relationshipType === "medigraph_componentOf") {
            medigraph.createEdge(src, dst, "component")
        } else if (relationshipType === "hasMember") {
            medigraph.createEdge(dst, src, "member")
        } else if (relationshipType === "medigraph_memberOf") {
            medigraph.createEdge(src, dst, "member")
        } else if (relationshipType === "hasCandidate") {
            medigraph.createEdge(dst, src, "candidate")
        } else if (relationshipType === "medigraph_candidateOf") {
            medigraph.createEdge(src, dst, "candidate")
        } else {
            debugger
            throw "OTHER EDGE"
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
                let edgeProperties = one(node.incomingEdges).properties
                for (let outgoingEdge of node.outgoingEdges) {
                    let dest = medigraph.getDestination(outgoingEdge);

                    medigraph.removeNode(node);
                    medigraph.createEdge(src, dest, edgeType, node, edgeProperties);
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
                    medigraph.createEdge(groupComponent, interactedNode, interactionEdge.description, interactionEdge.sourceObject, interactionEdge.properties)
                }
            }
        }
    }

    // Rename reference ideals if all instances have the same name
    for (let refNode of medigraph.nodes.values()) {
        if (refNode.sourceObject.schemaClass != null && refNode.sourceObject.schemaClass.startsWith("Reference")) {
            let instances = refNode.incomingEdges
                .filter(e => e.description === Medigraph.EDGE_TYPES.IS)
                .map(e => medigraph.getSource(e))
            if (instances.length > 0 && instances.every(node => node.name === instances[0].name)) {
                refNode.bioEntity.otherNames.push(refNode.name)
                refNode.bioEntity.name = instances[0].name
                refNode.name = instances[0].name
            }
        }
    }

    return medigraph
}

async function readNeo4jReactome() {
    //     let neo4jGraph = await queryNeo4J(`
// MATCH (reaction:ReactionLikeEvent)
//     -[edge:
//     input|
//     output|
//     catalystActivity|
//     physicalEntity|
//     regulatedBy|
//     regulator|
//     hasComponent|
//     hasMember|
//     hasCandidate|
//     referenceEntity|
//     compartment*]->
//     (node:DatabaseObject)
// WHERE
//     reaction.speciesName = 'Homo sapiens' and
//     node.speciesName = 'Homo sapiens'
//
//     with collect(distinct node) as nodes,
//     collect(distinct reaction) as reactions,
//     collect(distinct edge) as edges
//
//     return [node in nodes | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
//     [reaction in reactions | [reaction.dbId, reaction.displayName, reaction.name]] as reactions,
//     [es in edges | [ e in es | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
//     `)
//     debugger

    //     let neo4jGraph = await queryNeo4J(`
//
// match (src:DatabaseObject {
//   // stId: 'R-ALL-6806362' // MK 4
//   // stId: 'R-HSA-159826' // GGCX Gamma carboxylates F2
//   stId: 'R-HSA-179863' // Extracellular EGF
// }), (dst:DatabaseObject {
//   // stId: 'R-HSA-159728' // Furin cleaves stuff
//   // stId: 'R-HSA-74787' // PIK3CA
//   // stId: 'R-HSA-5672978' // RAF Phosphorylates
//   stId: 'R-HSA-167224' // BRAF (protein)
// })
// with src, dst
//
// // match p_in = (src)
// // <-[edge:
// //   medigraph_input|
// //   output|
// //   medigraph_catalyses|
// //   medigraph_catalystCatalyses|
// //   medigraph_regulates|
// //   medigraph_regulatorRegulates|
// //   medigraph_componentOf|
// //   medigraph_memberOf|
// //   medigraph_candidateOf
// //   *1..2]-
// // (:DatabaseObject)
// // where ALL(node IN nodes(p_in)
// //   WHERE NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens'
// // )
// // with p_in, src, dst
//
// // match p_out = (dst)
// // -[edge:
// //   medigraph_input|
// //   output|
// //   medigraph_catalyses|
// //   medigraph_catalystCatalyses|
// //   medigraph_regulates|
// //   medigraph_regulatorRegulates|
// //   medigraph_componentOf|
// //   medigraph_memberOf|
// //   medigraph_candidateOf
// //   *1..2]->
// // (:DatabaseObject)
// // where ALL(node IN nodes(p_out)
// //   WHERE NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens'
// // )
// // with p_in, p_out, src, dst
//
// MATCH p_between = shortestPath(
// (src)
//   -[edge:
//   medigraph_input|
//   output|
//   medigraph_catalyses|
//   medigraph_catalystCatalyses|
//   medigraph_regulates|
//   medigraph_regulatorRegulates|
//   medigraph_componentOf|
//   medigraph_memberOf|
//   medigraph_candidateOf
//   *]->
// (dst)
// )
// // Filter only for homo sapiens
//   WHERE ALL(node IN nodes(p_between)
//     WHERE NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens'
//   )
//
// // WITH nodes(p_in) + nodes(p_out) + nodes(p_between) as nodez
// WITH nodes(p_between) as nodez
// // return nodez
//
// // Filter only reactions from the shortest path
// WITH filter(node IN nodez
//   WHERE node:ReactionLikeEvent) AS reactions
//
//
//
// //
// // MATCH p = shortestPath(
// // (src:PhysicalEntity {
// // //  stId: 'R-HSA-9035037' // Inhibitors Complex
// //   stId: 'R-ALL-9014945' // Warfarin
// // })
// //   -[edge:
// //   medigraph_input|
// //   output|
// //   medigraph_catalyses|
// //   medigraph_catalystCatalyses|
// //   medigraph_regulates|
// //   medigraph_regulatorRegulates|
// //   medigraph_componentOf|
// //   medigraph_memberOf|
// //   medigraph_candidateOf
// //   *]->
// // (dst:DatabaseObject {
// // //  stId: 'R-ALL-6806362' // MK 4
// //   stId: 'R-HSA-159728' // Furin cleaves stuff
// // })
// // )
// // // Filter only for homo sapiens
// //   WHERE ALL(node IN nodes(p)
// //     WHERE NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens'
// //   )
// //
// // // Filter only reactions from the shortest path
// // WITH filter(node IN nodes(p)
// //   WHERE node:ReactionLikeEvent) AS reactions
//
//
// // Turn list of nodes into just nodes
// UNWIND reactions AS reaction
// // Find nodes affected and affecting the reactions
// MATCH (p:Pathway)-[:hasEvent*]->(reaction),
//       path = (reaction)
//         -[edge:
//         input|
//         output|
//         catalystActivity|
//         physicalEntity|
//         regulatedBy|
//         regulator|
//         hasComponent|
//         hasMember|
//         hasCandidate|
//         referenceEntity|
//         compartment
//         *]->
//       (node:DatabaseObject)
// return node, reaction, [e in edge | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]], p
//     `)

    // let neo4jGraph = await queryNeo4J(`
    // MATCH (p:Pathway)-[:hasEvent*]->(reaction:ReactionLikeEvent),
    // path = (reaction)-[
    //         edge:input|output|catalystActivity|physicalEntity|regulatedBy|regulator|hasComponent|hasMember|hasCandidate|referenceEntity|compartment*
    //     ]->(node:DatabaseObject)
    // where
    //     // p.stId = "R-HSA-163841"
    //
    //     // (p.stId = "R-HSA-163841"
    //     //     and
    //     //     (
    //     //         reaction.stId = "R-HSA-6807214" // BGLAP (Osteocalcin)
    //     //         // or reaction.stId = "R-HSA-163810" // GAS6
    //     //         // or reaction.stId = "R-HSA-159826" or reaction.stId = "R-HSA-159843" or reaction.stId = "R-HSA-159728" // F2 (Prothrombin)
    //     //     )
    //     // )
    //     //
    //     // or
    //     // (
    //     //     reaction.stId = "R-HSA-140664" // Prothombin in Homeostasis
    //     //     or reaction.stId = "R-HSA-159826" // F2 (prothrombin) first reaction in creation of epoxide
    //     //     or reaction.stId = "R-HSA-159826" // F2 (prothrombin) first reaction in creation of epoxide
    //     //     or reaction.stId = "R-HSA-159843" // Prothrombin second reaction (transport?)
    //     //     or reaction.stId = "R-HSA-159728" // Third reaction: creation of prothombin (44-622)
    //     // )
    //     // or
    //     //
    //     p.stId = "R-HSA-6806664" // Metabolism of Vitamin K
    //
    //     // p.stId = "R-HSA-1227986" or p.stId = "R-HSA-5673001" // ERBB2 + RAF
    //     // or p.stId = "R-HSA-453274" // Mitotic G2-G2/M phases (Centrosome is here)
    //     // or p.stId = "R-HSA-453279" // Mitotic G1 phase and G1/S transition
    //     // or p.stId = "R-HSA-68886" // M Phase
    //     // or p.stId = "R-HSA-69242" // S Phase
    //     // or p.stId = "R-HSA-9665348" // Signaling by ERBB2 ECD Mutants
    // RETURN node, reaction, [e in edge | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]], p
    // `
    // )

    // let neo4jGraph = VitaminKPathway;


    // // OLDDDDDDDDDDDD ALGORITHMMMM

    // let medigraph = new Medigraph();
    //
    // let neo4jIdMap = new Map();
    // let nodeTypesToRemove = ["CatalystActivity", "NegativeRegulation", "PositiveRegulation"]
    //
    //
    // // Create all nodes
    // for (let [node, reaction, edges, pathway] of neo4jGraph.data.map(item => item.row)) {
    //     let createNode = bioEntity => {
    //         let newNode = medigraph.createNode(bioEntity, "reactome neo4j", node);
    //         newNode._pathways = [pathway]
    //         neo4jIdMap.set(
    //             node.dbId,
    //             newNode
    //         )
    //         return newNode
    //     }
    //
    //     if (neo4jIdMap.has(node.dbId)) {
    //         let medigraphNode = neo4jIdMap.get(node.dbId)
    //         if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
    //             medigraphNode._pathways.push(pathway)
    //         }
    //     } else {
    //         let bioEntity;
    //         if (node.schemaClass.startsWith("Reference")) {
    //             if (node.schemaClass === "ReferenceMolecule") {
    //                 bioEntity = new SmallMolecule({
    //                     name: removeSquareBrackets(node.displayName),
    //                     otherNames: node.name
    //                 });
    //                 createNode(bioEntity)
    //             } else if (node.schemaClass === "ReferenceTherapeutic") {
    //                 bioEntity = new SmallMolecule({
    //                     name: removeSquareBrackets(node.displayName),
    //                     otherNames: node.name
    //                 })
    //                 createNode(bioEntity)
    //             } else if (node.schemaClass === "ReferenceGeneProduct") {
    //                 bioEntity = new Enzyme({
    //                     name: removeSquareBrackets(node.displayName),
    //                     otherNames: node.name
    //                 })
    //                 createNode(bioEntity)
    //             }
    //         } else if (node.schemaClass === "Compartment") {
    //             bioEntity = new Compartment({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             createNode(bioEntity)
    //         } else if (node.schemaClass === "SimpleEntity") {
    //             bioEntity = new SmallMoleculeInstance({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             createNode(bioEntity)
    //         } else if (node.schemaClass === "Complex" || node.schemaClass === "Polymer") {
    //             bioEntity = new ComplexInstance({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             let newNode = createNode(bioEntity)
    //
    //             let newReferenceNode = medigraph.createNode(
    //                 new BiochemicalEntity({
    //                     name: removeSquareBrackets(node.displayName) + " ref",
    //                     otherNames: node.name
    //                 }),
    //                 "reactome neo4j",
    //                 node
    //             );
    //             medigraph.createEdge(newNode, newReferenceNode, Medigraph.EDGE_TYPES.IS, null)
    //         } else if (node.schemaClass === "EntityWithAccessionedSequence") {
    //             bioEntity = new EnzymeInstance({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             createNode(bioEntity)
    //         } else if (node.schemaClass === "ChemicalDrug" || node.schemaClass === "ProteinDrug") {
    //             bioEntity = new Drug({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             createNode(bioEntity)
    //         } else if (node.schemaClass === "DefinedSet" || node.schemaClass === "CandidateSet") {
    //             bioEntity = new Group({
    //                 name: removeSquareBrackets(node.displayName),
    //                 otherNames: node.name
    //             })
    //             createNode(bioEntity)
    //         } else if (nodeTypesToRemove.includes(node.schemaClass)) {
    //             // Nodes that we throw away
    //             bioEntity = new BiochemicalEntity({})
    //             createNode(bioEntity)
    //         } else {
    //             // debugger
    //             console.error("neo4j object type unknown!" + node.schemaClass)
    //             // throw "neo4j object type unknown!"
    //         }
    //     }
    //
    //     if (neo4jIdMap.has(reaction.dbId)) {
    //         let medigraphNode = neo4jIdMap.get(reaction.dbId)
    //         if (!medigraphNode._pathways.find(p => p.dbId === pathway.dbId)) {
    //             medigraphNode._pathways.push(pathway)
    //         }
    //     } else {
    //         let newNode = medigraph.createNode(new BiochemicalReaction({
    //                 name: [...reaction.name, reaction.displayName]
    //                     .reduce((prev, current) => prev.length > current.length ? current : prev),
    //                 otherNames: reaction.name
    //             }),
    //             "reactome neo4j",
    //             reaction
    //         )
    //         newNode._pathways = [pathway]
    //         neo4jIdMap.set(
    //             reaction.dbId,
    //             newNode
    //         )
    //     }
    // }
    //
    // // Create edges
    // let addedEdges = new Set();
    // for (let [neo4jNode, neo4jReaction, relationships] of neo4jGraph.data.map(item => item.row)) {
    //     for (let [relationshipId, relationshipProperties, relationshipType, srcDbId, dstDbId] of relationships) {
    //         if (addedEdges.has(relationshipId)) {
    //             continue
    //         }
    //         addedEdges.add(relationshipId)
    //
    //         let src = neo4jIdMap.get(srcDbId)
    //         let dst = neo4jIdMap.get(dstDbId)
    //
    //         if (src == null || dst == null) {
    //             continue
    //         }
    //
    //         if (nodeTypesToRemove.includes(src.sourceObject.schemaClass) ||
    //             nodeTypesToRemove.includes(dst.sourceObject.schemaClass)) {
    //             // Later we remove this edge, it's for remembering which nodes are connected to this node
    //             medigraph.createEdge(dst, src, "#", null, relationshipProperties)
    //             continue
    //         }
    //
    //         if (relationshipType === "compartment") {
    //             src.bioEntity.location = new BioLocation({cellularLocation: dst.name})
    //         }
    //
    //         if (relationshipType === "referenceEntity") {
    //             medigraph.createEdge(src, dst, "is")
    //         } else if (relationshipType === "compartment") {
    //             medigraph.createEdge(src, dst, "in")
    //         } else if (relationshipType === "input") {
    //             medigraph.createEdge(dst, src, "reactant", null, relationshipProperties)
    //         } else if (relationshipType === "output") {
    //             medigraph.createEdge(src, dst, "product", null, relationshipProperties)
    //         } else if (relationshipType === "catalystActivity") {
    //             medigraph.createEdge(dst, src, "catalyst", null, relationshipProperties)
    //         } else if (relationshipType === "physicalEntity") {
    //             medigraph.createEdge(dst, src, "physicalEntity")
    //         } else if (relationshipType === "hasComponent") {
    //             medigraph.createEdge(dst, src, "component")
    //         } else if (relationshipType === "hasMember") {
    //             medigraph.createEdge(dst, src, "member")
    //         } else if (relationshipType === "hasCandidate") {
    //             medigraph.createEdge(dst, src, "candidate")
    //         } else {
    //             debugger
    //             throw "OTHER EDGE"
    //         }
    //     }
    // }
    //
    // // Remove nodes that are redundant and add edges instead of them
    // for (let node of medigraph.nodes.values()) {
    //     let edgeType = null
    //     if (node.sourceObject.schemaClass === "CatalystActivity") {
    //         edgeType = "catalyst"
    //     } else if (node.sourceObject.schemaClass === "NegativeRegulation") {
    //         edgeType = "inhibitor"
    //     } else if (node.sourceObject.schemaClass === "PositiveRegulation") {
    //         edgeType = "inducer"
    //     }
    //
    //     if (edgeType != null) {
    //         // There could be many targets for the behaviour
    //         try {
    //             let src = medigraph.getSource(one(node.incomingEdges));
    //             let edgeProperties = one(node.incomingEdges).properties
    //             for (let outgoingEdge of node.outgoingEdges) {
    //                 let dest = medigraph.getDestination(outgoingEdge);
    //
    //                 medigraph.removeNode(node);
    //                 medigraph.createEdge(src, dest, edgeType, node, edgeProperties);
    //             }
    //         } catch (e) {
    //             console.error("Edge from nowhere!")
    //         }
    //     }
    // }
    //
    // // Connect group components to group interactions
    // for (let groupNode of medigraph.nodes.values()) {
    //     if (groupNode.type === "Group") {
    //         for (let groupComponent of groupNode.incomingEdges
    //             .filter(e => e.description === "member")
    //             .map(e => medigraph.getSource(e))) {
    //
    //             for (let interactionEdge of groupNode.outgoingEdges) {
    //                 let interactedNode = medigraph.getDestination(interactionEdge);
    //                 medigraph.createEdge(groupComponent, interactedNode, interactionEdge.description, interactionEdge.sourceObject, interactionEdge.properties)
    //             }
    //         }
    //     }
    // }
    //
    // // Rename reference ideals if all instances have the same name
    // for (let refNode of medigraph.nodes.values()) {
    //     if (refNode.sourceObject.schemaClass.startsWith("Reference")) {
    //         let instances = refNode.incomingEdges
    //             .filter(e => e.description === Medigraph.EDGE_TYPES.IS)
    //             .map(e => medigraph.getSource(e))
    //         if (instances.every(node => node.name === instances[0].name)) {
    //             refNode.bioEntity.otherNames.push(refNode.name)
    //             refNode.bioEntity.name = instances[0].name
    //             refNode.name = instances[0].name
    //         }
    //     }
    // }
    //
    // //
    // // let n1 = medigraph.createNode(
    // //     new SmallMoleculeInstance(
    // //         {name: "n1"}),
    // //     "reactome neo4j",
    // //     {}
    // // );
    // // let n2 = medigraph.createNode(
    // //     new SmallMoleculeInstance(
    // //         {name: "n2"}),
    // //     "reactome neo4j",
    // //     {}
    // // );
    // // let n3 = medigraph.createNode(
    // //     new SmallMoleculeInstance(
    // //         {name: "n3"}),
    // //     "reactome neo4j",
    // //     {}
    // // );
    // // medigraph.createEdge(n1, n2, "a")
    // // medigraph.createEdge(n2, n3, "a")
    // // medigraph.createEdge(n1, n3, "a")
    //
    // return medigraph


    return await createMedigraphFromNeo4jQuery(`
    MATCH (p:Pathway)-[:hasEvent*]->(reaction:ReactionLikeEvent),
    (reaction:ReactionLikeEvent)
        -[edge:
        input|
        output|
        catalystActivity|
        physicalEntity|
        regulatedBy|
        regulator|
        hasComponent|
        hasMember|
        hasCandidate|
        referenceEntity|
        compartment*]->
        (node:DatabaseObject)
    WHERE
        (reaction.speciesName = 'Homo sapiens' or reaction.speciesName is null)
        and (node.speciesName = 'Homo sapiens' or node.speciesName is null)
        and p.stId = "R-HSA-6806664" // Metabolism of Vitamin K
        
        // match (node{dbId: 62720}) // KRAS
        // match (node{dbId: 152763}) // KRAS ISOFORM
        // match (node{dbId: 9649715}) // Ras P21
        // match (node{dbId: 54210}) // EGF
        // and node.dbId = 54210

    WITH collect(distinct node) as nodes,
         collect(distinct reaction) as reactions,
         // [] as reactions,
         collect(distinct edge) as edges
         // [] as edges

    RETURN [node in nodes | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
           [reaction in reactions | [reaction.dbId, reaction.displayName, reaction.name]] as reactions,
           [es in edges | [ e in es | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
    `)
}

async function downloadPartialMedigraph(nodes) {
    if (SearchOptions.PathOption === "Downstream Nodes" || SearchOptions.PathOption === "Upstream Nodes") {
        let downstream = SearchOptions.PathOption === "Downstream Nodes";
        // let leaky = prompt("Leaky?")
        // leaky = leaky.toLowerCase() === "y" || leaky.toLowerCase() === "yes" || leaky === "1"
        let maxHops = parseInt(prompt("Max number of hops?"))
        let dbId = nodes[0].originalNodeRef.sourceObject.dbId;
        return await createMedigraphFromNeo4jQuery(`
        MATCH 
            (src:DatabaseObject) -[e1:medigraph_instanceOf]-> (srcInstance:PhysicalEntity),
            (dst:ReferenceEntity) -[e2:medigraph_instanceOf]-> (dstInstance:PhysicalEntity)
        
        WHERE src.dbId = ${dbId} // 54210 // EGF
        
        WITH src, dst, srcInstance, dstInstance, e1, e2
        
        MATCH 
            p = (
                (srcInstance)
                ${downstream ? "" : "<"}-[edge:
                //referenceEntity|
                //medigraph_instanceOf|
                medigraph_input|
                output|
                medigraph_catalyses|
                medigraph_catalystCatalyses|
                medigraph_regulates|
                medigraph_regulatorRegulates|
                medigraph_componentOf|
                medigraph_memberOf|
                medigraph_candidateOf
                *1..${maxHops}]-${downstream ? ">" : ""}
                (dstInstance)
            )
        
        // Filter only for homo sapiens
        WHERE ALL(node IN nodes(p)
            WHERE (NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens') 
        )
        
        WITH 
            collect(distinct dst) + collect(distinct dstInstance) + collect(distinct src) + collect(distinct srcInstance) as nodes,
            collect(distinct e1) + collect(distinct e2) as edges
        
        RETURN [node in nodes | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
               [] as reactions,
               [[e in edges | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
        `)
    } else if (SearchOptions.PathOption === "Shortest Path") {
        let src = nodes[0].originalNodeRef.sourceObject.dbId;
        let dst = nodes[1].originalNodeRef.sourceObject.dbId;
        return await createMedigraphFromNeo4jQuery(`
        MATCH 
            (src:DatabaseObject) -[e1:medigraph_instanceOf]-> (srcInstance:PhysicalEntity),
            (dst:ReferenceEntity) -[e2:medigraph_instanceOf]-> (dstInstance:PhysicalEntity)
        
        WHERE 
            src.dbId = ${src} // 6806367 // MK4
            and dst.dbId = ${dst} // 6807256 // MK4 Epoxide
        
        WITH src, dst, srcInstance, dstInstance, e1, e2
        
        MATCH 
            p = shortestPath(
                (srcInstance)
                -[edge:
                //referenceEntity|
                //medigraph_instanceOf|
                medigraph_input|
                output|
                medigraph_catalyses|
                medigraph_catalystCatalyses|
                medigraph_regulates|
                medigraph_regulatorRegulates|
                medigraph_componentOf|
                medigraph_memberOf|
                medigraph_candidateOf
                *1..100]->
                (dstInstance)
            )
        
        // Filter only for homo sapiens
        WHERE ALL(node IN nodes(p)
            WHERE (NOT exists(node.speciesName) OR node.speciesName = 'Homo sapiens') 
        )
        
        with p, src, dst, e1, e2
            ORDER BY length(p) ASC
            LIMIT 1
        
        WITH 
            [n in nodes(p) where not (n:ReactionLikeEvent)] + [src, dst] as nodez,
            [n in nodes(p) where n:ReactionLikeEvent] as reactions,
            [e in rels(p)] + [e1, e2] as edges
        
        RETURN [node in nodez | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
               [reaction in reactions | [reaction.dbId, reaction.displayName, reaction.name]] as reactions,
               [[e in edges | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
        `)
    } else if (SearchOptions.PathOption === "Nearest Neighbors") {
        return await createMedigraphFromNeo4jQuery(`
        MATCH (selectedNodes)
        WHERE
            selectedNodes.dbId in [${[...nodes].map(n => n.originalNodeRef.sourceObject.dbId).join(",")}]
        
        WITH
            selectedNodes
        
        MATCH
            (selectedNodes)
            -[edge:
            input|
            output|
            catalystActivity|
            physicalEntity|
            regulatedBy|
            regulator|
            hasComponent|
            hasMember|
            hasCandidate|
            referenceEntity|*1]-
            (node:DatabaseObject)
            
        WHERE
            (node.speciesName = 'Homo sapiens' or node.speciesName is null) 
            and node.schemaClass <> "Pathway" 
            and node.schemaClass <> "GenomeEncodedEntity"
            and node.schemaClass <> "OtherEntity"
    
        WITH 
            [node in (collect(distinct node) + collect(distinct selectedNodes)) where not ("ReactionLikeEvent" in labels(node))] as nodes,
            [node in (collect(distinct node) + collect(distinct selectedNodes)) where "ReactionLikeEvent" in labels(node)] as reactions,
            collect(distinct edge) as edges
        
        RETURN [node in nodes | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
               [reaction in reactions | [reaction.dbId, reaction.displayName, reaction.name]] as reactions,
               [es in edges | [ e in es | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
        
        `);
    }
}

async function textSearchNodes(text, abortSignal) {
    let response = await queryNeo4J(`
    with "${text}" as search
    match(node:DatabaseObject)-->(:MedigraphRelevant)
    where 
        toLower(node.displayName) contains search
        or ANY(name IN node.name WHERE toLower(name) contains search)
        or node.dbId = toInteger(search)
        or node.stId contains search
        or node.dbId contains search
    return distinct node
    `, {}, null, abortSignal);

    // Convert neo4j response format into nodes, reactions, edges
    return response.data.map(dat => dat.row[0])
}

export {readNeo4jReactome, downloadPartialMedigraph, textSearchNodes}