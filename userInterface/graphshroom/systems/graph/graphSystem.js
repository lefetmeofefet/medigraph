import {Node} from "../../entities/node.js"
import {Edge} from "../../entities/edge.js";
import {NodeContainer} from "../../entities/container.js";

class GraphSystem {
    get nodes() {
        return [...this._nodes.values()]
    }

    get edges() {
        return this._edges;
    }

    get containers() {
        return this._containers;
    }

    constructor(pixiCanvas, {nodes = new Map(), edges = [], containers = []} = {}) {
        this._pixiCanvas = pixiCanvas;

        this._nodes = new Map();
        this._edges = [];
        this._containers = [];

        Node.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);
        Edge.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);
        NodeContainer.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);

        this.updateNodesAndEdges({nodes, edges, containers})
    }

    updateNodesAndEdges({nodes = new Map(), edges = [], containers = []} = {}) {
        if (nodes instanceof Map) {
            for (let key of nodes.keys()) {
                let node = new Node(nodes.get(key));
                this._nodes.set(key, node);
            }
        } else {
            for (let key of Object.keys(nodes)) {
                let node = new Node(nodes[key]);
                this._nodes.set(key, node);
            }
        }

        for (let edge of edges) {
            let newEdge = new Edge(edge, this._nodes.get(edge.source), this._nodes.get(edge.destination));
            this._edges.push(newEdge);
        }

        for (let container of containers) {
            let newContainer = new NodeContainer(container.name, container.nodes.map(nodeId => this._nodes.get(nodeId)));
            this._containers.push(newContainer);
        }
    }

    run() {
        for (let node of this.nodes) {
            let scale = this._pixiCanvas.scale;
            node.updateDisplay(scale)
        }
        for (let edge of this.edges) {
            let scale = this._pixiCanvas.scale;
            edge.updateDisplay(scale)
        }
        for (let container of this._containers) {
            let scale = this._pixiCanvas.scale;
            container.updateDisplay(scale)
        }
    }
}


export {GraphSystem}
