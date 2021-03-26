import "./userInterface/libs/xml2js.min.js";
import "./userInterface/libs/uuid4.js"
import PwmlPathways from "./pwmlPathways.js";
import {SmallMolecule} from "./bioChemicalEntities/SmallMolecule.js";
import {PublicationReference} from "./bioChemicalEntities/references/PublicationReference.js";
import {UnificationReference} from "./bioChemicalEntities/references/UnificationReference.js";
import {RelationshipReference} from "./bioChemicalEntities/references/RelationshipReference.js";
import {DBS} from "./bioChemicalEntities/references/Reference.js";
import {Protein} from "./bioChemicalEntities/Protein.js";
import {Complex} from "./bioChemicalEntities/Complex.js";
import {BiochemicalEntity} from "./bioChemicalEntities/BiochemicalEntity.js";
import {SmallMoleculeInstance} from "./bioChemicalEntities/instances/SmallMoleculeInstance.js";
import {Enzyme} from "./bioChemicalEntities/Enzyme.js";
import {EnzymeInstance} from "./bioChemicalEntities/instances/EnzymeInstance.js";
import {EntityInstance} from "./bioChemicalEntities/instances/EntityInstance.js";
import {ComplexInstance} from "./bioChemicalEntities/instances/ComplexInstance.js";
import {BiochemicalReaction} from "./bioChemicalEntities/BiochemicalReaction.js";
import {Medigraph} from "./bioChemicalEntities/Medigraph.js";
import {doSomethingRecursive} from "./parsers/parserUtil.js";
import {BioLocation} from "./bioChemicalEntities/instances/BioLocation.js";
// import {MedigraphDb} from "./medigraphDb.js";

/* TODO
 * - use short-name
 * - stoichiometry! interactions, reactions, complexes, everything...
 */

const PATH_TO_TYPE = {
    "root -> height": {unimportant: true},
    "root -> width": {unimportant: true},
    "root -> background-color": {unimportant: true},
    "root -> id": {singleList: true},

    "root -> pathway": {singleList: true},
    "root -> pathway -> id": {singleList: true},
    "root -> pathway -> name": {singleList: true},
    "root -> pathway -> description": {singleList: true},
    "root -> pathway -> subject": {singleList: true},
    "root -> pathway -> species-id": {singleList: true},
    "root -> pathway -> sub-pathways": {singleList: true},
}

