import {Node} from "../../entities/node.js"
import {Edge} from "../../entities/edge.js";

class GraphSystem {
    get nodes() {
        return this._nodes.values()
    }

    constructor(pixiCanvas, {nodes, edges}) {
        this._pixiCanvas = pixiCanvas;

        this._nodes = new Map();
        this._edges = [];

        Node.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);
        Edge.InitializeResources(pixiCanvas.renderer, pixiCanvas.stage);

        for (let key of Object.keys(nodes)) {
            let node = new Node(nodes[key]);
            this._nodes.set(key, node);
        }

        for (let edge of edges) {
            let newEdge = new Edge(edge, this._nodes.get(edge.source), this._nodes.get(edge.destination));
            this._edges.push(newEdge);
        }
    }

    run() {
        for (let node of new Array(...this._nodes).map(n => n[1])) {
            let scale = this._pixiCanvas.scale;
            node.updateDisplay(scale)
        }
    }
}


export {GraphSystem}
