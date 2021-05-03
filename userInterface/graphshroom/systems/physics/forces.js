import {Node} from "../../entities/node.js"
import {Edge} from "../../entities/edge.js";
import {Vector} from "../../physics/vector.mjs";
import {SparseEntitiesGrid} from "./sparseEntitiesGrid.js";

let EDGE_BASE_LENGTH = 150;
window.setLength = length => EDGE_BASE_LENGTH = length

const EDGE_STIFFNESS_COEFFICIENT = 0.0006;
const CLUSTER_SIZE = 2;

class Forces {
    constructor(graphSystem, nodeInteractionSystem) {
        this._graphSystem = graphSystem;
        this._nodeInteractionSystem = nodeInteractionSystem;

        this.initializeForces()
        this.entitiesGrid = new SparseEntitiesGrid()
        for (let node of graphSystem.nodes) {
            this.entitiesGrid.addEntity(node, node.position.x, node.position.y)
        }

        // Clusters
        this.clusters = [];
        this.clusterNodes()
    }

    initializeForces() {
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

    clusterNodes() {
        for (let node of this._graphSystem.nodes) {
            if (node._cluster == null && !node.hidden) {
                for (let cluster of buildClustersFromNode(node)) {
                    this.clusters.push(cluster)
                }
            }
        }

        function buildClustersFromNode(node) {
            let clusters = [];
            node._cluster = new Set([node])
            clusters.push(node._cluster)
            let currentLayer

            // BFS Pass
            currentLayer = new Set([node]);
            while (currentLayer.size > 0) {
                let nextLayer = new Set();
                for (let currentNode of currentLayer) {
                     let nextNodes = [
                         ...currentNode.outgoingEdges.map(edge => edge.destinationNode),
                         ...currentNode.incomingEdges.map(edge => edge.sourceNode),
                     ]
                         .filter(node => !node.hidden && node._cluster == null);

                     for (let nextNode of nextNodes) {
                         if (nextLayer.has(nextNode)) {
                             continue
                         }

                         if (currentNode._cluster.size < CLUSTER_SIZE) {
                             nextNode._cluster = currentNode._cluster
                             currentNode._cluster.add(nextNode)
                         } else {
                             nextNode._cluster = new Set([nextNode])
                             clusters.push(nextNode._cluster)
                         }
                         nextLayer.add(nextNode)
                     }
                }

                currentLayer = new Set(nextLayer);
            }

            return clusters
        }
    }



    run() {
        // for (let node of this._graphSystem.nodes) {
        //     this.entitiesGrid.updateEntity(node, node.position.x, node.position.y)
        // }

        this.calculateEdgeForces();
        this.calculateGravitationalForces();
        // this.calculateGravitationalForcesClusters();
        // this.calculateEfficientGravitationalForces();
        this.calculateContainerForces();
        this.addCenterPull();
        this.integrate();
    }

    addCenterPull() {
        let nodes = [...this._graphSystem.nodes.filter(node => !node.hidden)];

        let center = new Vector()
        for (let node of nodes) {
            let diff = Vector.Minus(center, node.position)
            node.physics.force.add(Vector.Multiply(diff.normalized(), 0.1 * Math.pow(diff.magnitude(), 0.7)))
        }
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

    calculateEfficientGravitationalForces() {
        let nodes = [...this._graphSystem.nodes.filter(node => !node.hidden)];
        let GRAVITY_RADIUS = 400;
        for (let node of nodes) {
            let closeNodes = this.entitiesGrid.getEntitiesInRect(
                node.position.x - GRAVITY_RADIUS,
                node.position.y - GRAVITY_RADIUS,
                node.position.x + GRAVITY_RADIUS,
                node.position.y + GRAVITY_RADIUS,
            )
            for (let closeNode of closeNodes) { //.filter(closeNode => closeNode.originalNodeRef.sourceObject.dbId > node.originalNodeRef.sourceObject.dbId)
                if (node === closeNode) {
                    continue
                }
                let node1 = node;
                let node2 = closeNode;

                let distanceVector = Vector.Minus(node1.position, node2.position);
                let forceVector = distanceVector.setMagnitude(Forces.calculateGravitationalForce(distanceVector.magnitude()) / 2);
                if (Math.random() > 0.9) {
                    forceVector.add(forceVector)
                    forceVector.add(forceVector)
                    forceVector.add(forceVector)
                }
                node1.physics.force.add(forceVector);
                node2.physics.force.add(Vector.Inverted(forceVector));
            }

            //
            // for (let s)
        }
    }


    calculateGravitationalForcesClusters() {
        for (let i = 0; i < this.clusters.length; i++) {
            let cluster1 = this.clusters[i];
            let cluster1Pos = {
                x: 0,
                y: 0
            }
            for (let node of cluster1) {
                cluster1Pos.x += node.position.x
                cluster1Pos.y += node.position.y
            }
            cluster1Pos.x /= cluster1.size
            cluster1Pos.y /= cluster1.size

            for (let j = i + 1; j < this.clusters.length; j+=1) {
                let cluster2 = this.clusters[j];
                let cluster2Pos = {
                    x: 0,
                    y: 0
                }
                for (let node of cluster2) {
                    cluster2Pos.x += node.position.x
                    cluster2Pos.y += node.position.y
                }
                cluster2Pos.x /= cluster2.size
                cluster2Pos.y /= cluster2.size

                let distanceVector = Vector.Minus(cluster1Pos, cluster2Pos);
                let forceVector = distanceVector.setMagnitude(Forces.calculateGravitationalForce(distanceVector.magnitude()));
                forceVector.multiply(cluster2.size + cluster2.size)
                let invertedForce = Vector.Inverted(forceVector)

                for (let node of cluster1) {
                    node.physics.force.add(forceVector);
                }
                for (let node of cluster2) {
                    node.physics.force.add(invertedForce);
                }
            }
        }

        for (let cluster of this.clusters) {
            let nodes = [...cluster];
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
