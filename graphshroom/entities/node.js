class Node {
    static get RADIUS() {
        return 32
    }

    static InitializeResources(renderer, stage) {
        const createNodeTexture = function () {
            const graphics = new PIXI.Graphics();

            // Multiply the radius for better resolution texture, later is downsized.
            const radius = Node.RADIUS * 2;

            graphics.beginFill(0xffffff, 0.1);
            graphics.drawCircle(radius, radius, radius);
            graphics.endFill();

            graphics.beginFill(0xffffff, 0.3);
            graphics.drawCircle(radius, radius, radius - 1);
            graphics.endFill();

            graphics.beginFill(0xffffff, 1);
            graphics.drawCircle(radius, radius, radius - 2);
            graphics.endFill();

            return renderer.generateTexture(graphics);
        };

        const createOutlineTexture = function () {
            const graphics = new PIXI.Graphics();

            // Multiply the radius for better resolution texture, later is downsized.
            const radius = Node.RADIUS * 2;


            graphics.lineStyle(5, 0xffffff, 1);
            graphics.drawCircle(radius, radius, radius - 5);
            graphics.endFill();

            return renderer.generateTexture(graphics);
        };

        // Node.NodesContainer = new PIXI.ParticleContainer({maxSize: 10000000});
        Node.NodesContainer = new PIXI.Container();
        stage.addChild(Node.NodesContainer);

        Node.NodesTextContainer = new PIXI.Container();
        stage.addChild(Node.NodesTextContainer);

        Node.NodeTexture = createNodeTexture();
        Node.NodeOutlineTexture = createOutlineTexture();
    }

    get selected() {
        return this._selected
    }

    set selected(selected) {
        this._selected = selected
        if (selected) {
            this.outlineSprite.alpha = 1;
            this.faded = false;
        } else {
            this.outlineSprite.alpha = 0;
        }
    }

    get faded() {
        return this._faded
    }

    set faded(faded) {
        let isThereDiff = this._faded !== faded;
        this._faded = faded;

        if (isThereDiff) {
            if (faded) {
                this.mainSprite.alpha = 0.3;
                this.nameText.alpha = 0.3;
            } else {
                this.mainSprite.alpha = 1;
                this.nameText.alpha = 1;
            }

            // Update edges
            for (let edge of this.incomingEdges) {
                edge.calculateFade()
            }
            for (let edge of this.outgoingEdges) {
                edge.calculateFade()
            }
        }
    }

    constructor(nodeObject) {
        this.position = nodeObject.position;
        this.name = nodeObject.name;
        this.color = nodeObject.color;
        this.incomingEdges = [];
        this.outgoingEdges = [];
        this.originalNodeRef = nodeObject

        this._selected = false;

        this._createSprites();
        this.updateDisplay();
    }

    _createSprites() {
        this.mainSprite = new PIXI.Sprite(this.constructor.NodeTexture);
        this.mainSprite.anchor.x = 0.5;
        this.mainSprite.anchor.y = 0.5;
        this.mainSprite.width = this.constructor.RADIUS * 2;
        this.mainSprite.height = this.constructor.RADIUS * 2;
        this.mainSprite.tint = this.color;

        this.outlineSprite = new PIXI.Sprite(this.constructor.NodeOutlineTexture);
        this.outlineSprite.anchor.x = 0.5;
        this.outlineSprite.anchor.y = 0.5;
        this.outlineSprite.width = this.constructor.RADIUS * 2;
        this.outlineSprite.height = this.constructor.RADIUS * 2;
        this.outlineSprite.tint = 0x77aaff;
        this.outlineSprite.alpha = 0;

        this.nameText = new PIXI.BitmapText(this.name, {
            font: {
                name: "Roboto",
                size: 30
            }
        });
        this.nameText.anchor.x = 0.5;
        this.nameText.anchor.y = -1;
        this.nameText.tint = 0xffffff;

        this._updateGraphicsPosition();

        Node.NodesContainer.addChild(this.mainSprite);
        Node.NodesContainer.addChild(this.outlineSprite);
        Node.NodesTextContainer.addChild(this.nameText);
    }

    _updateGraphicsPosition() {
        this.mainSprite.position.x = this.position.x;
        this.mainSprite.position.y = this.position.y;
        this.outlineSprite.position.x = this.position.x;
        this.outlineSprite.position.y = this.position.y;
        this.nameText.position.x = this.position.x;
        this.nameText.position.y = this.position.y;
    }

    static _CreateNameShortcut(name) {
        let importantLetters = [name[0]];
        let lastLetterWasConnector = false;
        for (let letter of name.substr(1)) {
            if ("_-=+./'><?`~\\|[]{}()*&^%$#@!1234567890".indexOf(letter) === -1) {
                if (letter.toUpperCase() === letter || lastLetterWasConnector) {
                    importantLetters.push(letter)
                }
                lastLetterWasConnector = false
            } else {
                lastLetterWasConnector = true
            }
        }
        if (importantLetters.length >= 2) {
            return importantLetters.join("").substring(0, 3)
        }
        return name.substring(0, 2)
    }

    setPosition(position) {
        this.position.x = position.x;
        this.position.y = position.y;
        this._updateGraphicsPosition();
        for (let outgoingEdge of this.outgoingEdges) {
            outgoingEdge.updatePoints()
        }
        for (let incomingEdge of this.incomingEdges) {
            incomingEdge.updatePoints()
        }
    }

    updateDisplay(scale) {

        // TODO: Do everything here. change text scale and color when zoom threshold reached, make nodes disappear, drag, etc
    }
}

export {Node}