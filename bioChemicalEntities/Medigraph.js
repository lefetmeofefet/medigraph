class Medigraph {
    static EDGE_TYPES = {
        REACTANT: "reactant",
        PRODUCT: "product",
        INHIBITOR: "inhibitor",
        CATALYST: "catalyst", // enzymes

        COMPONENT: "component", // complexes
        MEMBER: "member", // groups and candidateSets
        IS: "is", // reference ideals
        IN: "in", // compartments
    }

    constructor(nodes, edges = []) {
        this.nodes = nodes || new Map();
        this.edges = edges;
    }

    getDestination(edge) {
        return this.nodes.get(edge.destination)
    }

    getSource(edge) {
        return this.nodes.get(edge.source)
    }

    createNode(bioEntity, sourceType, sourceObject) {
        function uuidv4() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }

        let node = {
            id: uuidv4(),
            name: bioEntity.name,
            bioEntity: bioEntity,
            sourceType: sourceType,
            sourceObject: sourceObject,
            incomingEdges: [],
            outgoingEdges: [],
            type: bioEntity.type,
        }
        this.nodes.set(node.id, node);
        sourceObject._nodeRef = node
        return node;
    }

    removeNode(node) {
        let edgesToDelete = [...node.incomingEdges, ...node.outgoingEdges];
        for (let deletedEdge of edgesToDelete) {
            let source = this.getSource(deletedEdge);
            source.outgoingEdges = source.outgoingEdges.filter(edge => !edgesToDelete.includes(edge))
            let dest = this.getDestination(deletedEdge);
            dest.incomingEdges = dest.incomingEdges.filter(edge => !edgesToDelete.includes(edge))
        }
        this.edges = this.edges.filter(edge => !edgesToDelete.includes(edge));
        this.nodes.delete(node.id);
    }

    createEdge(source, destination, description, sourceObject) {
        let newEdge = {
            source: source.id,
            destination: destination.id,
            sourceObject,
            description
        }
        this.edges.push(newEdge)
        source.outgoingEdges.push(newEdge)
        destination.incomingEdges.push(newEdge)
    }
}

export {Medigraph}