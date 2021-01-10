import {Node} from "../../entities/node.js"
import {Edge} from "../../entities/edge.js";
import {Vector} from "../../physics/vector.mjs";

let EDGE_BASE_LENGTH = 150;
window.setLength = length => EDGE_BASE_LENGTH = length

const EDGE_STIFFNESS_COEFFICIENT = 0.0006;

class Forces {
    constructor(graphSystem, nodeInteractionSystem) {
        this._graphSystem = graphSystem;
        this._nodeInteractionSystem = nodeInteractionSystem;
        for (let node of this._graphSystem.nodes) {
            node.physics = {
                force: new Vector(0, 0),
                velocity: new Vector(0, 0),
            }
        }
    }

    run() {
        this.calculateEdgeForces();
        this.calculateGravitationalForces();
        this.integrate();
    }

    calculateEdgeForces() {
        for (let edge of this._graphSystem.edges) {
            let distanceVector = Vector.Minus(edge.sourceNode.position, edge.destinationNode.position);
            let distance = distanceVector.magnitude();
            let force = Forces.calculateSpringForce(distance)
            force -= Forces.calculateGravitationalForce(distance)
            let forceVector = distanceVector.setMagnitude(force);

            edge.sourceNode.physics.force.add(forceVector);
            edge.destinationNode.physics.force.add(Vector.Inverted(forceVector));
        }
    }

    calculateGravitationalForces() {
        let nodes = [...this._graphSystem.nodes];
        for (let i = 0; i < nodes.length - 1; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                let node1 = nodes[i];
                let node2 = nodes[j];

                let distanceVector = Vector.Minus(node1.position, node2.position);
                let forceVector = distanceVector.setMagnitude(Forces.calculateGravitationalForce(distanceVector.magnitude()));
                node1.physics.force.add(forceVector);
                node2.physics.force.add(Vector.Inverted(forceVector));
            }
        }
    }

    integrate() {
        for (let node of this._graphSystem.nodes) {
            node.physics.force.setMagnitude(Math.pow(node.physics.force.magnitude(), 0.6))
            node.physics.velocity.add(node.physics.force);
            // Dampening effect
            node.physics.velocity = node.physics.velocity.multiply(0.7)

            if (node !== this._nodeInteractionSystem._draggedNode && !node.selected) {
                node.setPosition(Vector.Plus(node.position, node.physics.velocity));
            }

            node.physics.force.set(0, 0);
        }
    }

    static calculateSpringForce(springLength) {
        let lengthDiff = (EDGE_BASE_LENGTH - springLength)
        return (lengthDiff * Math.abs(lengthDiff)) * EDGE_STIFFNESS_COEFFICIENT;
    }

    static calculateGravitationalForce(distance) {
        return 300 / distance
    }
}


export {Forces}
