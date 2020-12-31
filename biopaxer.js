import "./libs/xml2js.min.js"


export function parseBiopax(xml, finished) {
    xml2js.parseString(xml, (err, result) => {
        result = result["rdf:RDF"];
        // let pathwayOrder = oneItem(result["bp:Pathway"])["bp:pathwayOrder"].map(o => o["$"]["rdf:resource"].substr(1));

        let RES_KEY_NAMES = {
            Pathway: "bp:Pathway",
            PathwayStep: "bp:PathwayStep",
            BiochemicalPathwayStep: "bp:BiochemicalPathwayStep",
            BiochemicalReaction: "bp:BiochemicalReaction",
            SmallMolecule: "bp:SmallMolecule",
            CellularLocationVocabulary: "bp:CellularLocationVocabulary",
            UnificationXref: "bp:UnificationXref",
            SmallMoleculeReference: "bp:SmallMoleculeReference",
            Provenance: "bp:Provenance",
            RelationshipXref: "bp:RelationshipXref",
            RelationshipTypeVocabulary: "bp:RelationshipTypeVocabulary",
            Catalysis: "bp:Catalysis",
            Protein: "bp:Protein",
            ProteinReference: "bp:ProteinReference",
            BioSource: "bp:BioSource",
            FragmentFeature: "bp:FragmentFeature",
            SequenceInterval: "bp:SequenceInterval",
            SequenceSite: "bp:SequenceSite",
            PublicationXref: "bp:PublicationXref",
            Complex: "bp:Complex",
            Stoichiometry: "bp:Stoichiometry",
            PhysicalEntity: "bp:PhysicalEntity",
            Control: "bp:Control",
        }
        let resourcesDict = Object.fromEntries(
            Object.values(RES_KEY_NAMES)
                .map(resName => {
                    return result.hasOwnProperty(resName) ?
                        result[resName]
                            .map(obj => [
                                obj["$"]["rdf:ID"],
                                Object.assign(obj, {type: resName})
                            ])
                        :
                        [];
                }).flat(1)
        );
        console.log("Resources dict: ", resourcesDict)

        // let processes = pathwayOrder.map(
        //     step => resourcesDict[step]["bp:stepProcess"].map(step => step["$"]["rdf:resource"].substr(1))
        // );
        // processes = processes.map(process => process.map(resource => resourcesDict[resource]))

        let nodes = new Map();
        let edges = []

        function oneItem(list) {
            if (list.length !== 1) {
                throw "LIST LENGTH IS NOT ONE!"
            }
            return list[0]
        }

        function flattenReferences(list) {
            return list.map(res => resourcesDict[res["$"]["rdf:resource"].substr(1)])
        }

        function getOrCreateNode(resource) {
            // Check if node ID exists already, if it does, return the node
            let id = resource["$"]["rdf:ID"];
            if (nodes.has(id)) {
                return nodes.get(id)
            }

            // Extract node name
            // TODO: Extract SmallMoleculeReference data!! there's unificationRefs and more names
            let name;
            if (resource.type === RES_KEY_NAMES.BiochemicalReaction ||
                resource.type === RES_KEY_NAMES.SmallMolecule ||
                resource.type === RES_KEY_NAMES.Complex ||
                resource.type === RES_KEY_NAMES.PhysicalEntity ||
                resource.type === RES_KEY_NAMES.Protein) {
                name = oneItem(resource["bp:displayName"])["_"];
            } else if (resource.type === RES_KEY_NAMES.Catalysis || resource.type === RES_KEY_NAMES.Control) {
                name = `${resource.type.substr(3)}: ${oneItem(resource["bp:controlType"])["_"]}`;
            } else {
                throw `UNEXPECTED RESOURCE TYPE! ${resource.type}`
            }

            // Create node
            let newNode = {
                id: id,
                name: name,
                type: resource.type,
                originalResource: resource,
                incomingEdges: [],
                outgoingEdges: [],
                unificationRefs: []
            };
            nodes.set(id, newNode);

            // Flatten references in original resource
            if (resource.hasOwnProperty("bp:xref")) {
                resource["references"] = flattenReferences(resource["bp:xref"]);
                newNode.unificationRefs = resource["references"]
                    .filter(ref => ref.type === RES_KEY_NAMES.UnificationXref)
                    .map(ref => ({
                        db: oneItem(ref["bp:db"])["_"],
                        id: oneItem(ref["bp:id"])["_"],
                        idVersion: ref.hasOwnProperty("bp:idVersion") ? oneItem(ref["bp:idVersion"])["_"] : null,
                        comment: ref.hasOwnProperty("bp:comment") ? oneItem(ref["bp:comment"])["_"] : null,
                    }));
                if (resource.hasOwnProperty("bp:eCNumber")) {
                    newNode.unificationRefs.push({
                        db: "EC Numbers",
                        id: oneItem(resource["bp:eCNumber"])["_"],
                        idVersion: null,
                        comment: "The unique number assigned to a reaction by the Enzyme Commission of the International Union of Biochemistry and Molecular Biology."
                    })
                }
            }

            if (resource.hasOwnProperty("bp:dataSource")) {
                resource["dataSource"] = flattenReferences(resource["bp:dataSource"]);
            }
            if (resource.hasOwnProperty("bp:cellularLocation")) {
                resource["cellularLocation"] = flattenReferences(resource["bp:cellularLocation"]);
            }
            if (resource.hasOwnProperty("bp:entityReference")) {
                resource["entityReference"] = flattenReferences(resource["bp:entityReference"]);
                let ref = resource["entityReference"][0];
                if (ref.hasOwnProperty("bp:xref")) {
                    let refs = flattenReferences(ref["bp:xref"]);
                    newNode.unificationRefs.push(...(
                        refs
                            .filter(ref => ref.type === RES_KEY_NAMES.UnificationXref)
                            .map(ref => ({
                                db: oneItem(ref["bp:db"])["_"],
                                id: oneItem(ref["bp:id"])["_"],
                                idVersion: ref.hasOwnProperty("bp:idVersion") ? oneItem(ref["bp:idVersion"])["_"] : null,
                                comment: ref.hasOwnProperty("bp:comment") ? oneItem(ref["bp:comment"])["_"] : null,
                            }))
                    ));
                }
            }
            if (resource.hasOwnProperty("bp:feature")) {
                resource["feature"] = flattenReferences(resource["bp:feature"]);
            }
            // TODO: Stoichiometry objects can be shared by multiple reactions (it happened). WHY?
            if (resource.hasOwnProperty("bp:componentStoichiometry")) {
                resource["componentStoichiometry"] = flattenReferences(resource["bp:componentStoichiometry"]);
                resource["componentStoichiometry"] = resource["componentStoichiometry"].map(stoich => ({
                    stoichiometricCoefficient: oneItem(stoich["bp:stoichiometricCoefficient"])["_"],
                    physicalEntity: oneItem(flattenReferences(stoich["bp:physicalEntity"])),
                }))
            }
            if (resource.hasOwnProperty("bp:participantStoichiometry")) {
                resource["participantStoichiometry"] = flattenReferences(resource["bp:participantStoichiometry"]);
                resource["participantStoichiometry"] = resource["participantStoichiometry"].map(stoich => ({
                    stoichiometricCoefficient: oneItem(stoich["bp:stoichiometricCoefficient"])["_"],
                    physicalEntity: oneItem(flattenReferences(stoich["bp:physicalEntity"])),
                }))
            }

            // Create relationships
            if (newNode.type === RES_KEY_NAMES.PhysicalEntity) {
                flattenReferences(resource["bp:memberPhysicalEntity"])
                    .map(res => getOrCreateNode(res))
                    .forEach(memberNode => createEdge(memberNode, newNode, "Member"));
            } else if (newNode.type === RES_KEY_NAMES.Complex) {
                flattenReferences(resource["bp:component"])
                    .map(res => getOrCreateNode(res))
                    .forEach(componentNode => createEdge(componentNode, newNode, "Component"));
            }

            return newNode
        }

        function createEdge(sourceNode, destinationNode, description) {
            let edge = {
                source: sourceNode.id,
                destination: destinationNode.id,
                description: description
            }
            edges.push(edge);
            sourceNode.outgoingEdges.push(edge);
            destinationNode.incomingEdges.push(edge);
            return edge
        }

        // for (let process of processes) {
        //     for (let step of process) {
        for (let step of [
            ...result["bp:BiochemicalReaction"],
            ...result["bp:Catalysis"],
            ...(result["bp:Control"] || [])]
            ) {
            let newNode = getOrCreateNode(step);

            if (step.type === RES_KEY_NAMES.BiochemicalReaction) {
                let direction = oneItem(step["bp:conversionDirection"])["_"];
                let incomingDirection, outgoingDirection;

                // TODO: Validate assumption that left-to-right and right-to-left have no difference except the direction
                if (direction === "LEFT-TO-RIGHT" || direction === "LEFT_TO_RIGHT") {
                    incomingDirection = "bp:left";
                    outgoingDirection = "bp:right";
                } else if (direction === "RIGHT-TO-LEFT" || direction === "RIGHT_TO_LEFT" || direction === "REVERSIBLE") {
                    // TODO: FIX THE REVERSIBLE FASTTTT
                    incomingDirection = "bp:right";
                    outgoingDirection = "bp:left";
                } else {
                    throw `DIRECTION IS UNEXPEXTERED: ${direction}`
                }

                flattenReferences(step[incomingDirection])
                    .map(res => getOrCreateNode(res))
                    .forEach(incomingNode => createEdge(incomingNode, newNode));

                flattenReferences(step[outgoingDirection])
                    .map(res => getOrCreateNode(res))
                    .forEach(outgoingEdge => createEdge(newNode, outgoingEdge));

            } else if (step.type === RES_KEY_NAMES.Catalysis || step.type === RES_KEY_NAMES.Control) {
                flattenReferences(step["bp:controller"])
                    .map(res => getOrCreateNode(res))
                    .forEach(incomingNode => createEdge(incomingNode, newNode));

                flattenReferences(step["bp:controlled"])
                    .map(res => getOrCreateNode(res))
                    .forEach(outgoingNode => createEdge(newNode, outgoingNode));
            } else {
                throw `STEP TYPE IS UNEXPECTED!! ${step.type}`
            }
            nodes.set(newNode.id, newNode);
        }
        // }
        // }

        let biopax = {
            metadata: {
                links: {
                    rdf: result["$"]["xmlns:rdf"],
                    bp: result["$"]["xmlns:bp"],
                    owl: result["$"]["xmlns:owl"],
                    rdfs: result["$"]["xmlns:rdfs"],
                    xsd: result["$"]["xmlns:xsd"],
                    base: result["$"]["xml:base"],
                },
                ontology: {
                    about: result["owl:Ontology"][0]["$"]["rdf:about"],
                    imports: result["owl:Ontology"][0]["owl:imports"][0]["$"]["rdf:resource"],
                }
            },
            nodes: nodes,
            edges: edges
        }

        finished(biopax)
    })
}
