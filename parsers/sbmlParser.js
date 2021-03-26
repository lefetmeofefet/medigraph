import {jsonSchemaValidate, one, parsingError} from "./parserUtil.js";
import {Medigraph} from "../bioChemicalEntities/Medigraph.js";
import {BiochemicalEntity} from "../bioChemicalEntities/BiochemicalEntity.js";
import {EntityInstance} from "../bioChemicalEntities/instances/EntityInstance.js";
import {BiochemicalReaction} from "../bioChemicalEntities/BiochemicalReaction.js";
import {UnificationReference} from "../bioChemicalEntities/references/UnificationReference.js";
import {DBS} from "../bioChemicalEntities/references/Reference.js";
import {BioLocation} from "../bioChemicalEntities/instances/BioLocation.js";

const SCHEMA = {
    type: "object",
    properties: {
        $: {},
        notes: {},
        annotation: {},
        listOfSpecies: {
            type: "list",
            isSingleItem: true,
            items: {
                type: "object",
                properties: {
                    species: {
                        required: true,
                        type: "list",
                        items: {
                            type: "object",
                            properties: {
                                $: {
                                    type: "object",
                                    properties: {
                                        boundaryCondition: {type: "string", required: true},
                                        compartment: {type: "string", required: true},
                                        constant: {type: "string", required: true},
                                        hasOnlySubstanceUnits: {type: "string", required: true},
                                        id: {type: "string", required: true},
                                        metaid: {type: "string", required: true},
                                        name: {type: "string", required: true},
                                        sboTerm: {type: "string"},
                                    }
                                },
                                notes: {},
                                annotation: {},
                            }
                        }
                    }
                }
            }
        },
        listOfCompartments: {},
        listOfReactions: {},
    }
}

function parseSbml(xml) {
    let model = one(xml.sbml.model);
    console.log("SBML: ", model)

    try {
        jsonSchemaValidate(SCHEMA, model);
    } catch (e) {
        console.log(e)
        parsingError("JSON schema doesnt pass validation: " + e)
    }

    let species = one(model.listOfSpecies).species;
    let compartments = one(model.listOfCompartments).compartment;
    let reactions = one(model.listOfReactions).reaction;

    let medigraph = new Medigraph();

    let compartmentIdToCompartment = new Map();
    for (let compartment of compartments) {
        compartmentIdToCompartment.set(compartment.$.id, compartment.$.name)
    }

    let specimenIdToNode = new Map();
    for (let specimen of species) {
        let compartment = compartmentIdToCompartment.get(specimen.$.compartment);
        let location = new BioLocation({cellularLocation: compartment})

        let entity = new EntityInstance({
            name: removeSquareBrackets(specimen.$.name),
            description: one(one(specimen.notes).p)._,
            unificationRefs: one(one(one(specimen.annotation)["rdf:RDF"])["rdf:Description"])["bqbiol:is"][0]["rdf:Bag"][0]["rdf:li"]
                .map(ref => UnificationReference.FromLink(ref.$["rdf:resource"]))
        }, location);

        let specimenNode = medigraph.createNode(entity, "sbml", specimen)
        specimenIdToNode.set(specimen.$.id, specimenNode)
    }

    for (let reaction of reactions) {
        let compartment = compartmentIdToCompartment.get(reaction.$.compartment);
        let entity = new BiochemicalReaction({
            name: reaction.$.name
        });
        entity.location = new BioLocation({cellularLocation: compartment})
        let reactionNode = medigraph.createNode(entity, "sbml", reaction)

        for (let reactantRef of one(reaction.listOfReactants).speciesReference) {
            let reactantNode = specimenIdToNode.get(reactantRef.$.species);
            medigraph.createEdge(reactantNode, reactionNode, `reactant - ${reactantRef.$.stoichiometry}`, reactantRef)
        }

        if (reaction.listOfModifiers != null) {
            for (let modifierRef of one(reaction.listOfModifiers).modifierSpeciesReference) {
                let modifierNode = specimenIdToNode.get(modifierRef.$.species);
                medigraph.createEdge(modifierNode, reactionNode, `modifier`, modifierRef)
            }
        }

        for (let productRef of one(reaction.listOfProducts).speciesReference) {
            let productNode = specimenIdToNode.get(productRef.$.species);
            medigraph.createEdge(reactionNode, productNode, `product - ${productRef.$.stoichiometry}`, productRef)
        }
    }

    return medigraph
}

function removeSquareBrackets(str) {
    return str.substring(0, str.indexOf(" ["))
}

export {parseSbml}