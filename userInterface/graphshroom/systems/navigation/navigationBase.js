import {Vector} from "../../physics/vector.mjs"


class NavigationBase {
    constructor(setPivotCb, setScaleCb, screenDimensionsCb, pivotCb, inputSystem, scaleMin, scaleMax) {
        this._setPivotCb = setPivotCb;
        this._setScaleCb = setScaleCb;
        this._screenDimensionsCb = screenDimensionsCb;
        this._pivotCb = pivotCb;
        this._inputSystem = inputSystem;
        this._scaleMin = scaleMin;
        this._scaleMax = scaleMax;


        this.center = Vector.Multiply(this._screenDimensionsCb(), 0.5);
        this.pivot = new Vector(0, 0);
        this.scale = 1;
        this.shouldUpdateCenter = false;
        this.shouldUpdateScale = false;
        this._recenterDestination = null;
    }

    recenter(destination) {
        this._recenterDestination = destination;
    }

    run() {
        if (this._recenterDestination !== null) {
            this.center.set(this._recenterDestination.x, this._recenterDestination.y);
            this._recenterDestination = null;
            this.shouldUpdateCenter = true;
        }

        if (this.shouldUpdateCenter) {
            this._calculatePivotByCenter();
            this._updateAppPivot();
            this.shouldUpdateCenter = false;
        }
        if (this.shouldUpdateScale) {
            this._updateScale();
            this.shouldUpdateScale = false;
        }
    }

    _calculatePivotByCenter() {
        let screenDimensions = this._screenDimensionsCb();
        this.pivot.set(
            this.center.x - (screenDimensions.x / (2 * this.scale)),
            this.center.y - (screenDimensions.y / (2 * this.scale))
        );
    }

    _updateAppPivot() {
        this._setPivotCb(this.pivot);
    }

    _updateScale() {
        this._setScaleCb(this.scale);
    }
}

export {NavigationBase}