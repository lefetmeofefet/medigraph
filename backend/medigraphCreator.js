import {one, queryNeo4J} from "../parsers/parserUtil.js";
import {Medigraph} from "../bioChemicalEntities/Medigraph.js";
import {SmallMolecule} from "../bioChemicalEntities/SmallMolecule.js";
import {Enzyme} from "../bioChemicalEntities/Enzyme.js";
import {Compartment} from "../bioChemicalEntities/Compartment.js";
import {SmallMoleculeInstance} from "../bioChemicalEntities/instances/SmallMoleculeInstance.js";
import {ComplexInstance} from "../bioChemicalEntities/instances/ComplexInstance.js";
import {BiochemicalEntity} from "../bioChemicalEntities/BiochemicalEntity.js";
import {EnzymeInstance} from "../bioChemicalEntities/instances/EnzymeInstance.js";
import {Drug} from "../bioChemicalEntities/instances/Drug.js";
import {Group} from "../bioChemicalEntities/instances/Group.js";
import {BiochemicalReaction} from "../bioChemicalEntities/BiochemicalReaction.js";
import {BioLocation} from "../bioChemicalEntities/instances/BioLocation.js";
import fetch from "node-fetch"

function removeSquareBrackets(str) {
    let indexOfBracket = str.indexOf(" [")
    if (indexOfBracket === -1) {
        return str
    }
    return str.substring(0, indexOfBracket)
}

async function createMedigraph() {
   let neo4jGraph = await queryNeo4J(`
    
MATCH (reaction:ReactionLikeEvent)
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
    reaction.speciesName = 'Homo sapiens' and
    node.speciesName = 'Homo sapiens'
    
    with collect(distinct node) as nodes, 
    collect(distinct reaction) as reactions, 
    collect(distinct edge) as edges
    
    return [node in nodes | [node.dbId, node.displayName, node.name, node.schemaClass]] as nodes,
    [reaction in reactions | [reaction.dbId, reaction.displayName, reaction.name]] as reactions,
    [es in edges | [ e in es | [ID(e), e, type(e), startNode(e).dbId, endNode(e).dbId]]] as edges
`, {}, fetch)
    console.log("Stringifying...")
    console.log("Length: " + JSON.stringify(neo4jGraph).length)


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
                } else if (schemaClass === "ReferenceTherapeutic") {
                    bioEntity = new SmallMolecule({
                        name: removeSquareBrackets(displayName),
                        otherNames: name
                    })
                    createNode(bioEntity)
                } else if (schemaClass === "ReferenceGeneProduct") {
                    bioEntity = new Enzyme({
                        name: removeSquareBrackets(displayName),
                        otherNames: name
                    })
                    createNode(bioEntity)
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
        } else if (relationshipType === "compartment") {
            medigraph.createEdge(src, dst, "in")
        } else if (relationshipType === "input") {
            medigraph.createEdge(dst, src, "reactant", null, relationshipProperties)
        } else if (relationshipType === "output") {
            medigraph.createEdge(src, dst, "product", null, relationshipProperties)
        } else if (relationshipType === "catalystActivity") {
            medigraph.createEdge(dst, src, "catalyst", null, relationshipProperties)
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
            if (instances.every(node => node.name === instances[0].name)) {
                refNode.bioEntity.otherNames.push(refNode.name)
                refNode.bioEntity.name = instances[0].name
                refNode.name = instances[0].name
            }
        }
    }

    return medigraph
}

export {createMedigraph}