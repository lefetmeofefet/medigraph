import {EntityInstance} from "../bioChemicalEntities/instances/EntityInstance.js";
import {one} from "./parserUtil.js";

function mergeNodesNoCompartments(medigraph) {
    let nodePairsToJoin = [];
    for (let node1 of medigraph.nodes.values()) {
        for (let node2 of medigraph.nodes.values()) {
            if (node1 !== node2) {
                if (node1.name === node2.name) {
                    nodePairsToJoin.push([node1, node2])
                }
            }
        }
    }

    for (let [node1, node2] of nodePairsToJoin) {
        let newNode = medigraph.createNode(node1.bioEntity, "2 reactome nodes", [node1, node2]);

        let incomingNodes = new Set()
        for (let incomingEdge of [...node1.incomingEdges, ...node2.incomingEdges]) {
            let incomingNode = medigraph.getSource(incomingEdge)
            if (!incomingNodes.has(incomingNode.name)) {
                incomingNodes.add(incomingNode.name)
                medigraph.createEdge(
                    incomingNode,
                    newNode,
                    incomingEdge.description,
                    incomingEdge.sourceObject
                )
            }
        }

        let outgoingNodes = new Set();
        for (let outgoingEdge of [...node1.outgoingEdges, ...node2.outgoingEdges]) {
            let outgoingNode = medigraph.getDestination(outgoingEdge);
            if (!outgoingNodes.has(outgoingNode.name)) {
                outgoingNodes.add(outgoingNode.name)
                medigraph.createEdge(
                    newNode,
                    outgoingNode,
                    outgoingEdge.description,
                    outgoingEdge.sourceObject
                )
            }
        }

        medigraph.removeNode(node1)
        medigraph.removeNode(node2)
    }
}


function mergeGraphsOfSamePathway(reactomeSbml, reactomeBiopax, pathbankPwml) {
    enrichSbmlTypes(reactomeSbml, reactomeBiopax);
    breakDownSbmlGroups(reactomeSbml, reactomeBiopax);
    addMissingComplexProteins(reactomeSbml, reactomeBiopax);
    addIdealNodes(reactomeSbml, reactomeBiopax);
    connectComplexesWithIdealComponents(reactomeSbml, reactomeBiopax);
    if (pathbankPwml != null) {
        enrichPwmlLocations(reactomeSbml, pathbankPwml);
    }
    return reactomeSbml
}

function enrichSbmlTypes(reactomeSbml, reactomeBiopax) {
    for (let sbmlNode of reactomeSbml.nodes.values()) {
        for (let biopaxNode of reactomeBiopax.nodes.values()) {
            // Only instances
            if (sbmlNode.name === biopaxNode.name) {
                biopaxNode._sbmlNode = sbmlNode
                if (biopaxNode.bioEntity instanceof EntityInstance) {
                    // TODO: change bioEntity type
                    sbmlNode.type = biopaxNode.type
                    biopaxNode.bioEntity.unificationRefs.forEach(ref => {
                        if (!sbmlNode.bioEntity.unificationRefs.find(sbmlRef => sbmlRef.db === ref.db && sbmlRef.id === ref.id)) {
                            sbmlNode.bioEntity.unificationRefs.push(ref)
                        }
                    });
                }
            }
        }
    }
}

function breakDownSbmlGroups(reactomeSbml, reactomeBiopax) {
    for (let biopaxGroupNode of reactomeBiopax.nodes.values()) {
        if (biopaxGroupNode.biopaxObject.type === "bp:PhysicalEntity") {
            biopaxGroupNode.type = "Group"

            // let complexesThatContainBiopaxGroup = biopaxGroupNode.outgoingEdges.map(edge => reactomeBiopax.nodes.get(edge.destination))
            let sbmlGroupNode = biopaxGroupNode._sbmlNode;
            try {
                // TODO: think here. yellow note about group possibly being a product as well.
                let sbmlReactionNode = reactomeSbml.getDestination(one(sbmlGroupNode.outgoingEdges));

                sbmlGroupNode.type = "Group"
                for (let memberNode of biopaxGroupNode.incomingEdges.map(edge => reactomeBiopax.nodes.get(edge.source))) {
                    let newMemberNode = reactomeSbml.createNode(memberNode.bioEntity, "biopax", memberNode.biopaxObject)
                    memberNode._sbmlNode = newMemberNode
                    reactomeSbml.createEdge(newMemberNode, sbmlReactionNode, "reactant")
                    reactomeSbml.createEdge(newMemberNode, sbmlGroupNode, "member")
                    // for (let containerComplex of complexesThatContainBiopaxGroup) {
                    //     if (containerComplex._sbmlNode == null) {
                    //         throw "No corresponding SBML complex node when trying to connect group members as components to complex!"
                    //     }
                    //     reactomeSbml.createEdge(newMemberNode, containerComplex._sbmlNode, "component")
                    // }
                }
            } catch (e) {

            }
        }
    }
}

