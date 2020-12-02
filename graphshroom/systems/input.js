import {Vector} from "../physics/vector.mjs"


class Input {
    screenToWorldCoordinates(p) {
        let scale = this._scaleCb();
        let pivot = this._pivotCb();
        return new Vector(
            p.x / scale.x + pivot.x,
            p.y / scale.y + pivot.y
        );
    }

    get mouse() {
        let mouse = this._mouseLocationCb();
        return this.screenToWorldCoordinates(
            new Vector(
                mouse.x,
                mouse.y
            )
        );
    }

    get leftMouseDown() {
        return this._mouseState.leftDown
    }

    get rightMouseDown() {
        return this._mouseState.rightDown;
    }

    get leftMousePressedThisFrame() {
        return this._mouseState.leftPressedThisFrame;
    }

    get rightMousePressedThisFrame() {
        return this._mouseState.rightPressedThisFrame;
    }

    get leftMouseReleasedThisFrame() {
        return this._mouseState.leftReleasedThisFrame;
    }

    get rightMouseReleasedThisFrame() {
        return this._mouseState.rightReleasedThisFrame;
    }

    get dragging() {
        return this._mouseState.dragging;
    }

    get rightDragging() {
        return this._mouseState.rightDragging;
    }

    get dragStartPoint() {
        return this._mouseState.dragStartPoint;
    }

    get rightDragStartPoint() {
        return this._mouseState.rightDragStartPoint;
    }

    get finishedDraggingThisFrame() {
        return this._mouseState.finishedDraggingThisFrame;
    }

    get finishedRightDraggingThisFrame() {
        return this._mouseState.finishedRightDraggingThisFrame;
    }


    get touching() {
        return this._touchState.touching;
    }

    get touches() {
        return this._touchState.touches;
    }

    get startedTouchingThisFrame() {
        return this._touchState.startedTouchingThisFrame;
    }

    get finishedTouchingThisFrame() {
        return this._touchState.finishedTouchingThisFrame;
    }

    get touchMovedThisFrame() {
        return this._touchState.touchMovedThisFrame;
    }

    get fingerLandedThisFrame() {
        return this._touchState.fingerLandedThisFrame;
    }

    get fingerLiftedThisFrame() {
        return this._touchState.fingerLiftedThisFrame;
    }

    get firstTouchingLocation() {
        return this._touchState.firstTouchingLocation;
    }

    get lastTouchingLocation() {
        return this._touchState.lastTouchingLocation;
    }

    get movementsSinceFirstTouch() {
        return this._touchState.movementsSinceFirstTouch;
    }

    constructor(scaleCb, pivotCb, mouseLocationCb, addEventCb) {
        this._scaleCb = scaleCb;
        this._pivotCb = pivotCb;
        this._mouseLocationCb = mouseLocationCb;

        this._mouseState = {
            leftDown: false,
            rightDown: false,
            leftPressedThisFrame: false,
            rightPressedThisFrame: false,
            leftReleasedThisFrame: false,
            rightReleasedThisFrame: false,
            dragging: false,
            rightDragging: false,
            dragStartPoint: null,
            rightDragStartPoint: null,
            finishedDraggingThisFrame: false,
            finishedRightDraggingThisFrame: false
        };
        this._touchState = {
            touching: false,
            touches: [],
            startedTouchingThisFrame: false,
            finishedTouchingThisFrame: false,
            touchMovedThisFrame: false,

            firstTouchingLocation: null,
            lastTouchingLocation: null,
            fingerLandedThisFrame: false,
            fingerLiftedThisFrame: false,
            movementsSinceFirstTouch: 0
        };
        this._pressedKeys = new Set();

        window.addEventListener("keydown", this._keyDown.bind(this), false);
        window.addEventListener("keyup", this._keyUp.bind(this), false);

        addEventCb("mousedown", (e) => {
            this._mouseState.leftDown = true;
            this._mouseState._leftPressedThisFrame = true;
        });
        addEventCb("mouseup", (e) => {
            this._mouseState.leftDown = false;
            this._mouseState._leftReleasedThisFrame = true;
        });
        addEventCb("rightdown", (e) => {
            this._mouseState.rightDown = true;
            this._mouseState._rightPressedThisFrame = true;
        });
        addEventCb("rightup", (e) => {
            this._mouseState.rightDown = false;
            this._mouseState._rightReleasedThisFrame = true;
        });

        // Touch
        const _updateTouchesByEvent = e => {
            this._touchState.touches = [...e.data.originalEvent.touches].map(touch => {
                return this.screenToWorldCoordinates(new Vector(touch.pageX, touch.pageY))
            });
        };
        addEventCb("touchstart", (e) => {
            this._touchState._fingerLandedThisFrame = true;

            if (this._touchState.touches.length === 0) {
                this._touchState.touching = true;
                this._touchState._startedTouchingThisFrame = true;
            }

            _updateTouchesByEvent(e);

            if (this._touchState.touches.length === 1) {
                this._touchState.firstTouchingLocation = this._touchState.touches[0];
                this._touchState.movementsSinceFirstTouch = 0;
            }
            console.log("touchstart: ", e.data.originalEvent.touches)
        });

        addEventCb("touchmove", e => {
            this._touchState._touchMovedThisFrame = true;
            _updateTouchesByEvent(e);
            this._touchState.movementsSinceFirstTouch += 1;
            // console.log("touchmove: ", e.data.originalEvent.touches)
        });

        addEventCb("touchend", e => {
            this._touchState._fingerLiftedThisFrame = true;

            // If currently the last finger is lifted
            if (this._touchState.touches.length === 1) {
                this._touchState.touching = false;
                this._touchState._finishedTouchingThisFrame = true;
                this._touchState.lastTouchingLocation = this._touchState.touches[0]
            }

            _updateTouchesByEvent(e);
            console.log("touchend: ", e.data.originalEvent.touches)
        });
    }

