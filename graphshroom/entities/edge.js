import {Vector} from "../physics/vector.mjs";

class Edge {
    static get TRIANGLE_HEIGHT() {
        return 12
    }

    static get TRIANGLE_WIDTH() {
        return 14
    }

    static InitializeResources(renderer, stage) {
        const createLineTexture = () => {
            const graphics = new PIXI.Graphics();

            let opacityScales = [0.1, 0.8, 1, 1, 0.8, 0.1];
            for (let i = 0; i < opacityScales.length; i++) {
                graphics.lineStyle(1, 0xffffff, opacityScales[i]);
                graphics.moveTo(0, i + 2);
                graphics.lineTo(1, i + 2);
            }

            return renderer.generateTexture(graphics);
        };

        const createDirectionTriangleTexture = () => {
            const graphics = new PIXI.Graphics();

            // Multiplying by 2 for resolution, later downscaled
            let triangleWidth = Edge.TRIANGLE_WIDTH * 2;
            let triangleHeight = Edge.TRIANGLE_HEIGHT * 2;

            let renderTriangle = (graphics, baseLength, width, offset) => {
                graphics.beginFill(0xffffff, 1);
                graphics.moveTo(0, offset);
                graphics.lineTo(0, baseLength - offset);
                graphics.lineTo(1, baseLength - offset);
                graphics.lineTo(width, offset + baseLength / 2);
                graphics.lineTo(1, offset);
                graphics.lineTo(0, offset);
                graphics.endFill();
            };

            graphics.lineStyle(1, 0xffffff, 0.2);
            renderTriangle(graphics, triangleWidth, triangleHeight, 0);
            graphics.lineStyle(1, 0xffffff, 1);
            renderTriangle(graphics, triangleWidth - 2, triangleHeight - 1, 1);

            return renderer.generateTexture(graphics);
        };

        Edge.EdgesContainer = new PIXI.Container();
        stage.addChild(Edge.EdgesContainer);

        Edge.EdgesTextContainer = new PIXI.Container();
        stage.addChild(Edge.EdgesTextContainer);

        Edge.LineTexture = createLineTexture();
        Edge.TriangleTexture = createDirectionTriangleTexture();
    }

    constructor(edgeObject, sourceNode, destinationNode) {
        this.sourceNode = sourceNode;
        sourceNode.outgoingEdges.push(this);
        this.destinationNode = destinationNode;
        destinationNode.incomingEdges.push(this);
        this.description = edgeObject.action;
        this._createSprites(edgeObject);
    }

    _createSprites(edgeObject) {
        this.lineSprite = new PIXI.Sprite(Edge.LineTexture);
        this.lineSprite.anchor.y = 0.5;

        // lineSprite.height is the "height" of the line, which is actually its width
        this.lineSprite.height = 8;
        this.lineSprite.tint = 0x777777;

        this.triangleSprite = new PIXI.Sprite(Edge.TriangleTexture);

        this.triangleSprite.width = this.constructor.TRIANGLE_HEIGHT;
        this.triangleSprite.height = this.constructor.TRIANGLE_WIDTH;

        this.triangleSprite.anchor.y = 0.5;
        this.triangleSprite.anchor.x = 1.0;
        this.triangleSprite.tint = 0x777777;

        this.descriptionText = new PIXI.BitmapText(this.description, {
            font: {
                name: "Roboto",
                size: 30
            }
        });
        this.descriptionText.anchor.x = 0.5;
        this.descriptionText.anchor.y = 0.5;
        this.descriptionText.tint = 0xffffff;

        this.updatePoints();

        Edge.EdgesContainer.addChild(this.lineSprite);
        Edge.EdgesContainer.addChild(this.triangleSprite);
        Edge.EdgesTextContainer.addChild(this.descriptionText);
    }

    updatePoints() {
        let source = this.sourceNode.position;
        let destination = this.destinationNode.position;

        let angle = Vector.Angle(destination, source);
        let startPoint = Vector.Plus(source, Vector.FromPolarCoordinates(this.sourceNode.constructor.RADIUS + 1, angle));
        let endPoint = Vector.Minus(destination, Vector.FromPolarCoordinates(this.destinationNode.constructor.RADIUS + Edge.TRIANGLE_HEIGHT, angle));

        this.lineSprite.width = Vector.Distance(startPoint, endPoint);
        this.lineSprite.position.x = startPoint.x;
        this.lineSprite.position.y = startPoint.y;
        this.lineSprite.rotation = angle;

        let trianglePoint = Vector.Plus(endPoint, Vector.FromPolarCoordinates(Edge.TRIANGLE_HEIGHT, angle));
        this.triangleSprite.position.x = trianglePoint.x;
        this.triangleSprite.position.y = trianglePoint.y;
        this.triangleSprite.rotation = angle;

        this.descriptionText.position.x = (startPoint.x + endPoint.x) / 2;
        this.descriptionText.position.y = (startPoint.y + endPoint.y) / 2;
    }
}

export {Edge}