/**
 * Sbml doesn't include the proteins that make up the complex. Biopax does. We enrich the graph by finding those
 * @param reactomeSbml
 * @param reactomeBiopax
 */
function addMissingComplexProteins(reactomeSbml, reactomeBiopax) {
    for (let biopaxNode of reactomeBiopax.nodes.values()) {
        let componentEdges = biopaxNode.outgoingEdges.filter(edge => edge.description === "component");
        if (biopaxNode.type === "EnzymeInstance" && componentEdges.length === 1) {
            let complexNode = reactomeBiopax.nodes.get(componentEdges[0].destination);
            for (let sbmlNode of reactomeSbml.nodes.values()) {
                if (sbmlNode.name === complexNode.name) {
                    let newEnzymeNode = reactomeSbml.createNode(biopaxNode.bioEntity, "biopax", biopaxNode.biopaxObject);
                    reactomeSbml.createEdge(newEnzymeNode, sbmlNode, "component")
                }
            }
        }
    }
}

function addIdealNodes(reactomeSbml, reactomeBiopax) {
    for (let biopaxNode of reactomeBiopax.nodes.values()) {
        let isEdges = biopaxNode.incomingEdges.filter(edge => edge.description === "is");
        if (!(biopaxNode instanceof EntityInstance) && isEdges.length === 1) {
            let instanceNode = reactomeBiopax.nodes.get(isEdges[0].source);
            for (let sbmlNode of [...reactomeSbml.nodes.values()]) {
                if (sbmlNode.name === instanceNode.name) {
                    let newIdealNode = reactomeSbml.createNode(biopaxNode.bioEntity, "biopax", biopaxNode.biopaxObject);
                    reactomeSbml.createEdge(sbmlNode, newIdealNode, "is")
                }
            }
        }
    }
}

function connectComplexesWithIdealComponents(reactomeSbml, reactomeBiopax) {
    for (let biopaxGroupNode of reactomeBiopax.nodes.values()) {
        if (biopaxGroupNode.type === "Group") {
            let complexesThatContainBiopaxGroup = biopaxGroupNode.outgoingEdges.filter(e => e.description === "component").map(edge => reactomeBiopax.nodes.get(edge.destination))

            for (let memberNode of biopaxGroupNode.incomingEdges.map(edge => reactomeBiopax.nodes.get(edge.source))) {
                let sbmlMemberNode = memberNode._sbmlNode;

                for (let containerComplex of complexesThatContainBiopaxGroup) {
                    if (containerComplex._sbmlNode == null) {
                        throw "No corresponding SBML complex node when trying to connect group members as components to complex!"
                    }
                    let sbmlMemberIdeal = reactomeSbml.getDestination(one(sbmlMemberNode.outgoingEdges.filter(e => e.description === "is")))
                    reactomeSbml.createEdge(sbmlMemberIdeal, containerComplex._sbmlNode, "component")
                }
            }
        }
    }
}

function enrichPwmlLocations(reactomeSbml, pathbankPwml) {
    function perUnificationId(medigraph, cb) {
        for (let node of medigraph.nodes.values()) {
            let bioEntity = node.bioEntity
            for (let unificationRef of bioEntity.unificationRefs) {
                let unificationId = unificationRef.db + ";" + unificationRef.id;
                cb(node, unificationId)
            }
        }
    }

    let unificationIdToNodes = new Map()

    perUnificationId(pathbankPwml, (node, unificationId) => {
        if (unificationIdToNodes.has(unificationId)) {
            let nodes = unificationIdToNodes.get(unificationId)
            nodes.push(node)
        } else {
            unificationIdToNodes.set(unificationId, [node])
        }
    });

    perUnificationId(reactomeSbml, (sbmlNode, unificationId) => {
        if (unificationIdToNodes.has(unificationId)) {
            let pwmlNodes = unificationIdToNodes.get(unificationId)
            let organs = pwmlNodes.filter(node => node.bioEntity.location != null && node.bioEntity.location.organ != null)
                .map(node => node.bioEntity.location.organ);
            sbmlNode.bioEntity.location.organ = one(organs)
        }
    });
}


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

export {mergeGraphsOfSamePathway, mergeNodesNoCompartments}