    run() {
        // The params that start with _ are changing mid-frame, and the state has to be the same throughout the frame.
        // This mechanic is not for all properties, but only for ones that happened "ThisFrame"
        this._mouseState.leftPressedThisFrame = this._mouseState._leftPressedThisFrame;
        this._mouseState.leftReleasedThisFrame = this._mouseState._leftReleasedThisFrame;
        this._mouseState.rightPressedThisFrame = this._mouseState._rightPressedThisFrame;
        this._mouseState.rightReleasedThisFrame = this._mouseState._rightReleasedThisFrame;
        this._mouseState.finishedDraggingThisFrame = this._mouseState._finishedDraggingThisFrame;
        this._mouseState.finishedRightDraggingThisFrame = this._mouseState._finishedRightDraggingThisFrame;
        this._touchState.startedTouchingThisFrame = this._touchState._startedTouchingThisFrame;
        this._touchState.finishedTouchingThisFrame = this._touchState._finishedTouchingThisFrame;
        this._touchState.touchMovedThisFrame = this._touchState._touchMovedThisFrame;
        this._touchState.fingerLandedThisFrame = this._touchState._fingerLandedThisFrame;
        this._touchState.fingerLiftedThisFrame = this._touchState._fingerLiftedThisFrame;


        this._mouseState._leftPressedThisFrame = false;
        this._mouseState._leftReleasedThisFrame = false;
        this._mouseState._rightPressedThisFrame = false;
        this._mouseState._rightReleasedThisFrame = false;
        this._mouseState._finishedDraggingThisFrame = false;
        this._mouseState._finishedRightDraggingThisFrame = false;
        this._touchState._startedTouchingThisFrame = false;
        this._touchState._finishedTouchingThisFrame = false;
        this._touchState._touchMovedThisFrame = false;
        this._touchState._fingerLandedThisFrame = false;
        this._touchState._fingerLiftedThisFrame = false;

        this._handleDrag();
    }

    _handleDrag() {
        // Left mouse drag
        if (this.leftMousePressedThisFrame) {
            this._mouseState.dragStartPoint = this.mouse;
            this._mouseState.dragging = true;
        }

        if (this.leftMouseReleasedThisFrame) {
            this._mouseState.dragging = false;
            this._mouseState._finishedDraggingThisFrame = true;
        } else {
            this._mouseState._finishedDraggingThisFrame = false;
        }

        // Right mouse drag
        if (this.rightMousePressedThisFrame) {
            this._mouseState.rightDragStartPoint = this.mouse;
            this._mouseState.rightDragging = true;
        }

        if (this.rightMouseReleasedThisFrame) {
            this._mouseState.rightDragging = false;
            this._mouseState._finishedRightDraggingThisFrame = true;
        } else {
            this._mouseState._finishedRightDraggingThisFrame = false;
        }
    }

    isKeyPressed(key) {
        return this._pressedKeys.has(key);
    }

    _keyDown(key) {
        this._pressedKeys.add(key.key);
    }

    _keyUp(key) {
        this._pressedKeys.delete(key.key);
    }
}

export {Input}