export function parsePwml(pwmlString, finished) {
    xml2js.parseString(pwmlString, (err, pwmlXmlObject) => {
        let pathways = pwmlXmlObject["super-pathway-visualization"]["pathway-visualization-contexts"][0]["pathway-visualization-context"].map(ctxt => ctxt["pathway-visualization"][0]);
        // console.log(pathways)
        let medigraphNodes = new Map();
        let medigraphEdges = [];

        for (let pathway of pathways) {
            console.log("PWML Pathway: ", pathway);
            // PWML files are stupid: their IDs are not unique per the file, they're only unique per the type of element.
            // So each ID maps to multiple entities, one from each type. That's why we use idToTypeToEntity instead of idToEntity.
            let idToTypeToEntity = new Map();

            // Map id8 to object
            doSomethingRecursive(pathway, (entity, path) => {
                if (entity.hasOwnProperty("id") && path.length >= 2) {
                    if (entity.id.length !== 1) {
                        throw "Entity id is in unexpected length (???)"
                    }
                    let idNumber = entity.id[0]._;
                    if (idNumber == null) {
                        throw "ID is null, why? :("
                    }

                    let idMapping = idToTypeToEntity.get(idNumber);
                    if (idMapping == null) {
                        idMapping = {};
                        idToTypeToEntity.set(idNumber, idMapping)
                    }

                    let entityType = path[path.length - 2];

                    if (idMapping.hasOwnProperty(entityType)) {
                        throw "ID already exists... how..."
                    }
                    idMapping[entityType] = entity
                    entity._type = entityType
                    entity._path = path
                } else {
                    let b = 3
                }
            })

            // Enrich references from idToObject dict
            doSomethingRecursive(pathway, (entity, path) => {
                for (let key of Object.keys(entity)) {
                    if (key === "_referencers" || key === "_reffedObj") {
                        continue
                    }
                    if (key.endsWith("-id")) {
                        if (entity[key].length !== 1) {
                            throw "Reference to more than one ID (???)"
                        }
                        let idNumber = entity[key][0]._;
                        if (idNumber == null) {
                            continue
                        }

                        let refType = key.substring(0, key.length - 3);
                        if (refType === "left-biological-state" || refType === "right-biological-state") {
                            refType = "biological-state"
                        }
                        if ([
                            "visualization-template",
                            "drawable-image",
                            "pathway-visualization",
                            "reference-pathway"
                        ].includes(refType)) {
                            continue
                        }

                        //
                        let idMapping = idToTypeToEntity.get(idNumber);
                        if (idMapping == null) {
                            throw "Reference to non existing ID"
                        }

                        // References are stupid in PWML files: the key contains the type of the reference, and value contains the ID
                        let referencedEntity = idMapping[refType];
                        if (referencedEntity == null && refType === "element") {
                            referencedEntity = idMapping.compound
                        }
                        if (referencedEntity == null) {
                            if (Object.keys(idMapping).length === 1) {
                                referencedEntity = Object.values(idMapping)[0];
                            } else if (([
                                    "sub-pathway-input", "sub-pathway-output", "reaction-left-element", "reaction-right-element"
                                ].includes(entity._type))
                                && idMapping.hasOwnProperty("protein-complex")) {
                                // TODO: VERIFY THATR ITS PROTEIN-COMPLEX with the property element-type. it has it!
                                referencedEntity = idMapping["protein-complex"];
                            } else {
                                continue
                                throw "Reference to non existing ID"
                            }
                        }
                        entity[key][0]["_reffedObj"] = referencedEntity

                        if (!referencedEntity.hasOwnProperty("_referencers")) {
                            referencedEntity["_referencers"] = []
                        }
                        referencedEntity["_referencers"].push(entity)
                    }
                }
            })

            let oneItem = list => {
                if (list.length !== 1) {
                    throw "Unexpected length of list!"
                }
                return list [0]
            }

            let locationToEntity = new Map();
            let nodes = new Map();
            let edges = [];

            function findInstance() {

            }

            function locationToTissue(pwmlLocation) {
                let bioState
                if (pwmlLocation._type === "biological-state") {
                    bioState = pwmlLocation
                } else {
                    let bioStateRef = pwmlLocation["biological-state-id"][0];
                    if (!bioStateRef.hasOwnProperty("_reffedObj")) {
                        return
                        throw "Location has no biological state id"
                    }
                    bioState = bioStateRef._reffedObj;
                }

                let tissue = bioState["tissue-id"][0].hasOwnProperty("_reffedObj") && bioState["tissue-id"][0]._reffedObj.name[0];
                return tissue
            }

            function parseLocation(pwmlLocation) {
                let bioState
                if (pwmlLocation._type === "biological-state") {
                    bioState = pwmlLocation
                } else {
                    let bioStateRef = pwmlLocation["biological-state-id"][0];
                    if (!bioStateRef.hasOwnProperty("_reffedObj")) {
                        return
                        throw "Location has no biological state id"
                    }
                    bioState = bioStateRef._reffedObj;
                }

                let tissue = bioState["tissue-id"][0].hasOwnProperty("_reffedObj") && bioState["tissue-id"][0]._reffedObj.name[0];
                let subcellularLocation = bioState["subcellular-location-id"][0].hasOwnProperty("_reffedObj") && bioState["subcellular-location-id"][0]._reffedObj.name[0];
                let species = bioState["species-id"][0].hasOwnProperty("_reffedObj") && bioState["species-id"][0]._reffedObj.name[0];
                let cell = bioState["cell-type-id"][0].hasOwnProperty("_reffedObj") && bioState["cell-type-id"][0]._reffedObj.name[0];

                let string = `${species || "unknown"}->${tissue || "unknown"}->${cell || "unknown"}->${subcellularLocation || "unknown"}`
                bioState.string = string

                return new BioLocation({
                    cellularLocation: subcellularLocation,
                    cell: cell,
                    organ: tissue,
                    organism: species
                })
                // return string
            }

            function mergeBioEntityIfExists(bioEntity) {
                return bioEntity
            }

            function createNode(bioEntity, pwmlObject) {
                let node = {
                    id: Math.random(), //uuidv4()
                    name: bioEntity.name,
                    bioEntity: bioEntity,
                    pwmlObject: pwmlObject,
                    incomingEdges: [],
                    outgoingEdges: [],
                    type: bioEntity.type,
                    source: "pwml"
                }
                nodes.set(node.id, node);
                pwmlObject._nodeRef = node
                return node;
            }

            function createEdge(sourceNode, destinationNode, pwmlObject, description) {
                if (sourceNode === destinationNode) {
                    // throw "Cant create node from and to the same entity"
                    console.error("Cant create node from and to the same entity")
                    showNotification("Cant create node from and to the same entity", "error")
                    return
                }
                let edge = {
                    source: sourceNode.id,
                    destination: destinationNode.id,
                    pwmlObject: pwmlObject,
                    description
                }
                edges.push(edge);
                sourceNode.outgoingEdges.push(edge);
                destinationNode.incomingEdges.push(edge);
                return edge
            }

            function getUnificationRefsFromPwml(pwml) {
                let unificationRefs = [];
                let possibleRefs = [
                    {key: "hmdb-id", db: DBS.HMDB},
                    {key: "hmdbp-id", db: DBS.HMDB},
                    {key: "kegg-id", db: DBS.Kegg},
                    {key: "pubchem-cid", db: DBS.Pubchem},
                    {key: "chebi-id", db: DBS.ChEBI},
                    {key: "biocyc-id", db: DBS.BioCYC},
                    {key: "chemspider-cid", db: DBS.ChemSpider},
                    {key: "drugbank-id", db: DBS.Drugbank},
                    {key: "foodb-id", db: DBS.Foodb},
                    {key: "uniprot-id", db: DBS.UniProt},
                    {key: "genbank-id", db: DBS.GeneBank},
                ]
                for (let ref of Object.values(possibleRefs)) {
                    if (pwml.hasOwnProperty(ref.key)) {
                        unificationRefs.push(new UnificationReference(ref.db, oneItem(pwml[ref.key]),))
                    }
                }
                if (pwml.hasOwnProperty("external-id-type")) {
                    let type = oneItem(pwml["external-id-type"]);
                    let id = oneItem(pwml["external-id"])
                    if (type === "KEGG Compound") {
                        unificationRefs.push(new UnificationReference(DBS.Kegg, id))
                    } else {
                        console.error("pwml external-id is of unexpected type: " + type)
                        showNotification("pwml external-id is of unexpected type: " + type, "error")
                    }
                }
                return unificationRefs
            }

            // Create Compounds
            for (let pwmlCompound of oneItem(pathway["compounds"])["compound"]) {
                let props = {
                    name: oneItem(pwmlCompound.name),
                    otherNames: oneItem(pwmlCompound.name),
                    unificationRefs: getUnificationRefsFromPwml(pwmlCompound)
                };
                let smallMolecule = new SmallMolecule(props)
                smallMolecule = mergeBioEntityIfExists(smallMolecule);
                let abstractNode = createNode(smallMolecule, pwmlCompound);

                pwmlCompound._bioReference = smallMolecule;
                pwmlCompound._instanceNodes = {};
                pwmlCompound._referencers.filter(r => r._type === "compound-location").forEach(referencer => {
                    let location = parseLocation(referencer);

                    if (location == null) {
                        return
                    }
                    if (!pwmlCompound._instanceNodes.hasOwnProperty(location.cellularLocation)) {
                        let smallMoleculeInstance = new SmallMoleculeInstance(props, location)

                        let instanceNode = createNode(smallMoleculeInstance, pwmlCompound)
                        createEdge(instanceNode, abstractNode, null, "is");
                        pwmlCompound._instanceNodes[location.cellularLocation] = instanceNode;
                    }
                });
            }

            // Create Proteins
            for (let pwmlProtein of oneItem(pathway["proteins"])["protein"]) {
                let props = {
                    name: oneItem(pwmlProtein.name),
                    otherNames: oneItem(pwmlProtein.name),
                    unificationRefs: getUnificationRefsFromPwml(pwmlProtein)
                }
                let protein = new Enzyme(props);
                protein = mergeBioEntityIfExists(protein);
                let abstractNode = createNode(protein, pwmlProtein);

                pwmlProtein._bioReference = protein;
                pwmlProtein._instanceNodes = {};
                pwmlProtein._referencers.filter(r => r._type === "protein-location").forEach(referencer => {
                    let location = parseLocation(referencer);
                    if (location == null) {
                        return
                    }

                    if (!pwmlProtein._instanceNodes.hasOwnProperty(location.cellularLocation)) {
                        let smallMoleculeInstance = new EnzymeInstance(props, location)

                        let instanceNode = createNode(smallMoleculeInstance, pwmlProtein)
                        createEdge(instanceNode, abstractNode, null, "is");
                        pwmlProtein._instanceNodes[location.cellularLocation] = instanceNode;
                    }
                });
            }

            // Create ElementCollections (ProteinComplex..?)
            let elementCollections = oneItem(pathway["element-collections"]);
            if (elementCollections instanceof Object) {
                for (let pwmlCollection of elementCollections["element-collection"]) {
                    // TODO: components of the collection......
                    let props = {
                        name: oneItem(pwmlCollection.name),
                        otherNames: oneItem(pwmlCollection.name),
                        unificationRefs: getUnificationRefsFromPwml(pwmlCollection)
                    }
                    let collection = new BiochemicalEntity(props);
                    collection = mergeBioEntityIfExists(collection);
                    let abstractNode = createNode(collection, pwmlCollection);

                    pwmlCollection._bioReference = collection;
                    pwmlCollection._instanceNodes = {};
                    pwmlCollection._referencers.filter(r => r._type === "element-collection-location").forEach(referencer => {
                        let location = parseLocation(referencer);
                        if (location == null) {
                            return
                        }

                        if (!pwmlCollection._instanceNodes.hasOwnProperty(location.cellularLocation)) {
                            let smallMoleculeInstance = new EntityInstance(props, location)

                            let instanceNode = createNode(smallMoleculeInstance, pwmlCollection)
                            createEdge(instanceNode, abstractNode, null, "is");
                            pwmlCollection._instanceNodes[location.cellularLocation] = instanceNode;
                        }
                    });
                }
            }

            // Create ProteinComplexes
            for (let pwmlProteinComplex of oneItem(pathway["protein-complexes"])["protein-complex"]) {
                let props = {
                    name: oneItem(pwmlProteinComplex.name),
                    otherNames: oneItem(pwmlProteinComplex.name),
                    unificationRefs: getUnificationRefsFromPwml(pwmlProteinComplex)
                }

                let proteinComplex = new Complex(props);
                proteinComplex = mergeBioEntityIfExists(proteinComplex);
                let complexNode = createNode(proteinComplex, pwmlProteinComplex);
                pwmlProteinComplex._bioReference = proteinComplex;
                pwmlProteinComplex._instanceNodes = {}

                let complexVisualizations = pwmlProteinComplex._referencers.filter(r => r._type === "protein-complex-visualization");

                complexVisualizations.forEach(complexVisualizationPwml => {
                    let complexLocation = parseLocation(complexVisualizationPwml);
                    if (pwmlProteinComplex._instanceNodes.hasOwnProperty(complexLocation.cellularLocation)) {
                        return
                    }

                    let proteinComplex = new ComplexInstance(props, complexLocation);

                    proteinComplex = mergeBioEntityIfExists(proteinComplex);
                    let complexNodeInstance = createNode(proteinComplex, pwmlProteinComplex);
                    createEdge(complexNodeInstance, complexNode, complexVisualizationPwml, "is")
                    pwmlProteinComplex._instanceNodes[complexLocation.cellularLocation] = complexNodeInstance;

                    if (complexVisualizationPwml.protein_complex_protein_visualizations != null) {
                        for (let proteinVisualizationPwml of
                            oneItem(complexVisualizationPwml.protein_complex_protein_visualizations)["protein-complex-protein-visualization"]) {
                            let proteinLocationPwml = oneItem(proteinVisualizationPwml["protein-location-id"])._reffedObj
                            let proteinLocation = parseLocation(proteinLocationPwml);
                            let proteinPwml = oneItem(proteinLocationPwml["protein-id"])._reffedObj
                            createEdge(proteinPwml._instanceNodes[proteinLocation.cellularLocation], complexNodeInstance, proteinVisualizationPwml, "component")
                        }
                    }

                    if (complexVisualizationPwml.protein_complex_compound_visualizations != null) {
                        for (let compoundVisualizationPwml of
                            oneItem(complexVisualizationPwml.protein_complex_compound_visualizations)["protein-complex-compound-visualization"]) {
                            let type = oneItem(compoundVisualizationPwml["compound-type"]);
                            let compoundLocationPwml = oneItem(compoundVisualizationPwml["compound-location-id"])._reffedObj
                            let compoundLocation = parseLocation(compoundLocationPwml);
                            let compoundPwml = oneItem(compoundLocationPwml["compound-id"])._reffedObj
                            createEdge(compoundPwml._instanceNodes[compoundLocation.cellularLocation], complexNodeInstance, compoundVisualizationPwml, type)
                        }
                    }
                });

                if (complexVisualizations.length === 0) {
                    for (let proteinComplexProtein of oneItem(pwmlProteinComplex["protein_complex-proteins"])["protein-complex-protein"]) {
                        let proteinPwml = oneItem(proteinComplexProtein["protein-id"])._reffedObj
                    }
                }

                // if (pwmlProteinComplex["protein_complex-cofactors"] != null) {
                //     for (let cofactor of oneItem(pwmlProteinComplex["protein_complex-cofactors"])["protein-complex-cofactor"]) {
                //         let cofactorCompoundPwml = oneItem(cofactor["compound-id"])._reffedObj;
                //         createEdge(cofactorCompoundPwml._nodeRef, complexNode, cofactor, "cofactor")
                //     }
                // }

                // pwmlProteinComplex._referencers.filter(r => r._type === "protein-complex-visualization").forEach(referencer => {
                //     let complexLocation = locationToString(referencer);
                //     if (complexLocation == null) {
                //         return
                //     }
                //
                //     if (!pwmlProteinComplex._instanceNodes.hasOwnProperty(complexLocation)) {
                //         let smallMoleculeInstance = new ComplexInstance(props, complexLocation)
                //         let instanceNode = createNode(smallMoleculeInstance, pwmlProteinComplex)
                //         createEdge(instanceNode, complexNode, null, "is");
                //         pwmlProteinComplex._instanceNodes[complexLocation] = instanceNode;
                //
                //         if (pwmlProteinComplex["protein_complex-cofactors"] != null) {
                //             for (let cofactor of oneItem(pwmlProteinComplex["protein_complex-cofactors"])["protein-complex-cofactor"]) {
                //                 let cofactorCompoundPwml = oneItem(cofactor["compound-id"])._reffedObj;
                //                 createEdge(cofactorCompoundPwml._nodeRef, instanceNode, cofactor, "cofactor")
                //             }
                //         }
                //     }
                // });
            }

            // Transports
            let transports = oneItem(pathway["transports"]);
            if (transports instanceof Object) {
                for (let pwmlTransport of transports["transport"]) {
                    let transportElement = oneItem(oneItem(pwmlTransport["transport-elements"])["transport-element"]);
                    // TODO: Direction
                    // Create edges
                    let transportedPwml = oneItem(transportElement["element-id"])._reffedObj
                    let leftLocation = parseLocation(oneItem(transportElement["left-biological-state-id"])._reffedObj);
                    let rightLocation = parseLocation(oneItem(transportElement["right-biological-state-id"])._reffedObj);

                    let leftNode = transportedPwml._instanceNodes[leftLocation.cellularLocation];
                    let rightNode = transportedPwml._instanceNodes[rightLocation.cellularLocation];

                    createEdge(leftNode, rightNode, pwmlTransport, "transport");
                }
            }

            // Reactions
            let reactions = oneItem(pathway["reactions"]);
            if (reactions instanceof Object) {
                for (let pwmlReaction of reactions["reaction"]) {
                    // TODO: Use Direction!!!
                    let reaction = new BiochemicalReaction({
                        name: "",
                        otherNames: "",
                        unificationRefs: getUnificationRefsFromPwml(pwmlReaction)
                    });
                    let reactionNode = createNode(reaction, pwmlReaction);

                    // TODO: Validate that leftPwmls, rightPwmls and enzymes are the same as the objects in the visualization objects used later
                    let leftPwmls = oneItem(pwmlReaction["reaction-left-elements"])["reaction-left-element"]
                        .map(element => oneItem(element["element-id"])._reffedObj)
                    let rightPwmls = oneItem(pwmlReaction["reaction-right-elements"])["reaction-right-element"]
                        .map(element => oneItem(element["element-id"])._reffedObj)
                    let enzymes = pwmlReaction["reaction-enzymes"] == null ? [] : oneItem(pwmlReaction["reaction-enzymes"])["reaction-enzyme"]
                        .map(element => oneItem(element["protein-complex-id"])._reffedObj)

                    // Multiple visualization references, but only one has a real bioState. I HOPES.
                    let pwmlLocations = pwmlReaction._referencers
                        .filter(ref => ref._type === "reaction-visualization")

                    // if (pwmlLocations.length !== 1) {
                    //     throw "OH SHETw"
                    // }
                    for (let pwmlLocation of pwmlLocations) {
                        // let pwmlLocation = oneItem(pwmlLocations)
                        reaction.location = parseLocation(pwmlLocation);

                        for (let reactionCompound of
                            oneItem(pwmlLocation.reaction_compound_visualizations)["reaction-compound-visualization"]) {
                            // TODO: USE reactionCompound.side!!!!
                            let compoundLocationObject = oneItem(reactionCompound["compound-location-id"])._reffedObj;
                            let compoundPwml = oneItem(compoundLocationObject["compound-id"])._reffedObj;
                            let compoundLocation = parseLocation(compoundLocationObject);

                            let node = compoundPwml._instanceNodes[compoundLocation.cellularLocation];
                            if (leftPwmls.includes(compoundPwml)) {
                                createEdge(node, reactionNode, reactionCompound, "component")
                            } else {
                                createEdge(reactionNode, node, reactionCompound, "product")
                            }
                        }

                        if (pwmlLocation.reaction_element_collection_visualizations != null) {
                            for (let reactionComplex of
                                oneItem(pwmlLocation.reaction_element_collection_visualizations)["reaction-element-collection-visualization"]) {
                                // TODO: USE reactionComplex.side!!!!
                                let complexLocationObject = oneItem(reactionComplex["element-collection-location-id"])._reffedObj;
                                let complexPwml = oneItem(complexLocationObject["element-collection-id"])._reffedObj;
                                let complexLocation = parseLocation(complexLocationObject);

                                let node = complexPwml._instanceNodes[complexLocation.cellularLocation];

                                if (leftPwmls.includes(complexPwml)) {
                                    createEdge(node, reactionNode, reactionComplex, "component")
                                } else {
                                    createEdge(reactionNode, node, reactionComplex, "product")
                                }
                            }
                        }

                        if (pwmlLocation.reaction_enzyme_visualizations != null) {
                            for (let reactionEnzymeViz of
                                oneItem(pwmlLocation.reaction_enzyme_visualizations)["reaction-enzyme-visualization"]) {
                                // TODO: USE reactionEnzymeViz.side!!!!
                                let reactionEnzyme = oneItem(reactionEnzymeViz["reaction-enzyme-id"])._reffedObj;
                                reactionEnzyme = oneItem(reactionEnzyme["protein-complex-id"])._reffedObj;
                                let enzymeLocation = parseLocation(oneItem(reactionEnzymeViz["protein-complex-visualization-id"])._reffedObj);

                                let node = reactionEnzyme._instanceNodes[enzymeLocation.cellularLocation];
                                createEdge(node, reactionNode, reactionEnzymeViz, "inhibits? catalyses?")
                            }
                        }
                    }
                }
            }

            // Interactions
            let interactions = oneItem(pathway["interactions"]);
            if (interactions instanceof Object) {
                for (let pwmlInteraction of interactions["interaction"]) {
                    let leftElement = oneItem(oneItem(pwmlInteraction["interaction-left-elements"])["interaction-left-element"]);
                    let rightElement = oneItem(oneItem(pwmlInteraction["interaction-right-elements"])["interaction-right-element"]);
                    let interactionType = oneItem(pwmlInteraction["interaction-type"]);

                    // Create edges
                    let leftNodes = Object.values(oneItem(leftElement["element-id"])._reffedObj._instanceNodes);
                    let rightNodes = Object.values(oneItem(rightElement["element-id"])._reffedObj._instanceNodes);

                    // Here we check if there is more than one instance that can interact, and if there is, we throw error
                    // TODO: Decide whether we should throw error, or it's like a global rule instead of an interaction?
                    // TODO: OR BETTER YET, use InteractionVisualization object instead of guessing...
                    let pairs = [];
                    for (let leftNode of leftNodes) {
                        for (let rightNode of rightNodes) {
                            if (leftNode.bioEntity.location.cellularLocation === rightNode.bioEntity.location.cellularLocation) {
                                pairs.push([leftNode, rightNode]);
                            }
                        }
                    }
                    if (pairs.length === 0 && leftNodes.length === 1 && rightNodes.length === 1) {
                        pairs = [[leftNodes[0], rightNodes[0]]]
                    }
                    if (pairs.length !== 1) {
                        // throw "Only one possible permutation for instances of interaction entities is allowed"
                        console.error("Only one possible permutation for instances of interaction entities is allowed")
                        showNotification("Only one possible permutation for instances of interaction entities is allowed", "error")
                        continue
                    }

                    let [leftNode, rightNode] = pairs[0];
                    createEdge(leftNode, rightNode, pwmlInteraction, interactionType);
                }
            }

            console.log("FERK")
            for (let key of nodes.keys()) {
                medigraphNodes.set(key, nodes.get(key))
            }
            medigraphEdges.push(...edges)
        }
        finished(new Medigraph(medigraphNodes, medigraphEdges));
    });
}

if (typeof window === 'undefined') {
    // parsePwml(PwmlPathways.PathbankWarfarin)
    // parsePwml(PwmlPathways.PathbankVitaminK, pathway => {
    //     console.log("I HAZ PATHWAY!");
    //     let nodes = node.va
    //     MedigraphDb.savePathway(pathway);
    // })
}
