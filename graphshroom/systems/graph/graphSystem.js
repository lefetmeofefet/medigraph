import {Node} from "../../entities/node.js"
import {Edge} from "../../entities/edge.js";

class GraphSystem {
    get nodes() {
        return this._nodes.values()
    }

    get edges() {
        return this._edges;
    }

    constructor(pixiCanvas, {nodes, edges}) {
        this._pixiCanvas = pixiCanvas;

        this._nodes = new Map();
        this._edges = [];

        Node.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);
        Edge.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);

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
    }
}


export {GraphSystem}
