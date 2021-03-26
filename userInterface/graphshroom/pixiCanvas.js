

class PixiCanvas {
    get pivot() {
        return this._zoomingStage.pivot;
    }

    get scale() {
        return this._zoomingStage.scale.x;
    }

    get stage() {
        return this._zoomingStage;
    }

    get staticStage() {
        return this._staticStage;
    }

    constructor(backgroundColor) {
        this.frame = 0;
        this.renderer = new PIXI.Renderer({
            antialias: true,
            transparent: false,
            resolution: 1,
            width: window.innerWidth,
            height: window.innerHeight
        });

        window.onload = () => {
            document.body.appendChild(this.renderer.view);
        };

        this.renderer.view.style.position = "absolute";
        this.renderer.view.style.display = "block";
        // TODO: What is this?
        // this.renderer.autoDensity = false;

        this._scaleListeners = [];

        this._onResize();

        window.addEventListener('resize', () => this._onResize());
        if (backgroundColor) {
            this.renderer.backgroundColor = backgroundColor;
        }

        this._staticStage = new PIXI.Container();
        this._zoomingStage = new PIXI.Container();
        this._staticStage.addChild(this._zoomingStage);
        this._staticStage.interactiveChildren = false;
    }

    addScaleListener(callback) {
        this._scaleListeners.push(callback);
    }

    setScale(x, y) {
        this._zoomingStage.scale.set(x, y);
        for (let listener of this._scaleListeners) {
            listener(x, y);
        }
    }

    getView() {
        return {
            x: this._zoomingStage.pivot.x,
            y: this._zoomingStage.pivot.y,
            width: this.renderer.screen.width / this.scale,
            height: this.renderer.screen.height / this.scale,
        }
    }

    setPivot(x, y) {
        this._zoomingStage.pivot.set(x, y)
    }

    _onResize() {
        this.renderer.resize(window.innerWidth, window.innerHeight);
        this.renderer.view.style.width = window.innerWidth + "px";
        this.renderer.view.style.height = window.innerHeight + "px";
    }

    startRenderLoop(updateCallback) {
        let ticker = new PIXI.Ticker();
        ticker.add(delta => {
            updateCallback(delta);
            this.renderer.render(this.stage);
            this.frame += 1;
        });
        ticker.start();
    }
}


export {PixiCanvas}