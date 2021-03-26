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
        for (let container of this._graphSystem.containers) {
            container.physics = {
                topLeft: {
                    force: new Vector(0, 0),
                    velocity: new Vector(0, 0),
                    position: container.topLeft,
                },
                bottomRight: {
                    force: new Vector(0, 0),
                    velocity: new Vector(0, 0),
                    position: container.bottomRight,
                }
            }
        }
    }

    run() {
        this.calculateEdgeForces();
        this.calculateGravitationalForces();
        this.calculateContainerForces();
        this.integrate();
    }

    calculateEdgeForces() {
        for (let edge of this._graphSystem.edges.filter(edge => !edge.hidden)) {
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
        let nodes = [...this._graphSystem.nodes.filter(node => !node.hidden)];
        for (let i = 0; i < nodes.length - 1; i+=1) {
            for (let j = i + 1; j < nodes.length; j+=1) {
                let node1 = nodes[i];
                let node2 = nodes[j];

                let distanceVector = Vector.Minus(node1.position, node2.position);
                let forceVector = distanceVector.setMagnitude(Forces.calculateGravitationalForce(distanceVector.magnitude()));
                node1.physics.force.add(forceVector);
                node2.physics.force.add(Vector.Inverted(forceVector));
            }
        }
    }

    calculateContainerForces() {
        let margin = 8;
        for (let container of this._graphSystem.containers) {
            let maxTopLeft = {x: 99999, y: 9999999}
            let maxBottomRight = {x: -99999, y: -9999999}
            for (let node of container.containedNodes.filter(node => !node.hidden)) {
                if (node.position.x - Node.RADIUS - margin < maxTopLeft.x) {
                    maxTopLeft.x = node.position.x - Node.RADIUS - margin;
                }
                if (node.position.y - Node.RADIUS - margin < maxTopLeft.y) {
                    maxTopLeft.y = node.position.y - Node.RADIUS - margin;
                }

                if (node.position.x + Node.RADIUS + margin > maxBottomRight.x) {
                    maxBottomRight.x = node.position.x + Node.RADIUS + margin;
                }
                if (node.position.y + Node.RADIUS + margin > maxBottomRight.y) {
                    maxBottomRight.y = node.position.y + Node.RADIUS + margin;
                }
            }
            container.topLeft.x = maxTopLeft.x
            container.topLeft.y = maxTopLeft.y
            container.bottomRight.x = maxBottomRight.x
            container.bottomRight.y = maxBottomRight.y
        }
    }

    calculateContainerForcesOld() {
        for (let container of this._graphSystem.containers) {
            let distanceVector = Vector.Minus(container.topLeft, container.bottomRight);
            let distance = distanceVector.magnitude();

            let defaultLength = 400;
            let lengthDiff = (defaultLength - distance)
            let force = (lengthDiff * Math.abs(lengthDiff)) * 0.0006;
            let forceVector = distanceVector.setMagnitude(force);

            container.physics.topLeft.force.add(forceVector);
            container.physics.bottomRight.force.add(Vector.Inverted(forceVector));

            for (let node of container.containedNodes) {
                // for (let vertex of [container.physics.topLeft, container.physics.bottomRight]) {
                //     let distanceVector = Vector.Minus(node.position, vertex.position);
                //     let distance = distanceVector.magnitude();
                //     let force = Forces.calculateSpringForce(distance)
                //     force -= Forces.calculateGravitationalForce(distance)
                //     let forceVector = distanceVector.setMagnitude(force);
                //
                //     node.physics.force.add(forceVector);
                //     vertex.force.add(Vector.Inverted(forceVector));
                // }

                let distanceVector = Vector.Minus(container.topLeft, node.position);
                let distance = distanceVector.magnitude();

                let OutsideForceCoefficient = 100
                let InsideForceCoefficient = 100

                if (distanceVector.x < node.RADIUS) {
                    let force = OutsideForceCoefficient * distance
                    node.physics.force.x += force
                    container.physics.topLeft.force.x -= force
                } else {
                    let force = InsideForceCoefficient / distance
                    node.physics.force.x += force
                    container.physics.topLeft.force.x -= force
                }

                if (distanceVector.y < node.RADIUS) {
                    let force = OutsideForceCoefficient * distance
                    node.physics.force.y += force
                    container.physics.topLeft.force.y -= force
                } else {
                    let force = InsideForceCoefficient / distance
                    node.physics.force.y += force
                    container.physics.topLeft.force.y -= force
                }



                distanceVector = Vector.Minus(node.position, container.bottomRight);
                distance = distanceVector.magnitude();

                if (distanceVector.x < node.RADIUS) {
                    let force = OutsideForceCoefficient * distance
                    node.physics.force.x += force
                    container.physics.bottomRight.force.x -= force
                } else {
                    let force = InsideForceCoefficient / distance
                    node.physics.force.x += force
                    container.physics.bottomRight.force.x -= force
                }

                if (distanceVector.y < node.RADIUS) {
                    let force = OutsideForceCoefficient * distance
                    node.physics.force.y += force
                    container.physics.bottomRight.force.y -= force
                } else {
                    let force = InsideForceCoefficient / distance
                    node.physics.force.y += force
                    container.physics.bottomRight.force.y -= force
                }
            }
        }
    }

    integrate() {
        for (let node of this._graphSystem.nodes.filter(node => !node.hidden)) {
            node.physics.force.setMagnitude(Math.pow(node.physics.force.magnitude(), 0.6))
            node.physics.velocity.add(node.physics.force);
            // Dampening effect
            node.physics.velocity = node.physics.velocity.multiply(0.7)

            if (node !== this._nodeInteractionSystem._draggedNode && !node.selected && !node.stable) {
                node.setPosition(Vector.Plus(node.position, node.physics.velocity));
            }

            node.physics.force.set(0, 0);
        }

        for (let container of this._graphSystem.containers) {
            for (let vertex of [container.physics.topLeft, container.physics.bottomRight]) {
                vertex.force.setMagnitude(Math.pow(vertex.force.magnitude(), 0.6))
                vertex.velocity.add(vertex.force);
                // Dampening effect
                vertex.velocity = vertex.velocity.multiply(0.7)

                let newPosition = Vector.Plus(vertex.position, vertex.velocity);
                vertex.position.x = newPosition.x
                vertex.position.y = newPosition.y

                vertex.force.set(0, 0);
            }
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
