import "./userInterface/libs/uuid4.js"
import "./userInterface/libs/xml2js.min.js"
import {SmallMolecule} from "./bioChemicalEntities/SmallMolecule.js";
import {Enzyme} from "./bioChemicalEntities/Enzyme.js";
import {Complex} from "./bioChemicalEntities/Complex.js";
import {ComplexInstance} from "./bioChemicalEntities/instances/ComplexInstance.js";
import {BiochemicalReaction} from "./bioChemicalEntities/BiochemicalReaction.js";
import {BiochemicalEntity} from "./bioChemicalEntities/BiochemicalEntity.js";
import {Dna} from "./bioChemicalEntities/Dna.js";
import {PublicationReference} from "./bioChemicalEntities/references/PublicationReference.js";
import {UnificationReference} from "./bioChemicalEntities/references/UnificationReference.js";
import {RelationshipReference} from "./bioChemicalEntities/references/RelationshipReference.js";
import {SmallMoleculeInstance} from "./bioChemicalEntities/instances/SmallMoleculeInstance.js";
import {EnzymeInstance} from "./bioChemicalEntities/instances/EnzymeInstance.js";
import {BioLocation} from "./bioChemicalEntities/instances/BioLocation.js";
import {Medigraph} from "./bioChemicalEntities/Medigraph.js";

export function parseBiopax(biopaxXmls, finished) {
    function parseXmlsRecursive(biopaxXmls, parsedXmls = []) {
        if (biopaxXmls.length === 0) {
            finished(createMedigraph(parsedXmls));
            return;
        }
        xml2js.parseString(biopaxXmls[0], (err, biopaxXmlObject) => {
            biopaxXmls.shift();
            parseXmlsRecursive(biopaxXmls, [biopaxXmlObject["rdf:RDF"], ...parsedXmls])
        });
    }

    parseXmlsRecursive(biopaxXmls)
}

function createMedigraph(biopaxXmlObjects) {
    // console.log("Unparsed BioPAX: ", biopaxXmlObject)

    let biopaxes = biopaxXmlObjects.map(biopaxXmlObject => jsonifyBiopax(biopaxXmlObject));
    console.log("Jsonified BioPAXes: ", biopaxes);

    // Create a Medigraph per biopax
    let medigraphs = biopaxes.map(biopax => createMedigraphFromBiopax(biopax));

    // Join medigraphs
    let medigraph = {
        edges: [],
        nodes: new Map()
    }
    for (let m of medigraphs) {
        for (let edge of m.edges) {
            medigraph.edges.push(edge)
        }
        for (let node of m.nodes.values()) {
            delete node.bioEntity._nodeRef
            medigraph.nodes.set(node.id, node)
        }
    }

    return medigraph
}

export {createMedigraph}

/**
 * Creates a parsimonious JSON representation of the BioPAX from the given BioPAX XML object.
 *  - Turns xml refs into actual object references
 *  - Simplifies plain XML values (<tag>value</tag> - previously represented as an object containing "_" key)
 *  - Turns lists with a single value to just plain value
 *  - Extracts rdf:ID from objects and adds it as a property named "id". simple!
 *  To make sure that I'm not missing any property
 * @param biopaxXmlObject BioPAX XML Object
 * @returns {Object} Parsimonious JSON representation of the BioPAX
 */
