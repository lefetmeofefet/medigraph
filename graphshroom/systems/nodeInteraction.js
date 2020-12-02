import {Node} from "../entities/node.js"
import {Edge} from "../entities/edge.js";
import {Vector} from "../physics/vector.mjs";


class NodeInteraction {
    constructor(inputSystem, graphSystem) {
        this._inputSystem = inputSystem;
        this._graphSystem = graphSystem;
        this._draggedNode = null;
        this._draggedNodeStart = null;
    }

    run() {
        if (this._inputSystem.leftMousePressedThisFrame) {
            for (let node of this._graphSystem.nodes) {
                if (Vector.Distance(this._inputSystem.dragStartPoint, node.position) <= Node.RADIUS) {
                    this._draggedNode = node;
                    this._draggedNodeStart = {x: node.position.x, y: node.position.y};
                }
            }
        }

        if (this._inputSystem.leftMouseReleasedThisFrame && this._draggedNode != null) {
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
}


export {NodeInteraction}
