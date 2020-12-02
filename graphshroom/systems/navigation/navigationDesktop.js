import {Vector} from "../../physics/vector.mjs"
import {NavigationBase} from "./navigationBase.js";


class NavigationDesktop extends NavigationBase {
    get KEYS_SCROLL_SPEED() {
        return 8 / this.scale;
    }

    get MOUSE_SCALE_SPEED_MULTIPLIER() {
        return 0.0018;
    }

    get KEYS_SCALE_SPEED() {
        return 0.05
    }

    constructor(setPivotCb, setScaleCb, screenDimensionsCb, pivotCb, inputSystem, scaleMin, scaleMax) {
        super(setPivotCb, setScaleCb, screenDimensionsCb, pivotCb, inputSystem, scaleMin, scaleMax);

        this._scaleDestination = 1;
        this._scaleSpeed = 0;
        window.addEventListener('wheel', e => {
            this._zoomPoint = this._inputSystem.mouse;
            if (e.deltaY < 0) {
                this.scaleIn(e.deltaY * this.MOUSE_SCALE_SPEED_MULTIPLIER);
            } else {
                this.scaleOut(e.deltaY * this.MOUSE_SCALE_SPEED_MULTIPLIER);
            }
        });

        // Clear right click
        document.addEventListener('contextmenu', event => event.preventDefault());
    }

    _limitScale() {
        if (this._scaleDestination > this._scaleMax) {
            this._scaleDestination = this._scaleMax;
        } else if (this._scaleDestination < this._scaleMin) {
            this._scaleDestination = this._scaleMin;
        }
    }

    scaleOut(amount) {
        this._scaleDestination /= 1 + Math.abs(amount);
    }

    scaleIn(amount) {
        this._scaleDestination *= 1 + Math.abs(amount);
    }

    run() {
        this._limitScale();
        this._scaleSpeed += (this._scaleDestination / this.scale - 1) * 0.7;
        this._scaleSpeed *= 0.32;
        if (Math.abs(this._scaleSpeed) > 0.000001) {
            this._scale(this._scaleSpeed);
        }

        if (this._inputSystem.isKeyPressed("w")) {
            this.center.set(this.center.x, this.center.y - this.KEYS_SCROLL_SPEED);
            this.shouldUpdateCenter = true;
        }
        if (this._inputSystem.isKeyPressed("a")) {
            this.center.set(this.center.x - this.KEYS_SCROLL_SPEED, this.center.y);
            this.shouldUpdateCenter = true;
        }
        if (this._inputSystem.isKeyPressed("s")) {
            this.center.set(this.center.x, this.center.y + this.KEYS_SCROLL_SPEED);
            this.shouldUpdateCenter = true;
        }
        if (this._inputSystem.isKeyPressed("d")) {
            this.center.set(this.center.x + this.KEYS_SCROLL_SPEED, this.center.y);
            this.shouldUpdateCenter = true;
        }

        // Left button drag
        if (this._inputSystem.dragging && this._inputSystem.isKeyPressed("Control")) {
            let dragVector = this._inputSystem.dragStartPoint.minus(this._inputSystem.mouse);
            this.center.set(this.center.plus(dragVector));
            this.shouldUpdateCenter = true;
        }

        // Right button drag
        if (this._inputSystem.rightDragging) {
            let dragVector = this._inputSystem.rightDragStartPoint.minus(this._inputSystem.mouse);
            this.center.set(this.center.plus(dragVector));
            this.shouldUpdateCenter = true;
        }

        if (this._inputSystem.isKeyPressed("ArrowDown")) {
            this.scaleOut(this.KEYS_SCALE_SPEED);
            this._zoomPoint = this.center;
        }
        if (this._inputSystem.isKeyPressed("ArrowUp")) {
            this.scaleIn(this.KEYS_SCALE_SPEED);
            this._zoomPoint = this.center;
        }

        super.run();
    }

    _scale(scaleAmount) {
        let pointToFixBefore = this._zoomPoint;

        // Zoom to center
        let oldScale = this.scale;
        this.scale += scaleAmount * this.scale;
        this.shouldUpdateScale = true; // Property of superclass

        this._calculatePivotByCenter();

        if (scaleAmount > 0) {
            // Mouse has to stay in the same XY coordinates as before, so we move center
            let pivot = this._pivotCb();
            let pointToFixAfter = new Vector(
                ((pointToFixBefore.x - pivot.x) * oldScale) / this.scale + this.pivot.x,
                ((pointToFixBefore.y - pivot.y) * oldScale) / this.scale + this.pivot.y,
            );

            this.center.set(
                this.center.x + (pointToFixBefore.x - pointToFixAfter.x),
                this.center.y + (pointToFixBefore.y - pointToFixAfter.y)
            );

            this._calculatePivotByCenter();
        }

        this._updateAppPivot();
    }
}

export {NavigationDesktop}