function jsonifyBiopax(biopaxXmlObject) {

    /**
     * Lists all paths / subpaths in the graph, and indicates whether they're a single item list or not.
     * A single item list is a list which always has only one value, and it shouldn't even be stored as a list.
     * If a path exists and is not found here, an exception is thrown, indicating that I missed a path. Which is good,
     * because then I won't be making mistakes without knowing it.
     * @type {Object}
     */
    const IS_PATH_SINGLE_LIST = {
        " -> bp:displayName": true,
        " -> bp:dataSource": true,
        " -> bp:term": true,
        " -> bp:name": false,
        " -> bp:xref": false,
        " -> bp:comment": false,

        "root -> owl:Ontology": true,
        "root -> owl:Ontology -> owl:imports": false,
        "root -> owl:Ontology -> rdfs:comment": true,

        "root -> bp:Pathway": false,
        "root -> bp:Pathway -> bp:pathwayComponent": false,
        "root -> bp:Pathway -> bp:pathwayOrder": false,
        "root -> bp:Pathway -> bp:organism": true,

        "root -> bp:PathwayStep": false,
        "root -> bp:PathwayStep -> bp:stepProcess": false,
        "root -> bp:PathwayStep -> bp:nextStep": false,

        "root -> bp:BiochemicalPathwayStep": false,
        "root -> bp:BiochemicalPathwayStep -> bp:stepProcess": false,
        "root -> bp:BiochemicalPathwayStep -> bp:stepConversion": true,

        "root -> bp:BiochemicalReaction": false,
        "root -> bp:BiochemicalReaction -> bp:conversionDirection": true,
        "root -> bp:BiochemicalReaction -> bp:left": false,
        "root -> bp:BiochemicalReaction -> bp:right": false,
        "root -> bp:BiochemicalReaction -> bp:eCNumber": false,
        "root -> bp:BiochemicalReaction -> bp:participantStoichiometry": false,
        "root -> bp:BiochemicalReaction -> bp:spontaneous": true,

        "root -> bp:TemplateReaction": false,
        "root -> bp:TemplateReaction -> bp:product": true,

        "root -> bp:TemplateReactionRegulation": false,
        "root -> bp:TemplateReactionRegulation -> bp:controlType": true,
        "root -> bp:TemplateReactionRegulation -> bp:controller": true,
        "root -> bp:TemplateReactionRegulation -> bp:controlled": true,

        "root -> bp:SmallMolecule": false,
        "root -> bp:SmallMolecule -> bp:cellularLocation": true,
        "root -> bp:SmallMolecule -> bp:memberPhysicalEntity": false,
        "root -> bp:SmallMolecule -> bp:entityReference": true,

        "root -> bp:SmallMoleculeReference": false,
        "root -> bp:SmallMoleculeReference -> bp:chemicalFormula": true,
        "root -> bp:SmallMoleculeReference -> bp:molecularWeight": true,
        "root -> bp:SmallMoleculeReference -> bp:structure": true,

        "root -> bp:MolecularInteraction": false,
        "root -> bp:MolecularInteraction -> bp:interactionType": true,
        "root -> bp:MolecularInteraction -> bp:participant": false,

        "root -> bp:CellularLocationVocabulary": false,

        "root -> bp:UnificationXref": false,
        "root -> bp:UnificationXref -> bp:db": true,
        "root -> bp:UnificationXref -> bp:id": true,
        "root -> bp:UnificationXref -> bp:idVersion": true,

        "root -> bp:RelationshipXref": false,
        "root -> bp:RelationshipXref -> bp:db": true,
        "root -> bp:RelationshipXref -> bp:id": true,
        "root -> bp:RelationshipXref -> bp:relationshipType": true,

        "root -> bp:RelationshipTypeVocabulary": false,

        "root -> bp:Catalysis": false,
        "root -> bp:Catalysis -> bp:controller": true,
        "root -> bp:Catalysis -> bp:controlled": true,
        "root -> bp:Catalysis -> bp:controlType": true,

        "root -> bp:Interaction": false,
        "root -> bp:Interaction -> bp:participant": false,

        "root -> bp:InteractionVocabulary": false,

        "root -> bp:Protein": false,
        "root -> bp:Protein -> bp:feature": false,
        "root -> bp:Protein -> bp:memberPhysicalEntity": false,
        "root -> bp:Protein -> bp:cellularLocation": true,
        "root -> bp:Protein -> bp:entityReference": true,

        "root -> bp:ProteinReference": false,
        "root -> bp:ProteinReference -> bp:organism": true,

        "root -> bp:BioSource": false,
        "root -> bp:BioSource -> bp:tissue": true,

        "root -> bp:TissueVocabulary": false,

        "root -> bp:FragmentFeature": false,
        "root -> bp:FragmentFeature -> bp:featureLocation": true,

        "root -> bp:SequenceInterval": false,
        "root -> bp:SequenceInterval -> bp:sequenceIntervalBegin": true,
        "root -> bp:SequenceInterval -> bp:sequenceIntervalEnd": true,

        "root -> bp:SequenceSite": false,
        "root -> bp:SequenceSite -> bp:sequencePosition": true,
        "root -> bp:SequenceSite -> bp:positionStatus": true,

        "root -> bp:SequenceModificationVocabulary": false,

        "root -> bp:PublicationXref": false,
        "root -> bp:PublicationXref -> bp:db": true,
        "root -> bp:PublicationXref -> bp:id": true,
        "root -> bp:PublicationXref -> bp:year": true,
        "root -> bp:PublicationXref -> bp:title": true,
        "root -> bp:PublicationXref -> bp:source": true,
        "root -> bp:PublicationXref -> bp:author": false,
        "root -> bp:PublicationXref -> bp:url": true,

        "root -> bp:Complex": false,
        "root -> bp:Complex -> bp:componentStoichiometry": false,
        "root -> bp:Complex -> bp:component": false,
        "root -> bp:Complex -> bp:memberPhysicalEntity": false,
        "root -> bp:Complex -> bp:cellularLocation": true,

        "root -> bp:Stoichiometry": false,
        "root -> bp:Stoichiometry -> bp:stoichiometricCoefficient": true,
        "root -> bp:Stoichiometry -> bp:physicalEntity": true,

        "root -> bp:PhysicalEntity": false,
        "root -> bp:PhysicalEntity -> bp:memberPhysicalEntity": false,
        "root -> bp:PhysicalEntity -> bp:cellularLocation": true,

        "root -> bp:ChemicalStructure": false,
        "root -> bp:ChemicalStructure -> bp:structureFormat": true,
        "root -> bp:ChemicalStructure -> bp:structureData": true,

        "root -> bp:Transport": false,
        "root -> bp:Transport -> bp:participantStoichiometry": false,
        "root -> bp:Transport -> bp:conversionDirection": true,
        "root -> bp:Transport -> bp:right": true,
        "root -> bp:Transport -> bp:left": true,
        "root -> bp:Transport -> bp:spontaneous": true,

        "root -> bp:Dna": false,
        "root -> bp:Dna -> bp:memberPhysicalEntity": false,
        "root -> bp:Dna -> bp:cellularLocation": true,
        "root -> bp:Dna -> bp:entityReference": true,

        "root -> bp:Rna": false,
        "root -> bp:Rna -> bp:cellularLocation": true,
        "root -> bp:Rna -> bp:entityReference": true,
        "root -> bp:Rna -> bp:feature": true,

        "root -> bp:RnaReference": false,
        "root -> bp:RnaReference -> bp:organism": false,

        "root -> bp:DnaReference": false,
        "root -> bp:DnaReference -> bp:organism": true,

        "root -> bp:Control": false,
        "root -> bp:Control -> bp:controller": true,
        "root -> bp:Control -> bp:controlled": true,
        "root -> bp:Control -> bp:controlType": true,

        "root -> bp:Provenance": false,

        "root -> bp:ModificationFeature": false,
        "root -> bp:ModificationFeature -> bp:featureLocation": true,
        "root -> bp:ModificationFeature -> bp:modificationType": true,
    };

    /**
     * Used to store mapping between biopaxId to newly made biopax object, for unfolding references later.
     * @type {Map<String, Object>}
     */
    let idToBiopaxObject = new Map();

    function recursiveBiopaxToJson(biopax, path = "root") {
        if (biopax.hasOwnProperty("$") &&
            biopax["$"].hasOwnProperty("rdf:resource") &&
            biopax["$"]["rdf:resource"].startsWith("#")) {
            if (Object.keys(biopax).length > 1 || Object.keys(biopax["$"]).length > 1) {
                throw "Unexpected keys in reference object"
            }

            return {
                isReference: true,
                reference: biopax["$"]["rdf:resource"].substr(1)
            }
        } else if (biopax.hasOwnProperty("_")) {
            if (Object.keys(biopax).length > 2 || Object.keys(biopax["$"]).length > 1) {
                throw "Unexpected keys in primitive value object"
            }
            return biopax["_"]
        }

        let json = {};
        for (let key of Object.keys(biopax)) {
            let currentItem = biopax[key];
            if (currentItem instanceof Array) {
                let newPath = `${path} -> ${key}`;
                let matchingPath = Object.keys(IS_PATH_SINGLE_LIST).find(path => newPath.endsWith(path));
                if (matchingPath == null) {
                    console.error(`Path doesn't exist in mapping: ${newPath}`)
                    // throw `Path doesn't exist in mapping: ${newPath}`
                }
                let isSingleList = IS_PATH_SINGLE_LIST[matchingPath];
                if (isSingleList) {
                    if (currentItem.length > 1) {
                        throw `Unexpected number of elements in list, expected one! path: ${newPath}`
                    }
                    json[key] = recursiveBiopaxToJson(currentItem[0], newPath);
                } else {
                    json[key] = currentItem.map(item => recursiveBiopaxToJson(item, newPath));
                }
            } else {
                json[key] = currentItem;
            }
        }

        if (biopax.hasOwnProperty("$") && biopax["$"].hasOwnProperty("rdf:ID")) {
            let id = biopax["$"]["rdf:ID"];
            json.id = id;
            idToBiopaxObject.set(id, json)
        }

        return json;
    }

    let biopaxJson = recursiveBiopaxToJson(biopaxXmlObject);

    function recursiveUnfoldReference(json) {
        for (let key of Object.keys(json)) {
            let currentJson = json[key];
            if (key === "_referencers") {
                continue
            }
            if (currentJson instanceof Array) {
                currentJson.forEach((child, index) => {
                    if (child.isReference) {
                        let referencedObj = idToBiopaxObject.get(child.reference);
                        if (referencedObj._referencers == null) {
                            referencedObj._referencers = []
                        }
                        referencedObj._referencers.push(json);
                        currentJson[index] = referencedObj;
                    } else if (child instanceof Object) {
                        recursiveUnfoldReference(child)
                    }
                })
            } else if (currentJson.isReference) {
                let referencedObj = idToBiopaxObject.get(currentJson.reference);
                if (referencedObj._referencers == null) {
                    referencedObj._referencers = []
                }
                referencedObj._referencers.push(json);
                json[key] = referencedObj;
            } else if (currentJson instanceof Object) {
                recursiveUnfoldReference(currentJson)
            }
        }
    }

    recursiveUnfoldReference(biopaxJson)

    Object.keys(biopaxJson).forEach(entityType => {
        if (entityType !== "$" && entityType !== "owl:Ontology") {
            biopaxJson[entityType].forEach(entity => entity.type = entityType)
        }
    })
    return biopaxJson
}

