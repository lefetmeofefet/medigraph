import {Node} from "../entities/node.js"
import {Edge} from "../entities/edge.js";
import {Vector} from "../physics/vector.mjs";


class NodeInteraction {
    constructor(inputSystem, graphSystem, nodeHoveredCb, nodeHoveredOutCb, nodeClickedCb) {
        this._inputSystem = inputSystem;
        this._graphSystem = graphSystem;
        this._draggedNode = null;
        this._draggedNodeStart = null;
        this._hoveredNode = null;
        this._nodeHoveredCb = nodeHoveredCb;
        this._nodeHoveredOutCb = nodeHoveredOutCb;
        this._nodeClickedCb = nodeClickedCb;
    }

    run() {
        this.handleDrag();

        if (this._inputSystem.leftMousePressedThisFrame) {
            for (let node of this._graphSystem.nodes) {
                if (Vector.Distance(this._inputSystem.dragStartPoint, node.position) <= Node.RADIUS) {
                    this._draggedNode = node;
                    this._draggedNodeStart = {x: node.position.x, y: node.position.y};
                }
            }
        }

        if (this._inputSystem.leftMouseReleasedThisFrame && this._draggedNode != null) {
            if (Vector.Distance(this._draggedNodeStart, this._draggedNode.position) <= 3) {
                this._nodeClickedCb(this._draggedNode);
            }
            this._draggedNode = null;
        }

        if (this._draggedNode != null) {
            this._draggedNode.setPosition(
                Vector.Plus(
                    this._draggedNodeStart,
                    Vector.Minus(this._inputSystem.mouse, this._inputSystem.dragStartPoint)
                )
            )
        }
    }

    handleDrag() {
        if (this._hoveredNode == null) {
            for (let node of this._graphSystem.nodes) {
                if (Vector.Distance(this._inputSystem.mouse, node.position) <= Node.RADIUS) {
                    this._hoveredNode = node;
                    this._nodeHoveredCb(node);
                }
            }
        }
        else {
            if (Vector.Distance(this._inputSystem.mouse, this._hoveredNode.position) > Node.RADIUS) {
                this._nodeHoveredOutCb(this._hoveredNode);
                this._hoveredNode = null;
            }
        }
    }
}


export {NodeInteraction}
