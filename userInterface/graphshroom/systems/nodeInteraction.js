import {Node} from "../entities/node.js"
import {Edge} from "../entities/edge.js";
import {Vector} from "../physics/vector.mjs";


class NodeInteraction {
    constructor(inputSystem, graphSystem, nodeHoveredCb, nodeHoveredOutCb, nodeClickedCb, finishDragCb, nodeRightClickCb) {
        this._inputSystem = inputSystem;
        this._graphSystem = graphSystem;
        this._draggedNode = null;
        this._draggedNodeStart = null;
        this._hoveredNode = null;
        this._nodeHoveredCb = nodeHoveredCb;
        this._nodeHoveredOutCb = nodeHoveredOutCb;
        this._nodeClickedCb = nodeClickedCb;
        this._finishDragCb = finishDragCb;
        this._nodeRightClickCb = nodeRightClickCb;
    }

    run() {
        this.handleDrag();

        if (this._inputSystem.leftMousePressedThisFrame) {
            for (let node of this._graphSystem.nodes.filter(node => !node.hidden)) {
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
            else {
                this._finishDragCb && this._finishDragCb(this._draggedNode)
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

        // Rightclick
        if (this._inputSystem.rightMousePressedThisFrame) {
            for (let node of this._graphSystem.nodes.filter(node => !node.hidden)) {
                if (Vector.Distance(this._inputSystem.mouse, node.position) <= Node.RADIUS) {
                    this._rightClickedNode = node;
                }
            }
        }

        if (this._inputSystem.rightMouseReleasedThisFrame && this._rightClickedNode != null) {
            if (Vector.Distance(this._inputSystem.mouse, this._rightClickedNode.position) <= Node.RADIUS) {
                this._nodeRightClickCb && this._nodeRightClickCb(this._rightClickedNode);
            }
            this._rightClickedNode = null;
        }
    }

    handleDrag() {
        if (this._hoveredNode == null) {
            for (let node of this._graphSystem.nodes.filter(node => !node.hidden)) {
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
