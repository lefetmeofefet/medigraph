import libsbml from "libsbmljs_stable";

function createSbml(sbmlData, onFinish) {
    // let libSbml = await libsbml()
    libsbml().then(libSbml => {
        // now it is safe to use the module
        const doc = new libSbml.SBMLDocument(3, 2);

        // create a model and compartment
        const model = doc.createModel()

        // const compartment = model.createCompartment()
        // compartment.setId('C1')
        // compartment.setSize(1)
        // compartment.setConstant(true)
        //
        // // create a species
        // const species = model.createSpecies()
        // species.setId('S1')
        // species.setConstant(false)
        // species.setHasOnlySubstanceUnits(false)
        // species.setBoundaryCondition(false)
        //
        // // create a reaction
        // const reaction = model.createReaction()
        // reaction.setId('J1')
        // reaction.setReversible(false)
        //
        // const reactant = reaction.createReactant() // returns a SpeciesReference
        // reactant.setSpecies('S1')
        // reactant.setConstant(false)
        //
        // // create a parser for infix formulae
        // // this is a libsbmljs helper class
        // // it doesn't exist in the libsbml C++ library
        // const parser = new libsbml.SBMLFormulaParser()
        // reaction.createKineticLaw().setMath(parser.parseL3Formula('10*S1'))


        // let createId = id => `id_${id
        //     .replace(/-/g, "")
        //     .replace(/(?![a-z|A-Z|0-9|_])./g, "_")
        //     .replace(/\s/g, "_")}`

        let createId = (prefix, id) => `${prefix}_${id.replace(/(?![a-z|A-Z|0-9|_])./g, "_")}`

        for (let medigraphCompartment of sbmlData.compartments) {
            const compartment = model.createCompartment()
            compartment.setId(createId("compartment", medigraphCompartment))
            compartment.setName(medigraphCompartment)
            compartment.setConstant(true)
        }

        for (let medigraphSpecies of sbmlData.nodes.species) {
            // create a species
            const species = model.createSpecies()
            species.setId(createId("species", medigraphSpecies.id))
            species.setName(medigraphSpecies.name)
            species.setCompartment(createId("compartment", medigraphSpecies.compartment))
            species.setConstant(false)
            species.setHasOnlySubstanceUnits(false)
            species.setBoundaryCondition(false)
            species.setInitialAmount(0)
        }

        for (let medigraphReaction of sbmlData.nodes.reactions) {
            // create a reaction
            const reaction = model.createReaction()
            let reactionId = createId("reaction", medigraphReaction.id)
            reaction.setId(reactionId)
            reaction.setName(medigraphReaction.name)
            reaction.setReversible(false)

            for (let medigraphReactant of medigraphReaction.reactants) {
                const reactant = reaction.createReactant() // returns a SpeciesReference
                let speciesId = createId("species", medigraphReactant.id)
                reactant.setSpecies(speciesId)
                reactant.setId("reactant_" + reactionId + speciesId)
                reactant.setStoichiometry(medigraphReactant.stoichiometry)
                reactant.setConstant(false)
            }

            for (let medigraphModifier of medigraphReaction.modifiers) {
                const reactant = reaction.createModifier() // returns a SpeciesReference
                let speciesId = createId("species", medigraphModifier.id)
                reactant.setSpecies(speciesId)
                reactant.setId("modifier_" + reactionId + speciesId)
                // reactant.setOrder(medigraphModifier.order)
            }

            for (let medigraphProduct of medigraphReaction.products) {
                const product = reaction.createProduct() // returns a SpeciesReference
                let speciesId = createId("species", medigraphProduct.id);
                product.setSpecies(speciesId)
                product.setId("product_" + reactionId + speciesId)
                product.setStoichiometry(medigraphProduct.stoichiometry)
                // product.setOrder(medigraphProduct.order)
                product.setConstant(false)
            }
        }

        // print out the serialized XML for the SBML model we created
        const writer = new libSbml.SBMLWriter()
        let sbmlString = writer.writeSBMLToString(doc);
        // response.json({sbml: sbmlString});
        onFinish(sbmlString)
        // return sbmlString
    })
}

export {createSbml}