let unificationIdToBioEntity = new Map();

function createMedigraphFromBiopax(biopax) {
    // Validate all pathways are human
    // TODO

    let nodes = new Map();
    let edges = [];

    function createNode(bioEntity, biopaxObject) {
        if (bioEntity._nodeRef != null) {
            nodes.set(biopaxObject.id, bioEntity._nodeRef);
            return bioEntity._nodeRef
        }
        let node = {
            id: Math.random(), //uuidv4(),
            name: bioEntity.name,
            bioEntity: bioEntity,
            biopaxObject: biopaxObject,
            incomingEdges: [],
            outgoingEdges: [],
            type: bioEntity.type,
            source: "biopax"
        }

        bioEntity.location = new BioLocation({
            cellularLocation: (biopaxObject["bp:cellularLocation"] || {})["bp:term"]
        });
        nodes.set(biopaxObject.id, node);
        bioEntity._nodeRef = node
        return node;
    }

    function createEdge(sourceNode, destinationNode, biopaxObject, description) {
        try {
            if (sourceNode === destinationNode) {
                console.error("Cant create node from and to the same entity")
                return
                throw "Cant create node from and to the same entity"
            }
            let edge = {
                source: sourceNode.id,
                destination: destinationNode.id,
                biopaxObject: biopaxObject,
                description
            }
            edges.push(edge);
            sourceNode.outgoingEdges.push(edge);
            destinationNode.incomingEdges.push(edge);
            return edge
        } catch(e) {
            console.error("SOME ERROR MAKING EDGE")
            showNotification("SOME ERROR MAKING EDGE", "error")
        }
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

    function biopaxToBioParams(biopax) {
        let xrefFromBiopax = (type, clazz) => biopax["bp:xref"] ?
            biopax["bp:xref"].filter(ref => ref.type === type).map(ref => clazz.FromBiopax(ref))
            : [];
        let name = biopax["bp:displayName"];
        if (name == null) {
            name = biopax["bp:name"].reduce((n1, n2) => n1.length < n2.length ? n1 : n2)
        }
        let relationshipRefs = xrefFromBiopax("bp:RelationshipXref", RelationshipReference);
        return {
            name: name,
            otherNames: biopax["bp:name"] || [],
            publicationRefs: xrefFromBiopax("bp:PublicationXref", PublicationReference),
            unificationRefs: [...xrefFromBiopax("bp:UnificationXref", UnificationReference), ...relationshipRefs],
            relationshipRefs: relationshipRefs,
        }
    }

    // SmallMolecules
    for (let biopaxSmallMolecule of biopax["bp:SmallMoleculeReference"] || []) {
        let smallMolecule = new SmallMolecule(biopaxToBioParams(biopaxSmallMolecule))
        smallMolecule = mergeBioEntityIfExists(smallMolecule);
        createNode(smallMolecule, biopaxSmallMolecule);
    }

    // SmallMoleculeInstances
    for (let biopaxSmallMolecule of biopax["bp:SmallMolecule"] || []) {
        let smallMoleculeInstance = new SmallMoleculeInstance(biopaxToBioParams(biopaxSmallMolecule))
        smallMoleculeInstance = mergeBioEntityIfExists(smallMoleculeInstance);
        let smallMoleculeInstanceNode = createNode(smallMoleculeInstance, biopaxSmallMolecule);

        if (biopaxSmallMolecule.hasOwnProperty("bp:entityReference")) {
            createEdge(smallMoleculeInstanceNode, nodes.get(biopaxSmallMolecule["bp:entityReference"].id), null, "is")
        }
    }

    // Proteins
    for (let biopaxProtein of biopax["bp:ProteinReference"] || []) {
        let protein = new Enzyme(biopaxToBioParams(biopaxProtein))
        protein = mergeBioEntityIfExists(protein);
        createNode(protein, biopaxProtein);
    }

    // Protein Instances
    for (let biopaxProtein of biopax["bp:Protein"] || []) {
        let proteinInstance = new EnzymeInstance(biopaxToBioParams(biopaxProtein))
        proteinInstance = mergeBioEntityIfExists(proteinInstance);
        let proteinInstanceNode = createNode(proteinInstance, biopaxProtein);

        if (biopaxProtein.hasOwnProperty("bp:entityReference")) {
            createEdge(proteinInstanceNode, nodes.get(biopaxProtein["bp:entityReference"].id), null, "is")
        }
    }

    // Dna
    for (let biopaxDna of biopax["bp:Dna"] || []) {
        let dna = new Dna(biopaxToBioParams(biopaxDna))
        dna = mergeBioEntityIfExists(dna);
        createNode(dna, biopaxDna);
    }

    // PhysicalEntities
    for (let biopaxPhysicalEntity of biopax["bp:PhysicalEntity"] || []) {
        // TODO: Create PhysicalEntity??
        let physicalEntity = new BiochemicalEntity(biopaxToBioParams(biopaxPhysicalEntity))
        physicalEntity = mergeBioEntityIfExists(physicalEntity);
        createNode(physicalEntity, biopaxPhysicalEntity);
    }

    // Complexes
    for (let biopaxComplex of biopax["bp:Complex"] || []) {
        let complex = new ComplexInstance(biopaxToBioParams(biopaxComplex))
        complex = mergeBioEntityIfExists(complex);
        createNode(complex, biopaxComplex);
    }

    // Complex components (must be after complexes have been established, because a component can be a complex as well)
    for (let biopaxComplex of biopax["bp:Complex"] || []) {
        if (biopaxComplex.hasOwnProperty("bp:component")) {
            let complexNode = nodes.get(biopaxComplex.id);
            biopaxComplex["bp:component"].forEach(
                component => createEdge(nodes.get(component.id), complexNode, null, "component")
            );
        }
    }

    // Physical members of entities
    for (let biopaxEntity of [
        ...biopax["bp:Complex"] || [],
        ...biopax["bp:PhysicalEntity"] || [],
        ...biopax["bp:Protein"] || [],
        ...biopax["bp:SmallMolecule"] || [],
        ...biopax["bp:Dna"] || [],
    ]) {
        if (biopaxEntity.hasOwnProperty("bp:memberPhysicalEntity")) {
            let node = nodes.get(biopaxEntity.id);
            biopaxEntity["bp:memberPhysicalEntity"].forEach(
                member => createEdge(nodes.get(member.id), node, null, "member")
            )
        }
    }

    let getIncomingOutgoingDirections = direction => {
        if (direction === "LEFT-TO-RIGHT" || direction === "LEFT_TO_RIGHT") {
            return ["bp:left", "bp:right"]
        } else if (direction === "RIGHT-TO-LEFT" || direction === "RIGHT_TO_LEFT" || direction === "REVERSIBLE") {
            // TODO: FIX THE REVERSIBLE FASTTTT
            return ["bp:right", "bp:left"]
        } else {
            debugger
            throw `DIRECTION IS UNEXPEXTERED: ${direction}`
        }
    }

    // BiochemicalReactions
    for (let biopaxBiochemicalReaction of biopax["bp:BiochemicalReaction"] || []) {
        let biochemicalReaction = new BiochemicalReaction(biopaxToBioParams(biopaxBiochemicalReaction))
        biochemicalReaction = mergeBioEntityIfExists(biochemicalReaction);
        let biochemicalReactionNode = createNode(biochemicalReaction, biopaxBiochemicalReaction);

        let direction = biopaxBiochemicalReaction["bp:conversionDirection"];
        let [incomingDirection, outgoingDirection] = getIncomingOutgoingDirections(direction)

        biopaxBiochemicalReaction[incomingDirection].forEach(
            sourceEntity => createEdge(nodes.get(sourceEntity.id), biochemicalReactionNode, null, "reactant")
        );
        biopaxBiochemicalReaction[outgoingDirection].forEach(
            destEntity => createEdge(biochemicalReactionNode, nodes.get(destEntity.id), null, "product")
        );
    }

    // Transports
    for (let biopaxTransport of biopax["bp:Transport"] || []) {
        let direction = biopaxTransport["bp:conversionDirection"];
        let [incomingDirection, outgoingDirection] = getIncomingOutgoingDirections(direction);
        createEdge(
            nodes.get(biopaxTransport[incomingDirection].id),
            nodes.get(biopaxTransport[outgoingDirection].id),
            null,
            "transport"
        )
    }

    // Catalysis / Control
    for (let biopaxControl of [...biopax["bp:Catalysis"] || [], ...biopax["bp:Control"] || []]) {
        let controller = biopaxControl["bp:controller"];
        let controlled = biopaxControl["bp:controlled"];
        let controlType = biopaxControl["bp:controlType"]
        createEdge(nodes.get(controller.id), nodes.get(controlled.id), biopaxControl, controlType)
    }

    // MolecularInteraction
    // TODO: WHAT IS THIS?!?!?! it appears instead of all other interactions only on EGF pathway
    for (let biopaxInteraction of biopax["bp:MolecularInteraction"] || []) {
        let participants = biopaxInteraction["bp:participant"];
        if (participants.length !== 2) {
            showNotification("MolecularInteraction participants length is unexpected", "error")
            throw "MolecularInteraction participants length is unexpected"
        }
        let [participant1, participant2] = participants;
        createEdge(nodes.get(participant1.id), nodes.get(participant2.id), biopaxInteraction, "interaction")
    }

    let idToNode = new Map();
    for (let node of nodes.values()) {
        idToNode.set(node.id, node);
    }
    return new Medigraph(idToNode, edges)
}

import BiopaxPathways from "./biopaxPathways.js"



if (typeof window === 'undefined') {
    // parseBiopax([BiopaxPathways.ReactomeVitaminK]);
    // parseBiopax([BiopaxPathways.PathbankVitaminK]);
    // parseBiopax([BiopaxPathways.PathbankWarfarin]);
    // parseBiopax([BiopaxPathways.ReactomeHemostasis]);
}
