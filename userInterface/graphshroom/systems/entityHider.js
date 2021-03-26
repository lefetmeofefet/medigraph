import {SparseEntitiesGrid} from "./physics/sparseEntitiesGrid.js";

class EntityHider {
    constructor(pixiCanvas, graphSystem) {
        this.pixiCanvas = pixiCanvas
        this.lastVisibleEntities = [];
        this.entitiesGrid = new SparseEntitiesGrid()
        for (let node of graphSystem.nodes) {
            this.entitiesGrid.addEntity(node, node.position.x, node.position.y)
        }
    }

    run() {
        for (let node of graphSystem.nodes) {
            this.entitiesGrid.updateEntity(node, node.position.x, node.position.y)
        }

        if (this.pixiCanvas.frame % 10 !== 0) {
            return
        }
        let screenRect = this.pixiCanvas.getView();
        // screenRect.x -= 200 / this.pixiCanvas.scale;
        // screenRect.width += 400 / this.pixiCanvas.scale;
        // screenRect.y -= 200 / this.pixiCanvas.scale;
        // screenRect.height += 400 / this.pixiCanvas.scale;

        // For debugging off-screen rendering
        // screenRect.x += 200;
        // screenRect.width -= 400;
        // screenRect.y += 200;
        // screenRect.height -= 400;

        screenRect.x += 200 / this.pixiCanvas.scale;
        screenRect.width -= 400 / this.pixiCanvas.scale;
        screenRect.y += 200 / this.pixiCanvas.scale;
        screenRect.height -= 400 / this.pixiCanvas.scale;
        this.updateHiddenHosts(screenRect);
    }

    updateHiddenHosts(screenRect) {
        let hostsInScreen = this.entitiesGrid.getEntitiesInRect(screenRect.x, screenRect.y,
            screenRect.x + screenRect.width, screenRect.y + screenRect.height);

        // The following logic: take all hosts in screen and make them visible, and then take all the visible hosts from
        // last frame, and if they're not currently visible make them invisible.
        let lastVisibleEntities = this.lastVisibleEntities;
        this.lastVisibleEntities = [];

        for (let host of hostsInScreen) {
            host.showDisplay();
            host.isInScreen = true;
            this.lastVisibleEntities.push(host);
        }
        for (let host of lastVisibleEntities) {
            if (!host.isInScreen) {
                host.hideDisplay();
            }
            host.isInScreen = false;
        }
        for (let host of this.lastVisibleEntities) {
            host.isInScreen = false;
        }
    }

    _isEntityInScreen(entity, radius, screenRect) {
        return (entity.position.x + radius >= screenRect.x && entity.position.y + radius >= screenRect.y &&
            entity.position.x - radius <= screenRect.x + screenRect.width && entity.position.y - radius <= screenRect.y + screenRect.height);
    }
}

export {EntityHider}
