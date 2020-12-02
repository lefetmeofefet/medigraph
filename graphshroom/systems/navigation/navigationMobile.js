import {Vector} from "../../physics/vector.mjs"
import {NavigationBase} from "./navigationBase.js";


class NavigationMobile extends NavigationBase {
    run() {
        this._handleMultiFingerNavigation();
        this._handleSingleFingerDragging();

        super.run();
    }

    _handleSingleFingerDragging() {
        if (this._inputSystem.touching && this._inputSystem.touchMovedThisFrame &&
            this._inputSystem.touches.length === 1) {
            let dragVector = (
                this._swipeStart || this._inputSystem.firstTouchingLocation
            ).minus(this._inputSystem.touches[0]);
            this.center.set(this.center.plus(dragVector));
            this.shouldUpdateCenter = true; // Superclass property
        }
        if (this._inputSystem.finishedTouchingThisFrame) {
            this._swipeStart = null;
        }
    }

    _handleMultiFingerNavigation() {
        // Two finger zooming
        if (this._inputSystem.touches.length >= 2) {
            // Reset last multi-finger pair if some finger was lifted. bug: if lifted finger is not index 0 or 1, or if indexes switch...
            if (this._firstMultiTouches && !this._inputSystem.fingerLiftedThisFrame) {
                if (!this._inputSystem.touchMovedThisFrame) {
                    return
                }
                let newMultiTouch = this._inputSystem.touches;
                let distanceStart = this._firstMultiTouches[0].distance(this._firstMultiTouches[1]);
                let distanceNow = newMultiTouch[0].distance(newMultiTouch[1]);
                let middlePointStart = Vector.Average([this._firstMultiTouches[0], this._firstMultiTouches[1]]);
                let middlePointNow = Vector.Average([newMultiTouch[0], newMultiTouch[1]]);

                // Zoom
                let newScale = this.scale * distanceNow / distanceStart;
                if (newScale !== this.scale) {
                    this.scale = newScale;
                    this.shouldUpdateScale = true; // Superclass property
                    console.log("Should update scale/")
                }

                // Move center
                let dragVector = middlePointStart.minus(middlePointNow);
                let newCenter = this.center.plus(dragVector);
                if (!Vector.Same(newCenter, this.center)) {
                    this.center.set(this.center.plus(dragVector));
                    this.shouldUpdateCenter = true; // Superclass property
                }
            } else {
                this._firstMultiTouches = this._inputSystem.touches;
            }
        } else {
            if (this._firstMultiTouches) {
                this._swipeStart = this._inputSystem.touches[0];
            }
            this._firstMultiTouches = null;
        }
    }
}

export {NavigationMobile}
