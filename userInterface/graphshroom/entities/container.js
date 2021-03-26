import {Vector} from "../physics/vector.mjs";

class NodeContainer {
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

        NodeContainer.LinesContainer = new PIXI.Container();
        stage.addChild(NodeContainer.LinesContainer);

        NodeContainer.TextContainer = new PIXI.Container();
        stage.addChild(NodeContainer.TextContainer);

        NodeContainer.LineTexture = createLineTexture();
    }

    constructor(name, containedNodes) {
        this.name = name;
        this.containedNodes = containedNodes;
        this.topLeft = {x: 0, y: 0}
        this.bottomRight = {x: 1000, y: 1000}
        this._createSprites();
    }

    _createSprites() {
        this.lineSpriteLeft = new PIXI.Sprite(NodeContainer.LineTexture);
        this.lineSpriteLeft.rotation = Vector.Angle({x: 0, y: 0}, {x: 0, y: -1});

        this.lineSpriteRight = new PIXI.Sprite(NodeContainer.LineTexture);
        this.lineSpriteRight.rotation = Vector.Angle({x: 0, y: 0}, {x: 0, y: 1});

        this.lineSpriteTop = new PIXI.Sprite(NodeContainer.LineTexture);
        this.lineSpriteTop.rotation = Vector.Angle({x: 0, y: 0}, {x: -1, y: 0});

        this.lineSpriteBottom = new PIXI.Sprite(NodeContainer.LineTexture);
        this.lineSpriteBottom.rotation = Vector.Angle({x: 0, y: 0}, {x: 1, y: 0});

        for (let lineSprite of [this.lineSpriteTop, this.lineSpriteBottom, this.lineSpriteLeft, this.lineSpriteRight]) {
            lineSprite.tint = 0x777777;
            lineSprite.anchor.y = 0.5;
            lineSprite.height = 8;
        }

        this.nameText = new PIXI.BitmapText(this.name || "", {
            font: {
                name: "Roboto",
                size: 20
            }
        });
        this.nameText.anchor.x = 0.5;
        this.nameText.anchor.y = 0.5;
        this.nameText.tint = 0xffffff;

        this.updatePoints();

        NodeContainer.LinesContainer.addChild(this.lineSpriteLeft);
        NodeContainer.LinesContainer.addChild(this.lineSpriteTop);
        NodeContainer.LinesContainer.addChild(this.lineSpriteBottom);
        NodeContainer.LinesContainer.addChild(this.lineSpriteRight);
        NodeContainer.TextContainer.addChild(this.nameText);
    }

    updatePoints() {
        let width = Math.abs(this.topLeft.x - this.bottomRight.x)
        let height = Math.abs(this.topLeft.y - this.bottomRight.y)

        this.lineSpriteTop.position.x = this.topLeft.x
        this.lineSpriteTop.position.y = this.topLeft.y
        this.lineSpriteTop.width = width

        this.lineSpriteLeft.position.x = this.topLeft.x
        this.lineSpriteLeft.position.y = this.topLeft.y
        this.lineSpriteLeft.width = height

        this.lineSpriteBottom.position.x = this.bottomRight.x
        this.lineSpriteBottom.position.y = this.bottomRight.y
        this.lineSpriteBottom.width = width

        this.lineSpriteRight.position.x = this.bottomRight.x
        this.lineSpriteRight.position.y = this.bottomRight.y
        this.lineSpriteRight.width = height

        this.nameText.position.x = this.topLeft.x + 10 + this.nameText.width / 2;
        this.nameText.position.y = this.topLeft.y + 15;
    }

    updateDisplay(scale) {
        this.updatePoints();

        // Scaling direction triangle sprite. 0.5 is base scale

        // Scaling edge line width. 1 is base scale
        [this.lineSpriteTop, this.lineSpriteLeft, this.lineSpriteBottom, this.lineSpriteRight]
            .map(line => line.scale.y = Math.max(1, 0.25 / scale));

        // TODO: Do everything here. change text scale and color when zoom threshold reached, make nodes disappear, drag, etc
    }
}

export {NodeContainer}